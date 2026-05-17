from __future__ import annotations

import re
from typing import Literal, TypedDict

from app.services.adaptation_prompt_builder import AdaptationGenre
from app.services.protected_span_extractor import ProtectedSpan


ProtectedSpanValidationStatus = Literal["ok", "warning", "critical"]
ProtectedSpanIssueSeverity = Literal["warning", "critical"]


class ProtectedSpanIssue(TypedDict):
    issue_type: str
    severity: ProtectedSpanIssueSeverity
    original_span: str
    adapted_evidence: str | None
    message: str
    repair_instruction: str


class ProtectedSpanValidationReport(TypedDict):
    status: ProtectedSpanValidationStatus
    issues: list[ProtectedSpanIssue]
    critical_count: int
    warning_count: int
    repair_required: bool
    summary: str


def validate_protected_spans(
    *,
    source_text: str,
    adapted_text: str,
    genre: AdaptationGenre,
    protected_spans: list[ProtectedSpan],
) -> ProtectedSpanValidationReport:
    source = (source_text or "").strip()
    adapted = (adapted_text or "").strip()
    normalized_adapted = _normalize(adapted)
    issues: list[ProtectedSpanIssue] = []

    for span in protected_spans:
        if span["preservation_mode"] in {"exact", "near_exact"} and span["normalized_text"] not in normalized_adapted:
            issue = _build_missing_span_issue(span)
            if issue is not None:
                issues.append(issue)

    if genre == "legal":
        issues.extend(_validate_legal_rules(source, adapted))
    if genre == "fiction":
        issues.extend(_validate_fiction_rules(source, adapted))
    if genre in {"educational", "scientific_popular"}:
        issues.extend(_validate_scope_rules(source, adapted, genre=genre))

    if _detect_invalid_markdown_heading(adapted):
        issues.append(
            {
                "issue_type": "markdown_format_invalid",
                "severity": "warning",
                "original_span": "",
                "adapted_evidence": None,
                "message": "В результате обнаружен некорректный markdown-заголовок.",
                "repair_instruction": "Исправь заголовки и не смешивай heading syntax с bold.",
            }
        )

    critical_count = sum(1 for issue in issues if issue["severity"] == "critical")
    warning_count = sum(1 for issue in issues if issue["severity"] == "warning")
    status: ProtectedSpanValidationStatus
    if critical_count > 0:
        status = "critical"
    elif warning_count > 0:
        status = "warning"
    else:
        status = "ok"

    return {
        "status": status,
        "issues": _deduplicate_issues(issues),
        "critical_count": critical_count,
        "warning_count": warning_count,
        "repair_required": critical_count > 0,
        "summary": _build_summary(status, critical_count=critical_count, warning_count=warning_count),
    }


def _build_missing_span_issue(span: ProtectedSpan) -> ProtectedSpanIssue | None:
    issue_type_map = {
        "legal_actor": "protected_span_missing",
        "legal_modality": "legal_modality_changed",
        "legal_condition": "condition_removed",
        "legal_deadline": "deadline_precision_lost",
        "legal_procedure": "legal_action_replaced",
        "data_category": "protected_span_weakened",
        "object_detail": "protected_span_missing",
        "narrative_action": "narrative_action_changed",
        "final_action_or_phrase": "protected_span_missing",
        "causal_relation": "causal_relation_removed",
        "definition": "term_removed",
        "core_term": "term_removed",
        "scientific_term": "term_removed",
        "method_or_process": "process_meaning_changed",
    }
    issue_type = issue_type_map.get(span["span_type"])
    if issue_type is None:
        return None
    severity: ProtectedSpanIssueSeverity = "critical" if span["severity"] == "critical" else "warning"
    return {
        "issue_type": issue_type,
        "severity": severity,
        "original_span": span["text"],
        "adapted_evidence": None,
        "message": f"Защищённый фрагмент исчез или был слишком сильно изменён: {span['text']}",
        "repair_instruction": f"Верни фрагмент ближе к исходной формулировке: {span['text']}",
    }


