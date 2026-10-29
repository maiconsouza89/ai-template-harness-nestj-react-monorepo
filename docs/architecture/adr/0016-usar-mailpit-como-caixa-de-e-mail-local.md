---
status: accepted
date: 2026-10-29
title: "Usar Mailpit como caixa de e-mail local"
description: "Por que Mailpit em vez de MailHog: servidor SMTP de teste com interface web e API REST em manutenção ativa, enquanto o MailHog está sem release desde 2020."
supersedes:
superseded-by:
---

# 0016. Usar Mailpit como caixa de e-mail local

## Contexto e problema

O PRD pede que o dev veja os e-mails de confirmação, recuperação e troca de senha numa caixa de
teste local, dentro dos 15 minutos de setup. O ADR-0006 deixou a ferramenta para um ADR próprio,
como serviço do Compose. Ela também é o alvo dos testes de ponta a ponta de RF-001, RF-002, RF-005
e RF-007, que precisam ler o link do e-mail por programa.

## Opções consideradas

- **Mailpit**: binário único sem dependências que recebe SMTP, mostra os e-mails numa interface web e os expõe por API REST.
- **MailHog**: o mesmo papel, com interface web e API; perdeu porque o último release é de 2020-08 e o último push no repositório de 2024-02.

## Decisão

Escolhido o **Mailpit** como serviço do Compose, apontado pela mesma configuração SMTP da API,
porque cumpre o papel com manutenção ativa e dá aos testes uma API REST para buscar o link do
e-mail sem raspar HTML.

## Consequências

- Bom: os testes de ponta a ponta leem o e-mail pela API REST do Mailpit e seguem o link de confirmação ou de recuperação.
- Bom: a API não sabe que fala com uma caixa de teste; trocar pelo SMTP do destino é só configuração (ADR-0017).
- Ruim: o Mailpit aceita qualquer remetente e destinatário, então problema de entrega real (SPF, DKIM, bounce) só aparece no destino.

## Referências

Consultado em 2026-10-29.

- [Mailpit](https://mailpit.axllent.org/): ferramenta de teste de e-mail sem dependências, servidor SMTP, interface web e API REST para testes de integração.
- [axllent/mailpit: releases](https://github.com/axllent/mailpit/releases): v1.32.0 publicada em 2026-10-22.
- [mailhog/MailHog](https://github.com/mailhog/MailHog): último release v1.0.1 em 2020-08-11 e último push em 2024-02-13.
