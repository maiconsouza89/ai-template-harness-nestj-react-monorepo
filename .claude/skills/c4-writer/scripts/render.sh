#!/bin/sh
# Renderiza diagramas .puml em SVG ao lado de cada arquivo, ou só confere a sintaxe com --check.
# Uso: sh render.sh [--check] <pasta-ou-arquivo.puml>...
# Ordem de motor: plantuml no PATH; java com PLANTUML_JAR apontando para o jar; docker com a
# imagem plantuml/plantuml na versão fixada abaixo. Nunca usa o servidor público do PlantUML,
# porque mandaria a arquitetura para fora. Sem motor: sai com código 2 e diz como instalar.
set -eu
PLANTUML_IMAGE=plantuml/plantuml:1.2025.4

mode=-tsvg
if [ "${1:-}" = "--check" ]; then
  mode=-checkonly
  shift
fi
if [ "$#" -eq 0 ]; then
  echo "uso: sh render.sh [--check] <pasta-ou-arquivo.puml>..." >&2
  exit 2
fi

files=""
for arg in "$@"; do
  if [ -d "$arg" ]; then
    for f in "$arg"/*.puml; do
      [ -f "$f" ] && files="$files $f"
    done
  elif [ -f "$arg" ]; then
    files="$files $arg"
  else
    echo "render: não encontrado: $arg" >&2
    exit 2
  fi
done
if [ -z "$files" ]; then
  echo "render: nenhum .puml em $*" >&2
  exit 2
fi

# shellcheck disable=SC2086
if command -v plantuml >/dev/null 2>&1; then
  plantuml "$mode" -charset UTF-8 $files
elif [ -n "${PLANTUML_JAR:-}" ] && command -v java >/dev/null 2>&1; then
  java -jar "$PLANTUML_JAR" "$mode" -charset UTF-8 $files
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker run --rm -u "$(id -u):$(id -g)" -v "$PWD":/data -w /data "$PLANTUML_IMAGE" \
    "$mode" -charset UTF-8 $files
else
  echo "render: nenhum motor PlantUML disponível." >&2
  echo "  instale o plantuml (apt-get install plantuml, brew install plantuml)," >&2
  echo "  ou defina PLANTUML_JAR com java no PATH, ou rode o docker." >&2
  exit 2
fi
if [ "$mode" = "-tsvg" ]; then
  echo "ok: SVG gerado para$files"
else
  echo "ok: sintaxe PlantUML válida em$files"
fi
