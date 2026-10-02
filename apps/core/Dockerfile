FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY pyproject.toml README.md ./
COPY gsms_core ./gsms_core
RUN pip install .

COPY alembic.ini ./
COPY migrations ./migrations

RUN useradd --create-home --uid 10001 gsms && mkdir -p /app/var && chown -R gsms /app/var
USER gsms

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn gsms_core.main:create_app --factory --host 0.0.0.0 --port 8000"]