def _validate_legal_rules(source: str, adapted: str) -> list[ProtectedSpanIssue]:
    source_lower = source.lower()
    adapted_lower = adapted.lower()
    issues: list[ProtectedSpanIssue] = []

    if "образовательная организация" in source_lower and "школ" in adapted_lower and "образовательная организация" not in adapted_lower:
        issues.append(_issue("legal_actor_narrowed", "critical", "образовательная организация", "школа", "Юридический субъект сужен до бытового аналога.", "Верни исходный юридический субъект без сужения."))
    if "законный представитель" in source_lower and "родител" in adapted_lower and "законный представитель" not in adapted_lower:
        issues.append(_issue("legal_actor_narrowed", "critical", "законный представитель", "родитель", "Юридический субъект сужен до более узкого бытового слова.", "Сохрани формулировку «законный представитель»."))
    if "обработка" in source_lower and "использ" in adapted_lower and "обработ" not in adapted_lower:
        issues.append(_issue("legal_action_replaced", "critical", "обработка", "использование", "Юридически значимое действие бытовизировано.", "Верни исходную формулировку действия ближе к слову «обработка»."))
    if "письменный отзыв" in source_lower and "письменный отказ" in adapted_lower:
        issues.append(_issue("legal_action_replaced", "critical", "письменный отзыв", "письменный отказ", "Точная процедура подменена другой формулировкой.", "Сохрани процедуру «письменный отзыв»."))
    if any(marker in source_lower for marker in ("вправе", "обязан", "допускается", "не допускается")) and not any(marker in adapted_lower for marker in ("вправе", "обязан", "допускается", "не допускается", "имеет право")):
        issues.append(_issue("legal_modality_changed", "critical", "юридическая модальность", None, "Модальность права, обязанности или допустимости потеряна.", "Верни юридическую модальность ближе к исходному слову."))
    if "не более" in source_lower and "в течение" in adapted_lower and "не более" not in adapted_lower:
        issues.append(_issue("deadline_precision_lost", "critical", "не более", "в течение", "Ограничитель срока стал менее точным.", "Верни исходный тип временного ограничения."))
    if any(marker in source_lower for marker in ("за исключением", "если иное", "исключительно")) and not any(marker in adapted_lower for marker in ("за исключением", "если иное", "исключительно")):
        issues.append(_issue("exception_removed", "critical", "условие/исключение", None, "Условие или исключение исчезло из адаптации.", "Верни условие или исключение без ослабления."))
    if "отзыв" in source_lower and re.search(r"законн\w+\s+представител\w+|обучающ\w+", source_lower):
        if "организац" in adapted_lower and any(marker in adapted_lower for marker in ("направля", "отправля", "пода", "направит", "отправит")):
            issues.append(_issue("legal_action_replaced", "critical", "направление действия", "организация направляет", "Направление действия или субъект действия подменены.", "Верни исходного отправителя и направление действия."))

    return issues


def _validate_fiction_rules(source: str, adapted: str) -> list[ProtectedSpanIssue]:
    source_lower = source.lower()
    adapted_lower = adapted.lower()
    issues: list[ProtectedSpanIssue] = []
    risky_additions = ("уверенно", "таинственно", "важное", "важный", "надежда", "надежды", "жёлтый", "желтый", "молча", "согласилась")
    for term in risky_additions:
        if term in adapted_lower and term not in source_lower:
            issues.append(_issue("narrative_detail_added", "warning", "", term, "В художественном тексте добавлена новая деталь или интерпретация.", "Убери добавленную интерпретацию и вернись ближе к исходной сцене."))
            break
    if "кораблик" in source_lower and "корабль" in adapted_lower and "кораблик" not in adapted_lower:
        issues.append(_issue("imagery_rewritten", "warning", "кораблик", "корабль", "Уменьшительная или образная деталь была заменена.", "Сохрани исходную предметную деталь ближе к авторской лексике."))
    if "не стала спорить" in source_lower and "соглас" in adapted_lower:
        issues.append(_issue("narrative_action_changed", "warning", "не стала спорить", "согласилась", "Действие персонажа интерпретировано как согласие.", "Верни действие персонажа без навязанной интерпретации."))
    return issues


