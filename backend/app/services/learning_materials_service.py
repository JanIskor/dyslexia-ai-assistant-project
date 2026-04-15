from uuid import UUID

from sqlalchemy.orm import Session

from app.models.learning_material import LearningMaterial
from app.schemas.learning_materials import (
    LearningMaterialResponse,
    TeacherLearningMaterialCreateRequest,
    TeacherLearningMaterialsListResponse,
)


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
