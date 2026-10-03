FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    GSMS_STORAGE_LOCAL_ROOT=/app/var/blobs \
    GSMS_CONTRACTS_DIR=/app/shared/contracts

WORKDIR /app

COPY pyproject.toml README.md ./
COPY gsms_core ./gsms_core
# Docling (moteur documentaire) avec PyTorch CPU : pas de pilotes CUDA, image bien plus légère.
RUN pip install --extra-index-url https://download.pytorch.org/whl/cpu ".[docling]"

# Modèles Docling (mise en page, tableaux, OCR) téléchargés au build : aucun téléchargement pendant
# l'analyse d'un document. Si le téléchargement échoue (réseau), le build continue et Docling les
# récupérera au premier PDF ; l'entrypoint n'utilise ce dossier que s'il est rempli.
RUN docling-tools models download -o /opt/docling-models \
    || (echo "AVERTISSEMENT : modèles Docling non téléchargés au build" && rm -rf /opt/docling-models)

COPY alembic.ini ./
COPY migrations ./migrations
COPY docker/entrypoint.sh /usr/local/bin/gsms-entrypoint
# Contrats inter-apps (finding.schema.json). Le docker-compose de la racine fournit le contexte
# « shared » ; un build isolé (docker build apps/core) utilise le dossier vide ci-dessous.
COPY --from=shared contracts /app/shared/contracts

RUN chmod +x /usr/local/bin/gsms-entrypoint \
    && useradd --create-home --uid 10001 gsms \
    && mkdir -p /app/var/blobs \
    && chown -R gsms /app/var
USER gsms

EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --retries=30 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health')"
ENTRYPOINT ["gsms-entrypoint"]
CMD ["uvicorn", "gsms_core.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
