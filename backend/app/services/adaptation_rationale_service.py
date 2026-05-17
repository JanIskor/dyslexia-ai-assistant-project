from __future__ import annotations

import re
from typing import Literal

from app.services.adaptation_prompt_builder import AdaptationGenre, AdaptationMode, normalize_adaptation_mode
from app.services.adaptation_contract_validator import AdaptationContractValidationResult
from app.services.adaptation_output_contracts import AdaptationOutputContract
from app.services.controlled_adaptation_policy_service import ControlledAdaptationPolicy
from app.services.factual_consistency_service import FactualConsistencyReport, get_factual_report_summary_message


AdaptationIntensity = Literal["low", "medium", "high"]

DEFAULT_FALLBACK_STRATEGY = "Адаптация выполнена по сохранённой версии материала."


def build_adaptation_rationale(
    *,
    source_text: str,
    adapted_text: str,
    mode: AdaptationMode | None,
    genre: AdaptationGenre | None,
    controlled_adaptation_policy: ControlledAdaptationPolicy | None = None,
    output_contract: AdaptationOutputContract | None = None,
    contract_validation: AdaptationContractValidationResult | None = None,
    factual_consistency_report: FactualConsistencyReport | None = None,
    is_fallback: bool = False,
) -> dict[str, object]:
    normalized_mode = normalize_adaptation_mode(mode or "basic_simplify", genre)
    effective_genre = genre

    source_metrics = _collect_text_metrics(source_text)
    adapted_metrics = _collect_text_metrics(adapted_text)

    sentence_split_applied = (
        adapted_metrics["sentence_count"] >= source_metrics["sentence_count"] + 1
        or adapted_metrics["avg_sentence_words"] + 3 <= source_metrics["avg_sentence_words"]
    )
    visual_segmentation_applied = (
        adapted_metrics["paragraph_count"] > source_metrics["paragraph_count"]
        or adapted_metrics["bullet_count"] > source_metrics["bullet_count"]
    )
    lexical_simplification_applied = normalized_mode == "mode_a" and (
        adapted_metrics["avg_word_length"] + 0.25 < source_metrics["avg_word_length"]
        or adapted_metrics["avg_sentence_words"] + 4 < source_metrics["avg_sentence_words"]
        or adapted_metrics["word_count"] < source_metrics["word_count"] * 0.9
    )

    applied_transformations: list[str] = []
    if sentence_split_applied:
        applied_transformations.append("Длинные предложения разделены.")
    if lexical_simplification_applied:
        applied_transformations.append("Сложная лексика упрощена.")
    if visual_segmentation_applied:
        applied_transformations.append("Текст разделён на короткие блоки.")
        applied_transformations.append("Применена визуальная сегментация.")
    if normalized_mode == "mode_b":
        applied_transformations.append("Сохранены ключевые термины.")
        if not visual_segmentation_applied:
            applied_transformations.append("Поддержка читаемости выполнена через аккуратную структуру текста.")

    methodology_references: list[str] = []
    if lexical_simplification_applied or normalized_mode == "mode_a":
        methodology_references.append("lexical adaptation")
    if sentence_split_applied or normalized_mode in {"mode_a", "mode_b"}:
        methodology_references.append("syntax adaptation")
    if visual_segmentation_applied or normalized_mode == "mode_b":
        methodology_references.append("visual segmentation")
    if effective_genre in {"scientific_popular", "fiction", "legal", "instruction"}:
        methodology_references.append("genre restrictions")

    semantic_preservation_notes: list[str] = []
    if normalized_mode == "mode_b":
        semantic_preservation_notes.extend(
            [
                "Сохранена терминология.",
                "Минимизировано переписывание.",
                "Сохранён исходный стиль.",
            ]
        )
    else:
        semantic_preservation_notes.append("Сохранён предметный смысл при более доступной подаче.")
        if effective_genre in {"scientific_popular", "legal", "instruction"}:
            semantic_preservation_notes.append("Ключевые факты и операционные элементы оставлены без смысловой подмены.")
    if controlled_adaptation_policy is not None:
        semantic_preservation_notes.extend(
            [
                "Защищённые элементы были извлечены до генерации.",
                "Защищённые фрагменты были выделены до генерации.",
                "Применены жанровые правила сохранения смысла и формулировок.",
                "Разрешены только контролируемые операции адаптации.",
                "Добавление внешних фактов, примеров, причин, терминов, объяснений и выводов было запрещено.",
                "Формат результата был аккуратно отполирован без смыслового переписывания.",
                "После генерации выполнена проверка фактической согласованности.",
            ]
        )
    if output_contract is not None:
        semantic_preservation_notes.append("Применён контракт формата результата для выбранного метода адаптации.")
        if output_contract.get("golden_template_title"):
            semantic_preservation_notes.append("Для этого жанра был применён эталонный шаблон структуры результата.")
    if contract_validation is not None:
        semantic_preservation_notes.append(
            "Формат результата подтверждён."
            if contract_validation["contract_status"] == "ok"
            else "Формат результата требует дополнительной проверки преподавателем."
        )
    protected_span_report = (
        factual_consistency_report.get("protected_span_report")
        if factual_consistency_report is not None and isinstance(factual_consistency_report, dict)
        else None
    )
    if protected_span_report is not None:
        semantic_preservation_notes.append("После генерации выполнена проверка защищённых фрагментов.")
        if protected_span_report.get("status") == "critical":
            semantic_preservation_notes.append("Обнаружены критические искажения защищённых фрагментов.")
        elif protected_span_report.get("status") == "warning":
            semantic_preservation_notes.append("Защищённые фрагменты требуют проверки преподавателем.")
    if factual_consistency_report is not None and factual_consistency_report.get("repair_attempted"):
        semantic_preservation_notes.append("После генерации был выполнен автоматический repair-pass.")
    semantic_preservation_notes.append(get_factual_report_summary_message(factual_consistency_report))

    warnings: list[str] = []
    if normalized_mode == "mode_a" and effective_genre in {"fiction", "legal"}:
        warnings.append(
            "Для выбранного жанра сильное упрощение может изменить исходный смысл или стиль текста."
        )
    if protected_span_report is not None and protected_span_report.get("status") == "critical":
        warnings.append("Даже после автоматической проверки защищённые фрагменты требуют ручной верификации.")

    intensity = _calculate_intensity(
        normalized_mode=normalized_mode,
        lexical_simplification_applied=lexical_simplification_applied,
        sentence_split_applied=sentence_split_applied,
        visual_segmentation_applied=visual_segmentation_applied,
        source_word_count=source_metrics["word_count"],
        adapted_word_count=adapted_metrics["word_count"],
    )

    return {
        "mode": mode,
        "genre": effective_genre,
        "adaptation_strategy": _get_adaptation_strategy_label(normalized_mode, is_fallback=is_fallback),
        "applied_transformations": applied_transformations
        or ["Адаптация выполнена без агрессивного переписывания."],
        "semantic_preservation_notes": semantic_preservation_notes,
        "methodology_references": methodology_references or ["syntax adaptation"],
        "adaptation_intensity": intensity,
        "warnings": warnings,
        "output_contract_title": output_contract["title"] if output_contract is not None else None,
        "output_contract_status": contract_validation["contract_status"] if contract_validation is not None else None,
        "output_contract_summary": contract_validation["summary"] if contract_validation is not None else None,
        "is_fallback": is_fallback,
    }


