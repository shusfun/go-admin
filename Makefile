SHELL := /bin/zsh

.DEFAULT_GOAL := help

ifneq ("$(wildcard config/dev-ports.env)","")
include config/dev-ports.env
endif

PROJECT := go-admin
ROOT_DIR := $(CURDIR)
ROOT_PACKAGE_NAME := $(shell node -e "process.stdout.write(require('./package.json').name)")
PROJECT_PREFIX ?= $(shell node -e "const name=require('./package.json').name;const normalized=name.toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$$/g,'');process.stdout.write(normalized)")
CONFIG_FILE ?= config/settings.pg.yml
DEV_BACKEND_PORT ?= 18123
DEV_ADMIN_PORT ?= 26173
DEV_MOBILE_PORT ?= 26174

GO_TMP_DIR := $(ROOT_DIR)/.tmp/go
GO_BIN_DIR := $(ROOT_DIR)/.tmp/bin
GO_CACHE_DIR := $(GO_TMP_DIR)/cache
GO_MOD_CACHE_DIR := $(GO_TMP_DIR)/mod
GO_ENV := GOCACHE="$(GO_CACHE_DIR)" GOMODCACHE="$(GO_MOD_CACHE_DIR)" GOBIN="$(GO_BIN_DIR)"

PNPM := pnpm
PNPM_INSTALL := pnpm install --store-dir ./.pnpm-store
SWAG := $(GO_BIN_DIR)/swag
OPENAPI_SOURCE := docs/admin/admin_swagger.json
OPENAPI_TARGET := frontend/packages/api/openapi/admin.json
DOCKER_ENV_FILE := config/dev-ports.env
DOCKER_COMPOSE := docker compose --project-name "$(PROJECT_PREFIX)" --env-file "$(DOCKER_ENV_FILE)"
APP_COMPOSE := $(DOCKER_COMPOSE)
INFRA_COMPOSE := $(DOCKER_COMPOSE) -f docker-compose.dev.yml
INFRA_DATA_DIR := $(ROOT_DIR)/.tmp/docker

.PHONY: help prepare-go-env init doctor setup-status env-print check-dev-ports infra-up reinit deps-backend deps-frontend dev-backend dev-admin dev-mobile build build-backend build-admin build-mobile build-frontend build-docker test-backend test-frontend test-all fmt typecheck db-migrate openapi docker-up docker-down deploy

