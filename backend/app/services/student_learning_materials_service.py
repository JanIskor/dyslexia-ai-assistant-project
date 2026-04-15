from uuid import UUID

from sqlalchemy.orm import Session

from app.models.learning_material import LearningMaterial
from app.models.student_learning_material import StudentLearningMaterial
from app.schemas.student_learning_materials import (
    StudentLearningMaterialDetailResponse,
    StudentLearningMaterialListItem,
    StudentLearningMaterialsListResponse,
)


def list_student_learning_materials(
    db: Session,
    *,
    student_user_id: UUID,
) -> StudentLearningMaterialsListResponse:
    assignments = (
        db.query(StudentLearningMaterial, LearningMaterial)
        .join(
            LearningMaterial,
            LearningMaterial.id == StudentLearningMaterial.learning_material_id,
        )
        .filter(StudentLearningMaterial.student_user_id == student_user_id)
        .order_by(StudentLearningMaterial.created_at.desc())
        .all()
    )

    return StudentLearningMaterialsListResponse(
        items=[
            StudentLearningMaterialListItem(
                id=material.id,
                title=material.title,
                created_at=assignment.created_at,
            )
            for assignment, material in assignments
        ]
    )


def get_student_learning_material(
    db: Session,
    *,
    student_user_id: UUID,
    material_id: UUID,
) -> StudentLearningMaterialDetailResponse | None:
    assignment = (
        db.query(StudentLearningMaterial, LearningMaterial)
        .join(
            LearningMaterial,
            LearningMaterial.id == StudentLearningMaterial.learning_material_id,
        )
        .filter(
            StudentLearningMaterial.student_user_id == student_user_id,
            StudentLearningMaterial.learning_material_id == material_id,
        )
        .first()
    )

    if assignment is None:
        return None

    assigned_material, material = assignment
    return StudentLearningMaterialDetailResponse(
        id=material.id,
        title=material.title,
        original_text=material.original_text,
        created_at=assigned_material.created_at,
    )
