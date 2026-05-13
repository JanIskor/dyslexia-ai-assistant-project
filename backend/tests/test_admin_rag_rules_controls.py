import unittest
import uuid
from collections.abc import Iterator
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.dependencies import get_db
from app.main import app
from app.models.knowledge_document import KnowledgeDocument
from app.models.knowledge_document_chunk import KnowledgeDocumentChunk
from app.models.user import User
from app.services.auth_service import get_password_hash
from app.services.retrieval_service import retrieve_relevant_chunks


EMBEDDING_A = [1.0] + [0.0] * 383
EMBEDDING_B = [0.0, 1.0] + [0.0] * 382


class AdminRagRulesControlsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        User.__table__.create(bind=cls.engine, checkfirst=True)
        KnowledgeDocument.__table__.create(bind=cls.engine, checkfirst=True)
        KnowledgeDocumentChunk.__table__.create(bind=cls.engine, checkfirst=True)

        cls.original_startup = list(app.router.on_startup)
        app.router.on_startup = []

        def override_get_db() -> Iterator[Session]:
            db = cls.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        app.dependency_overrides.clear()
        app.router.on_startup = cls.original_startup
        cls.client.close()
        cls.engine.dispose()

    def setUp(self) -> None:
        with self.SessionLocal() as db:
            db.query(KnowledgeDocumentChunk).delete()
            db.query(KnowledgeDocument).delete()
            db.query(User).delete()
            db.commit()

            self.admin_id = uuid.uuid4()
            self.teacher_id = uuid.uuid4()
            db.add_all(
                [
                    User(
                        id=self.admin_id,
                        email="admin.rag@example.com",
                        password_hash=get_password_hash("AdminRag123!"),
                        role="admin",
                        is_active=True,
                    ),
                    User(
                        id=self.teacher_id,
                        email="teacher.rag@example.com",
                        password_hash=get_password_hash("TeacherRag123!"),
                        role="teacher",
                        is_active=True,
                    ),
                ]
            )

            self.general_document_id = uuid.uuid4()
            self.mode_specific_document_id = uuid.uuid4()
            self.legal_mode_b_document_id = uuid.uuid4()
            self.disabled_document_id = uuid.uuid4()
            self.deleted_document_id = uuid.uuid4()

            db.add_all(
                [
                    KnowledgeDocument(
                        id=self.general_document_id,
                        title="Общие рекомендации",
                        original_filename="general.md",
                        mime_type="text/markdown",
                        file_size=100,
                        storage_object_key="knowledge-base/general.md",
                        uploaded_by_user_id=self.admin_id,
                        status="embedded",
                        use_in_rag=True,
                        adaptation_modes=[],
                        extracted_text="Общий методический документ.",
                    ),
                    KnowledgeDocument(
                        id=self.mode_specific_document_id,
                        title="Mode A рекомендации",
                        original_filename="mode-a.md",
                        mime_type="text/markdown",
                        file_size=100,
                        storage_object_key="knowledge-base/structured.md",
                        uploaded_by_user_id=self.admin_id,
                        status="embedded",
                        use_in_rag=True,
                        adaptation_modes=["mode_a"],
                        extracted_text="Правила для сильного упрощения.",
                    ),
                    KnowledgeDocument(
                        id=self.legal_mode_b_document_id,
                        title="Юридическая бережная адаптация",
                        original_filename="legal-mode-b.md",
                        mime_type="text/markdown",
                        file_size=100,
                        storage_object_key="knowledge-base/legal-mode-b.md",
                        uploaded_by_user_id=self.admin_id,
                        status="embedded",
                        use_in_rag=True,
                        adaptation_modes=["mode_b", "legal"],
                        extracted_text="Правила для юридических текстов в строгом режиме.",
                    ),
                    KnowledgeDocument(
                        id=self.disabled_document_id,
                        title="Выключенный документ",
                        original_filename="disabled.md",
                        mime_type="text/markdown",
                        file_size=100,
                        storage_object_key="knowledge-base/disabled.md",
                        uploaded_by_user_id=self.admin_id,
                        status="embedded",
                        use_in_rag=False,
                        adaptation_modes=[],
                        extracted_text="Не должен попадать в retrieval.",
                    ),
                    KnowledgeDocument(
                        id=self.deleted_document_id,
                        title="Удаляемый документ",
                        original_filename="deleted.md",
                        mime_type="text/markdown",
                        file_size=100,
                        storage_object_key="knowledge-base/deleted.md",
                        uploaded_by_user_id=self.admin_id,
                        status="embedded",
                        use_in_rag=True,
                        adaptation_modes=[],
                        extracted_text="Будет удалён.",
                    ),
                ]
            )
            db.flush()

            db.add_all(
                [
                    KnowledgeDocumentChunk(
                        id=uuid.uuid4(),
                        document_id=self.general_document_id,
                        chunk_index=0,
                        content="Общий chunk для всех режимов.",
                        char_count=28,
                        embedding=EMBEDDING_A,
                    ),
                    KnowledgeDocumentChunk(
                        id=uuid.uuid4(),
                        document_id=self.mode_specific_document_id,
                        chunk_index=0,
                        content="Chunk только для mode A.",
                        char_count=24,
                        embedding=EMBEDDING_A,
                    ),
                    KnowledgeDocumentChunk(
                        id=uuid.uuid4(),
                        document_id=self.legal_mode_b_document_id,
                        chunk_index=0,
                        content="Chunk для legal + mode B.",
                        char_count=26,
                        embedding=EMBEDDING_A,
                    ),
                    KnowledgeDocumentChunk(
                        id=uuid.uuid4(),
                        document_id=self.disabled_document_id,
                        chunk_index=0,
                        content="Выключенный chunk.",
                        char_count=18,
                        embedding=EMBEDDING_A,
                    ),
                    KnowledgeDocumentChunk(
                        id=uuid.uuid4(),
                        document_id=self.deleted_document_id,
                        chunk_index=0,
                        content="Удаляемый chunk.",
                        char_count=16,
                        embedding=EMBEDDING_B,
                    ),
                ]
            )
            db.commit()

    def _login_admin(self) -> str:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "admin.rag@example.com", "password": "AdminRag123!"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def _login_teacher(self) -> str:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "teacher.rag@example.com", "password": "TeacherRag123!"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def test_admin_can_update_document_controls(self) -> None:
        token = self._login_admin()
        response = self.client.patch(
            f"/api/v1/admin/knowledge-base/documents/{self.general_document_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"use_in_rag": False, "adaptation_modes": ["mode_b", "legal"]},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertFalse(payload["use_in_rag"])
        self.assertEqual(payload["adaptation_modes"], ["mode_b", "legal"])
        self.assertEqual(payload["status"], "embedded")
        self.assertEqual(payload["chunks_count"], 1)
        self.assertEqual(payload["embedded_chunks_count"], 1)

    def test_use_in_rag_false_document_does_not_participate_in_retrieval(self) -> None:
        with self.SessionLocal() as db:
            with patch("app.services.retrieval_service.embed_query", return_value=EMBEDDING_A):
                items = retrieve_relevant_chunks(
                    db,
                    query_text="любой запрос",
                    top_k=10,
                    selected_mode="mode_a",
                )

        self.assertNotIn("Выключенный документ", [item.document_title for item in items])

    def test_general_document_with_empty_adaptation_modes_participates_for_any_mode(self) -> None:
        with self.SessionLocal() as db:
            with patch("app.services.retrieval_service.embed_query", return_value=EMBEDDING_A):
                basic_items = retrieve_relevant_chunks(
                    db,
                    query_text="любой запрос",
                    top_k=10,
                    selected_mode="mode_a",
                )
                structured_items = retrieve_relevant_chunks(
                    db,
                    query_text="любой запрос",
                    top_k=10,
                    selected_mode="mode_b",
                )

        self.assertIn("Общие рекомендации", [item.document_title for item in basic_items])
        self.assertIn("Общие рекомендации", [item.document_title for item in structured_items])

    def test_mode_specific_document_participates_for_matching_mode(self) -> None:
        with self.SessionLocal() as db:
            with patch("app.services.retrieval_service.embed_query", return_value=EMBEDDING_A):
                items = retrieve_relevant_chunks(
                    db,
                    query_text="любой запрос",
                    top_k=10,
                    selected_mode="mode_a",
                )

        self.assertIn("Mode A рекомендации", [item.document_title for item in items])

    def test_mode_specific_document_does_not_participate_for_other_mode(self) -> None:
        with self.SessionLocal() as db:
            with patch("app.services.retrieval_service.embed_query", return_value=EMBEDDING_A):
                items = retrieve_relevant_chunks(
                    db,
                    query_text="любой запрос",
                    top_k=10,
                    selected_mode="mode_b",
                )

        self.assertNotIn("Mode A рекомендации", [item.document_title for item in items])

    def test_genre_specific_document_participates_only_for_matching_genre_and_mode(self) -> None:
        with self.SessionLocal() as db:
            with patch("app.services.retrieval_service.embed_query", return_value=EMBEDDING_A):
                matching_items = retrieve_relevant_chunks(
                    db,
                    query_text="любой запрос",
                    top_k=10,
                    selected_mode="mode_b",
                    selected_genre="legal",
                )
                non_matching_items = retrieve_relevant_chunks(
                    db,
                    query_text="любой запрос",
                    top_k=10,
                    selected_mode="mode_a",
                    selected_genre="legal",
                )

        self.assertIn(
            "Юридическая бережная адаптация",
            [item.document_title for item in matching_items],
        )
        self.assertNotIn(
            "Юридическая бережная адаптация",
            [item.document_title for item in non_matching_items],
        )

    def test_teacher_assistant_endpoint_no_longer_returns_500(self) -> None:
        token = self._login_teacher()
        with patch("app.services.retrieval_service.embed_query", return_value=EMBEDDING_A):
            with patch(
                "app.services.teacher_ai_assistant_service.get_llm_service",
                return_value=SimpleNamespace(
                    adapt_plain_text=lambda request: SimpleNamespace(
                        adapted_text=f"ok:{request.mode}"
                    )
                ),
            ):
                response = self.client.post(
                    "/api/v1/teacher/ai-assistant/messages",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "message": "Проверь адаптацию",
                        "mode": "mode_b",
                        "genre": "legal",
                    },
                )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["reply"], "ok:mode_b")
        self.assertIn(
            "Юридическая бережная адаптация",
            [item["document_title"] for item in payload["used_knowledge_chunks"]],
        )

    def test_delete_removes_document_chunks_and_retrieval_visibility(self) -> None:
        token = self._login_admin()
        with patch("app.services.knowledge_base_service.delete_object") as delete_object_mock:
            delete_object_mock.return_value = None
            response = self.client.delete(
                f"/api/v1/admin/knowledge-base/documents/{self.deleted_document_id}",
                headers={"Authorization": f"Bearer {token}"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["id"], str(self.deleted_document_id))
        self.assertTrue(payload["deleted"])
        self.assertIsNone(payload["storage_cleanup_warning"])

        with self.SessionLocal() as db:
            self.assertIsNone(
                db.query(KnowledgeDocument)
                .filter(KnowledgeDocument.id == self.deleted_document_id)
                .first()
            )
            self.assertEqual(
                db.query(KnowledgeDocumentChunk)
                .filter(KnowledgeDocumentChunk.document_id == self.deleted_document_id)
                .count(),
                0,
            )

            with patch("app.services.retrieval_service.embed_query", return_value=EMBEDDING_B):
                items = retrieve_relevant_chunks(
                    db,
                    query_text="любой запрос",
                    top_k=10,
                    selected_mode="mode_a",
                )

        self.assertNotIn("Удаляемый документ", [item.document_title for item in items])

    def test_delete_still_succeeds_when_storage_cleanup_fails(self) -> None:
        token = self._login_admin()
        with patch("app.services.knowledge_base_service.delete_object", side_effect=RuntimeError("storage down")):
            response = self.client.delete(
                f"/api/v1/admin/knowledge-base/documents/{self.general_document_id}",
                headers={"Authorization": f"Bearer {token}"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn("storage", response.json()["storage_cleanup_warning"])


if __name__ == "__main__":
    unittest.main()
