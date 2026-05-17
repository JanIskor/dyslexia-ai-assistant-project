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
    combined_step_heading = re.search(
        r"(?im)^#{0,3}\s*(?:шаг|эпизод)\s*\d+\s*/\s*(?:шаг|эпизод)\s*\d+\s*$",
        adapted_text,
    )
    mixed_heading_markup_detected = _detect_mixed_heading_markup(adapted_text)
    expects_episode_markers = any("Эпизод 1" in hint for hint in contract["validation_hints"])
    legal_informal_substitution_detected = _detect_legal_informal_substitution(
        source_text=source_text,
        adapted_text=adapted_text,
    )
    legal_modality_loss_detected = _detect_legal_modality_loss(
        source_text=source_text,
        adapted_text=adapted_text,
    )
    legal_deadline_mutation_detected = _detect_legal_deadline_or_order_mutation(
        source_text=source_text,
        adapted_text=adapted_text,
    )
    legal_actor_action_shift_detected = _detect_legal_actor_action_shift(
        source_text=source_text,
        adapted_text=adapted_text,
    )
    educational_new_notation_detected = _detect_educational_new_notation(
        source_text=source_text,
        adapted_text=adapted_text,
    )
    educational_broad_expansion_detected = _detect_educational_broad_expansion(
        source_text=source_text,
        adapted_text=adapted_text,
    )
    fiction_interpretive_additions_detected = _detect_fiction_interpretive_additions(
        source_text=source_text,
        adapted_text=adapted_text,
    )
    has_educational_basic_template = contract.get("golden_template_title") == "Учебная адаптация с главной мыслью и тематическими блоками"
    has_educational_structured_template = contract.get("golden_template_title") == "Учебное пошаговое объяснение процесса"
    has_legal_template = contract.get("golden_template_title") == "Юридическая сегментация с сохранением формулировок"
    has_scientific_popular_template = (contract.get("golden_template_title") or "").startswith("Научно-популяр")
    has_fiction_template = (contract.get("golden_template_title") or "").startswith("Художе")
    step_heading_matches = re.findall(r"(?im)^#{2,3}\s*шаг\s*\d+", adapted_text)

    if contract["contract_id"] == "key_points_focus":
        if not bullet_lines and not re.search(r"\b(главное|важно|запомнить)\b", adapted_text, flags=re.IGNORECASE):
            issues.append("Результат для key_points_focus должен иметь bullets или короткие блоки главных мыслей.")
        if source_word_count > 0 and adapted_word_count >= source_word_count * 0.9:
            issues.append("Результат для key_points_focus слишком близок по объёму к исходнику и похож на полный пересказ.")
        if len(paragraphs) >= 3 and not bullet_lines:
            issues.append("Результат для key_points_focus выглядит как полный пересказ вместо краткого выделения главного.")

    elif contract["contract_id"] == "structured_explanation":
        if not bullet_lines and not re.search(r"\b(шаг|этап|эпизод)\s*\d+\b", adapted_text, flags=re.IGNORECASE):
            issues.append("Результат для structured_explanation должен содержать шаги, этапы или явную последовательность.")
        if combined_step_heading:
            issues.append("Результат для structured_explanation не должен объединять несколько шагов в одном заголовке.")
        if mixed_heading_markup_detected:
            issues.append("Markdown-заголовки должны быть оформлены единообразно: не смешивайте heading syntax и bold в одной строке.")
        if expects_episode_markers and re.search(r"\bшаг\s*\d+\b", adapted_text, flags=re.IGNORECASE):
            issues.append("Для fiction в structured_explanation ожидаются маркеры «Эпизод 1», а не технические шаги.")
        long_paragraphs = [paragraph for paragraph in paragraphs if _count_words(paragraph) >= 60]
        if long_paragraphs:
            issues.append("Результат для structured_explanation содержит слишком длинные неструктурированные абзацы.")
        if has_educational_structured_template and not re.search(r"(?im)^#{2,3}\s*шаг\s*\d+", adapted_text):
            issues.append("Учебный structured_explanation должен содержать отдельные заголовки шагов.")
        if has_scientific_popular_template and len(step_heading_matches) > 5:
            issues.append("Scientific-popular structured_explanation не должен дробить текст на слишком много микрошагов.")

    else:
        if bullet_lines and len(paragraphs) <= 1:
            issues.append("Результат для basic_simplify не должен состоять только из списка без связного адаптированного текста.")
        if source_word_count > 0 and adapted_word_count <= source_word_count * 0.25:
            issues.append("Результат для basic_simplify выглядит чрезмерно сокращённым.")
        if legal_informal_substitution_detected:
            issues.append("В legal-тексте обнаружена возможная слишком бытовая замена юридически значимого термина.")
        if legal_modality_loss_detected:
            issues.append("В legal-тексте обнаружена возможная потеря юридически значимой модальности или условий.")
        if legal_deadline_mutation_detected:
            issues.append("В legal-тексте обнаружено возможное изменение сроков, адресатов или порядка действий.")
        if legal_actor_action_shift_detected:
            issues.append("В legal-тексте обнаружена возможная подмена субъекта действия или направления действия.")
        if educational_new_notation_detected:
            issues.append("В educational-тексте обнаружена новая нотация, символ, формула или сокращение, которых не было в исходнике.")
        if educational_broad_expansion_detected:
            issues.append("В educational-тексте обнаружено слишком широкое обобщение или расширение вывода без опоры на источник.")
        if fiction_interpretive_additions_detected:
            issues.append("В fiction-тексте обнаружены возможные новые детали или интерпретации, которых не было в исходнике.")
        if has_educational_basic_template:
            if "главная мысль" not in adapted_text.lower():
                issues.append("Учебный basic_simplify должен выделять блок «Главная мысль».")
            thematic_matches = sum(
                1
                for pattern in (
                    r"что это такое",
                    r"как это происходит",
                    r"от чего зависит",
                    r"почему это важно",
                    r"вывод",
                )
                if re.search(pattern, adapted_text, flags=re.IGNORECASE)
            )
            if thematic_matches < 2:
                issues.append("Учебный basic_simplify должен быть ближе к тематической структуре эталонной адаптации.")
        if has_legal_template:
            legal_section_matches = sum(
                1
                for pattern in (
                    r"кто участвует",
                    r"что регулируется|для чего используются данные",
                    r"какие сведения|какие действия",
                    r"ограничения и условия",
                    r"срок действия|порядок изменения|отзыв",
                    r"право на запрос|ответ|действие организации",
                )
                if re.search(pattern, adapted_text, flags=re.IGNORECASE)
            )
            if legal_section_matches < 2:
                issues.append("Legal mode_b ожидает сегментацию по юридически значимым разделам, а не сплошной пересказ.")

    if has_legal_template:
        if legal_informal_substitution_detected and not any("бытовая замена" in issue.lower() for issue in issues):
            issues.append("В legal-тексте обнаружена возможная слишком бытовая замена юридически значимого термина.")
        if legal_modality_loss_detected and not any("модальности" in issue.lower() for issue in issues):
            issues.append("В legal-тексте обнаружена возможная потеря юридически значимой модальности или условий.")
        if legal_deadline_mutation_detected and not any("сроков" in issue.lower() for issue in issues):
            issues.append("В legal-тексте обнаружено возможное изменение сроков, адресатов или порядка действий.")
        if legal_actor_action_shift_detected and not any("субъекта действия" in issue.lower() for issue in issues):
            issues.append("В legal-тексте обнаружена возможная подмена субъекта действия или направления действия.")

    if (contract.get("golden_template_title") or "").startswith("Учеб") or has_scientific_popular_template:
        if educational_new_notation_detected and not any("новая нотация" in issue.lower() for issue in issues):
            issues.append("В тексте обнаружена новая нотация, символ, формула или сокращение, которых не было в исходнике.")
        if educational_broad_expansion_detected and not any("слишком широкое обобщение" in issue.lower() for issue in issues):
            issues.append("В тексте обнаружено слишком широкое обобщение или расширение вывода без опоры на источник.")

    if has_fiction_template and fiction_interpretive_additions_detected and not any("fiction" in issue.lower() for issue in issues):
        issues.append("В fiction-тексте обнаружены возможные новые детали или интерпретации, которых не было в исходнике.")

    if mixed_heading_markup_detected and not any("heading syntax" in issue.lower() for issue in issues):
        issues.append("Markdown-заголовки должны быть оформлены единообразно: не смешивайте heading syntax и bold в одной строке.")

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


