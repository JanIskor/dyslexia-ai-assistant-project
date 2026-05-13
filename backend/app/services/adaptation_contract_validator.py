from __future__ import annotations

import re
from typing import Literal, TypedDict

from app.services.adaptation_output_contracts import AdaptationOutputContract


ContractStatus = Literal["ok", "needs_review"]


class AdaptationContractValidationResult(TypedDict):
    contract_status: ContractStatus
    issues: list[str]
    summary: str


def validate_adaptation_output_contract(
    *,
    contract: AdaptationOutputContract,
    source_text: str,
    adapted_text: str,
) -> AdaptationContractValidationResult:
    issues: list[str] = []
    source_word_count = _count_words(source_text)
    adapted_word_count = _count_words(adapted_text)
    paragraphs = [segment.strip() for segment in re.split(r"\n\s*\n", adapted_text.strip()) if segment.strip()]
    bullet_lines = [
        line for line in adapted_text.splitlines()
        if re.match(r"^\s*(?:[-•*]|\d+[.)]|(?:шаг|этап)\s*\d+)\b", line.strip(), flags=re.IGNORECASE)
    ]

    if contract["contract_id"] == "key_points_focus":
        if not bullet_lines and not re.search(r"\b(главное|важно|запомнить)\b", adapted_text, flags=re.IGNORECASE):
            issues.append("Результат для key_points_focus должен иметь bullets или короткие блоки главных мыслей.")
        if source_word_count > 0 and adapted_word_count >= source_word_count * 0.9:
            issues.append("Результат для key_points_focus слишком близок по объёму к исходнику и похож на полный пересказ.")
        if len(paragraphs) >= 3 and not bullet_lines:
            issues.append("Результат для key_points_focus выглядит как полный пересказ вместо краткого выделения главного.")

    elif contract["contract_id"] == "structured_explanation":
        if not bullet_lines and not re.search(r"\b(шаг|этап)\s*\d+\b", adapted_text, flags=re.IGNORECASE):
            issues.append("Результат для structured_explanation должен содержать шаги, этапы или явную последовательность.")
        long_paragraphs = [paragraph for paragraph in paragraphs if _count_words(paragraph) >= 60]
        if long_paragraphs:
            issues.append("Результат для structured_explanation содержит слишком длинные неструктурированные абзацы.")

    else:
        if bullet_lines and len(paragraphs) <= 1:
            issues.append("Результат для basic_simplify не должен состоять только из списка без связного адаптированного текста.")
        if source_word_count > 0 and adapted_word_count <= source_word_count * 0.25:
            issues.append("Результат для basic_simplify выглядит чрезмерно сокращённым.")

    status: ContractStatus = "needs_review" if issues else "ok"
    summary = (
        "Формат результата соответствует выбранному product mode."
        if not issues
        else "Формат результата требует проверки преподавателем."
    )
    return {
        "contract_status": status,
        "issues": issues,
        "summary": summary,
    }


def _count_words(text: str) -> int:
    return len(re.findall(r"[A-Za-zА-Яа-яЁё0-9-]+", text or ""))
