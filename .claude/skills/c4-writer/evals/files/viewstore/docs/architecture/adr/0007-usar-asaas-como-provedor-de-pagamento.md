---
status: accepted
date: 2026-10-24
title: "Usar Asaas como provedor de pagamento"
description: "Por que Asaas em vez de Pagar.me, Mercado Pago ou Stripe: é o único com Pix avulso, assinatura por Pix, split para subcontas CPF e CNPJ e transferência Pix no mesmo fornecedor, com taxas publicadas."
supersedes:
superseded-by:
---

# 0007. Usar Asaas como provedor de pagamento

## Contexto e problema

O PRD (DEP-1) pede um fornecedor para três fluxos: anunciante paga anúncio direto e pacote de rede por Pix ou cartão, exibidor paga assinatura recorrente, e exibidor saca o repasse por Pix. O HLD fixou como critério ter os três no mesmo fornecedor e o custo por transação. Exibidores são em boa parte pessoa física ou microempresa, então qualquer cadastro pesado por exibidor trava a adoção. Receber o valor dos exibidores na conta da plataforma e pagá-lo depois sob pedido se parece com gestão de conta de pagamento, atividade que pede autorização do Banco Central, o que favorece fornecedor com split para conta do próprio exibidor.

## Opções consideradas

- **Asaas**: Pix, cartão e assinatura por Pix, cartão ou boleto; split por `walletId` para subcontas CPF ou CNPJ; transferência Pix por chave; taxas publicadas.
- **Pagar.me**: Pix a 0,99 por cento e recebedores CPF ou CNPJ, mas assinatura só por cartão ou boleto, sem Pix, e split só para clientes PSP.
- **Mercado Pago**: webhook com assinatura HMAC, mas split self-service só no modelo 1:1 com OAuth e KYC nível 6 por vendedor, e a página de tarifas não abriu na consulta.
- **Stripe**: Pix para empresa brasileira só por convite e só avulso, sem Pix Automático, e o Connect cobra R$ 6 por conta ativa por mês mais tarifa por repasse.

## Decisão

Escolhido o **Asaas**, porque é o único dos quatro em que cobrança Pix, assinatura recorrente por Pix, split para subconta do exibidor e transferência Pix aparecem todos na documentação, com preço público. O modelo de custódia (split na cobrança para subconta do exibidor ou saldo na conta da plataforma) é decisão à parte, a tomar com o jurídico (DEP-3) antes do RF-014.

## Consequências

- Bom: RF-007, RF-010, RF-011 e RF-014 integram com uma única API e um único webhook, e a conciliação do livro-razão compara com um só extrato.
- Bom: Pix recebido custa R$ 1,99 fixo, então num anúncio de algumas centenas de reais a taxa fica abaixo de 1 por cento.
- Ruim: o webhook do Asaas é autenticado por token estático no cabeçalho `asaas-access-token`, não por assinatura HMAC, então a API compara o token e consulta a cobrança na API do Asaas antes de converter a reserva em venda.
- Ruim: a conta principal precisa ser CNPJ, e a tarifa de subconta não é publicada; as duas coisas entram no contrato antes do piloto.
- Ruim: a página de preços diverge de si mesma na taxa de assinatura e parcelado (1,99 por cento no FAQ contra a tabela), então a taxa real se confirma no painel da conta, não na página.

## Referências

Consultado em 2026-10-24.

- [Asaas: Preços e taxas](https://www.asaas.com/precos-e-taxas): Pix recebido a R$ 1,99, cartão à vista R$ 0,49 mais 2,99 por cento, Pix enviado a chave PF grátis; o FAQ cita 1,99 por cento para assinatura, em conflito com a tabela.
- [Asaas: Assinaturas](https://docs.asaas.com/docs/assinaturas): assinatura por boleto, Pix ou cartão com periodicidade configurável.
- [Asaas: Split de pagamentos](https://docs.asaas.com/docs/split-de-pagamentos): divisão por `walletId`, fixa ou percentual, também em assinatura.
- [Asaas: Criação de subcontas](https://docs.asaas.com/docs/criacao-de-subcontas): conta principal CNPJ, subconta CPF ou CNPJ com saldo próprio, tarifa não publicada.
- [Asaas: Transferências](https://docs.asaas.com/docs/transferencias): transferência Pix por chave limitada ao saldo, com eventos `TRANSFER_DONE` e `TRANSFER_FAILED`.
- [Asaas: Sobre os webhooks](https://docs.asaas.com/docs/sobre-os-webhooks): autenticação por token no cabeçalho `asaas-access-token`.
- [Pagar.me: Assinaturas](https://docs.pagar.me/reference/assinaturas-1): meios de pagamento da assinatura são `credit_card` e `boleto`, sem Pix.
- [Pagar.me: Split](https://docs.pagar.me/docs/split-1): split disponível apenas para clientes PSP.
- [Mercado Pago: Split 1:1, pré-requisitos](https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/prerequisites): KYC nível 6 e OAuth por vendedor.
- [Stripe: Pix](https://docs.stripe.com/payments/pix): Pix só avulso para empresa brasileira, sem Pix Automático.
- [Stripe Brasil: Preços](https://stripe.com/br/pricing): Pix a 1,19 por cento e por convite.
- [Stripe Brasil: Connect](https://stripe.com/br/connect/pricing): R$ 6 por conta ativa por mês mais 0,25 por cento e R$ 0,67 por repasse.
- [Resolução BCB 80](https://www.bcb.gov.br/api/conteudo/app/normativos/exibenormativo?p1=Resolu%C3%A7%C3%A3o%20BCB&p2=80): instituição de pagamento depende de autorização (art. 9) e gerir conta de pagamento pré-paga é papel de emissor de moeda eletrônica (art. 3), base do risco de a plataforma guardar o saldo do exibidor.
