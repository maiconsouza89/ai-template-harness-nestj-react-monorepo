#!/bin/sh
# Executa um alvo do contrato (lint, format, test, build) se scripts/<alvo>.sh existir.
# Caso contrário avisa e passa: a stack ainda não foi definida.
set -eu
cd "$(git rev-parse --show-toplevel)"
target="$1"
if [ -f "scripts/$target.sh" ]; then
  exec sh "scripts/$target.sh"
fi
echo "aviso: make $target não implementado para esta stack (crie scripts/$target.sh)"
