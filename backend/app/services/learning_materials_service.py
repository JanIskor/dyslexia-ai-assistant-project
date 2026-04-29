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


def _get_group_title(materials: list[LearningMaterial]) -> str | None:
    if not materials:
        return None

    earliest_material = min(materials, key=lambda material: (material.created_at, str(material.id)))
    return earliest_material.title


def _group_adapted_materials_by_key(
    materials: list[LearningMaterial],
) -> list[tuple[LearningMaterial, str | None, list[LearningMaterial]]]:
    grouped_materials: dict[str | None, list[LearningMaterial]] = {}

    for material in materials:
        group_key = _build_adaptation_group_key(material)
        grouped_materials.setdefault(group_key, []).append(material)

    grouped_items: list[tuple[LearningMaterial, str | None, list[LearningMaterial]]] = []
    for group_key, group_materials in grouped_materials.items():
        representative_material = max(
            group_materials,
            key=lambda material: (material.created_at, str(material.id)),
        )
        grouped_items.append((representative_material, group_key, group_materials))

    grouped_items.sort(
        key=lambda item: (item[0].created_at, str(item[0].id)),
        reverse=True,
    )
    return grouped_items


def _to_learning_material_response(
    material: LearningMaterial,
    *,
    override_title: str | None = None,
) -> LearningMaterialResponse:
    return LearningMaterialResponse(
        id=material.id,
        title=override_title or material.title,
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


def _get_group_sibling_materials(
    db: Session,
    *,
    teacher_user_id: UUID,
    adaptation_group_key: str | None,
) -> list[LearningMaterial]:
    if adaptation_group_key is None:
        return []

    sibling_materials = (
        db.query(LearningMaterial)
        .filter(
            LearningMaterial.teacher_user_id == teacher_user_id,
            LearningMaterial.adapted_text.is_not(None),
        )
        .order_by(LearningMaterial.created_at.asc())
        .all()
    )
    return [
        sibling for sibling in sibling_materials if _build_adaptation_group_key(sibling) == adaptation_group_key
    ]


def get_adapted_group_status_for_source(
    db: Session,
    *,
    teacher_user_id: UUID,
    original_text: str,
    source_type: str,
    source_material_id: UUID | None = None,
    source_filename: str | None = None,
) -> tuple[str | None, str | None]:
    group_probe = LearningMaterial(
        title="source-status",
        original_text=original_text.strip(),
        adapted_text="status-probe",
        source_type=source_type.strip(),
        source_material_id=source_material_id,
        source_filename=source_filename.strip() if source_filename else None,
    )
    adaptation_group_key = _build_adaptation_group_key(group_probe)
    grouped_siblings = _get_group_sibling_materials(
        db,
        teacher_user_id=teacher_user_id,
        adaptation_group_key=adaptation_group_key,
    )
    return adaptation_group_key, _get_group_title(grouped_siblings)


def create_learning_material(
    db: Session,
    *,
    teacher_user_id: UUID,
    payload: TeacherLearningMaterialCreateRequest,
) -> LearningMaterialResponse:
    normalized_source_type = payload.source_type.strip() if payload.source_type else None
    normalized_source_filename = payload.source_filename.strip() if payload.source_filename else None
    normalized_original_text = payload.original_text.strip()
    normalized_title = payload.title.strip()
    normalized_adapted_text = payload.adapted_text.strip() if payload.adapted_text else None

    material_group_key: str | None = None
    if normalized_adapted_text is not None:
        group_probe = LearningMaterial(
            title=normalized_title,
            original_text=normalized_original_text,
            adapted_text=normalized_adapted_text,
            source_type=normalized_source_type,
            source_material_id=payload.source_material_id,
            source_filename=normalized_source_filename,
        )
        material_group_key = _build_adaptation_group_key(group_probe)

        if material_group_key is not None:
            grouped_siblings = _get_group_sibling_materials(
                db,
                teacher_user_id=teacher_user_id,
                adaptation_group_key=material_group_key,
            )
            group_title = _get_group_title(grouped_siblings)
            if group_title:
                normalized_title = group_title

    material = LearningMaterial(
        teacher_user_id=teacher_user_id,
        title=normalized_title,
        original_text=normalized_original_text,
        adapted_text=normalized_adapted_text,
        material_type="text",
        status="draft",
        source_type=normalized_source_type,
        source_material_id=payload.source_material_id,
        source_filename=normalized_source_filename,
        adaptation_mode=payload.adaptation_mode,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return _to_learning_material_response(material)


def save_or_update_adapted_learning_material(
    db: Session,
    *,
    teacher_user_id: UUID,
    payload: TeacherLearningMaterialCreateRequest,
) -> tuple[LearningMaterialResponse, str]:
    normalized_source_type = payload.source_type.strip() if payload.source_type else None
    normalized_source_filename = payload.source_filename.strip() if payload.source_filename else None
    normalized_original_text = payload.original_text.strip()
    normalized_title = payload.title.strip()
    normalized_adapted_text = payload.adapted_text.strip() if payload.adapted_text else None

    if normalized_adapted_text is None:
        return (
            create_learning_material(
                db,
                teacher_user_id=teacher_user_id,
                payload=payload,
            ),
            "created",
        )

    group_probe = LearningMaterial(
        title=normalized_title,
        original_text=normalized_original_text,
        adapted_text=normalized_adapted_text,
        source_type=normalized_source_type,
        source_material_id=payload.source_material_id,
        source_filename=normalized_source_filename,
        adaptation_mode=payload.adaptation_mode,
    )
    material_group_key = _build_adaptation_group_key(group_probe)
    grouped_siblings = _get_group_sibling_materials(
        db,
        teacher_user_id=teacher_user_id,
        adaptation_group_key=material_group_key,
    )

    existing_version = next(
        (
            sibling
            for sibling in grouped_siblings
            if sibling.adaptation_mode == payload.adaptation_mode
        ),
        None,
    )
    if existing_version is not None:
        existing_version.original_text = normalized_original_text
        existing_version.adapted_text = normalized_adapted_text
        existing_version.source_type = normalized_source_type
        existing_version.source_material_id = payload.source_material_id
        existing_version.source_filename = normalized_source_filename
        existing_version.adaptation_mode = payload.adaptation_mode
        existing_version.title = _get_group_title(grouped_siblings) or existing_version.title
        db.add(existing_version)
        db.commit()
        db.refresh(existing_version)
        return _to_learning_material_response(existing_version), "updated"

    group_title = _get_group_title(grouped_siblings)
    created_payload = TeacherLearningMaterialCreateRequest(
        title=group_title or normalized_title,
        original_text=normalized_original_text,
        adapted_text=normalized_adapted_text,
        source_type=normalized_source_type,
        source_material_id=payload.source_material_id,
        source_filename=normalized_source_filename,
        adaptation_mode=payload.adaptation_mode,
    )
    return (
        create_learning_material(
            db,
            teacher_user_id=teacher_user_id,
            payload=created_payload,
        ),
        "created",
    )


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

    if kind == "adapted":
        grouped_materials = _group_adapted_materials_by_key(materials)
        return TeacherLearningMaterialsListResponse(
            items=[
                _to_learning_material_response(
                    representative_material,
                    override_title=_get_group_title(group_materials),
                )
                for representative_material, _, group_materials in grouped_materials
            ]
        )

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

    group_title = _get_group_title(
        _get_group_sibling_materials(
            db,
            teacher_user_id=teacher_user_id,
            adaptation_group_key=adaptation_group_key,
        )
    )

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
        **response.model_dump(exclude={"title"}),
        title=group_title or response.title,
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
        assigned_title=material.title,
        assigned_text=material.adapted_text or material.original_text,
        assigned_adaptation_mode=material.adaptation_mode,
        assigned_is_adapted=material.adapted_text is not None,
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
