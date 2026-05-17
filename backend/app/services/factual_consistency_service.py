from __future__ import annotations

import re
from collections import Counter
from typing import Literal, TypedDict


FactualIssueType = Literal[
    "missing_fact",
    "changed_number",
    "changed_unit",
    "formula_changed",
    "added_fact",
    "terminology_changed",
    "possible_semantic_drift",
]
FactualIssueSeverity = Literal["info", "warning", "critical"]
FactualSummaryStatus = Literal["ok", "warning", "critical"]


class FactualIssue(TypedDict):
    type: FactualIssueType
    severity: FactualIssueSeverity
    source_value: str | None
    adapted_value: str | None
    message: str


class ExtractedFacts(TypedDict):
    numbers: list[str]
    percentages: list[str]
    units: list[str]
    number_unit_pairs: list[str]
    dates: list[str]
    ranges: list[str]
    formulas: list[str]
    technical_symbols: list[str]
    capitalized_entities: list[str]
    named_entities: list[str]
    quoted_terms: list[str]
    domain_terms: list[str]
    important_terms: list[str]
    legal_markers: list[str]
    action_order_markers: list[str]
    condition_exception_markers: list[str]


class FactualConsistencyReport(TypedDict):
    summary_status: FactualSummaryStatus
    summary_message: str
    strict_mode: bool
    issues: list[FactualIssue]


UNIT_PATTERN = re.compile(
    r"(?<!\w)(\d+(?:[.,]\d+)?)\s*(%|°C|°F|км/ч|м/с|мм|см|м|км|г|кг|мг|л|мл|Вт|кВт|МВт|Гц|кГц|МГц|В|кВ|А|мА|Па|кПа|МПа|Н|Дж|м²|км²|м³|ч|мин|с)\b",
    flags=re.IGNORECASE,
)
PERCENT_PATTERN = re.compile(r"(?<!\w)\d+(?:[.,]\d+)?\s*%")
NUMBER_PATTERN = re.compile(r"(?<![\w/])\d+(?:[.,]\d+)?(?![\w/])")
DATE_PATTERN = re.compile(
    r"\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}|\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{4})\b",
    flags=re.IGNORECASE,
)
RANGE_PATTERN = re.compile(
    r"\b\d+(?:[.,]\d+)?\s*(?:[-–—]|до)\s*\d+(?:[.,]\d+)?(?:\s*(?:%|°C|°F|км/ч|м/с|мм|см|м|км|г|кг|мг|л|мл|Вт|кВт|МВт|Гц|кГц|МГц|В|кВ|А|мА|Па|кПа|МПа|Н|Дж|м²|км²|м³|ч|мин|с))?\b",
    flags=re.IGNORECASE,
)
FORMULA_PATTERN = re.compile(
    r"(?<!\w)(?:[A-Za-zА-Яа-я][A-Za-zА-Яа-я0-9_]*\s*=\s*[-+*/()A-Za-zА-Яа-я0-9_^.,]+|[A-Za-zА-Яа-я0-9]+\s*[+\-*/=^]\s*[A-Za-zА-Яа-я0-9][A-Za-zА-Яа-я0-9+\-*/=^().,]*)"
)
TECHNICAL_SYMBOL_PATTERN = re.compile(r"\b(?:[A-ZА-Я]{2,}\d*|[A-Za-z]+\d+[A-Za-z0-9]*|№\s*\d+|§\s*\d+)\b")
CAPITALIZED_ENTITY_PATTERN = re.compile(r"\b[А-ЯЁA-Z][а-яёa-z]{2,}\b")
MULTIWORD_ENTITY_PATTERN = re.compile(r"\b[А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z][а-яёa-z]+)+\b")
QUOTED_TERM_PATTERN = re.compile(r"[«\"]([^»\"\n]{3,})[»\"]")
LONG_TERM_PATTERN = re.compile(r"\b[А-Яа-яЁёA-Za-z-]{7,}\b")
LEGAL_MARKER_PATTERN = re.compile(
    r"\b(?:"
    r"ст\.?|п\.?|ч\.?|договор|закон|кодекс|постановление|приказ|№|§|"
    r"вправе|обязан(?:а)?|допускается|не допускается|исключительно|"
    r"за исключением|если иное|не более|в течение|с даты|до момента|"
    r"письменн(?:ый|ого|ому|ым|ом)?\s+отзыв|официальн(?:ый|ого|ому|ым|ом)?\s+адрес|"
    r"обработка персональных данных|законный представитель|"
    r"законодательство российской федерации"
    r")\b",
    re.IGNORECASE,
)
ACTION_ORDER_PATTERN = re.compile(
    r"\b(?:сначала|затем|потом|далее|после этого|во-первых|во-вторых|во-третьих|шаг\s+\d+)\b",
    re.IGNORECASE,
)
CONDITION_EXCEPTION_PATTERN = re.compile(
    r"\b(?:если|когда|при условии|кроме|исключение|за исключением|если только|иначе|в случае)\b",
    re.IGNORECASE,
)