def _detect_mixed_heading_markup(text: str) -> bool:
    return bool(
        re.search(r"(?im)^\s*\*+\s*#{1,6}\s*", text)
        or re.search(r"(?im)^\s*#{1,6}\s*\*+", text)
    )


def _detect_legal_informal_substitution(*, source_text: str, adapted_text: str) -> bool:
    source = source_text.lower()
    adapted = adapted_text.lower()
    sensitive_pairs = [
        ("образовательная организация", "школ"),
        ("законный представитель", "родител"),
        ("персональные данные", "личные данные"),
        ("адаптированные учебные материалы", "специальные материалы"),
        ("письменный отзыв", "официальный отказ"),
        ("30 календарных дней", "30 рабочих дней"),
    ]
    for source_term, adapted_term in sensitive_pairs:
        if source_term in source and adapted_term in adapted and source_term not in adapted:
            return True
    return False


def _detect_legal_modality_loss(*, source_text: str, adapted_text: str) -> bool:
    source = source_text.lower()
    adapted = adapted_text.lower()
    protected_markers = (
        "вправе",
        "обязан",
        "допускается",
        "не допускается",
        "исключительно",
        "за исключением",
        "если иное",
        "в течение",
        "не более",
        "с даты",
        "до момента",
        "письменн",
    )
    return any(marker in source and marker not in adapted for marker in protected_markers)


