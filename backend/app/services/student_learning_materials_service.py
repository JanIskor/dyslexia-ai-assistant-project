from uuid import UUID

from sqlalchemy.orm import Session

from app.models.learning_material import LearningMaterial
from app.models.student_learning_material import StudentLearningMaterial
from app.schemas.student_learning_materials import (
    StudentLearningMaterialDetailResponse,
    StudentLearningMaterialListItem,
    StudentLearningMaterialsListResponse,
)


def _build_student_preview_text(text: str, *, limit: int = 180) -> str:
    normalized_text = " ".join(text.split())
    if len(normalized_text) <= limit:
        return normalized_text
    return f"{normalized_text[: limit - 1].rstrip()}…"


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
                title=assignment.assigned_title or material.title,
                preview_text=_build_student_preview_text(
                    assignment.assigned_text or material.adapted_text or material.original_text
                ),
                is_adapted=(
                    assignment.assigned_is_adapted
                    if assignment.assigned_is_adapted is not None
                    else material.adapted_text is not None
                ),
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
    student_visible_text = assigned_material.assigned_text or material.adapted_text or material.original_text

    return StudentLearningMaterialDetailResponse(
        id=material.id,
        title=assigned_material.assigned_title or material.title,
        original_text=student_visible_text,
        is_adapted=(
            assigned_material.assigned_is_adapted
            if assigned_material.assigned_is_adapted is not None
            else material.adapted_text is not None
        ),
        created_at=assigned_material.created_at,
    )
