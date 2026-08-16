.PHONY: dev dev-debug down migrate seed test-backend test-frontend logs clean

# ── Dev ──────────────────────────────────────────────────────────
dev:
	@echo "🚀 Starting PharmAssist Complaint Management System..."
	docker compose up --build

dev-debug:
	@echo "🚀 Starting with pgAdmin..."
	docker compose --profile debug up --build

down:
	docker compose down

down-clean:
	docker compose down -v --remove-orphans

# ── Database ──────────────────────────────────────────────────────
migrate:
	@echo "📦 Running Alembic migrations..."
	docker compose exec backend python -m alembic upgrade head

migrate-create:
	@echo "📝 Creating new migration (usage: make migrate-create MSG='your message')..."
	docker compose exec backend python -m alembic revision --autogenerate -m "$(MSG)"

seed:
	@echo "🌱 Seeding database with demo data..."
	docker compose exec backend python seed.py

# ── Testing ───────────────────────────────────────────────────────
test-backend:
	@echo "🧪 Running backend tests..."
	docker compose exec backend python -m pytest tests/ -v

test-frontend:
	@echo "🧪 Running frontend tests..."
	docker compose exec frontend npm test -- --run

test-all: test-backend test-frontend

# ── Logs ──────────────────────────────────────────────────────────
logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

# ── Utilities ─────────────────────────────────────────────────────
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true

shell-backend:
	docker compose exec backend /bin/sh

shell-db:
	docker compose exec postgres psql -U pharmassist -d pharmassist
