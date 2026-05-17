from __future__ import annotations

import re
from typing import Literal, NotRequired, TypedDict

from app.services.adaptation_prompt_builder import AdaptationGenre


ProtectedSpanSeverity = Literal["info", "warning", "critical"]
ProtectedSpanPreservationMode = Literal["exact", "near_exact", "semantic"]


class ProtectedSpan(TypedDict):
    text: str
    normalized_text: str
    span_type: str
    severity: ProtectedSpanSeverity
    preservation_mode: ProtectedSpanPreservationMode
    reason: str


class ProtectedSpanExtractionResult(TypedDict):
    genre: AdaptationGenre
    spans: list[ProtectedSpan]
    summary: str


LEGAL_PATTERNS: tuple[tuple[str, str, ProtectedSpanSeverity, ProtectedSpanPreservationMode, str], ...] = (
    (
        r"\b(?:законн\w+\s+представител\w+|обучающ\w+|образовательн\w+\s+организац\w+|оператор\w*)\b",
        "legal_actor",
        "critical",
        "near_exact",
        "Юридический субъект должен сохраняться без сужения и бытовизации.",
    ),
    (
        r"\b(?:обработк\w+\s+персональн\w+\s+данн\w+|обработк\w+\s+данн\w+|передач\w+\s+данн\w+\s+третьим\s+лиц\w+|запрос\w*|ответ\w*\s+на\s+запрос\w*|письменн\w+\s+отзыв\w*|официальн\w+\s+адрес\w*)\b",
        "legal_procedure",
        "critical",
        "near_exact",
        "Юридически значимая процедура должна сохраняться максимально близко к источнику.",
    ),
    (
        r"\b(?:вправе|обязан(?:а|ы)?|допускается|не\s+допускается|запрещается|имеет\s+право)\b",
        "legal_modality",
        "critical",
        "exact",
        "Юридическая модальность не должна ослабляться или теряться.",
    ),
    (
        r"\b(?:исключительно|только\s+при|при\s+соблюдении|за\s+исключением|если\s+иное|если\s+это\s+не\s+требуется|прямо\s+предусмотренн\w+|в\s+случаях)\b",
        "legal_condition",
        "critical",
        "exact",
        "Условия и исключения должны сохраняться без удаления.",
    ),
    (
        r"\b(?:не\s+более\s+\d+\s+\w+\s+дн\w+|в\s+течение\s+\d+\s+\w+\s+дн\w+|со\s+дня|с\s+даты|до\s+момента|до\s+окончания|после\s+получения)\b",
        "legal_deadline",
        "critical",
        "exact",
        "Сроки и временные ограничения должны сохранять точность.",
    ),
    (
        r"\b(?:обработка\s+персональн\w+\s+данн\w+|персональн\w+\s+данн\w+|учебн\w+\s+данн\w+)\b",
        "data_category",
        "critical",
        "near_exact",
        "Категории данных не должны подменяться более бытовыми или широкими словами.",
    ),
    (
        r"\b(?:законодательств\w+\s+российск\w+\s+федерац\w+|федеральн\w+\s+закон\w*|кодекс\w*)\b",
        "official_reference",
        "warning",
        "near_exact",
        "Официальные ссылки лучше сохранять близко к исходной формулировке.",
    ),
)

EDUCATIONAL_PATTERNS: tuple[tuple[str, str, ProtectedSpanSeverity, ProtectedSpanPreservationMode, str], ...] = (
    (
        r"\b[А-Яа-яЁёA-Za-z-]{7,}\b",
        "core_term",
        "warning",
        "semantic",
        "Ключевые учебные термины должны сохраняться и не заменяться более широкими понятиями.",
    ),
    (
        r"\b(?:это\s+называется|называется|это\s+процесс|процесс\s+[А-Яа-яЁёA-Za-z-]+)\b",
        "definition",
        "warning",
        "semantic",
        "Определения и названия процессов не должны исчезать при адаптации.",
    ),
    (
        r"\b(?:потому\s+что|поэтому|в\s+результате|из-за|зависит\s+от)\b",
        "causal_relation",
        "warning",
        "exact",
        "Причинно-следственные связи должны сохраняться без разрыва.",
    ),
)

