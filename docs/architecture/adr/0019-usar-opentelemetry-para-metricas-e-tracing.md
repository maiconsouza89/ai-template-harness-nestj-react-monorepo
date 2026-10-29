---
status: accepted
date: 2026-10-29
title: "Usar OpenTelemetry para métricas e tracing"
description: "Por que OpenTelemetry com exportação OTLP em vez de Prometheus com prom-client ou só logs e health check: métricas e traces num padrão que qualquer coletor do destino aceita, desligado sem endpoint."
supersedes:
superseded-by:
---

# 0019. Usar OpenTelemetry para métricas e tracing

## Contexto e problema

O HLD pede taxa de requisição, erro 5xx e p95 por interface, métricas da fila de e-mail e traces
que cubram HTTP, Prisma e o consumo do job, para sustentar os alertas da meta de 99,5 por cento.
O template não escolhe o destino, então a telemetria tem de sair num formato que qualquer
coletor aceite. Ao mesmo tempo, o risco de excesso de infraestrutura do HLD pede que ela não pese
no padrão de Tarefas que o dev copia.

## Opções consideradas

- **OpenTelemetry com OTLP**: SDK Node com auto-instrumentação de HTTP, Nest e Prisma, exportando métricas e traces por OTLP ao coletor do destino.
- **Prometheus com prom-client**: endpoint `/metrics` raspado pelo Prometheus; perdeu porque cobre só métricas, sem tracing, e prende o projeto gerado ao modelo de raspagem.
- **Só logs e health check**: nada além do nestjs-pino (ADR-0018) e do health check; perdeu porque não dá p95 por interface nem o trace do cadastro até o envio do e-mail.

## Decisão

Escolhido o **OpenTelemetry**, com `@opentelemetry/sdk-node` e
`@opentelemetry/auto-instrumentations-node` carregados por `--import` antes da aplicação e
exportação OTLP, ligada só quando `OTEL_EXPORTER_OTLP_ENDPOINT` está definido, porque é o único
dos três que cobre métricas e traces sem amarrar o template a um destino.

## Consequências

- Bom: sem endpoint configurado o SDK não exporta, então o setup local de 15 minutos não ganha serviço novo.
- Bom: trocar de coletor ou de fornecedor de observabilidade é trocar variável de ambiente, não código.
- Ruim: o arquivo de instrumentação tem de rodar antes de qualquer import da aplicação; esquecer o `--import` no Dockerfile ou no Compose deixa a API sem telemetria, sem erro.
- Ruim: o SDK 0.300 exige Node 22.15 ou superior, e `sdk-node` e `auto-instrumentations-node` fixam faixas de `@opentelemetry/api`; atualizar um exige atualizar os outros juntos.
- Ruim: o tracing do Prisma vem do `@prisma/instrumentation`, que segue a versão do Prisma (ADR-0008) e sobe junto com ela.

## Referências

Consultado em 2026-10-29.

- [OpenTelemetry: Node.js getting started](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/): `NodeSDK` com `getNodeAutoInstrumentations()` num arquivo carregado por `--import` antes do código da aplicação.
- [OpenTelemetry: SDK environment variables](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/): `OTEL_SDK_DISABLED` troca o SDK por no-op, e `OTEL_TRACES_SAMPLER` aceita `parentbased_traceidratio`.
- [@opentelemetry/sdk-node no npm](https://www.npmjs.com/package/@opentelemetry/sdk-node): 0.300.0, `engines.node >= 22.15.0`, peer `@opentelemetry/api >=1.10.0 <1.11.0`.
- [@opentelemetry/auto-instrumentations-node no npm](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node): 0.82.0, `engines.node >= 22.15.0`, peers `@opentelemetry/api ^1.10.0` e `@opentelemetry/core ^3.0.0`.
- [@prisma/instrumentation no npm](https://www.npmjs.com/package/@prisma/instrumentation): 7.10.1, a mesma versão do Prisma do ADR-0008, peer `@opentelemetry/api ^1.8`.
