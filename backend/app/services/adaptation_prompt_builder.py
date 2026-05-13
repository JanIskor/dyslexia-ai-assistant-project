from dataclasses import dataclass
from typing import Final, Literal

from app.services.adaptation_output_contracts import get_adaptation_output_contract
from app.services.controlled_adaptation_policy_service import build_controlled_adaptation_policy
from app.services.factual_consistency_service import extract_protected_elements


ProductAdaptationMode = Literal["basic_simplify", "structured_explanation", "key_points_focus"]
StrategyAdaptationMode = Literal["mode_a", "mode_b"]
AdaptationMode = Literal[
    "mode_a",
    "mode_b",
    "basic_simplify",
    "structured_explanation",
    "key_points_focus",
]
AdaptationGenre = Literal[
    "educational",
    "scientific_popular",
    "fiction",
    "legal",
    "instruction",
    "other",
]
MethodologyAdaptationTag = Literal[
    "basic_simplify",
    "structured_explanation",
    "key_points_focus",
    "mode_a",
    "mode_b",
    "educational",
    "scientific_popular",
    "fiction",
    "legal",
    "instruction",
    "other",
]

DEFAULT_PRODUCT_ADAPTATION_MODE: Final[ProductAdaptationMode] = "basic_simplify"
DEFAULT_ADAPTATION_MODE: Final[ProductAdaptationMode] = DEFAULT_PRODUCT_ADAPTATION_MODE
DEFAULT_ADAPTATION_GENRE: Final[AdaptationGenre] = "educational"
GENERAL_RETRIEVAL_TAG: Final[str] = "general"
ALL_GENRE_TAGS: Final[set[str]] = {
    "educational",
    "scientific_popular",
    "fiction",
    "legal",
    "instruction",
    "other",
}
ALL_PRODUCT_MODE_TAGS: Final[set[str]] = {
    "basic_simplify",
    "structured_explanation",
    "key_points_focus",
}
ALL_STRATEGY_MODE_TAGS: Final[set[str]] = {"mode_a", "mode_b"}
ALL_MODE_TAGS: Final[set[str]] = ALL_PRODUCT_MODE_TAGS | ALL_STRATEGY_MODE_TAGS
ALL_METHODOLOGY_TAGS: Final[set[str]] = ALL_MODE_TAGS | ALL_GENRE_TAGS


@dataclass(frozen=True)
class RetrievedKnowledgeChunkPromptContext:
    document_title: str
    chunk_index: int
    content: str


BASE_PROMPT: Final[str] = (
    "Ты — ИИ-ассистент для преподавателя, который адаптирует текст "
    "для обучающегося с дислексией. "
    "Сохраняй смысл, факты, учебную точность и коммуникативную задачу исходного текста. "
    "Не придумывай новую информацию и не добавляй того, чего нет в исходном материале. "
    "Не изменяй числа, даты, единицы измерения, формулы, имена, технические обозначения и ключевые термины. "
    "Не добавляй факты, которых нет в исходном тексте. "
    "Если в тексте есть сложная формула, сохрани её и при необходимости поясни словами, не меняя саму запись. "
    "Верни только готовый адаптированный текст без вводных комментариев от себя."
)

BASE_RAG_GUARDRAILS: Final[str] = (
    "Используй контекст из базы знаний только как методические рекомендации "
    "по адаптации текста для обучающегося с дислексией. "
    "Очень важно: "
    "не добавляй новые предметные факты, которых нет в исходном тексте; "
    "не расширяй содержание исходного материала за счёт внешних знаний; "
    "не подменяй смысл исходного текста новым содержанием; "
    "не меняй числа, даты, единицы измерения, формулы и технические обозначения; "
    "не используй контекст из базы знаний как источник предметной информации; "
    "используй его только для выбора формы подачи, например: "
    "деление длинных предложений, визуальная сегментация, "
    "синтаксическое упрощение, пояснение терминов, повышение читаемости. "
    "Твоя задача — адаптировать исходный учебный материал, а не дописывать его."
)

MODE_PROMPT_BLOCKS: Final[dict[StrategyAdaptationMode, str]] = {
    "mode_a": (
        "Стратегия адаптации: mode A, сильное педагогическое упрощение. "
        "Разрешены: синтаксическое упрощение, деление длинных предложений, "
        "перестройка структуры, пошаговая подача, переформулирование, "
        "краткие пояснения терминов и повышение визуальной читаемости. "
        "Можно сокращать второстепенные детали, если смысл и учебная точность сохраняются."
    ),
    "mode_b": (
        "Стратегия адаптации: mode B, минимальное семантическое вмешательство. "
        "Приоритет: максимально точное сохранение смысла, фактов, терминологии и стиля исходного текста. "
        "Сильное переписывание запрещено. Замена терминов на другие слова запрещена. "
        "Сохраняй исходные числа, даты, единицы измерения, формулы, имена и технические обозначения без изменений. "
        "Предпочитай поддержку читаемости через деление перегруженных фрагментов, "
        "визуальную сегментацию, аккуратные абзацы, маркированные структуры и выделение опорных элементов "
        "без агрессивного перефразирования."
    ),
}

