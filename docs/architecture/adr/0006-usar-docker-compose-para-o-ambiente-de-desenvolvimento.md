---
status: accepted
date: 2026-10-28
title: "Usar Docker Compose para o ambiente de desenvolvimento"
description: "Por que o ambiente local sobe inteiro no Docker Compose, com API, web e dependências em containers e hot reload, em vez de cada dev instalar Node, banco e caixa de e-mail na própria máquina."
supersedes:
superseded-by:
---

# 0006. Usar Docker Compose para o ambiente de desenvolvimento

## Contexto e problema

O PRD pede que um dev, partindo do template, tenha o app rodando localmente com cadastro, login e
tarefas em até 15 minutos, com os e-mails transacionais visíveis numa caixa de teste local. Isso
exige API (ADR-0003), web (ADR-0004), banco e caixa de e-mail funcionando juntos na máquina de quem
nunca viu o projeto. Faltava decidir como esse ambiente é montado, o que define o passo a passo do
README e as versões que cada dev roda.

## Opções consideradas

- **Docker Compose com tudo em containers**: um `compose.yaml` sobe API, web, banco e caixa de e-mail, com o código do host refletido nos containers e hot reload.
- **Instalação local**: cada dev instala Node, gerenciador de pacotes, banco e caixa de e-mail guiado pelo README; perdeu porque cada ferramenta é um passo, e versão divergente na máquina vira bug que não reproduz.

## Decisão

Escolhido o **Docker Compose subindo todo o ambiente**, porque Docker é o único pré-requisito na
máquina e as versões de Node, banco e caixa de e-mail ficam fixadas no repositório, o mesmo para
todo dev.

## Consequências

- Bom: um `docker compose up` deixa API, web, banco e caixa de e-mail no ar; um dev sem Node instalado consegue rodar o app.
- Ruim: o hot reload depende de o container ver a mudança de arquivo; no Docker com backend WSL2 o Vite pode exigir `usePolling`, que custa CPU alta.
- Ruim: `node_modules` tem de ficar no container e fora da sincronização com o host; dependência nova exige reconstruir a imagem de dev, não só rodar a instalação no host.
- Ruim: Docker Desktop exige assinatura paga em empresa com 250 funcionários ou mais, ou receita anual de US$ 10 milhões ou mais; Docker Engine no Linux não entra nessa regra.
- Ruim: a tecnologia do banco e da caixa de e-mail de teste fica fora deste ADR; cada uma entra como serviço do Compose por ADR próprio.

## Referências

Consultado em 2026-10-28.

- [Docker: Use Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/): ação `sync` para frameworks com hot reload, `rebuild` para mudança em `package.json`, e regras para ignorar `node_modules/`.
- [Vite: Server Options](https://vite.dev/config/server-options): `server.watch.usePolling` como saída no WSL2 e no Docker com backend WSL2, com aviso de uso alto de CPU.
- [Docker Desktop license agreement](https://docs.docker.com/subscription/desktop-license/): uso gratuito só para empresa com menos de 250 funcionários e menos de US$ 10 milhões de receita anual; termos do Docker Engine não mudam.
