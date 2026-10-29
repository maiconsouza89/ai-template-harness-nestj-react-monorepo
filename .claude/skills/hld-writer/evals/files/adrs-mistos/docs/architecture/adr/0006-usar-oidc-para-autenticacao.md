---
status: accepted
date: 2026-09-10
title: "Usar OIDC para autenticação de dono e barbeiro"
description: "Por que OIDC com provedor gerenciado em vez de senha própria."
supersedes: 
superseded-by: 
---

# 0006. Usar OIDC para autenticação de dono e barbeiro

## Contexto e problema

Dono e barbeiro precisam de login; guardar senha própria exige política de senha, recuperação e proteção contra vazamento que o time não quer operar.

## Opções consideradas

- **OIDC com provedor gerenciado**: login delegado; sem senha no nosso banco
- **Senha própria com hash**: controle total; operação de recuperação e vazamento por nossa conta

## Decisão

Escolhido OIDC, porque tira senha do nosso banco e a operação de recuperação do nosso time.

## Consequências

- Bom: nenhuma senha de usuário armazenada no sistema.
- Ruim: indisponibilidade do provedor derruba o login do dono.
