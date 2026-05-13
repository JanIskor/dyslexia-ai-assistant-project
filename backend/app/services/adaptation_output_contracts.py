from __future__ import annotations

from typing import Literal, TypedDict

from app.services.adaptation_contract_overrides import get_adaptation_contract_override


ProductAdaptationMode = Literal["basic_simplify", "structured_explanation", "key_points_focus"]
StrategyAdaptationMode = Literal["mode_a", "mode_b"]
AdaptationGenre = Literal[
    "educational",
    "scientific_popular",
    "fiction",
    "legal",
    "instruction",
    "other",
]
RiskLevel = Literal["low", "medium", "high"]


class AdaptationOutputContract(TypedDict):
    contract_id: str
    title: str
    purpose: str
    required_structure: list[str]
    allowed_output_patterns: list[str]
    forbidden_output_patterns: list[str]
    format_instructions: list[str]
    validation_hints: list[str]


def get_adaptation_output_contract(
    *,
    product_mode: ProductAdaptationMode,
    strategy_mode: StrategyAdaptationMode,
    genre: AdaptationGenre,
    risk_level: RiskLevel,
) -> AdaptationOutputContract:
    contract = _build_base_contract(
        product_mode=product_mode,
        strategy_mode=strategy_mode,
        genre=genre,
        risk_level=risk_level,
    )
    override = get_adaptation_contract_override(
        product_mode=product_mode,
        strategy_mode=strategy_mode,
        genre=genre,
        risk_level=risk_level,
    )
    if override is None:
        return contract

    contract["required_structure"] = list(dict.fromkeys(contract["required_structure"] + override["required_structure_append"]))
    contract["forbidden_output_patterns"] = list(
        dict.fromkeys(contract["forbidden_output_patterns"] + override["forbidden_output_patterns_append"])
    )
    contract["format_instructions"] = list(
        dict.fromkeys(contract["format_instructions"] + override["format_instructions_append"])
    )
    contract["validation_hints"] = list(dict.fromkeys(contract["validation_hints"] + override["preserve_notes"]))
    return contract


def _build_base_contract(
    *,
    product_mode: ProductAdaptationMode,
    strategy_mode: StrategyAdaptationMode,
    genre: AdaptationGenre,
    risk_level: RiskLevel,
) -> AdaptationOutputContract:
    if product_mode == "structured_explanation":
        return {
            "contract_id": "structured_explanation",
            "title": "Пошаговое объяснение",
            "purpose": "Создать последовательное пошаговое объяснение материала.",
            "required_structure": [
                "Этапы или шаги.",
                "Последовательная логика.",
                "Явные переходы между шагами.",
                "Маркер вида «Шаг 1 / Шаг 2» или эквивалентная стадийность.",
            ],
            "allowed_output_patterns": [
                "Нумерованные шаги.",
                "Последовательные блоки объяснения.",
                "Короткие поясняющие переходы.",
            ],
            "forbidden_output_patterns": [
                "Обычный сплошной пересказ без стадийности.",
                "Длинные неструктурированные абзацы.",
                "Смешивание нескольких шагов в один блок.",
                "Изменение порядка действий или процессов.",
            ],
            "format_instructions": [
                "Верни пошаговое объяснение, а не обычный пересказ.",
            ],
            "validation_hints": [
                "В тексте должны быть шаги, этапы или явная последовательность.",
                "Избегай длинных абзацев без структурных маркеров.",
            ],
        }

    if product_mode == "key_points_focus":
        return {
            "contract_id": "key_points_focus",
            "title": "Выделение главного",
            "purpose": "Выделить главные идеи в краткой near-extractive форме.",
            "required_structure": [
                "Краткие bullets или короткие блоки.",
                "Маркеры вида «Главное», «Важно», «Запомнить» или эквивалент.",
                "Сжатая подача без полного пересказа.",
            ],
            "allowed_output_patterns": [
                "Bullets с главными пунктами.",
                "Короткие опорные блоки.",
                "Сохранение ключевых формулировок близко к источнику.",
            ],
            "forbidden_output_patterns": [
                "Полный адаптированный пересказ всего текста.",
                "Широкое объяснительное переписывание.",
                "Новые выводы, которых нет в исходнике.",
                "Расширение содержания за пределы исходного текста.",
            ],
            "format_instructions": [
                "Верни краткие главные пункты, а не полный адаптированный текст.",
            ],
            "validation_hints": [
                "Результат должен быть заметно короче исходника.",
                "Форма должна быть списочной или блочной, а не как сплошной пересказ.",
            ],
        }

    return {
        "contract_id": "basic_simplify",
        "title": "Упрощённый текст",
        "purpose": "Создать полную адаптированную версию текста для чтения.",
        "required_structure": [
            "Связный адаптированный текст.",
            "Короткие абзацы.",
            "Заголовки там, где это полезно.",
            "Списки допустимы как вспомогательная структура.",
        ],
        "allowed_output_patterns": [
            "Полный адаптированный текст.",
            "Короткие пояснения терминов.",
            "Контролируемая перестройка структуры.",
        ],
        "forbidden_output_patterns": [
            "Только bullet summary вместо полного текста.",
            "Чрезмерное сокращение.",
            "Потеря учебных связей.",
            "Подмена полной адаптации простым списком ключевых пунктов.",
        ],
        "format_instructions": [
            "Верни полную адаптированную версию текста, а не конспект.",
        ],
        "validation_hints": [
            "Результат должен быть связным текстом, а не только списком.",
            "Не допускай слишком сильного сокращения исходного содержания.",
        ],
    }
