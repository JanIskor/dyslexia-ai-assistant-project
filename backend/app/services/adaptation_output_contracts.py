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
    golden_template_title: str | None
    golden_template_structure: list[str]
    golden_template_rules: list[str]


class GoldenTemplateGuidance(TypedDict):
    template_id: str
    title: str
    structure: list[str]
    rules: list[str]


def get_adaptation_output_contract(
    *,
    product_mode: ProductAdaptationMode,
    strategy_mode: StrategyAdaptationMode,
    genre: AdaptationGenre,
    risk_level: RiskLevel,
) -> AdaptationOutputContract:
    golden_template = resolve_golden_template(
        product_mode=product_mode,
        strategy_mode=strategy_mode,
        genre=genre,
    )
    contract = _build_base_contract(
        product_mode=product_mode,
        strategy_mode=strategy_mode,
        genre=genre,
        risk_level=risk_level,
        golden_template=golden_template,
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


def resolve_golden_template(
    *,
    product_mode: ProductAdaptationMode,
    strategy_mode: StrategyAdaptationMode,
    genre: AdaptationGenre,
) -> GoldenTemplateGuidance | None:
    if genre == "educational" and product_mode == "basic_simplify":
        return {
            "template_id": "educational_basic_simplify",
            "title": "Учебная адаптация с главной мыслью и тематическими блоками",
            "structure": [
                "# [Короткий учебный заголовок]",
                "Главная мысль: ...",
                "## 1. Что это такое",
                "## 2. Как это происходит",
                "## 3. От чего зависит",
                "## 4. Почему это важно",
                "Вывод: ...",
            ],
            "rules": [
                "Используй только те разделы, которые действительно поддержаны исходным текстом.",
                "Не придумывай отсутствующие разделы и не заполняй их внешними фактами.",
                "Сохраняй исходные термины и поясняй их простыми словами без подмены смысла.",
                "Не вводи новые обозначения, если их нет в источнике.",
                "Не вводи сокращения, формулы и символы, которых не было в исходном тексте.",
            ],
        }

    if genre == "educational" and product_mode == "structured_explanation":
        return {
            "template_id": "educational_structured_explanation",
            "title": "Учебное пошаговое объяснение процесса",
            "structure": [
                "# Как происходит [процесс]",
                "## Шаг 1. ...",
                "## Шаг 2. ...",
                "## Шаг 3. ...",
                "## Что получается в результате",
                "## Почему это важно",
            ],
            "rules": [
                "Шаги должны отражать реальные этапы процесса, а не просто нумеровать абзацы источника.",
                "Не объединяй несколько шагов в одном заголовке.",
                "Не добавляй шаги, которых нет в исходной логике текста.",
                "Не вводи новую нотацию и сокращения, которых не было в источнике.",
            ],
        }

    if genre == "educational" and product_mode == "key_points_focus":
        return {
            "template_id": "educational_key_points_focus",
            "title": "Учебное выделение главного",
            "structure": [
                "# Главное",
                "- ...",
                "## Важно",
                "- ...",
                "## Запомнить",
                "- ...",
            ],
            "rules": [
                "Делай результат кратким и опорным, а не полным пересказом.",
                "Не добавляй внешние факты, новые выводы и новую нотацию.",
                "Сохраняй исходную терминологию как опорную.",
                "Не заменяй слова новыми символами и сокращениями.",
            ],
        }

    if genre == "legal" and (strategy_mode == "mode_b" or product_mode == "key_points_focus"):
        return {
            "template_id": "legal_preservation_mode_b",
            "title": "Юридическая сегментация с сохранением формулировок",
            "structure": [
                "# [Нейтральное название документа]",
                "Кратко: document explains what is regulated.",
                "## 1. Кто участвует",
                "## 2. Для чего используются данные / что регулируется",
                "## 3. Какие сведения или действия указаны",
                "## 4. Ограничения и условия",
                "## 5. Срок действия / порядок изменения / отзыв",
                "## 6. Право на запрос / ответ / действие организации",
            ],
            "rules": [
                "Используй только те разделы, которые реально поддержаны исходным документом.",
                "Предпочитай сегментацию и списки, а не свободный пересказ.",
                "Не подменяй юридические субъекты бытовыми словами и не сужай значение формулировок.",
                "Не добавляй примеры, если их нет в исходнике.",
                "Если фразу опасно упрощать, сохрани её максимально близко к исходнику.",
            ],
        }

    return None


def _build_base_contract(
    *,
    product_mode: ProductAdaptationMode,
    strategy_mode: StrategyAdaptationMode,
    genre: AdaptationGenre,
    risk_level: RiskLevel,
    golden_template: GoldenTemplateGuidance | None,
) -> AdaptationOutputContract:
    if product_mode == "structured_explanation":
        required_structure = [
            "Этапы или шаги.",
            "Последовательная логика.",
            "Явные переходы между шагами.",
        ]
        format_instructions = [
            "Верни пошаговое объяснение, а не обычный пересказ.",
        ]
        validation_hints = [
            "В тексте должны быть шаги, этапы или явная последовательность.",
            "Избегай длинных абзацев без структурных маркеров.",
        ]

        if genre == "fiction":
            required_structure.append("Каждый блок оформляется как отдельный заголовок вида «### Эпизод 1».")
            format_instructions.append("Для художественного текста используй формат «### Эпизод 1», «### Эпизод 2», а не технические шаги.")
            validation_hints.append("Для fiction ожидаются markers вида «Эпизод 1», а не «Шаг 1 / Шаг 2».")
        else:
            required_structure.append("Каждый шаг оформляется отдельно как «### Шаг 1», «### Шаг 2».")
            format_instructions.append("Используй отдельные заголовки «### Шаг 1», «### Шаг 2», не объединяй несколько шагов в одном заголовке.")

        return {
            "contract_id": "structured_explanation",
            "title": "Пошаговое объяснение",
            "purpose": "Создать последовательное пошаговое объяснение материала.",
            "required_structure": required_structure,
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
            "format_instructions": format_instructions,
            "validation_hints": validation_hints,
            "golden_template_title": golden_template["title"] if golden_template is not None else None,
            "golden_template_structure": golden_template["structure"] if golden_template is not None else [],
            "golden_template_rules": golden_template["rules"] if golden_template is not None else [],
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
                "Новые символы, формулы, сокращения и обозначения, которых нет в исходнике.",
            ],
            "format_instructions": [
                "Верни краткие главные пункты, а не полный адаптированный текст.",
                "Не вводи новую нотацию и новые сокращения.",
            ],
            "validation_hints": [
                "Результат должен быть заметно короче исходника.",
                "Форма должна быть списочной или блочной, а не как сплошной пересказ.",
                "Новые символы и сокращения недопустимы, если их нет в исходном тексте.",
            ],
            "golden_template_title": golden_template["title"] if golden_template is not None else None,
            "golden_template_structure": golden_template["structure"] if golden_template is not None else [],
            "golden_template_rules": golden_template["rules"] if golden_template is not None else [],
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
            "Введение новой нотации, формул, символов и сокращений, которых нет в исходнике.",
        ],
        "format_instructions": [
            "Верни полную адаптированную версию текста, а не конспект.",
            "Не вводи новые обозначения и сокращения, если их нет в исходном тексте.",
        ],
        "validation_hints": [
            "Результат должен быть связным текстом, а не только списком.",
            "Не допускай слишком сильного сокращения исходного содержания.",
            "Не расширяй сферу утверждений и не вводи новую нотацию без опоры на источник.",
        ],
        "golden_template_title": golden_template["title"] if golden_template is not None else None,
        "golden_template_structure": golden_template["structure"] if golden_template is not None else [],
        "golden_template_rules": golden_template["rules"] if golden_template is not None else [],
    }
