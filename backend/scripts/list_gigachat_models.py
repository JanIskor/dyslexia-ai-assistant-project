from __future__ import annotations

import json

from app.services.gigachat_provider import GigaChatProvider


def main() -> None:
    models = GigaChatProvider().list_models()
    print(json.dumps(models, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