def _get_adaptation_strategy_label(mode: Literal["mode_a", "mode_b"], *, is_fallback: bool) -> str:
    if is_fallback:
        return DEFAULT_FALLBACK_STRATEGY

    if mode == "mode_b":
        return "Минимальное вмешательство с приоритетом сохранения смысла и терминологии."

    return "Упрощение и перестройка текста с опорой на читаемость."


def _collect_text_metrics(text: str) -> dict[str, float]:
    normalized_text = (text or "").strip()
    words = re.findall(r"[A-Za-zА-Яа-яЁё0-9-]+", normalized_text)
    sentence_candidates = [segment.strip() for segment in re.split(r"[.!?…]+", normalized_text) if segment.strip()]
    paragraphs = [segment.strip() for segment in re.split(r"\n\s*\n", normalized_text) if segment.strip()]
    bullet_count = sum(
        1
        for line in normalized_text.splitlines()
        if re.match(r"^\s*(?:[-•*]|\d+[.)])\s+", line)
    )

    word_count = len(words)
    sentence_count = max(1, len(sentence_candidates)) if normalized_text else 0
    paragraph_count = max(1, len(paragraphs)) if normalized_text else 0
    avg_word_length = (
        sum(len(word) for word in words) / word_count if word_count else 0.0
    )
    avg_sentence_words = word_count / sentence_count if sentence_count else 0.0

    return {
        "word_count": float(word_count),
        "sentence_count": float(sentence_count),
        "paragraph_count": float(paragraph_count),
        "bullet_count": float(bullet_count),
        "avg_word_length": avg_word_length,
        "avg_sentence_words": avg_sentence_words,
    }


def _calculate_intensity(
    *,
    normalized_mode: Literal["mode_a", "mode_b"],
    lexical_simplification_applied: bool,
    sentence_split_applied: bool,
    visual_segmentation_applied: bool,
    source_word_count: float,
    adapted_word_count: float,
) -> AdaptationIntensity:
    score = 2 if normalized_mode == "mode_a" else 1
    if lexical_simplification_applied:
        score += 1
    if sentence_split_applied:
        score += 1
    if visual_segmentation_applied:
        score += 1
    if source_word_count > 0 and adapted_word_count < source_word_count * 0.8:
        score += 1

    if score <= 1:
        return "low"
    if score <= 3:
        return "medium"
    return "high"
