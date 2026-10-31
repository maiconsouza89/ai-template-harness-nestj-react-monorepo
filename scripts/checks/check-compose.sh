#!/bin/sh
# Confere o compose.yaml renderizado pelo próprio Compose: serviço com interface de administração
# sem login publica as portas só no loopback do host. Hoje é o observability (Grafana do
# grafana/otel-lgtm com acesso anônimo de admin): publicado em todas as interfaces, qualquer
# máquina da rede local editaria painéis, regras de alerta e fontes de dados.
# Uso: check-compose.sh [arquivo-compose]; sem argumento, confere o compose.yaml da raiz.
# A conferência do JSON renderizado está em check-compose.mjs.
set -eu
cd "$(git rev-parse --show-toplevel)"
root=$(pwd)
file=${1:-compose.yaml}
loopback_only="observability"

command -v docker >/dev/null 2>&1 || {
  echo "check-compose: docker não encontrado; a verificação renderiza o compose com docker compose config" >&2
  exit 1
}
command -v node >/dev/null 2>&1 || {
  echo "check-compose: node não encontrado" >&2
  exit 1
}

rendered=$(docker compose -f "$file" --project-directory "$root" --profile observability config --format json) || {
  echo "check-compose: docker compose config falhou para $file" >&2
  exit 1
}

printf '%s' "$rendered" | node scripts/checks/check-compose.mjs "$loopback_only"
