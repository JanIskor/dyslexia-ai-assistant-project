import unittest
import uuid

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.learning_material import LearningMaterial
from app.models.user import User
from app.services.adaptation_rationale_service import build_adaptation_rationale
from app.services.auth_service import get_password_hash
from app.services.learning_materials_service import (
    get_teacher_learning_material_compare_ready_detail,
    save_or_update_adapted_learning_material,
)
from app.schemas.learning_materials import TeacherLearningMaterialCreateRequest


class AdaptationRationaleServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        User.__table__.create(bind=cls.engine, checkfirst=True)
        LearningMaterial.__table__.create(bind=cls.engine, checkfirst=True)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.engine.dispose()

    def setUp(self) -> None:
        with self.SessionLocal() as db:
            db.query(LearningMaterial).delete()
            db.query(User).delete()
            self.teacher_id = uuid.uuid4()
            db.add(
                User(
                    id=self.teacher_id,
                    email="teacher.rationale@example.com",
                    password_hash=get_password_hash("TeacherRationale123!"),
                    role="teacher",
                    is_active=True,
                )
            )
            db.commit()

    def test_mode_b_rationale_prioritizes_semantic_preservation(self) -> None:
        rationale = build_adaptation_rationale(
            source_text="Юридический текст с длинным предложением и точными формулировками.",
            adapted_text="Юридический текст с точными формулировками.\n\nУсловия сохранены.",
            mode="mode_b",
            genre="legal",
        )

        self.assertEqual(rationale["adaptation_intensity"], "medium")
        self.assertIn("Сохранена терминология.", rationale["semantic_preservation_notes"])
        self.assertIn("visual segmentation", rationale["methodology_references"])
        self.assertNotIn(
            "Для выбранного жанра сильное упрощение может изменить исходный смысл или стиль текста.",
            rationale["warnings"],
        )

    def test_save_persists_rationale_for_adapted_material_history(self) -> None:
        with self.SessionLocal() as db:
            response, save_type = save_or_update_adapted_learning_material(
                db,
                teacher_user_id=self.teacher_id,
                payload=TeacherLearningMaterialCreateRequest(
                    title="Материал с rationale",
                    original_text="Очень длинное предложение, которое трудно читать без пауз и смысловых остановок.",
                    adapted_text="Очень длинное предложение разделено.\n\nСмысл сохранён в коротких блоках.",
                    source_type="manual",
                    adaptation_mode="mode_a",
                    adaptation_genre="educational",
                    adaptation_rationale=build_adaptation_rationale(
                        source_text="Очень длинное предложение, которое трудно читать без пауз и смысловых остановок.",
                        adapted_text="Очень длинное предложение разделено.\n\nСмысл сохранён в коротких блоках.",
                        mode="mode_a",
                        genre="educational",
                    ),
                ),
            )

            self.assertEqual(save_type, "created")
            self.assertEqual(response.adaptation_genre, "educational")
            self.assertIsNotNone(response.adaptation_rationale)
            self.assertIn(
                "Длинные предложения разделены.",
                response.adaptation_rationale.applied_transformations,
            )

    def test_legacy_adapted_material_gets_fallback_rationale_in_detail(self) -> None:
        with self.SessionLocal() as db:
            material = LearningMaterial(
                id=uuid.uuid4(),
                teacher_user_id=self.teacher_id,
                title="Старая версия",
                original_text="Сложный исходный текст с одной длинной фразой и высокой плотностью информации.",
                adapted_text="Сложный исходный текст.\n\nИнформация распределена по коротким блокам.",
                material_type="text",
                status="draft",
                source_type="manual",
                adaptation_mode="basic_simplify",
                adaptation_genre=None,
                adaptation_rationale=None,
            )
            db.add(material)
            db.commit()

            detail = get_teacher_learning_material_compare_ready_detail(
                db,
                teacher_user_id=self.teacher_id,
                material_id=material.id,
            )

            self.assertIsNotNone(detail)
            assert detail is not None
            self.assertIsNotNone(detail.adaptation_rationale)
            self.assertTrue(detail.adaptation_rationale.is_fallback)
            self.assertEqual(
                detail.adaptation_rationale.adaptation_strategy,
                "Адаптация выполнена по сохранённой версии материала.",
            )


if __name__ == "__main__":
    unittest.main()
