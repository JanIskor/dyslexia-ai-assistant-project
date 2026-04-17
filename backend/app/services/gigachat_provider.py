from gigachat import GigaChat
from gigachat.models import Chat, Messages, MessagesRole

from app.core.config import settings
from app.services.llm_service import LlmProvider, LlmProviderConfigurationError, LlmProviderRequestError


class GigaChatProvider(LlmProvider):
    provider_name = "gigachat"

    def adapt_plain_text(self, source_text: str, system_prompt: str) -> str:
        if not settings.GIGACHAT_AUTH_KEY:
            raise LlmProviderConfigurationError("Не настроен GigaChat: отсутствует GIGACHAT_AUTH_KEY.")

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
