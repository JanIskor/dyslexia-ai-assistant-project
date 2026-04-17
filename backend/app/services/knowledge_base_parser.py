from __future__ import annotations

from io import BytesIO
from pathlib import Path

from docx import Document
from fastapi import HTTPException, status
from pypdf import PdfReader


SUPPORTED_KNOWLEDGE_FILE_TYPES: dict[str, set[str]] = {
    "application/pdf": {".pdf"},
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {".docx"},
    "text/plain": {".txt", ".md"},
    "text/markdown": {".md"},
    "application/octet-stream": {".pdf", ".docx", ".txt", ".md"},
}
SUPPORTED_KNOWLEDGE_EXTENSIONS: set[str] = {".pdf", ".docx", ".txt", ".md"}


def validate_knowledge_file_type(filename: str, mime_type: str | None) -> tuple[str, str]:
    extension = Path(filename).suffix.lower()
    normalized_mime_type = (mime_type or "").lower().strip() or "application/octet-stream"

    if extension not in SUPPORTED_KNOWLEDGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Allowed formats: pdf, docx, txt, md.",
        )

    allowed_extensions = SUPPORTED_KNOWLEDGE_FILE_TYPES.get(normalized_mime_type)
    if allowed_extensions is None or extension not in allowed_extensions:
        if normalized_mime_type != "application/octet-stream":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type. Allowed formats: pdf, docx, txt, md.",
            )

    return extension, normalized_mime_type


def extract_text_from_knowledge_file(*, filename: str, mime_type: str | None, payload: bytes) -> str:
    extension, _ = validate_knowledge_file_type(filename, mime_type)

    try:
        if extension == ".pdf":
            extracted_text = _extract_text_from_pdf(payload)
        elif extension == ".docx":
            extracted_text = _extract_text_from_docx(payload)
        else:
            extracted_text = _extract_text_from_text(payload)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parsing failed for the uploaded document.",
        ) from error

    normalized_text = "\n".join(line.rstrip() for line in extracted_text.splitlines()).strip()
    if not normalized_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty extracted text. The document does not contain readable text.",
        )

    return normalized_text


def _extract_text_from_pdf(payload: bytes) -> str:
    reader = PdfReader(BytesIO(payload))
    chunks: list[str] = []

    for page in reader.pages:
        page_text = (page.extract_text() or "").strip()
        if page_text:
            chunks.append(page_text)

    return "\n\n".join(chunks)


def _extract_text_from_docx(payload: bytes) -> str:
    document = Document(BytesIO(payload))
    paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
    return "\n".join(paragraphs)


def _extract_text_from_text(payload: bytes) -> str:
    return payload.decode("utf-8")
