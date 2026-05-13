from dataclasses import dataclass
from typing import Protocol

from app.core.config import settings
from app.services.adaptation_prompt_builder import (
    AdaptationGenre,
    AdaptationMode,
    DEFAULT_ADAPTATION_GENRE,
    RetrievedKnowledgeChunkPromptContext,
    build_adaptation_system_prompt,
)


class LlmServiceError(Exception):
    pass


class LlmProviderConfigurationError(LlmServiceError):
    pass


class LlmProviderRequestError(LlmServiceError):
    pass


class LlmProvider(Protocol):
    provider_name: str

    def adapt_plain_text(self, source_text: str, system_prompt: str) -> str:
        ...


@dataclass
class PlainTextAdaptationRequest:
    source_text: str
    mode: AdaptationMode
    genre: AdaptationGenre = DEFAULT_ADAPTATION_GENRE
    retrieved_chunks: list[RetrievedKnowledgeChunkPromptContext] | None = None


@dataclass
class PlainTextAdaptationResult:
    adapted_text: str
    provider: str
    model: str


class LlmService:
    def __init__(self, provider: LlmProvider):
        self._provider = provider

    def adapt_plain_text(self, request: PlainTextAdaptationRequest) -> PlainTextAdaptationResult:
        adapted_text = self._provider.adapt_plain_text(
            source_text=request.source_text,
            system_prompt=build_adaptation_system_prompt(
                request.mode,
                genre=request.genre,
                retrieved_chunks=request.retrieved_chunks,
            ),
        )

        return PlainTextAdaptationResult(
            adapted_text=adapted_text,
            provider=self._provider.provider_name,
            model=_get_active_model_name(),
        )


def get_llm_service() -> LlmService:
    provider_name = settings.LLM_PROVIDER.strip().lower()

    if provider_name == "gigachat":
        from app.services.gigachat_provider import GigaChatProvider

        return LlmService(provider=GigaChatProvider())

    if provider_name == "openai":
        raise LlmProviderConfigurationError(
            "Провайдер OpenAI пока не подключён в этом шаге. Используйте LLM_PROVIDER=gigachat."
        )

    raise LlmProviderConfigurationError(
        f"Неподдерживаемый LLM_PROVIDER: {settings.LLM_PROVIDER}."
    )
def _get_active_model_name() -> str:
    provider_name = settings.LLM_PROVIDER.strip().lower()

    if provider_name == "gigachat":
        return settings.GIGACHAT_MODEL

    if provider_name == "openai":
        return settings.OPENAI_MODEL or ""

    return ""
