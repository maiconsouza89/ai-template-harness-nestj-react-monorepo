---
status: accepted
date: 2026-09-01
title: "Usar ADRs para decisões de arquitetura"
description: "Por que decisões caras de reverter viram arquivo em docs/architecture/adr em vez de ficarem no histórico de conversa."
supersedes: 
superseded-by: 
---

# 0001. Usar ADRs para decisões de arquitetura

## Contexto e problema

Cada escolha de arquitetura exclui alternativas e seis meses depois ninguém lembra por quê. Faltava um lugar onde a decisão e o que foi recusado ficassem juntos, versionados com o código.

## Opções consideradas

- **ADRs em docs/architecture/adr/**: um arquivo numerado por decisão, formato MADR-minimal
- **Uma página só de decisões**: arquivo único sem numeração nem status
- **Nada formal**: decisões em issues e conversa

## Decisão

Escolhidos os ADRs, porque numeração estável dá referência cruzada e o status dá ciclo de vida.

## Consequências

- Bom: o motivo e as opções recusadas estão no mesmo arquivo.
- Ruim: toda decisão cara de reverter custa um arquivo a mais.