def extract_protected_elements(text: str) -> ExtractedFacts:
    normalized_text = (text or "").strip()

    numbers = [match.group(0).replace(" ", "") for match in NUMBER_PATTERN.finditer(normalized_text)]
    percentages = [match.group(0).replace(" ", "") for match in PERCENT_PATTERN.finditer(normalized_text)]
    number_unit_pairs = [
        f"{match.group(1).replace(',', '.')} {match.group(2).lower()}"
        for match in UNIT_PATTERN.finditer(normalized_text)
    ]
    units = [match.group(2).lower() for match in UNIT_PATTERN.finditer(normalized_text)]
    dates = [match.group(0).strip() for match in DATE_PATTERN.finditer(normalized_text)]
    ranges = [match.group(0).strip() for match in RANGE_PATTERN.finditer(normalized_text)]
    formulas = [_normalize_formula(match.group(0)) for match in FORMULA_PATTERN.finditer(normalized_text)]
    technical_symbols = sorted(
        {
            match.group(0).strip()
            for match in TECHNICAL_SYMBOL_PATTERN.finditer(normalized_text)
            if len(match.group(0).strip()) >= 2
        }
    )
    capitalized_entities = sorted(
        {
            match.group(0).strip()
            for match in CAPITALIZED_ENTITY_PATTERN.finditer(normalized_text)
            if match.group(0).strip().lower() not in {
                "если",
                "когда",
                "после",
                "сначала",
            }
        }
    )
    named_entities = sorted(
        {
            match.group(0).strip()
            for match in MULTIWORD_ENTITY_PATTERN.finditer(normalized_text)
        }
    )
    quoted_terms = sorted(
        {
            match.group(1).strip()
            for match in QUOTED_TERM_PATTERN.finditer(normalized_text)
            if len(match.group(1).strip()) >= 3
        }
    )
    domain_terms = sorted(
        {
            term.lower()
            for term in LONG_TERM_PATTERN.findall(normalized_text)
            if term[:1].isalpha() and term.lower() not in {"которого", "которые", "которыми"}
        }
    )
    important_terms = sorted(
        {term.lower() for term in quoted_terms} | set(domain_terms)
    )
    legal_markers = sorted({match.group(0).lower() for match in LEGAL_MARKER_PATTERN.finditer(normalized_text)})
    action_order_markers = sorted(
        {match.group(0).lower() for match in ACTION_ORDER_PATTERN.finditer(normalized_text)}
    )
    condition_exception_markers = sorted(
        {match.group(0).lower() for match in CONDITION_EXCEPTION_PATTERN.finditer(normalized_text)}
    )

    return {
        "numbers": numbers,
        "percentages": percentages,
        "units": units,
        "number_unit_pairs": number_unit_pairs,
        "dates": dates,
        "ranges": ranges,
        "formulas": formulas,
        "technical_symbols": technical_symbols,
        "capitalized_entities": capitalized_entities,
        "named_entities": named_entities,
        "quoted_terms": quoted_terms,
        "domain_terms": domain_terms,
        "important_terms": important_terms,
        "legal_markers": legal_markers,
        "action_order_markers": action_order_markers,
        "condition_exception_markers": condition_exception_markers,
    }


def extract_key_facts(text: str) -> ExtractedFacts:
    return extract_protected_elements(text)


