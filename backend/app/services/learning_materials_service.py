from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.learning_material import LearningMaterial
from app.models.student_learning_material import StudentLearningMaterial
from app.models.teacher_student import TeacherStudent
from app.schemas.learning_materials import (
    LearningMaterialResponse,
    TeacherLearningMaterialAssignmentResponse,
    TeacherLearningMaterialAssignRequest,
    TeacherLearningMaterialCreateRequest,
    TeacherLearningMaterialsListResponse,
)
from app.services.notifications_service import create_notification


def _to_learning_material_response(material: LearningMaterial) -> LearningMaterialResponse:
    return LearningMaterialResponse(
        id=material.id,
        title=material.title,
        original_text=material.original_text,
        material_type=material.material_type,
        status=material.status,
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
        material_type="text",
        status="draft",
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return _to_learning_material_response(material)


def list_teacher_learning_materials(
    db: Session,
    *,
    teacher_user_id: UUID,
) -> TeacherLearningMaterialsListResponse:
    materials = (
        db.query(LearningMaterial)
        .filter(LearningMaterial.teacher_user_id == teacher_user_id)
        .order_by(LearningMaterial.created_at.desc())
        .all()
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
