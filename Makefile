.PHONY: compose-prod-up compose-dokploy-up generate-postgres-password db-reset-migrations

compose-prod-up:
	docker compose -f compose.prod.yml up --build

compose-dokploy-up:
	docker compose -f compose.dokploy.yml up --build

generate-postgres-password:
	openssl rand -base64 24

db-reset-migrations:
	bun run src/db/reset.ts
	rm -rf src/db/migrations
	bun run db:generate
	bun run db:migrate