def _validate_scope_rules(source: str, adapted: str, *, genre: AdaptationGenre) -> list[ProtectedSpanIssue]:
    source_lower = source.lower()
    adapted_lower = adapted.lower()
    issues: list[ProtectedSpanIssue] = []
    risky_terms = ("все", "всегда", "полностью", "главный", "единственный", "на земле")
    for term in risky_terms:
        if term in adapted_lower and term not in source_lower:
            issues.append(_issue("unsupported_generalization", "warning", "", term, "Область утверждения стала шире, чем в исходнике.", "Сохрани scope исходного утверждения без глобального усиления."))
            break
    new_notation_tokens = set(_extract_notation_tokens(adapted)) - set(_extract_notation_tokens(source))
    if new_notation_tokens:
        token_preview = sorted(new_notation_tokens)[0]
        issues.append(_issue("new_external_fact", "warning", "", token_preview, "Добавлена новая нотация или обозначение, которого не было в исходнике.", "Убери новую нотацию и используй исходное словесное обозначение."))
    if any(marker in source_lower for marker in ("потому что", "поэтому", "в результате", "из-за", "зависит от")) and not any(marker in adapted_lower for marker in ("потому что", "поэтому", "в результате", "из-за", "зависит от")):
        issues.append(_issue("causal_relation_removed", "warning", "причинно-следственная связь", None, f"В {genre} могла исчезнуть причинно-следственная связь.", "Верни причинно-следственную логику ближе к исходнику."))
    return issues


def _issue(
    issue_type: str,
    severity: ProtectedSpanIssueSeverity,
    original_span: str,
    adapted_evidence: str | None,
    message: str,
    repair_instruction: str,
) -> ProtectedSpanIssue:
    return {
        "issue_type": issue_type,
        "severity": severity,
        "original_span": original_span,
        "adapted_evidence": adapted_evidence,
        "message": message,
        "repair_instruction": repair_instruction,
    }


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _extract_notation_tokens(text: str) -> list[str]:
    return re.findall(r"\b(?:[A-ZА-ЯЁ]{2,}\d*|[A-Za-zА-Яа-яЁё]*\d+[A-Za-zА-Яа-яЁё]*|[A-Z][a-z]?\d+)\b", text or "")


def _detect_invalid_markdown_heading(text: str) -> bool:
    return bool(
        re.search(r"(?im)^\s*\*+\s*#{1,6}\s*", text)
        or re.search(r"(?im)^\s*#{1,6}\s*\*+", text)
        or re.search(r"(?im)^#{0,3}\s*(?:шаг|эпизод)\s*\d+\s*/\s*(?:шаг|эпизод)\s*\d+\s*$", text)
    )


def _build_summary(
    status: ProtectedSpanValidationStatus,
    *,
    critical_count: int,
    warning_count: int,
) -> str:
    if status == "critical":
        return f"Обнаружены критические искажения защищённых фрагментов: {critical_count}."
    if status == "warning":
        return f"Обнаружены предупреждения по защищённым фрагментам: {warning_count}."
    return "Критических искажений защищённых фрагментов не найдено."


def _deduplicate_issues(issues: list[ProtectedSpanIssue]) -> list[ProtectedSpanIssue]:
    seen: set[tuple[str, str, str | None]] = set()
    deduplicated: list[ProtectedSpanIssue] = []
    for issue in issues:
        key = (issue["issue_type"], issue["original_span"], issue["adapted_evidence"])
        if key in seen:
            continue
        seen.add(key)
        deduplicated.append(issue)
    return deduplicated
