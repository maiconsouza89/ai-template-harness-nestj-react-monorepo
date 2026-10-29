---
status: accepted
date: 2026-10-29
title: "Usar SMTP genérico com Nodemailer para envio de e-mail"
description: "Por que SMTP genérico via Nodemailer em vez de uma porta abstrata com adapters por API de provedor: um transporte só serve o Mailpit local e qualquer provedor real, trocado por variável de ambiente."
supersedes:
superseded-by:
---

# 0017. Usar SMTP genérico com Nodemailer para envio de e-mail

## Contexto e problema

O worker da fila (ADR-0015) envia os e-mails transacionais, localmente para o Mailpit (ADR-0016) e
fora do local para um provedor que o projeto gerado escolhe. O HLD exige que a troca do local para
o real seja só configuração e que o template não fique preso a um destino. Faltava decidir o
protocolo e a biblioteca de envio.

## Opções consideradas

- **SMTP genérico com Nodemailer**: um transporte SMTP configurado por host, porta, usuário, senha e TLS, que todo provedor de e-mail aceita.
- **Porta abstrata com adapters por API de provedor**: interface própria e um adapter HTTP por provedor (SES, SendGrid, Postmark); perdeu porque o template teria de escolher e manter adapters de provedores que o projeto gerado talvez não use.

## Decisão

Escolhido o **SMTP genérico com Nodemailer 10**, com host, porta e credenciais em variáveis de
ambiente, porque o mesmo código envia ao Mailpit e a qualquer provedor real, e o template não
carrega SDK de fornecedor.

## Consequências

- Bom: passar do Mailpit para o provedor real é trocar as variáveis SMTP, sem mudar código nem imagem.
- Ruim: recursos que só a API HTTP do provedor tem (templates hospedados, webhooks de bounce, tags de rastreio) ficam fora; o projeto que precisar deles troca o transporte no Módulo E-mail.
- Ruim: SMTP é mais lento que uma chamada HTTP por mensagem e alguns destinos bloqueiam as portas 25 e 587 de saída, o que o projeto gerado confere antes do deploy.
- Ruim: o Nodemailer 10 sai como ES module e entra pelo mesmo `require(esm)` do ADR-0010.

## Referências

Consultado em 2026-10-29.

- [Nodemailer](https://nodemailer.com/): SMTP como transporte padrão, com variante em pool, e transportes extras para SES, sendmail e stream.
- [nodemailer no npm](https://www.npmjs.com/package/nodemailer): 10.2.1, `"type": "module"`, licença MIT-0, `engines.node >= 20.0.0`.
