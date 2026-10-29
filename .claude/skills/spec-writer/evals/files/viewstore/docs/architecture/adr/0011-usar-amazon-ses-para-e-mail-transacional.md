---
status: accepted
date: 2026-10-24
title: "Usar Amazon SES para e-mail transacional"
description: "Por que Amazon SES em vez de Resend ou Postmark: roda em sa-east-1 sob o mesmo IAM, custa US$ 0,10 por mil e-mails e não traz fornecedor novo para um volume pequeno."
supersedes:
superseded-by:
---

# 0011. Usar Amazon SES para e-mail transacional

## Contexto e problema

O Worker envia e-mails de moderação, inadimplência, renovação e saque, e o Cognito (ADR-0009) envia os de verificação e recuperação de senha. O volume do piloto é de poucos milhares de e-mails por mês, então preço por mensagem pesa menos que operar um fornecedor a mais. E-mail de saque recusado ou de inadimplência que cai no spam vira chamado de suporte, então entregabilidade importa. A plataforma é a AWS em sa-east-1 (ADR-0006).

## Opções consideradas

- **Amazon SES**: serviço de envio da AWS, disponível em sa-east-1, a US$ 0,10 por mil e-mails sem mensalidade.
- **Resend**: API simples com 3.000 e-mails grátis por mês e limite de 100 por dia; acima disso, US$ 20 por mês para 50.000.
- **Postmark**: reputação forte em e-mail transacional, mas US$ 15 por mês para 10.000 e-mails, e é um fornecedor a mais com chave fora da AWS.

## Decisão

Escolhido o **Amazon SES**, porque no volume do piloto o custo é de centavos, o Worker e o Cognito enviam pelo mesmo serviço com papel IAM e sem chave estática, e nenhum fornecedor novo entra no contrato. A entregabilidade fica com a configuração de domínio (SPF, DKIM e DMARC), que vale para qualquer das três opções.

## Consequências

- Bom: o Worker envia por papel IAM, então não há chave de API de e-mail para rotacionar no Secrets Manager.
- Ruim: conta nova do SES fica limitada a 200 e-mails por dia e 1 por segundo até a AWS liberar o acesso de produção, então o pedido tem que sair antes do piloto.
- Ruim: rejeição e reclamação não são tratadas sozinhas; sem consumir esses eventos e parar de enviar para o endereço, a reputação da conta cai e a AWS pode suspender o envio.
- Ruim: o SES não traz editor de modelo nem painel de entrega como o Postmark, então modelo de e-mail é código e investigar uma entrega é ler evento no CloudWatch.

## Referências

Consultado em 2026-10-24.

- [Amazon SES: Pricing](https://aws.amazon.com/ses/pricing/): US$ 0,10 por mil e-mails no pagamento por uso, sem mensalidade.
- [Amazon SES: Endpoints and quotas](https://docs.aws.amazon.com/general/latest/gr/ses.html): endpoint de API e SMTP em sa-east-1; limite padrão de 200 e-mails por 24 horas e 1 por segundo, ampliável.
- [Resend: Pricing](https://resend.com/pricing): grátis até 3.000 por mês com 100 por dia; Pro a US$ 20 por mês para 50.000.
- [Postmark: Pricing](https://postmarkapp.com/pricing): plano de 10.000 e-mails por mês a partir de US$ 15.
