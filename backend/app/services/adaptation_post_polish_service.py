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
    polished = re.sub(r"[ \t]{2,}", " ", polished)
    polished = re.sub(r"\n{3,}", "\n\n", polished)
    polished = _remove_duplicated_service_labels(polished)

    if product_mode == "structured_explanation":
        polished = _normalize_structured_headings(polished, genre=genre)

    return polished.strip()


def _remove_duplicated_service_labels(text: str) -> str:
    return re.sub(
        r"(?im)^(Тип результата|Стратегия адаптации|Проверка фактов):\s*\1:\s*",
        r"\1: ",
        text,
    )


def _normalize_structured_headings(text: str, *, genre: AdaptationGenre) -> str:
    heading_word = "Эпизод" if genre == "fiction" else "Шаг"
    normalized = text

    combined_pattern = re.compile(
        r"(?im)^#{0,3}\s*(?:Шаг|Эпизод)\s*(\d+)\s*/\s*(?:Шаг|Эпизод)\s*(\d+)\s*$"
    )

    def _split_combined_heading(match: re.Match[str]) -> str:
        first = match.group(1)
        second = match.group(2)
        return f"### {heading_word} {first}\n\n### {heading_word} {second}"

    normalized = combined_pattern.sub(_split_combined_heading, normalized)
    normalized = re.sub(
        r"(?im)^#{0,3}\s*шаг\s+(\d+)\b",
        lambda match: f"### {heading_word} {match.group(1)}",
        normalized,
    )
    normalized = re.sub(
        r"(?im)^#{0,3}\s*этап\s+(\d+)\b",
        lambda match: f"### {heading_word} {match.group(1)}",
        normalized,
    )
    normalized = re.sub(
        r"(?im)^#{0,3}\s*эпизод\s+(\d+)\b",
        lambda match: f"### {heading_word} {match.group(1)}",
        normalized,
    )
    return normalized
