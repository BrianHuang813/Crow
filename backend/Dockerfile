FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*
COPY . .
RUN pip install -e ".[dev]"
CMD ["sh", "-c", "alembic upgrade head && uvicorn crow.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