def _detect_legal_deadline_or_order_mutation(*, source_text: str, adapted_text: str) -> bool:
    source = source_text.lower()
    adapted = adapted_text.lower()
    sensitive_actor_pairs = [
        ("образовательная организация", "школ"),
        ("законный представитель", "родител"),
    ]
    if any(source_term in source and adapted_term in adapted and source_term not in adapted for source_term, adapted_term in sensitive_actor_pairs):
        return True
    if "в течение" in source and "в течение" not in adapted:
        return True
    if "до момента" in source and "до момента" not in adapted:
        return True
    if "с даты" in source and "с даты" not in adapted:
        return True
    return False


def _detect_legal_actor_action_shift(*, source_text: str, adapted_text: str) -> bool:
    source = source_text.lower()
    adapted = adapted_text.lower()
    if "отзыв" not in source:
        return False
    source_sender_is_non_org = bool(
        re.search(r"законн\w+\s+представител\w+|обучающ\w+", source)
    )
    adapted_sender_is_org = "организац" in adapted and any(
        marker in adapted for marker in ("направля", "отправля", "пода", "направит", "отправит")
    )
    return source_sender_is_non_org and adapted_sender_is_org


def _detect_educational_new_notation(*, source_text: str, adapted_text: str) -> bool:
    source_tokens = set(_extract_notation_tokens(source_text))
    adapted_tokens = set(_extract_notation_tokens(adapted_text))
    new_tokens = adapted_tokens - source_tokens
    return bool(new_tokens)


def _extract_notation_tokens(text: str) -> list[str]:
    return re.findall(r"\b(?:[A-ZА-ЯЁ]{2,}\d*|[A-Za-zА-Яа-яЁё]*\d+[A-Za-zА-Яа-яЁё]*|[A-Z][a-z]?\d+)\b", text or "")


def _detect_educational_broad_expansion(*, source_text: str, adapted_text: str) -> bool:
    source = source_text.lower()
    adapted = adapted_text.lower()
    risky_terms = ("все", "всегда", "полностью", "главный", "единственный", "на земле")
    return any(term in adapted and term not in source for term in risky_terms)


def _detect_fiction_interpretive_additions(*, source_text: str, adapted_text: str) -> bool:
    source = source_text.lower()
    adapted = adapted_text.lower()
    risky_additions = (
        "уверенно",
        "таинственно",
        "важное",
        "важный",
        "надежды",
        "надежда",
        "согласилась",
        "молча",
        "жёлтый",
        "желтый",
    )
    return any(term in adapted and term not in source for term in risky_additions)
