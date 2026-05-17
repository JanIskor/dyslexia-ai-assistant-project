import logging

from gigachat import GigaChat
from gigachat.models import Chat, Messages, MessagesRole

from app.core.config import settings
from app.services.llm_service import LlmProvider, LlmProviderConfigurationError, LlmProviderRequestError


logger = logging.getLogger(__name__)


class GigaChatProvider(LlmProvider):
    provider_name = "gigachat"

    def adapt_plain_text(self, source_text: str, system_prompt: str) -> str:
        if not settings.GIGACHAT_AUTH_KEY:
            raise LlmProviderConfigurationError("Не настроен GigaChat: отсутствует GIGACHAT_AUTH_KEY.")

        self._log_dev_configuration(request_model=settings.GIGACHAT_MODEL)
        payload = Chat(
            model=settings.GIGACHAT_MODEL,
            messages=[
                Messages(role=MessagesRole.SYSTEM, content=system_prompt),
                Messages(role=MessagesRole.USER, content=source_text),
            ],
        )

        try:
            with GigaChat(
                credentials=settings.GIGACHAT_AUTH_KEY,
                scope=settings.GIGACHAT_SCOPE,
                model=settings.GIGACHAT_MODEL,
                base_url=settings.GIGACHAT_BASE_URL,
                verify_ssl_certs=False,
            ) as client:
                response = client.chat(payload)
        except Exception as error:  # pragma: no cover - vendor runtime surface
            raise LlmProviderRequestError("Не удалось получить ответ от GigaChat.") from error

        if not response.choices:
            raise LlmProviderRequestError("GigaChat вернул пустой ответ.")

        content = response.choices[0].message.content.strip()

        if not content:
            raise LlmProviderRequestError("GigaChat вернул пустой текст ответа.")

        return content

    def list_models(self) -> list[dict[str, object]]:
        if not settings.GIGACHAT_AUTH_KEY:
            raise LlmProviderConfigurationError("Не настроен GigaChat: отсутствует GIGACHAT_AUTH_KEY.")

        self._log_dev_configuration(request_model=None)
        try:
            with GigaChat(
                credentials=settings.GIGACHAT_AUTH_KEY,
                scope=settings.GIGACHAT_SCOPE,
                model=settings.GIGACHAT_MODEL,
                base_url=settings.GIGACHAT_BASE_URL,
                verify_ssl_certs=False,
            ) as client:
                response = client.get_models()
        except Exception as error:  # pragma: no cover - vendor runtime surface
            raise LlmProviderRequestError("Не удалось получить список моделей GigaChat.") from error

        models = getattr(response, "data", response)
        if not models:
            return []

        normalized_models: list[dict[str, object]] = []
        for item in models:
            model_id = (
                getattr(item, "id_", None)
                or getattr(item, "id", None)
                or getattr(item, "name", None)
                or str(item)
            )
            normalized_models.append(
                {
                    "id": model_id,
                    "raw_id": getattr(item, "id", None),
                    "owned_by": getattr(item, "owned_by", None),
                    "object": getattr(item, "object_", None) or getattr(item, "object", None),
                }
            )
        return normalized_models

    def _log_dev_configuration(self, *, request_model: str | None) -> None:
        if settings.APP_ENV.strip().lower() not in {"dev", "development", "local"}:
            return

        logger.info(
            "GigaChat provider config: provider=%s model=%s scope=%s request_model=%s",
            self.provider_name,
            settings.GIGACHAT_MODEL,
            settings.GIGACHAT_SCOPE,
            request_model,
        )
