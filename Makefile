.PHONY: setup install dev run build start lint clean

setup: install

install:
	@echo "Installing frontend dependencies..."
	pnpm install

dev: run

run:
	pnpm run dev

build:
	pnpm run build

start:
	pnpm start

lint:
	pnpm run lint

clean:
	rm -rf .next node_modules out