FICTION_PATTERNS: tuple[tuple[str, str, ProtectedSpanSeverity, ProtectedSpanPreservationMode, str], ...] = (
    (
        r"\b[А-ЯЁ][а-яё]{2,}\b",
        "character",
        "warning",
        "exact",
        "Имена персонажей и значимые именные элементы должны сохраняться.",
    ),
    (
        r"\b(?:кораблик|лист|яблон\w+|двер\w+|окн\w+|сад\w+|река|дом|ветер)\b",
        "object_detail",
        "warning",
        "near_exact",
        "Предметные детали сцены не должны заменяться другими объектами.",
    ),
    (
        r"\b(?:сказал\w*|посмотрел\w*|молчал\w*|не\s+стал\w*\s+спорить|наш[её]л\w*|пош[её]л\w*|остановил\w*|ответил\w*)\b",
        "narrative_action",
        "warning",
        "near_exact",
        "Действия персонажей должны сохраняться без интерпретации.",
    ),
)

SCIENTIFIC_PATTERNS: tuple[tuple[str, str, ProtectedSpanSeverity, ProtectedSpanPreservationMode, str], ...] = (
    (
        r"\b[А-Яа-яЁёA-Za-z-]{7,}\b",
        "scientific_term",
        "warning",
        "semantic",
        "Научные термины должны сохраняться и не заменяться бытовыми обобщениями.",
    ),
    (
        r"\b(?:потому\s+что|поэтому|в\s+результате|именно\s+поэтому|зависит\s+от)\b",
        "causal_relation",
        "warning",
        "exact",
        "Причинно-следственная логика должна сохраняться.",
    ),
    (
        r"\b(?:метод|процесс|механизм|явление|система)\b",
        "method_or_process",
        "warning",
        "semantic",
        "Названия процессов и механизмов должны сохранять исходный смысл.",
    ),
)


def extract_protected_spans(
    text: str,
    *,
    genre: AdaptationGenre,
) -> ProtectedSpanExtractionResult:
    normalized_text = (text or "").strip()
    if not normalized_text:
        return {
            "genre": genre,
            "spans": [],
            "summary": "Защищённые фрагменты не найдены.",
        }

    spans: list[ProtectedSpan] = []
    seen: set[tuple[str, str]] = set()

    for pattern, span_type, severity, preservation_mode, reason in _get_patterns_for_genre(genre):
        for match in re.finditer(pattern, normalized_text, flags=re.IGNORECASE):
            raw = match.group(0).strip()
            if len(raw) < 2:
                continue
            normalized = _normalize_span_text(raw)
            key = (span_type, normalized)
            if key in seen:
                continue
            seen.add(key)
            spans.append(
                {
                    "text": raw,
                    "normalized_text": normalized,
                    "span_type": span_type,
                    "severity": severity,
                    "preservation_mode": preservation_mode,
                    "reason": reason,
                }
            )

    if genre == "fiction":
        final_sentence = _extract_final_sentence(normalized_text)
        if final_sentence:
            spans.append(
                {
                    "text": final_sentence,
                    "normalized_text": _normalize_span_text(final_sentence),
                    "span_type": "final_action_or_phrase",
                    "severity": "warning",
                    "preservation_mode": "near_exact",
                    "reason": "Финальное действие или фраза не должны заменяться интерпретацией.",
                }
            )

    return {
        "genre": genre,
        "spans": spans,
        "summary": (
            f"Извлечено {len(spans)} защищённых фрагментов для жанра {genre}."
            if spans
            else "Защищённые фрагменты не найдены."
        ),
    }


def _get_patterns_for_genre(
    genre: AdaptationGenre,
) -> tuple[tuple[str, str, ProtectedSpanSeverity, ProtectedSpanPreservationMode, str], ...]:
    if genre == "legal":
        return LEGAL_PATTERNS
    if genre == "fiction":
        return FICTION_PATTERNS
    if genre == "scientific_popular":
        return SCIENTIFIC_PATTERNS
    if genre == "educational":
        return EDUCATIONAL_PATTERNS
    return ()


def _normalize_span_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _extract_final_sentence(text: str) -> str | None:
    sentence_candidates = [segment.strip() for segment in re.split(r"(?<=[.!?…])\s+", text.strip()) if segment.strip()]
    return sentence_candidates[-1] if sentence_candidates else None
