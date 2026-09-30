# TenderAI MCP — VPS (Traefik). Smoke :8090 avant DNS mcp.
FROM python:3.12-slim

WORKDIR /opt/tenderai

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY .env.example ./.env.example

RUN mkdir -p /opt/tenderai/db /opt/tenderai/data \
  && useradd -r -u 10001 tenderai \
  && chown -R tenderai:tenderai /opt/tenderai

USER tenderai
ENV TRANSPORT=http
ENV HOST=0.0.0.0
ENV PORT=8090

EXPOSE 8090
CMD ["python", "-m", "app.server"]
