---
status: accepted
date: 2026-10-29
title: "Usar @playwright/cli para verificar as telas"
description: "Por que @playwright/cli dirigindo o navegador na verificação de tela dos contratos, sem suíte E2E versionada, em vez de @playwright/test, Vitest Browser Mode ou Cypress."
supersedes:
superseded-by:
---

# 0024. Usar @playwright/cli para verificar as telas

## Contexto e problema

Os contratos em `docs/features/` têm itens de UI que precisam de um navegador dirigido contra a SPA
em execução, e sem ferramenta decidida esses itens nascem bloqueados. A verificação desses itens é
feita por um agente de código no ambiente local. O HLD também pedia testes de ponta a ponta das
contas a cada atualização de dependência, o que exigiria uma suíte de navegador versionada.

## Opções consideradas

- **@playwright/cli, sem suíte E2E versionada**: CLI da Microsoft sobre o motor do Playwright, feita para agentes de código dirigirem o navegador por comandos curtos.
- **@playwright/test**: suíte E2E versionada no repositório; perdeu porque o comportamento de tela já é verificado pelo contrato, e uma suíte paralela teria de ser mantida junto.
- **Vitest Browser Mode**: o mesmo runner do ADR-0021 no navegador; perdeu porque serve a teste de componente, não a jornada contra o sistema completo.
- **Cypress**: runner E2E próprio; perdeu pelo WebKit experimental e por mais um runner fora do Vite.

## Decisão

Escolhido o **@playwright/cli** para dirigir o navegador na superfície UI dos contratos, sem
suíte E2E versionada no repositório, porque a verificação das telas já é feita por agente contra o
contrato, e a CLI é a forma que o Playwright oferece para esse uso.

## Consequências

- Bom: os itens de UI dos contratos têm mecanismo decidido e deixam de nascer bloqueados.
- Bom: o `make check` e a CI não dependem de navegador instalado.
- Ruim: nada roda as jornadas de tela automaticamente a cada atualização de dependência; a mitigação do HLD para o risco da integração Better Auth com o Nest fica só nos testes de integração da API e na reavaliação dos contratos.
- Ruim: o pacote está na 0.1 e depende de um build alpha do Playwright 1.64; a interface de comandos pode mudar entre versões menores, e a versão fica fixada.

## Referências

Consultado em 2026-10-29.

- [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli): README apresenta a CLI como a melhor opção para agentes de código, com sessões que preservam cookies entre comandos e modo headless por padrão.
- [@playwright/cli no npm](https://www.npmjs.com/package/@playwright/cli): 0.1.22, `engines.node >=18`, dependência de `playwright` 1.64.0-alpha.
- [@playwright/test no npm](https://www.npmjs.com/package/@playwright/test): 1.64.1, `engines.node >=20`.
