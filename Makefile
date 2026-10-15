.PHONY: help build up down restart logs ps migrate seed key cache bash-backend bash-frontend dev-up dev-down dev-logs

help:
	@echo "================================================================="
	@echo "WhatsOmni Docker Management CLI"
	@echo "================================================================="
	@echo "make build          - Build or rebuild all production Docker images"
	@echo "make up             - Start production containers in background"
	@echo "make down           - Stop and remove production containers"
	@echo "make restart        - Restart all production containers"
	@echo "make logs           - Follow logs from all production containers"
	@echo "make ps             - View status of all running containers"
	@echo "make migrate        - Execute Laravel database migrations"
	@echo "make seed           - Run database seeders"
	@echo "make key            - Generate a fresh Laravel application key"
	@echo "make cache          - Clear and rebuild application caches"
	@echo "make bash-backend   - Open an interactive shell in the backend container"
	@echo "make bash-frontend  - Open an interactive shell in the frontend container"
	@echo ""
	@echo "Development Commands:"
	@echo "make dev-up         - Start local development stack with live volume mounts"
	@echo "make dev-down       - Stop local development stack"
	@echo "make dev-logs       - Follow logs in local development stack"
	@echo "================================================================="

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

ps:
	docker compose ps

migrate:
	docker compose exec backend php artisan migrate --force

seed:
	docker compose exec backend php artisan db:seed --force

key:
	docker compose exec backend php artisan key:generate

cache:
	docker compose exec backend php artisan config:cache
	docker compose exec backend php artisan route:cache
	docker compose exec backend php artisan view:cache
	docker compose exec backend php artisan event:cache

bash-backend:
	docker compose exec backend sh

bash-frontend:
	docker compose exec frontend sh

dev-up:
	docker compose -f docker-compose.dev.yml up -d --build

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f
