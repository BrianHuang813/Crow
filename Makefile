.PHONY: up down migrate test shell

up:
	docker compose up --build

down:
	docker compose down

migrate:
	docker compose run --rm api alembic upgrade head

test:
	docker compose run --rm api pytest tests/ -v

shell:
	docker compose run --rm api bash
