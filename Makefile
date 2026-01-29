up:
	docker-compose up --build

down:
	docker-compose down

test:
	go test ./...

lint:
	golangci-lint run

db-shell:
	docker-compose exec db psql -U campusloop -d campusloop_db