help:
	@printf "\n帮助\n\n"
	@printf "  %-22s %s\n" "make help" "分组显示所有可用命令"
	@printf "\n环境\n\n"
	@printf "  %-22s %s\n" "make init" "初始化本地依赖并生成 OpenAPI 产物"
	@printf "  %-22s %s\n" "make doctor" "检查 go / pnpm / docker / docker compose"
	@printf "  %-22s %s\n" "make setup-status" "检查当前是否会进入 Setup Wizard"
	@printf "  %-22s %s\n" "make env-print" "打印当前关键环境变量、端口与容器前缀"
	@printf "  %-22s %s\n" "make infra-up" "启动 PostgreSQL + Redis 开发基础设施"
	@printf "  %-22s %s\n" "make reinit" "重置应用栈、PG/Redis 数据卷与安装态，重新走 setup"
	@printf "\n开发 (dev-*)\n\n"
	@printf "  %-22s %s\n" "make dev-backend" "go run . server -c $(CONFIG_FILE)"
	@printf "  %-22s %s\n" "make dev-admin" "pnpm --filter @suiyuan/admin-web dev"
	@printf "  %-22s %s\n" "make dev-mobile" "pnpm --filter @suiyuan/mobile-h5 dev"
	@printf "\n构建 (build-*)\n\n"
	@printf "  %-22s %s\n" "make build" "兼容别名，等价于 make build-backend"
	@printf "  %-22s %s\n" "make build-backend" "CGO_ENABLED=0 构建 Go 二进制"
	@printf "  %-22s %s\n" "make build-admin" "仅构建 admin-web"
	@printf "  %-22s %s\n" "make build-mobile" "仅构建 mobile-h5"
	@printf "  %-22s %s\n" "make build-frontend" "构建所有前端应用"
	@printf "  %-22s %s\n" "make build-docker" "Docker 镜像构建"
	@printf "\n测试 & 质量\n\n"
	@printf "  %-22s %s\n" "make test-backend" "go test ./..."
	@printf "  %-22s %s\n" "make test-frontend" "前端工作区测试"
	@printf "  %-22s %s\n" "make test-all" "后端 + 前端全跑"
	@printf "  %-22s %s\n" "make fmt" "gofmt -w 所有 Go 文件"
	@printf "  %-22s %s\n" "make typecheck" "前端全工作区 tsc 类型检查"
	@printf "\n数据库\n\n"
	@printf "  %-22s %s\n" "make db-migrate" "./go-admin migrate -c $(CONFIG_FILE)"
	@printf "\n依赖\n\n"
	@printf "  %-22s %s\n" "make deps-backend" "go mod tidy"
	@printf "  %-22s %s\n" "make deps-frontend" "pnpm install --store-dir ./.pnpm-store"
	@printf "\nOpenAPI\n\n"
	@printf "  %-22s %s\n" "make openapi" "生成 Swagger，并同步前端 types + client"
	@printf "\nDocker & 部署\n\n"
	@printf "  %-22s %s\n" "make docker-up" "启动应用 compose 栈（沿用同一容器前缀）"
	@printf "  %-22s %s\n" "make docker-down" "停止应用 compose 栈（沿用同一容器前缀）"
	@printf "  %-22s %s\n" "make deploy" "build-docker + docker-up"
	@printf "\n说明\n\n"
	@printf "  %-22s %s\n" "PROJECT_PREFIX" "默认取 package.json.name，可按需覆盖"
	@printf "  %-22s %s\n" "覆盖方式" "PROJECT_PREFIX=my-local make infra-up"
	@printf "\n"

prepare-go-env:
	mkdir -p "$(GO_BIN_DIR)" "$(GO_CACHE_DIR)" "$(GO_MOD_CACHE_DIR)"

init: deps-backend deps-frontend openapi

doctor:
	@printf "%-18s %s\n" "go" "$$(command -v go >/dev/null 2>&1 && go version || echo '未安装')"
	@printf "%-18s %s\n" "pnpm" "$$(command -v pnpm >/dev/null 2>&1 && echo "已安装，版本 $$(pnpm --version)" || echo '未安装')"
	@printf "%-18s %s\n" "docker" "$$(command -v docker >/dev/null 2>&1 && docker --version || echo '未安装')"
	@printf "%-18s %s\n" "docker compose" "$$(command -v docker >/dev/null 2>&1 && echo "已安装，$$(docker compose version 2>/dev/null)" || echo '未安装或不可用')"

setup-status:
	@if [ -f config/.installed ]; then \
		echo "当前状态：已安装，启动后会进入正常服务模式"; \
	else \
		echo "当前状态：未安装，启动后会进入 Setup Wizard"; \
	fi

