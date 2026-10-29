#!/bin/sh
# Configuração única após o clone: aponta o Git para os hooks versionados.
set -eu
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x .githooks/*
echo "ok: hooks ativados (core.hooksPath=.githooks)"
