---
status: accepted
date: 2026-10-28
title: "Usar imagem Docker multi-stage como artefato de deploy"
description: "Por que cada app deployável sai do build como imagem Docker gerada por um Dockerfile multi-stage versionado no repositório, sem alternativa avaliada além dela."
supersedes:
superseded-by:
---

# 0005. Usar imagem Docker multi-stage como artefato de deploy

## Contexto e problema

O template entrega uma API NestJS (ADR-0003) e um frontend Vite (ADR-0004) num monorepo Turborepo
(ADR-0002), e o projeto gerado precisa de um artefato de deploy que não dependa do destino
escolhido por quem o usa. Faltava fixar o formato desse artefato e onde a receita de build vive.
A escolha define o que a CI publica e o que qualquer ambiente de execução consome, então é cara de
trocar depois do primeiro deploy.

## Opções consideradas

- **Imagem Docker com Dockerfile multi-stage**: um `Dockerfile` por app no repositório; estágios de build instalam e compilam, o estágio final copia só o necessário para rodar.
- Nenhuma outra opção foi avaliada: o registro existe para fixar o formato do artefato, não para documentar uma disputa.

## Decisão

Cada app deployável é empacotado numa **imagem Docker gerada por um Dockerfile multi-stage**
versionado no repositório, usando `turbo prune <app> --docker` para copiar ao build só os pacotes
de que o app depende.

## Consequências

- Bom: ferramenta de build, `devDependencies` e fontes ficam nos estágios intermediários; a imagem final só leva o que roda.
- Bom: com `turbo prune --docker`, a camada de instalação só é refeita quando um `package.json` ou o lockfile podado muda; editar código de outro pacote não invalida o cache.
- Ruim: o Dockerfile vira um segundo lugar que conhece a estrutura do monorepo; pacote novo do qual o app depende e que não entra no prune quebra o build da imagem, não o `make build`.
- Ruim: versão do Node na imagem base, registro de imagens e como os estáticos do front são servidos ficam fora deste ADR; o Node da imagem tem de respeitar o piso do ADR-0004.

## Referências

Consultado em 2026-10-28.

- [Docker: Multi-stage builds](https://docs.docker.com/build/building/multi-stage/): vários `FROM` no mesmo Dockerfile, cópia seletiva de artefatos entre estágios e imagem final menor.
- [Turborepo: Docker](https://turborepo.dev/docs/guides/tools/docker): `turbo prune --docker` gera `out/json/` com os `package.json` e lockfile podado e `out/full/` com o código, para instalar dependências numa camada separada.
