import hashlib
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.learning_material import LearningMaterial
from app.models.student_learning_material import StudentLearningMaterial
from app.models.teacher_student import TeacherStudent
from app.schemas.learning_materials import (
    AdaptationVersionSummary,
    AdaptedLearningMaterialDetailResponse,
    AdaptedMaterialSourceInfo,
    LearningMaterialResponse,
    LearningMaterialKind,
    TeacherLearningMaterialAssignmentResponse,
    TeacherLearningMaterialAssignRequest,
    TeacherLearningMaterialCreateRequest,
    TeacherLearningMaterialsListResponse,
)
from app.services.notifications_service import create_notification


def _normalize_material_text(text: str | None) -> str:
    return (text or "").strip()


def _build_adaptation_group_key(material: LearningMaterial) -> str | None:
    if material.adapted_text is None:
        return None

    source_type = (material.source_type or "manual").strip().lower()
    if source_type == "material" and material.source_material_id is not None:
        return f"material:{material.source_material_id}"

    normalized_original_text = _normalize_material_text(material.original_text)
    fingerprint = hashlib.sha256(normalized_original_text.encode("utf-8")).hexdigest()[:16]

    if source_type == "file":
        source_filename = (material.source_filename or "uploaded-file").strip().lower()
        return f"file:{source_filename}:{fingerprint}"

    return f"manual:{fingerprint}"


def _get_learning_material_kind(material: LearningMaterial) -> LearningMaterialKind:
    return "adapted" if material.adapted_text is not None else "draft"


def _to_learning_material_response(material: LearningMaterial) -> LearningMaterialResponse:
    return LearningMaterialResponse(
        id=material.id,
        title=material.title,
        original_text=material.original_text,
        adapted_text=material.adapted_text,
        material_kind=_get_learning_material_kind(material),
        material_type=material.material_type,
        status=material.status,
        source_type=material.source_type,
        source_material_id=material.source_material_id,
        source_filename=material.source_filename,
        adaptation_mode=material.adaptation_mode,
        adaptation_group_key=_build_adaptation_group_key(material),
        created_at=material.created_at,
        updated_at=material.updated_at,
    )


