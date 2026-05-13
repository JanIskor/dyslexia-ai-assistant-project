from __future__ import annotations

import io
import sys
from pathlib import Path

from starlette.datastructures import Headers, UploadFile


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.models.knowledge_document import KnowledgeDocument
from app.models.user import User
from app.schemas.knowledge_documents import KnowledgeDocumentControlsUpdateRequest
from app.services.auth_service import normalize_email
from app.services.knowledge_base_service import (
    delete_knowledge_document,
    update_knowledge_document_controls,
    upload_knowledge_document,
)


SOURCE_DIR = REPO_ROOT / "docs" / "rag_methodology"
DEFAULT_ADMIN_EMAIL = "admin.seed@example.com"

DOCUMENT_CONTROL_MAP: dict[str, dict[str, object]] = {
    "01_general_principles.md": {
        "use_in_rag": True,
        "adaptation_modes": [],
    },
    "02_lexical_rules.md": {
        "use_in_rag": True,
        "adaptation_modes": [],
    },
    "03_syntactic_rules.md": {
        "use_in_rag": True,
        "adaptation_modes": ["basic_simplify", "structured_explanation"],
    },
    "04_visual_markup_rules.md": {
        "use_in_rag": True,
        "adaptation_modes": [],
    },
    "05_genre_modes_a_b.md": {
        "use_in_rag": True,
        "adaptation_modes": ["basic_simplify", "structured_explanation", "key_points_focus"],
    },
}


def build_upload_file(path: Path) -> UploadFile:
    payload = path.read_bytes()
    return UploadFile(
        file=io.BytesIO(payload),
        filename=path.name,
        headers=Headers({"content-type": "text/markdown; charset=utf-8"}),
    )


def seed_methodology_documents(admin_email: str = DEFAULT_ADMIN_EMAIL) -> None:
    if not SOURCE_DIR.exists():
        raise FileNotFoundError(f"Methodology directory not found: {SOURCE_DIR}")

    db = SessionLocal()
    try:
        normalized_email = normalize_email(admin_email)
        admin_user = db.query(User).filter(User.email == normalized_email, User.role == "admin").first()
        if admin_user is None:
            raise RuntimeError(
                "Admin user not found. "
                "Create one first with backend/scripts/create_admin_user.py or use an existing admin email."
            )

        for filename, controls in DOCUMENT_CONTROL_MAP.items():
            path = SOURCE_DIR / filename
            if not path.exists():
                raise FileNotFoundError(f"Methodology file not found: {path}")

            existing_documents = (
                db.query(KnowledgeDocument)
                .filter(KnowledgeDocument.original_filename == filename)
                .all()
            )
            for existing_document in existing_documents:
                delete_knowledge_document(db, document_id=existing_document.id)

            uploaded = upload_knowledge_document(
                db,
                uploaded_by_user_id=admin_user.id,
                file=build_upload_file(path),
            )
            updated = update_knowledge_document_controls(
                db,
                document_id=uploaded.id,
                payload=KnowledgeDocumentControlsUpdateRequest(
                    use_in_rag=bool(controls["use_in_rag"]),
                    adaptation_modes=list(controls["adaptation_modes"]),
                ),
            )
            if updated is None:
                raise RuntimeError(f"Failed to update controls for {filename}")

            print(
                f"Seeded {filename}: "
                f"status={updated.status}, "
                f"use_in_rag={updated.use_in_rag}, "
                f"adaptation_modes={updated.adaptation_modes}, "
                f"chunks={updated.chunks_count}, "
                f"embedded={updated.embedded_chunks_count}"
            )
    finally:
        db.close()


def main() -> None:
    admin_email = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_ADMIN_EMAIL
    seed_methodology_documents(admin_email=admin_email)


if __name__ == "__main__":
    main()
