# Backend Foundation

## Запуск

1. В корне папки backend установите зависимости:
```bash
pip install -r requirements.txt
```

2. Запустите приложение:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

3. Проверьте health:
- http://127.0.0.1:8000/health
- http://127.0.0.1:8000/api/v1/health
