import os
from gigachat import GigaChat

with GigaChat(
    credentials=os.environ["GIGACHAT_AUTH_KEY"],
    scope=os.environ.get("GIGACHAT_SCOPE", "GIGACHAT_API_PERS"),
    model=os.environ.get("GIGACHAT_MODEL", "GigaChat-2-Pro"),
    verify_ssl_certs=False,
) as client:
    response = client.chat("Адаптируй текст: Сложные биологические процессы требуют поэтапного объяснения.")
    print(response.choices[0].message.content)
