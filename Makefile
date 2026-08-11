.PHONY: setup install dev run build start lint clean

setup: install

install:
	@echo "Installing frontend dependencies..."
	npm install

dev: run

run:
	npm run dev

build:
	npm run build

start:
	npm start

lint:
	npm run lint

clean:
	rm -rf .next node_modules out
