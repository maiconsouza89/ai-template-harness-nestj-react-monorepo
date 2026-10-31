---
status: accepted
date: 2026-10-31
title: "Usar grafana/otel-lgtm como backend local de observabilidade"
description: "Por que a imagem grafana/otel-lgtm num perfil do Compose em vez de Jaeger com Prometheus e Grafana ou SigNoz: um container só recebe OTLP, guarda traces, métricas e logs e carrega painéis e alertas de arquivo versionado."
supersedes:
superseded-by:
---

# 0029. Usar grafana/otel-lgtm como backend local de observabilidade

## Contexto e problema

O ADR-0019 exporta por OTLP para o coletor do destino, e no ambiente local não há onde ver o que a
API exporta. A revisão da fundação de 2026-10-31 decidiu ter um backend local no Compose, com os
painéis e os quatro alertas do HLD versionados como código e uma configuração de referência do
coletor do destino com a amostragem de cauda do HLD. O ADR-0019 também promete que o setup local de
15 minutos não ganha serviço novo, então o backend só pode subir quando alguém pedir.

## Opções consideradas

- **grafana/otel-lgtm**: um container com OpenTelemetry Collector contrib, Prometheus, Tempo, Loki e Grafana, com painéis e alertas provisionados de arquivo.
- **Jaeger com Prometheus e Grafana**: o all-in-one do Jaeger v2 guarda só traces; perdeu porque exige mais dois serviços e deixa os logs sem backend.
- **SigNoz**: plataforma única sobre OpenTelemetry; perdeu porque o deploy em Docker traz ClickHouse e vários containers, e os painéis e alertas ficam num formato que os destinos baseados em Grafana e Prometheus não importam.

## Decisão

Escolhido o **grafana/otel-lgtm**, com a tag fixada no `compose.yaml`, num serviço do perfil
`observability`, com painéis e regras de alerta montados como provisionamento do Grafana a partir de
`docker/observability/`, porque é a única opção que cobre traces, métricas e logs num serviço só.
O `otelcol-contrib` da mesma imagem valida o `collector-destino.yaml` de referência, que usa o
processador `tail_sampling`.

## Consequências

- Bom: `docker compose up` sem perfil continua com os cinco serviços da fundação; o backend só sobe com `--profile observability`.
- Bom: os painéis e as regras de alerta são arquivos do formato de provisionamento do Grafana, que um destino com Grafana importa sem conversão.
- Ruim: recurso provisionado de arquivo não se edita pela interface do Grafana; mudar painel ou alerta é editar o arquivo e reiniciar o serviço.
- Ruim: a imagem não serve para produção, então o destino precisa do próprio backend, e o template não prova que os arquivos funcionam lá.
- Ruim: Grafana, Prometheus, Tempo, Loki e o coletor sobem juntos na tag da imagem; atualizar um é atualizar todos, e uma consulta PromQL ou uma regra pode quebrar na troca de tag.

## Referências

Consultado em 2026-10-31.

- [grafana/docker-otel-lgtm, README](https://github.com/grafana/docker-otel-lgtm/blob/main/README.md): componentes da imagem, painéis provisionados pela pasta `/otel-lgtm/grafana/conf/provisioning/dashboards/custom`, portas 3000 (Grafana) e 4318 (OTLP HTTP), e o aviso de que a imagem é para desenvolvimento, demonstração e teste.
- [grafana/docker-otel-lgtm, release v0.39.0](https://github.com/grafana/docker-otel-lgtm/releases/tag/v0.39.0): tag de 2026-10-30, com OpenTelemetry Collector v0.164.0 e Grafana v13.3.0.
- [grafana/docker-otel-lgtm, download-otelcol.sh](https://github.com/grafana/docker-otel-lgtm/blob/main/docker/download-otelcol.sh): a imagem baixa a distribuição `otelcol-contrib`, que inclui o `tail_sampling`.
- [Grafana: provisionamento de alertas por arquivo](https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/): regras em YAML na pasta `provisioning/alerting`, com `interval` e `for` por regra; recurso provisionado não se edita pela interface.
- [OpenTelemetry Collector contrib: tail sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md): políticas `probabilistic` e `status_code`, estabilidade beta para traces.
- [Jaeger, README](https://github.com/jaegertracing/jaeger/blob/main/README.md): o all-in-one do v2 traz UI, coletor e armazenamento em memória, só de traces.
- [SigNoz, README](https://github.com/SigNoz/signoz/blob/main/README.md): logs, métricas, traces, alertas e painéis numa plataforma sobre um banco colunar (ClickHouse).
