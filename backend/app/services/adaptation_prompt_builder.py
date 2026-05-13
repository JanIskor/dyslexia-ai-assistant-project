from dataclasses import dataclass
from typing import Final, Literal


StrategyAdaptationMode = Literal["mode_a", "mode_b"]
LegacyAdaptationMode = Literal["basic_simplify", "structured_explanation", "key_points_focus"]
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
    "mode_a",
    "mode_b",
    "basic_simplify",
    "structured_explanation",
    "key_points_focus",
    "educational",
    "scientific_popular",
    "fiction",
    "legal",
    "instruction",
    "other",
]

DEFAULT_ADAPTATION_MODE: Final[StrategyAdaptationMode] = "mode_a"
DEFAULT_ADAPTATION_GENRE: Final[AdaptationGenre] = "educational"
ALL_GENRE_TAGS: Final[set[str]] = {
    "educational",
    "scientific_popular",
    "fiction",
    "legal",
    "instruction",
    "other",
}
ALL_MODE_TAGS: Final[set[str]] = {
    "mode_a",
    "mode_b",
    "basic_simplify",
    "structured_explanation",
    "key_points_focus",
}


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
    "Верни только готовый адаптированный текст без вводных комментариев от себя."
)

BASE_RAG_GUARDRAILS: Final[str] = (
    "Используй контекст из базы знаний только как методические рекомендации "
    "по адаптации текста для обучающегося с дислексией. "
    "Очень важно: "
    "не добавляй новые предметные факты, которых нет в исходном тексте; "
    "не расширяй содержание исходного материала за счёт внешних знаний; "
    "не подменяй смысл исходного текста новым содержанием; "
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
        "Предпочитай поддержку читаемости через деление перегруженных фрагментов, "
        "визуальную сегментацию, аккуратные абзацы, маркированные структуры и выделение опорных элементов "
        "без агрессивного перефразирования."
    ),
}

LEGACY_MODE_PROMPT_SUFFIXES: Final[dict[LegacyAdaptationMode, str]] = {
    "basic_simplify": (
        "Совместимость со старым режимом basic_simplify: "
        "сделай основной акцент на общем упрощении формулировок."
    ),
    "structured_explanation": (
        "Совместимость со старым режимом structured_explanation: "
        "сделай основной акцент на пошаговой и последовательной структуре."
    ),
    "key_points_focus": (
        "Совместимость со старым режимом key_points_focus: "
        "сделай основной акцент на опорных идеях и краткой структуре."
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


def normalize_adaptation_mode(mode: AdaptationMode) -> StrategyAdaptationMode:
    if mode == "mode_b":
        return "mode_b"
    return "mode_a"


def resolve_mode_filter_tags(mode: AdaptationMode | None) -> set[str]:
    if mode is None:
        return set()

    if mode == "mode_b":
        return {"mode_b"}

    if mode == "mode_a":
        return {"mode_a", "basic_simplify", "structured_explanation", "key_points_focus"}

    return {"mode_a", mode}


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
    retrieved_chunks: list[RetrievedKnowledgeChunkPromptContext] | None = None,
) -> str:
    normalized_mode = normalize_adaptation_mode(mode)
    prompt_parts = [
        BASE_PROMPT,
        BASE_RAG_GUARDRAILS,
        MODE_PROMPT_BLOCKS[normalized_mode],
        GENRE_PROMPT_BLOCKS[genre],
    ]

    legacy_mode_suffix = LEGACY_MODE_PROMPT_SUFFIXES.get(mode)
    if legacy_mode_suffix:
        prompt_parts.append(legacy_mode_suffix)

    knowledge_context_block = _build_knowledge_context_block(retrieved_chunks)
    if knowledge_context_block:
        prompt_parts.append(knowledge_context_block)

    return "\n\n".join(prompt_parts)