def create_learning_material(
    db: Session,
    *,
    teacher_user_id: UUID,
    payload: TeacherLearningMaterialCreateRequest,
) -> LearningMaterialResponse:
    material = LearningMaterial(
        teacher_user_id=teacher_user_id,
        title=payload.title.strip(),
        original_text=payload.original_text.strip(),
        adapted_text=payload.adapted_text.strip() if payload.adapted_text else None,
        material_type="text",
        status="draft",
        source_type=payload.source_type.strip() if payload.source_type else None,
        source_material_id=payload.source_material_id,
        source_filename=payload.source_filename.strip() if payload.source_filename else None,
        adaptation_mode=payload.adaptation_mode,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return _to_learning_material_response(material)


def list_teacher_learning_materials(
    db: Session,
    *,
    teacher_user_id: UUID,
    kind: str = "all",
) -> TeacherLearningMaterialsListResponse:
    query = db.query(LearningMaterial).filter(LearningMaterial.teacher_user_id == teacher_user_id)

    if kind == "draft":
        query = query.filter(LearningMaterial.adapted_text.is_(None))
    elif kind == "adapted":
        query = query.filter(LearningMaterial.adapted_text.is_not(None))

    materials = query.order_by(LearningMaterial.created_at.desc()).all()

    return TeacherLearningMaterialsListResponse(
        items=[_to_learning_material_response(material) for material in materials]
    )


def get_teacher_learning_material(
    db: Session,
    *,
    teacher_user_id: UUID,
    material_id: UUID,
) -> LearningMaterialResponse | None:
    material = (
        db.query(LearningMaterial)
        .filter(
            LearningMaterial.id == material_id,
            LearningMaterial.teacher_user_id == teacher_user_id,
        )
        .first()
    )

    if material is None:
        return None

    return _to_learning_material_response(material)


def get_teacher_learning_material_compare_ready_detail(
    db: Session,
    *,
    teacher_user_id: UUID,
    material_id: UUID,
) -> AdaptedLearningMaterialDetailResponse | None:
    material = (
        db.query(LearningMaterial)
        .filter(
            LearningMaterial.id == material_id,
            LearningMaterial.teacher_user_id == teacher_user_id,
        )
        .first()
    )

    if material is None:
        return None

    response = _to_learning_material_response(material)
    if response.material_kind != "adapted":
        return AdaptedLearningMaterialDetailResponse(
            **response.model_dump(),
            source_info=None,
            available_adaptation_versions=[],
        )

    adaptation_group_key = response.adaptation_group_key
    related_versions: list[AdaptationVersionSummary] = []

    if adaptation_group_key is not None:
        sibling_materials = (
            db.query(LearningMaterial)
            .filter(
                LearningMaterial.teacher_user_id == teacher_user_id,
                LearningMaterial.adapted_text.is_not(None),
            )
            .order_by(LearningMaterial.created_at.desc())
            .all()
        )

        related_versions = [
            AdaptationVersionSummary(
                id=sibling.id,
                title=sibling.title,
                adaptation_mode=sibling.adaptation_mode,
                created_at=sibling.created_at,
                updated_at=sibling.updated_at,
                is_current=sibling.id == material.id,
            )
            for sibling in sibling_materials
            if _build_adaptation_group_key(sibling) == adaptation_group_key
        ]

    source_material_title: str | None = None
    if material.source_material_id is not None:
        source_material = (
            db.query(LearningMaterial)
            .filter(
                LearningMaterial.id == material.source_material_id,
                LearningMaterial.teacher_user_id == teacher_user_id,
            )
            .first()
        )
        source_material_title = source_material.title if source_material is not None else None

    source_info = AdaptedMaterialSourceInfo(
        source_type=material.source_type or "manual",
        source_material_id=material.source_material_id,
        source_material_title=source_material_title,
        source_filename=material.source_filename,
        adaptation_group_key=adaptation_group_key or f"material:{material.id}",
    )

    return AdaptedLearningMaterialDetailResponse(
        **response.model_dump(),
        source_info=source_info,
        available_adaptation_versions=related_versions,
    )


def assign_learning_material_to_student(
    db: Session,
    *,
    teacher_user_id: UUID,
    material_id: UUID,
    payload: TeacherLearningMaterialAssignRequest,
) -> TeacherLearningMaterialAssignmentResponse:
    material = (
        db.query(LearningMaterial)
        .filter(
            LearningMaterial.id == material_id,
            LearningMaterial.teacher_user_id == teacher_user_id,
        )
        .first()
    )
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning material not found")

    teacher_student_link = (
        db.query(TeacherStudent)
        .filter(
            TeacherStudent.teacher_user_id == teacher_user_id,
            TeacherStudent.student_user_id == payload.student_user_id,
        )
        .first()
    )
    if teacher_student_link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    existing_assignment = (
        db.query(StudentLearningMaterial)
        .filter(
            StudentLearningMaterial.student_user_id == payload.student_user_id,
            StudentLearningMaterial.learning_material_id == material_id,
        )
        .first()
    )
    if existing_assignment is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Material already assigned to this student",
        )

    assignment = StudentLearningMaterial(
        student_user_id=payload.student_user_id,
        learning_material_id=material_id,
        assigned_by_teacher_user_id=teacher_user_id,
    )
    db.add(assignment)
    db.flush()

    create_notification(
        db,
        user_id=payload.student_user_id,
        role="student",
        type="student_material_assigned",
        title="Назначен новый учебный материал",
        message="Преподаватель назначил вам новый учебный материал.",
        target_view="student_materials",
        action_key="open_materials",
        target_id=material_id,
    )

    db.commit()
    db.refresh(assignment)

    return TeacherLearningMaterialAssignmentResponse(
        id=assignment.id,
        student_user_id=assignment.student_user_id,
        learning_material_id=assignment.learning_material_id,
        assigned_by_teacher_user_id=assignment.assigned_by_teacher_user_id,
        created_at=assignment.created_at,
    )
