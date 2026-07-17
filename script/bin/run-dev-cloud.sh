#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${DALANSHU_DEV_ENV_FILE:-${HOME}/.config/dalanshu/dev.env}"

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "未找到本机开发配置：${ENV_FILE}" >&2
    echo "请先执行：mkdir -p ~/.config/dalanshu && cp script/env/dev.env.example ~/.config/dalanshu/dev.env" >&2
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

: "${DALANSHU_SSH_USER:?请在 dev.env 中配置 DALANSHU_SSH_USER}"

require_property_or_env() {
    local variable_name="$1"
    local property_file="$2"
    if [[ -z "${!variable_name:-}" && ! -f "${HOME}/.config/dalanshu/${property_file}" ]]; then
        echo "缺少 ${variable_name}：请配置环境变量或 ~/.config/dalanshu/${property_file}" >&2
        exit 1
    fi
}

require_property_or_env "DALANSHU_DB_PASSWORD" "database.properties"
require_property_or_env "DALANSHU_REDIS_PASSWORD" "redis.properties"
require_property_or_env "DALANSHU_MAIL_PASSWORD" "mail.properties"

if ! lsof -nP -iTCP:13306 -sTCP:LISTEN 2>/dev/null | grep -q ssh; then
    echo "正在启动云 MySQL SSH 隧道..."
    ssh -fN \
        -o ExitOnForwardFailure=yes \
        -o ServerAliveInterval=30 \
        -o ServerAliveCountMax=3 \
        -L 127.0.0.1:13306:172.31.10.95:3306 \
        "${DALANSHU_SSH_USER}@118.196.139.226"
fi

cd "${PROJECT_ROOT}"
exec mvn -pl ruoyi-admin -am spring-boot:run -Dspring-boot.run.profiles=dev
