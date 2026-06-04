all:
	docker compose down
	docker compose up -d --build

frontend:
	docker compose down frontend
	docker compose up -d frontend

db:
	docker compose down db
	docker compose up -d db

app:
	docker compose down app
	docker compose up -d app

server: app frontend

setting:
	cp .env.example .env
	docker network create app_default || true

wait_db:
	@echo "Waiting for db to be ready..."
	@for i in $$(seq 1 60); do \
		if docker compose exec -T db mysqladmin ping -uroot -proot_pw --silent >/dev/null 2>&1; then \
			echo "db is ready"; \
			exit 0; \
		fi; \
		echo "  ...waiting ($$i)"; \
		sleep 2; \
	done; \
	echo "db did not become ready in time"; \
	exit 1

test_setting: wait_db
	docker compose exec -T db mysql -uroot -proot_pw -e \
		"CREATE DATABASE IF NOT EXISTS purchase_orders_test CHARACTER SET utf8mb4; \
		GRANT ALL PRIVILEGES ON purchase_orders_test.* TO 'app'@'%'; FLUSH PRIVILEGES;"

all_setting_strat: setting db app frontend test_setting

test_go:
	docker compose exec app npm test