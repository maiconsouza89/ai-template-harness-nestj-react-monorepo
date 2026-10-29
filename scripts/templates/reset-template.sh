#!/bin/sh
# Zera o que o projeto gerado herda do template e não deveria: changelog e versão.
# Rode uma vez, logo após "Use this template", antes do primeiro commit do projeto.
set -eu
cd "$(git rev-parse --show-toplevel)"
rm -f CHANGELOG.md
echo '{}' > .release-please-manifest.json
echo "ok: CHANGELOG.md removido e manifest zerado; a primeira release será a 0.1.0"