PRODUCT_MODE_PROMPT_BLOCKS: Final[dict[ProductAdaptationMode, str]] = {
    "basic_simplify": (
        "Метод адаптации: basic_simplify. "
        "Главная педагогическая цель — сделать текст проще и легче для чтения, "
        "снижая перегрузку формулировок."
    ),
    "structured_explanation": (
        "Метод адаптации: structured_explanation. "
        "Главная педагогическая цель — сделать объяснение пошаговым, "
        "последовательным и прозрачным по структуре."
    ),
    "key_points_focus": (
        "Метод адаптации: key_points_focus. "
        "Главная педагогическая цель — выделить главное, опорные идеи и "
        "не перегружать второстепенными деталями."
    ),
}

GENRE_PROMPT_BLOCKS: Final[dict[AdaptationGenre, str]] = {
    "educational": (
        "Жанр: учебный текст. "
        "Сохраняй учебную логику, определения, причинно-следственные связи и последовательность объяснения."
    ),
    "scientific_popular": (
        "Жанр: научно-популярный текст. "
        "Сохраняй научную корректность, но делай объяснение доступным и прозрачным для чтения."
    ),
    "fiction": (
        "Жанр: художественный текст. "
        "Осторожно обращайся с авторским стилем, образностью, ритмом и интонацией."
    ),
    "legal": (
        "Жанр: юридический текст. "
        "Особенно строго сохраняй формулировки, условия, ограничения и нормативный смысл."
    ),
    "instruction": (
        "Жанр: инструкция. "
        "Сохраняй порядок действий, условия выполнения, предупреждения и операционную точность."
    ),
    "other": (
        "Жанр: другой. "
        "Определи наиболее безопасную стратегию адаптации по функции текста и не искажай его назначение."
    ),
}


def is_strategy_mode(mode: str | None) -> bool:
    return mode in ALL_STRATEGY_MODE_TAGS


def is_product_mode(mode: str | None) -> bool:
    return mode in ALL_PRODUCT_MODE_TAGS


def resolve_strategy_mode(
    mode: AdaptationMode | None,
    genre: AdaptationGenre | None = DEFAULT_ADAPTATION_GENRE,
) -> StrategyAdaptationMode:
    if mode == "mode_b":
        return "mode_b"
    if mode == "mode_a":
        return "mode_a"

    effective_mode = mode or DEFAULT_PRODUCT_ADAPTATION_MODE
    effective_genre = genre or DEFAULT_ADAPTATION_GENRE

    if effective_genre in {"legal", "fiction"}:
        return "mode_b"
    if effective_mode == "key_points_focus":
        return "mode_b"
    return "mode_a"


def normalize_adaptation_mode(
    mode: AdaptationMode | None,
    genre: AdaptationGenre | None = DEFAULT_ADAPTATION_GENRE,
) -> StrategyAdaptationMode:
    return resolve_strategy_mode(mode, genre)


def build_retrieval_tags(
    mode: AdaptationMode | None,
    genre: AdaptationGenre | None = DEFAULT_ADAPTATION_GENRE,
) -> list[str]:
    effective_genre = genre or DEFAULT_ADAPTATION_GENRE
    resolved_strategy = resolve_strategy_mode(mode, effective_genre)
    tags: list[str] = []

    if mode and is_product_mode(mode):
        tags.append(mode)

    if mode and is_strategy_mode(mode):
        tags.append(mode)

    tags.extend([resolved_strategy, effective_genre, GENERAL_RETRIEVAL_TAG])
    return list(dict.fromkeys(tags))


def resolve_mode_filter_tags(
    mode: AdaptationMode | None,
    *,
    genre: AdaptationGenre | None = DEFAULT_ADAPTATION_GENRE,
) -> set[str]:
    if mode is None:
        return set()
    return set(build_retrieval_tags(mode, genre))


def _build_knowledge_context_block(
    retrieved_chunks: list[RetrievedKnowledgeChunkPromptContext] | None,
) -> str:
    if not retrieved_chunks:
        return ""

    knowledge_context = "\n\n".join(
        (
            f"[Источник: {chunk.document_title}, chunk {chunk.chunk_index}]\n"
            f"{chunk.content.strip()}"
        )
        for chunk in retrieved_chunks[:5]
        if chunk.content.strip()
    )

    if not knowledge_context:
        return ""

    return (
        "Ниже дан дополнительный контекст из базы знаний. "
        "Используй его только как методические рекомендации по форме адаптации, "
        "а не как источник новых предметных фактов.\n\n"
        f"Контекст из базы знаний:\n{knowledge_context}"
    )