env-print:
	@printf "%-18s %s\n" "项目根目录" "$(ROOT_DIR)"
	@printf "%-18s %s\n" "根包名" "$(ROOT_PACKAGE_NAME)"
	@printf "%-18s %s\n" "容器前缀" "$(PROJECT_PREFIX)"
	@printf "%-18s %s\n" "前缀来源" "默认来自 package.json.name，可用 PROJECT_PREFIX 覆盖"
	@printf "%-18s %s\n" "配置文件" "$(CONFIG_FILE)"
	@printf "%-18s %s\n" "开发端口配置" "$(DOCKER_ENV_FILE)"
	@printf "%-18s %s\n" "基础设施数据目录" "$(INFRA_DATA_DIR)"
	@printf "%-18s %s\n" "后端开发端口" "$(DEV_BACKEND_PORT)"
	@printf "%-18s %s\n" "管理端端口" "$(DEV_ADMIN_PORT)"
	@printf "%-18s %s\n" "移动端端口" "$(DEV_MOBILE_PORT)"
	@printf "%-18s %s\n" "PostgreSQL 端口" "$(DEV_POSTGRES_PORT)"
	@printf "%-18s %s\n" "Redis 端口" "$(DEV_REDIS_PORT)"
	@printf "%-18s %s\n" "PostgreSQL 数据库" "$(DEV_POSTGRES_DB)"
	@printf "%-18s %s\n" "PostgreSQL 用户" "$(DEV_POSTGRES_USER)"
	@printf "%-18s %s\n" "Go 可执行目录" "$(GO_BIN_DIR)"
	@printf "%-18s %s\n" "Go 编译缓存" "$(GO_CACHE_DIR)"
	@printf "%-18s %s\n" "Go 模块缓存" "$(GO_MOD_CACHE_DIR)"
	@printf "%-18s %s\n" "OpenAPI 目标" "$(OPENAPI_TARGET)"
	@printf "%-18s %s\n" "安装状态" "$$(if [ -f config/.installed ]; then echo 已安装; else echo 未安装，将进入 Setup Wizard; fi)"
	@printf "%-18s %s\n" "前缀覆盖示例" "PROJECT_PREFIX=my-local make infra-up"
	@printf "%-18s %s\n" "管理端启动提示" "VITE_API_BASE_URL=http://127.0.0.1:$(DEV_BACKEND_PORT) $(PNPM) --filter @suiyuan/admin-web dev"
	@printf "%-18s %s\n" "移动端启动提示" "VITE_API_BASE_URL=http://127.0.0.1:$(DEV_BACKEND_PORT) $(PNPM) --filter @suiyuan/mobile-h5 dev"
	@printf "%-18s %s\n" "后端 PG 示例" "host=127.0.0.1 port=$(DEV_POSTGRES_PORT) user=$(DEV_POSTGRES_USER) password=$(DEV_POSTGRES_PASSWORD) dbname=$(DEV_POSTGRES_DB)"
	@printf "%-18s %s\n" "后端 Redis 示例" "addr=127.0.0.1:$(DEV_REDIS_PORT)"

check-dev-ports:
	@conflict=0; \
	check_port() { \
		port="$$1"; \
		expected_name="$$2"; \
		label="$$3"; \
		docker_lines="$$(docker ps --format '{{.Names}} {{.Ports}}' | rg ":$$port->" || true)"; \
		foreign_lines="$$(printf '%s\n' "$$docker_lines" | rg -v "^$$expected_name " || true)"; \
		if [ -n "$$foreign_lines" ]; then \
			echo "$$label 端口 $$port 已被其他 Docker 容器占用："; \
			printf '%s\n' "$$foreign_lines"; \
			conflict=1; \
			return; \
		fi; \
		if [ -z "$$docker_lines" ] && lsof_out="$$(lsof -nP -iTCP:$$port -sTCP:LISTEN 2>/dev/null || true)" && [ -n "$$lsof_out" ]; then \
			echo "$$label 端口 $$port 已被本机其他进程占用："; \
			printf '%s\n' "$$lsof_out"; \
			conflict=1; \
		fi; \
	}; \
	check_port "$(DEV_POSTGRES_PORT)" "$(PROJECT_PREFIX)-postgres-1" "PostgreSQL"; \
	check_port "$(DEV_REDIS_PORT)" "$(PROJECT_PREFIX)-redis-1" "Redis"; \
	if [ "$$conflict" -eq 1 ]; then \
		echo "请先停止占用端口的服务，或修改 config/dev-ports.env 后再执行 make infra-up"; \
		exit 1; \
	fi

infra-up: check-dev-ports
	mkdir -p "$(INFRA_DATA_DIR)/postgres" "$(INFRA_DATA_DIR)/redis"
	$(INFRA_COMPOSE) up -d
	echo "开发基础设施已启动：项目 $(PROJECT_PREFIX)，PostgreSQL $(DEV_POSTGRES_PORT)，Redis $(DEV_REDIS_PORT)"

