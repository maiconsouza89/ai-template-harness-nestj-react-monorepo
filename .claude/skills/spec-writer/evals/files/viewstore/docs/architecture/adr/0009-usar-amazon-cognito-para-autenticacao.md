---
status: accepted
date: 2026-10-24
title: "Usar Amazon Cognito para autenticação"
description: "Por que Amazon Cognito em vez de autenticação própria no NestJS, Auth0 ou Clerk: MFA e recuperação prontos, identidade dentro da AWS e 10.000 usuários ativos grátis com MFA incluído."
supersedes:
superseded-by:
---

# 0009. Usar Amazon Cognito para autenticação

## Contexto e problema

Exibidores, anunciantes e operadores entram no painel com e-mail e senha; o operador mexe em moderação, planos e parâmetros comerciais e precisa de MFA obrigatório. Recuperação de senha, bloqueio por tentativa e armazenamento de hash de senha são código de segurança que o time pequeno não quer escrever nem manter. A plataforma é a AWS (ADR-0006) e a autorização por papel e posse fica nos guards do NestJS (ADR-0002), então o provedor só precisa emitir um token confiável. A escala do piloto é de centenas de contas, mas o mapa e a contratação podem trazer milhares de anunciantes.

## Opções consideradas

- **Amazon Cognito**: provedor OIDC gerenciado na AWS, 10.000 usuários ativos por mês grátis nos planos Lite e Essentials, MFA por aplicativo e SMS em todos os planos.
- **Autenticação própria no NestJS**: sem fornecedor e sem custo por usuário, mas hash de senha, MFA, recuperação e bloqueio ficam com o time.
- **Auth0**: plano grátis de até 25.000 usuários, mas sem MFA no plano grátis B2C; com MFA, o plano pago começa em US$ 35 por mês para 500 usuários.
- **Clerk**: 50.000 usuários retidos grátis, mas MFA só no plano Pro, e é um fornecedor novo fora da AWS.

## Decisão

Escolhido o **Amazon Cognito**, porque é a única opção que entrega MFA e recuperação prontos sem custo no volume do piloto e mantém o dado de identidade na mesma conta AWS, sob o mesmo IAM e a mesma região. A API só valida o JWT emitido; papel e posse continuam nos guards.

## Consequências

- Bom: senha e segredo de MFA nunca passam pelo banco do viewstore, então um vazamento do PostgreSQL não expõe credenciais.
- Bom: até 10.000 usuários ativos por mês a autenticação não tem custo por usuário.
- Ruim: a configuração de MFA é do pool, então MFA obrigatório só para o operador exige um pool separado para operadores ou MFA opcional no pool com a API recusando token de operador sem MFA.
- Ruim: SMS de MFA é cobrado à parte pelo SNS e e-mail de recuperação sai pelo SES (ADR-0011), então o custo real não é só o preço por usuário ativo.

## Referências

Consultado em 2026-10-24.

- [Amazon Cognito: Pricing](https://aws.amazon.com/cognito/pricing/): 10.000 usuários ativos grátis em Lite e Essentials, Essentials a US$ 0,015 por usuário ativo depois disso, MFA por aplicativo e SMS em todos os planos, SMS cobrado pelo SNS e e-mail pelo SES.
- [Auth0: Pricing](https://auth0.com/pricing): plano grátis até 25.000 usuários sem MFA para B2C; B2C Essentials a US$ 35 por mês para 500 usuários.
- [Clerk: Pricing](https://clerk.com/pricing): Hobby grátis até 50.000 usuários retidos sem MFA; Pro a US$ 25 por mês com MFA.