def build_factual_consistency_report(*, source_text: str, adapted_text: str) -> FactualConsistencyReport:
    source_facts = extract_key_facts(source_text)
    adapted_facts = extract_key_facts(adapted_text)
    strict_mode = _is_strict_content(source_facts)
    issues: list[FactualIssue] = []

    issues.extend(_compare_number_unit_pairs(source_facts, adapted_facts, strict_mode=strict_mode))
    issues.extend(_compare_formulas(source_facts, adapted_facts, strict_mode=strict_mode))
    issues.extend(_compare_dates(source_facts, adapted_facts, strict_mode=strict_mode))
    issues.extend(_compare_numbers(source_facts, adapted_facts, strict_mode=strict_mode))
    issues.extend(_compare_terms(source_facts, adapted_facts, strict_mode=strict_mode))
    issues.extend(_compare_added_facts(source_facts, adapted_facts, strict_mode=strict_mode))

    if len([issue for issue in issues if issue["severity"] in {"warning", "critical"}]) >= 3:
        issues.append(
            {
                "type": "possible_semantic_drift",
                "severity": "critical" if strict_mode else "warning",
                "source_value": None,
                "adapted_value": None,
                "message": "Обнаружено несколько признаков возможного смыслового дрейфа. Проверьте адаптацию вручную.",
            }
        )

    summary_status = _get_summary_status(issues)
    summary_message = _get_summary_message(summary_status)

    return {
        "summary_status": summary_status,
        "summary_message": summary_message,
        "strict_mode": strict_mode,
        "issues": _deduplicate_issues(issues),
    }


def get_factual_report_summary_message(report: FactualConsistencyReport | None) -> str:
    if not report:
        return "Проверка фактов не выполнялась для этой версии."
    return report["summary_message"]


def _compare_number_unit_pairs(
    source_facts: ExtractedFacts,
    adapted_facts: ExtractedFacts,
    *,
    strict_mode: bool,
) -> list[FactualIssue]:
    issues: list[FactualIssue] = []
    source_pairs = {
        pair.split(" ", 1)[0]: pair.split(" ", 1)[1]
        for pair in source_facts["number_unit_pairs"]
        if " " in pair
    }
    adapted_pairs = {
        pair.split(" ", 1)[0]: pair.split(" ", 1)[1]
        for pair in adapted_facts["number_unit_pairs"]
        if " " in pair
    }

    for number, source_unit in source_pairs.items():
        adapted_unit = adapted_pairs.get(number)
        if adapted_unit and adapted_unit != source_unit:
            issues.append(
                {
                    "type": "changed_unit",
                    "severity": "critical" if strict_mode else "warning",
                    "source_value": f"{number} {source_unit}",
                    "adapted_value": f"{number} {adapted_unit}",
                    "message": "Единица измерения могла измениться при адаптации.",
                }
            )
        elif adapted_unit is None:
            issues.append(
                {
                    "type": "missing_fact",
                    "severity": "critical" if strict_mode else "warning",
                    "source_value": f"{number} {source_unit}",
                    "adapted_value": None,
                    "message": "Число с единицей измерения не найдено в адаптации.",
                }
            )
    return issues


def _compare_formulas(
    source_facts: ExtractedFacts,
    adapted_facts: ExtractedFacts,
    *,
    strict_mode: bool,
) -> list[FactualIssue]:
    issues: list[FactualIssue] = []
    adapted_formulas = Counter(adapted_facts["formulas"])
    unmatched_adapted = [formula for formula, count in adapted_formulas.items() for _ in range(count)]

    for source_formula in source_facts["formulas"]:
        if source_formula in adapted_formulas and adapted_formulas[source_formula] > 0:
            adapted_formulas[source_formula] -= 1
            continue

        adapted_value = unmatched_adapted[0] if unmatched_adapted else None
        issues.append(
            {
                "type": "formula_changed",
                "severity": "critical" if strict_mode else "warning",
                "source_value": source_formula,
                "adapted_value": adapted_value,
                "message": "Формула или формульная запись могла измениться.",
            }
        )
    return issues


def _compare_dates(
    source_facts: ExtractedFacts,
    adapted_facts: ExtractedFacts,
    *,
    strict_mode: bool,
) -> list[FactualIssue]:
    issues: list[FactualIssue] = []
    source_dates = Counter(_normalize_simple_token(value) for value in source_facts["dates"])
    adapted_dates = Counter(_normalize_simple_token(value) for value in adapted_facts["dates"])

    for source_date, count in source_dates.items():
        adapted_count = adapted_dates.get(source_date, 0)
        if adapted_count >= count:
            continue
        issues.append(
            {
                "type": "missing_fact",
                "severity": "critical" if strict_mode else "warning",
                "source_value": source_date,
                "adapted_value": None,
                "message": "Дата из исходного текста не найдена в адаптации.",
            }
        )
    return issues


