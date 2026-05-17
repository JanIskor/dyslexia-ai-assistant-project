import unittest
from unittest.mock import patch

from app.services.gigachat_provider import GigaChatProvider


class _FakeMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class _FakeChoice:
    def __init__(self, content: str) -> None:
        self.message = _FakeMessage(content)


class _FakeResponse:
    def __init__(self, content: str) -> None:
        self.choices = [_FakeChoice(content)]


class _FakeClient:
    def __init__(self, *args, **kwargs) -> None:
        self.kwargs = kwargs
        self.payload = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def chat(self, payload):
        self.payload = payload
        return _FakeResponse("ok")


class GigaChatProviderTests(unittest.TestCase):
    def test_provider_uses_model_from_settings_in_client_and_payload(self) -> None:
        captured: dict[str, object] = {}

        class CapturingClient(_FakeClient):
            def __init__(self, *args, **kwargs) -> None:
                super().__init__(*args, **kwargs)
                captured["client_kwargs"] = kwargs

            def chat(self, payload):
                captured["payload"] = payload
                return super().chat(payload)

        with patch("app.services.gigachat_provider.settings.GIGACHAT_AUTH_KEY", "token"), patch(
            "app.services.gigachat_provider.settings.GIGACHAT_MODEL",
            "GigaChat-2-Pro",
        ), patch("app.services.gigachat_provider.GigaChat", CapturingClient):
            provider = GigaChatProvider()
            result = provider.adapt_plain_text("text", "system")

        self.assertEqual(result, "ok")
        self.assertEqual(captured["client_kwargs"]["model"], "GigaChat-2-Pro")
        self.assertEqual(captured["payload"].model, "GigaChat-2-Pro")


if __name__ == "__main__":
    unittest.main()