reinit:
	$(INFRA_COMPOSE) down --volumes --remove-orphans
	$(APP_COMPOSE) down --volumes --remove-orphans
	rm -f "$(ROOT_DIR)/config/.installed"
	rm -f "$(ROOT_DIR)/go-admin"
	if [ -d "$(ROOT_DIR)/.tmp/go" ]; then chmod -R u+w "$(ROOT_DIR)/.tmp/go" 2>/dev/null || true; fi
	if [ -d "$(ROOT_DIR)/.tmp/bin" ]; then chmod -R u+w "$(ROOT_DIR)/.tmp/bin" 2>/dev/null || true; fi
	if [ -d "$(INFRA_DATA_DIR)" ]; then chmod -R u+w "$(INFRA_DATA_DIR)" 2>/dev/null || true; fi
	if [ -d "$(ROOT_DIR)/frontend/apps/admin-web/dist" ]; then chmod -R u+w "$(ROOT_DIR)/frontend/apps/admin-web/dist" 2>/dev/null || true; fi
	if [ -d "$(ROOT_DIR)/frontend/apps/mobile-h5/dist" ]; then chmod -R u+w "$(ROOT_DIR)/frontend/apps/mobile-h5/dist" 2>/dev/null || true; fi
	if [ -d "$(ROOT_DIR)/dist" ]; then chmod -R u+w "$(ROOT_DIR)/dist" 2>/dev/null || true; fi
	if [ -d "$(ROOT_DIR)/temp/logs" ]; then chmod -R u+w "$(ROOT_DIR)/temp/logs" 2>/dev/null || true; fi
	rm -rf "$(ROOT_DIR)/.tmp/go" "$(ROOT_DIR)/.tmp/bin"
	rm -rf "$(INFRA_DATA_DIR)"
	rm -rf "$(ROOT_DIR)/frontend/apps/admin-web/dist" "$(ROOT_DIR)/frontend/apps/mobile-h5/dist" "$(ROOT_DIR)/dist"
	rm -rf "$(ROOT_DIR)/temp/logs"
	echo "环境重置完成，已按项目前缀 $(PROJECT_PREFIX) 清理应用栈、PG/Redis 数据卷、安装锁和本地产物"
	echo "下次执行 make dev-backend 会重新进入 Setup Wizard"

deps-backend: prepare-go-env
	$(GO_ENV) go mod tidy

deps-frontend:
	$(PNPM_INSTALL)

dev-backend: prepare-go-env
	$(GO_ENV) go run . server -c "$(CONFIG_FILE)"

dev-admin:
	$(PNPM) --filter @suiyuan/admin-web dev

dev-mobile:
	$(PNPM) --filter @suiyuan/mobile-h5 dev

build: build-backend

build-backend: prepare-go-env
	$(GO_ENV) CGO_ENABLED=0 go build -ldflags="-w -s" -o "$(PROJECT)" .

build-admin:
	$(PNPM) --filter @suiyuan/admin-web build

build-mobile:
	$(PNPM) --filter @suiyuan/mobile-h5 build

build-frontend:
	$(PNPM) build

build-docker:
	docker build -t $(PROJECT):latest .

test-backend: prepare-go-env
	$(GO_ENV) go test ./...

test-frontend:
	$(PNPM) test

test-all: test-backend test-frontend

fmt:
	@files=$$(rg --files -g '*.go'); \
	if [ -z "$$files" ]; then \
		echo "未找到 Go 文件"; \
	else \
		gofmt -w $$files; \
	fi

typecheck:
	$(PNPM) typecheck

db-migrate: build-backend
	./$(PROJECT) migrate -c "$(CONFIG_FILE)"

$(SWAG): prepare-go-env
	GOWORK=off $(GO_ENV) go install github.com/swaggo/swag/cmd/swag@v1.16.4

openapi: $(SWAG)
	"$(SWAG)" init -g main.go --parseDependency --parseDepth=6 --instanceName admin -o ./docs/admin
	node ./scripts/sync-openapi.mjs
	$(PNPM) run openapi
	$(PNPM) typecheck

docker-up:
	$(APP_COMPOSE) up -d

docker-down:
	$(APP_COMPOSE) down

deploy: build-docker docker-up