def _compare_numbers(
    source_facts: ExtractedFacts,
    adapted_facts: ExtractedFacts,
    *,
    strict_mode: bool,
) -> list[FactualIssue]:
    issues: list[FactualIssue] = []
    source_numbers = Counter(_normalize_number(value) for value in source_facts["numbers"])
    adapted_numbers = Counter(_normalize_number(value) for value in adapted_facts["numbers"])
    extra_numbers = [value for value, count in adapted_numbers.items() for _ in range(max(0, count - source_numbers.get(value, 0)))]

    for source_value, count in source_numbers.items():
        adapted_count = adapted_numbers.get(source_value, 0)
        if adapted_count >= count:
            continue

        adapted_value = extra_numbers[0] if extra_numbers else None
        issues.append(
            {
                "type": "changed_number" if adapted_value else "missing_fact",
                "severity": "critical" if strict_mode and adapted_value else "warning",
                "source_value": source_value,
                "adapted_value": adapted_value,
                "message": "Числовое значение могло измениться." if adapted_value else "Числовое значение не найдено в адаптации.",
            }
        )
    return issues


def _compare_terms(
    source_facts: ExtractedFacts,
    adapted_facts: ExtractedFacts,
    *,
    strict_mode: bool,
) -> list[FactualIssue]:
    issues: list[FactualIssue] = []
    source_terms = set(source_facts["technical_symbols"]) | set(source_facts["named_entities"]) | set(source_facts["important_terms"])
    adapted_terms = set(adapted_facts["technical_symbols"]) | set(adapted_facts["named_entities"]) | set(adapted_facts["important_terms"])

    for term in sorted(source_terms):
        if term in adapted_terms:
            continue
        issues.append(
            {
                "type": "terminology_changed",
                "severity": "critical" if strict_mode and (term in source_facts["technical_symbols"] or term.lower() in source_facts["legal_markers"]) else "warning",
                "source_value": term,
                "adapted_value": None,
                "message": "Ключевой термин или обозначение не найдено в адаптации.",
            }
        )
    return issues


def _compare_added_facts(
    source_facts: ExtractedFacts,
    adapted_facts: ExtractedFacts,
    *,
    strict_mode: bool,
) -> list[FactualIssue]:
    issues: list[FactualIssue] = []
    source_numbers = Counter(_normalize_number(value) for value in source_facts["numbers"])
    adapted_numbers = Counter(_normalize_number(value) for value in adapted_facts["numbers"])

    for adapted_value, count in adapted_numbers.items():
        if count <= source_numbers.get(adapted_value, 0):
            continue
        issues.append(
            {
                "type": "added_fact",
                "severity": "warning" if strict_mode else "info",
                "source_value": None,
                "adapted_value": adapted_value,
                "message": "В адаптации появилось новое числовое значение, которого не было в исходном тексте.",
            }
        )

    source_terms = set(source_facts["technical_symbols"]) | set(source_facts["named_entities"])
    adapted_terms = set(adapted_facts["technical_symbols"]) | set(adapted_facts["named_entities"])
    for adapted_term in sorted(adapted_terms - source_terms):
        if len(adapted_term) < 3:
            continue
        issues.append(
            {
                "type": "added_fact",
                "severity": "info",
                "source_value": None,
                "adapted_value": adapted_term,
                "message": "В адаптации появилось новое значимое обозначение или имя.",
            }
        )
    return issues


def _is_strict_content(facts: ExtractedFacts) -> bool:
    return (
        bool(facts["formulas"])
        or len(facts["numbers"]) >= 3
        or bool(facts["units"])
        or bool(facts["legal_markers"])
        or bool(facts["technical_symbols"])
        or bool(facts["ranges"])
    )


def _normalize_formula(value: str) -> str:
    return re.sub(r"\s+", "", value)


def _normalize_number(value: str) -> str:
    return value.replace(" ", "").replace(",", ".")


def _normalize_simple_token(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _get_summary_status(issues: list[FactualIssue]) -> FactualSummaryStatus:
    if any(issue["severity"] == "critical" for issue in issues):
        return "critical"
    if any(issue["severity"] == "warning" for issue in issues):
        return "warning"
    return "ok"


def _get_summary_message(summary_status: FactualSummaryStatus) -> str:
    if summary_status == "critical":
        return "Проверка фактов: обнаружены критические расхождения."
    if summary_status == "warning":
        return "Проверка фактов: есть предупреждения."
    return "Проверка фактов: критических расхождений не найдено."


def _deduplicate_issues(issues: list[FactualIssue]) -> list[FactualIssue]:
    seen: set[tuple[str, str, str, str, str]] = set()
    unique_issues: list[FactualIssue] = []
    for issue in issues:
        key = (
            issue["type"],
            issue["severity"],
            issue["source_value"] or "",
            issue["adapted_value"] or "",
            issue["message"],
        )
        if key in seen:
            continue
        seen.add(key)
        unique_issues.append(issue)
    return unique_issues
