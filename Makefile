.PHONY: up down logs register restart typecheck build

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f bot

register:
	docker compose run --rm bot register

restart:
	docker compose restart bot

typecheck:
	bun run typecheck

build:
	docker compose build
