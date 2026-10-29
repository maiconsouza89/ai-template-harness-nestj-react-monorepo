---
status: accepted
date: 2026-10-24
title: "Usar CloudWatch e X-Ray com OpenTelemetry para observabilidade"
description: "Por que CloudWatch e X-Ray instrumentados com OpenTelemetry em vez de Grafana Cloud ou Datadog: nenhum fornecedor novo, custo por uso no volume do piloto, e o OpenTelemetry deixa trocar o destino sem reinstrumentar."
supersedes:
superseded-by:
---

# 0012. Usar CloudWatch e X-Ray com OpenTelemetry para observabilidade

## Contexto e problema

O HLD pede logs JSON com id de correlação e retenção de 30 dias, métricas de erro e latência por API e de idade por fila, tracing atravessando a outbox e as filas, e alertas só de disponibilidade. API e Worker rodam no ECS Fargate (ADR-0006), de 3 a 10 tarefas. O time é pequeno e não quer operar Prometheus nem Grafana. O SDK e o daemon do X-Ray entraram em modo de manutenção, então a instrumentação precisa sair por OpenTelemetry de qualquer jeito.

## Opções consideradas

- **CloudWatch e X-Ray com OpenTelemetry**: logs e métricas nativos do Fargate e traces enviados ao X-Ray pelo OpenTelemetry, cobrado por uso, sem fornecedor novo.
- **Grafana Cloud**: cota grátis generosa (50 GB de logs e 50 GB de traces por mês), mas retenção de 14 dias, abaixo dos 30 do HLD, e é um fornecedor e um login a mais.
- **Datadog**: painéis e APM mais completos, mas a partir de US$ 15 por host por mês de infraestrutura mais US$ 31 de APM, caro para o tamanho do piloto.

## Decisão

Escolhidos **CloudWatch e X-Ray com OpenTelemetry**, porque os logs do Fargate já chegam ao CloudWatch sem agente extra, o custo acompanha o uso, e nenhum contrato novo entra. Toda instrumentação é OpenTelemetry e não SDK do X-Ray, então mudar para Grafana Cloud ou Datadog depois é trocar o exportador, não o código.

## Consequências

- Bom: o id de correlação vai no contexto do OpenTelemetry pela outbox e pelas filas, então um trace liga a requisição do painel ao job do Worker que ela gerou.
- Ruim: usar o SDK ou o daemon do X-Ray é proibido no código novo, porque não recebem mais funcionalidade; revisão de código recusa `aws-xray-sdk`.
- Ruim: logs do CloudWatch são cobrados por GB ingerido, então log verboso de depuração em produção vira custo, e o preço de sa-east-1 precisa ser estimado na calculadora da AWS.
- Ruim: os painéis do CloudWatch são mais pobres que os do Grafana ou do Datadog, então investigação além dos alertas é consulta no Logs Insights, não painel pronto.

## Referências

Consultado em 2026-10-24.

- [AWS X-Ray: SDK and daemon timeline](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html): SDKs e daemon em modo de manutenção desde 2026-02-25, com recomendação de migrar para OpenTelemetry enviando ao X-Ray.
- [Amazon CloudWatch: Pricing](https://aws.amazon.com/cloudwatch/pricing/): 5 GB de logs grátis por mês e cobrança por GB ingerido e armazenado; exemplos com preço de us-east-1.
- [Grafana Cloud: Pricing](https://grafana.com/pricing/): plano grátis com 50 GB de logs e de traces, 10.000 séries de métricas e retenção de 14 dias.
- [Datadog: Pricing](https://www.datadoghq.com/pricing/): infraestrutura a partir de US$ 15 por host por mês e APM a partir de US$ 31 por host, no contrato anual.