def build_adaptation_system_prompt(
    mode: AdaptationMode,
    *,
    genre: AdaptationGenre = DEFAULT_ADAPTATION_GENRE,
    source_text: str,
    retrieved_chunks: list[RetrievedKnowledgeChunkPromptContext] | None = None,
) -> str:
    normalized_product_mode = mode if is_product_mode(mode) else DEFAULT_PRODUCT_ADAPTATION_MODE
    normalized_mode = normalize_adaptation_mode(mode, genre)
    retrieval_tags = build_retrieval_tags(mode, genre)
    protected_elements = extract_protected_elements(source_text)
    policy = build_controlled_adaptation_policy(
        product_mode=normalized_product_mode,
        strategy_mode=normalized_mode,
        genre=genre,
        original_text=source_text,
        protected_elements=protected_elements,
    )
    output_contract = get_adaptation_output_contract(
        product_mode=normalized_product_mode,
        strategy_mode=normalized_mode,
        genre=genre,
        risk_level=policy["risk_level"],
    )
    prompt_parts = [
        BASE_PROMPT,
        BASE_RAG_GUARDRAILS,
        PRODUCT_MODE_PROMPT_BLOCKS.get(normalized_product_mode),
        MODE_PROMPT_BLOCKS[normalized_mode],
        GENRE_PROMPT_BLOCKS[genre],
        f"Уровень риска адаптации: {policy['risk_level']}.",
        policy["policy_summary"],
        _build_protected_elements_block(protected_elements),
        _build_operations_block(
            title="Разрешённые операции",
            operations=policy["allowed_operations"],
        ),
        _build_operations_block(
            title="Запрещённые операции",
            operations=policy["forbidden_operations"],
        ),
        _build_output_contract_block(
            product_mode=normalized_product_mode,
            output_contract=output_contract,
            protected_elements=protected_elements,
        ),
        (
            "Правило неопределённости: если ты не уверен, как безопасно упростить фрагмент, "
            "сохрани исходную формулировку. Не придумывай объяснения и не добавляй факты, "
            "которых нет в источнике. Защищённые элементы можно только визуально структурировать "
            "или пояснить после сохранения их исходной формы."
        ),
        f"Связанные теги применения: {', '.join(retrieval_tags)}.",
    ]

    knowledge_context_block = _build_knowledge_context_block(retrieved_chunks)
    if knowledge_context_block:
        prompt_parts.append(knowledge_context_block)

    return "\n\n".join(part for part in prompt_parts if part)


def _build_protected_elements_block(protected_elements: dict[str, list[str]]) -> str:
    visible_items: list[str] = []
    for label, key in (
        ("Числа", "numbers"),
        ("Проценты", "percentages"),
        ("Даты", "dates"),
        ("Диапазоны", "ranges"),
        ("Единицы измерения", "units"),
        ("Формулы", "formulas"),
        ("Технические обозначения", "technical_symbols"),
        ("Имена и сущности", "named_entities"),
        ("Цитируемые термины", "quoted_terms"),
        ("Термины предметной области", "domain_terms"),
        ("Юридические маркеры", "legal_markers"),
        ("Маркеры порядка действий", "action_order_markers"),
        ("Маркеры условий и исключений", "condition_exception_markers"),
    ):
        values = protected_elements.get(key) or []
        if not values:
            continue
        preview = ", ".join(values[:6])
        if len(values) > 6:
            preview += ", ..."
        visible_items.append(f"{label}: {preview}")

    if not visible_items:
        return "Защищённые элементы: явных чувствительных элементов не найдено, но факты всё равно нельзя менять."

    return "Защищённые элементы, которые нужно сохранить без изменения:\n- " + "\n- ".join(visible_items)


def _build_operations_block(*, title: str, operations: list[str]) -> str:
    return f"{title}:\n- " + "\n- ".join(operations)


def _build_output_contract_block(
    *,
    product_mode: ProductAdaptationMode,
    output_contract: dict[str, object],
    protected_elements: dict[str, list[str]],
) -> str:
    preserve_categories = [
        label
        for label, key in (
            ("числа", "numbers"),
            ("даты", "dates"),
            ("единицы измерения", "units"),
            ("формулы", "formulas"),
            ("термины", "important_terms"),
            ("условия и исключения", "condition_exception_markers"),
            ("порядок действий", "action_order_markers"),
        )
        if protected_elements.get(key)
    ]
    preserve_text = ", ".join(preserve_categories) if preserve_categories else "ключевые факты и формулировки"
    required_structure = "\n- ".join(output_contract["required_structure"])
    forbidden_patterns = "\n- ".join(output_contract["forbidden_output_patterns"])
    format_instructions = "\n- ".join(output_contract["format_instructions"])
    return (
        "OUTPUT CONTRACT:\n"
        f"- product mode: {product_mode}\n"
        f"- output type: {output_contract['title']}\n"
        f"- purpose: {output_contract['purpose']}\n"
        f"- required format:\n- {required_structure}\n"
        f"- do not produce:\n- {forbidden_patterns}\n"
        f"- preserve: {preserve_text}\n"
        f"- format instructions:\n- {format_instructions}"
    )
