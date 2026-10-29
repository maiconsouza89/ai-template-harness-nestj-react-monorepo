#!/bin/sh
# Lança o Node com a instrumentação do OpenTelemetry (ADR-0019) carregada por --import antes de
# qualquer módulo da aplicação, como start:prod e a imagem fazem. É o --exec dos scripts start*
# do package.json: em modo watch o Nest CLI compila e relança a aplicação com um binário e os
# argumentos dele (--enable-source-maps dist/main.js), sem lugar para flags do node, e com
# --no-shell o binário não pode ter argumentos próprios; este script é o binário. Roda de
# apps/api, de onde o Nest CLI o chama; sem OTEL_EXPORTER_OTLP_ENDPOINT a instrumentação não
# faz nada.
set -eu
exec node --import ./dist/instrumentation.js "$@"
