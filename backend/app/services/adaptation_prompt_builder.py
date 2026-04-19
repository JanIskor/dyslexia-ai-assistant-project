from dataclasses import dataclass
from typing import Final, Literal


AdaptationMode = Literal["basic_simplify", "structured_explanation", "key_points_focus"]

DEFAULT_ADAPTATION_MODE: Final[AdaptationMode] = "basic_simplify"


@dataclass(frozen=True)
class RetrievedKnowledgeChunkPromptContext:
    document_title: str
    chunk_index: int
    content: str


BASE_PROMPT: Final[str] = (
    "Ты — ИИ-ассистент для преподавателя, который адаптирует учебный текст "
    "для обучающегося с дислексией. "
    "Сохраняй смысл, учебную точность и факты исходного текста. "
    "Не придумывай новую информацию и не добавляй того, чего нет в исходном материале. "
    "Пиши простым, спокойным и понятным русским языком. "
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
    "упрощение формулировок, сокращение перегруженных предложений, "
    "пошаговая структура, выделение главного, повышение читаемости. "
    "Твоя задача — адаптировать исходный учебный материал, а не дописывать его."
)

MODE_PROMPT_BLOCKS: Final[dict[AdaptationMode, str]] = {
    "basic_simplify": (
        "Режим: упростить текст. "
        "Переформулируй текст проще, сокращай слишком длинные предложения, "
        "заменяй сложные конструкции на более понятные, "
        "но не теряй важные детали и не искажай смысл."
    ),
    "structured_explanation": (
        "Режим: сделать пошаговым. "
        "Представь материал в более структурном и последовательном виде. "
        "Разбивай объяснение на короткие логические шаги, пункты или абзацы, "
        "чтобы читателю было проще следить за ходом мысли."
    ),
    "key_points_focus": (
        "Режим: выделить главное. "
        "Сделай ответ более коротким и концентрированным. "
        "Оставь только ключевые мысли и самые важные опорные пункты. "
        "Убирай второстепенные детали, если это не искажает смысл."
    ),
}


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
    retrieved_chunks: list[RetrievedKnowledgeChunkPromptContext] | None = None,
) -> str:
    prompt_parts = [
        BASE_PROMPT,
        BASE_RAG_GUARDRAILS,
        MODE_PROMPT_BLOCKS[mode],
    ]

    knowledge_context_block = _build_knowledge_context_block(retrieved_chunks)
    if knowledge_context_block:
        prompt_parts.append(knowledge_context_block)

    return "\n\n".join(prompt_parts)