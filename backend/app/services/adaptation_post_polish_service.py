from __future__ import annotations

import re
from typing import Literal


AdaptationGenre = Literal[
    "educational",
    "scientific_popular",
    "fiction",
    "legal",
    "instruction",
    "other",
]

INTERNAL_SPAN_LABELS = (
    "legal_actor",
    "legal_modality",
    "legal_condition",
    "legal_procedure",
    "legal_deadline",
    "scientific_term",
    "causal_relation",
    "character",
    "narrative_action",
    "object_detail",
)


def post_polish_adaptation_output(
    *,
    adapted_text: str,
    product_mode: str,
    genre: AdaptationGenre,
) -> str:
    polished = (adapted_text or "").strip()
    if not polished:
        return polished

    polished = polished.replace("\r\n", "\n")
    polished = _sanitize_internal_validation_markers(polished)
    polished = re.sub(r"[ \t]{2,}", " ", polished)
    polished = re.sub(r"\n{3,}", "\n\n", polished)
    polished = _remove_duplicated_service_labels(polished)
    polished = _normalize_mixed_heading_markup(polished)

    if product_mode == "structured_explanation":
        polished = _normalize_structured_headings(polished, genre=genre)

    return polished.strip()


def _sanitize_internal_validation_markers(text: str) -> str:
    sanitized = re.sub(
        r"(?im)^\s*\[(?:critical|warning|info)/(?:exact|near_exact|semantic)\]\s*[a-z_]+:\s*",
        "",
        text,
    )
    sanitized = re.sub(
        rf"(?im)^\s*(?:{'|'.join(INTERNAL_SPAN_LABELS)}):\s*",
        "",
        sanitized,
    )
    sanitized = re.sub(
        rf"(?im)^\s*(?:{'|'.join(INTERNAL_SPAN_LABELS)})\s*$",
        "",
        sanitized,
    )
    sanitized = re.sub(
        r"(?im)^\s*protected spans extracted from source text\.?.*$",
        "",
        sanitized,
    )
    sanitized = re.sub(
        r"(?im)^\s*preserve these spans according to preservation mode\.?.*$",
        "",
        sanitized,
    )
    return sanitized


def _remove_duplicated_service_labels(text: str) -> str:
    return re.sub(
        r"(?im)^(Тип результата|Стратегия адаптации|Проверка фактов):\s*\1:\s*",
        r"\1: ",
        text,
    )


def _normalize_mixed_heading_markup(text: str) -> str:
    normalized = re.sub(
        r"(?im)^\s*\*+\s*#{1,6}\s*([^*\n]+?)\s*\*+\s*(.*)$",
        lambda match: f"### {match.group(1).strip()} {match.group(2).strip()}".rstrip(),
        text,
    )
    normalized = re.sub(
        r"(?im)^\s*#{1,6}\s*\*+\s*([^*\n]+?)\s*\*+\s*(.*)$",
        lambda match: f"### {match.group(1).strip()} {match.group(2).strip()}".rstrip(),
        normalized,
    )
    return normalized


def _normalize_structured_headings(text: str, *, genre: AdaptationGenre) -> str:
    heading_word = "Эпизод" if genre == "fiction" else "Шаг"
    normalized = text

    combined_pattern = re.compile(
        r"(?im)^#{0,3}\s*(?:Шаг|Эпизод)\s*(\d+)\.?\s*/\s*(?:Шаг|Эпизод)\s*(\d+)\.?\s*$"
    )

    def _split_combined_heading(match: re.Match[str]) -> str:
        first = match.group(1)
        second = match.group(2)
        return f"### {heading_word} {first}\n\n### {heading_word} {second}"

    normalized = combined_pattern.sub(_split_combined_heading, normalized)
    normalized = re.sub(
        r"(?im)^#{0,3}\s*шаг\s+(\d+)(?:\.\s*)?",
        lambda match: f"### {heading_word} {match.group(1)}. ",
        normalized,
    )
    normalized = re.sub(
        r"(?im)^#{0,3}\s*этап\s+(\d+)(?:\.\s*)?",
        lambda match: f"### {heading_word} {match.group(1)}. ",
        normalized,
    )
    normalized = re.sub(
        r"(?im)^#{0,3}\s*эпизод\s+(\d+)(?:\.\s*)?",
        lambda match: f"### {heading_word} {match.group(1)}. ",
        normalized,
    )
    normalized = re.sub(r"(?im)^###\s+(Шаг|Эпизод)\s+(\d+)\.\s*$", r"### \1 \2", normalized)
    return normalized
