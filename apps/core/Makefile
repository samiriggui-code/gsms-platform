PY ?= python3
VENV ?= .venv
BIN := $(VENV)/bin

.PHONY: install dev test lint fmt migrate revision seed docker

$(BIN)/python:
	$(PY) -m venv $(VENV)

install: $(BIN)/python
	$(BIN)/pip install -U pip
	$(BIN)/pip install -e '.[dev]'

dev:
	$(BIN)/uvicorn gsms_core.main:create_app --factory --reload --port 8000

test:
	$(BIN)/pytest -q

lint:
	$(BIN)/ruff check .
	$(BIN)/ruff format --check .

fmt:
	$(BIN)/ruff format .
	$(BIN)/ruff check --fix .

migrate:
	mkdir -p var
	$(BIN)/alembic upgrade head

revision:
	$(BIN)/alembic revision --autogenerate -m "$(m)"

seed: migrate
	$(BIN)/python -m gsms_core.scripts.seed_demo

docker:
	docker build -t gsms-core:dev .
