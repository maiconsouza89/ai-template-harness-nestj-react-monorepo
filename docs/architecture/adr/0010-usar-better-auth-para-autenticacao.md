---
status: accepted
date: 2026-10-29
title: "Usar Better Auth para autenticação"
description: "Por que Better Auth em vez de Passport com JWT ou implementação própria: confirmação de e-mail, recuperação de senha, sessões revogáveis e papéis vêm prontos, sem depender de serviço externo."
supersedes:
superseded-by:
---

# 0010. Usar Better Auth para autenticação

## Contexto e problema

O PRD pede cadastro com confirmação por e-mail, login com bloqueio após tentativas erradas, saída,
recuperação e troca de senha que encerram sessões, e papéis usuário e admin com desativação de
conta. A API é NestJS (ADR-0003) com Prisma 7 (ADR-0008) sobre PostgreSQL (ADR-0007), e o app tem
de rodar localmente em até 15 minutos com os e-mails numa caixa de teste. Faltava escolher a
camada de autenticação, que define tabelas, formato de sessão e guarda de rota em todo projeto
gerado e é cara de trocar depois que existem contas.

## Opções consideradas

- **Better Auth**: biblioteca TypeScript de auth com sessão em cookie no próprio banco, adapter Prisma e plugin admin, ligada ao Nest por `@thallesp/nestjs-better-auth`.
- **Passport com `@nestjs/jwt`**: receita oficial do Nest; perdeu porque cobre só login e emissão de token, e hash, confirmação, reset e revogação ficariam a cargo do template.
- **Implementação própria**: sessão em tabela do Postgres e hash com scrypt ou argon2; perdeu porque o template manteria código sensível de segurança que a biblioteca já entrega testado.
- **Provedor gerenciado (Clerk, Auth0, Supabase Auth)**: auth como serviço externo; perdeu porque exige conta e chaves fora do repositório, o que quebra o ambiente local autocontido de 15 minutos.

## Decisão

Escolhido o **Better Auth na versão major 1**, com sessão em cookie gravada no PostgreSQL pelo
adapter Prisma e o plugin admin para papéis e desativação, porque cobre quase todo o escopo de
contas do PRD por configuração e roda inteiro dentro da API e do banco do template.

## Consequências

- Bom: `requireEmailVerification`, `sendResetPassword` com `revokeSessionsOnPasswordReset`, `changePassword` com `revokeOtherSessions` e o ban do plugin admin (que revoga as sessões) cobrem RF-002, RF-005, RF-007 e RF-013 sem código de criptografia no template.
- Ruim: o rate limit nativo conta por IP e caminho, não por e-mail; o bloqueio de 5 erros seguidos por e-mail durante 15 minutos do RF-003 é código do template sobre os hooks do Better Auth.
- Ruim: a integração com o Nest é pacote de comunidade; exige `bodyParser: false` no `NestFactory.create()` e liga um guard global, então rota pública sem `@AllowAnonymous()` responde 401.
- Ruim: o `better-auth` sai só como ES module; a API compilada como CommonJS depende do `require(esm)` do Node 22.12 ou superior (o piso de 22.22 do ADR-0004 atende) e quebra se algum módulo do grafo tiver top-level await.
- Ruim: as tabelas `user`, `session`, `account` e `verification` seguem o esquema do Better Auth e entram no `schema.prisma` pela CLI dele; renomear campo ou trocar de biblioteca depois exige migração de dados das contas.

## Referências

Consultado em 2026-10-29.

- [Better Auth: NestJS](https://www.better-auth.com/docs/integrations/nestjs): integração mantida pela comunidade em `@thallesp/nestjs-better-auth`, `bodyParser: false`, guard global e decorators `@Session()`, `@AllowAnonymous()`, `@OptionalAuth()`.
- [Better Auth: Email & Password](https://www.better-auth.com/docs/authentication/email-password): confirmação obrigatória de e-mail, reset com revogação opcional de sessões, troca de senha com `revokeOtherSessions`, hash scrypt por padrão, senha de 8 a 128 caracteres.
- [Better Auth: Rate Limit](https://www.better-auth.com/docs/concepts/rate-limit): limite por IP e caminho, desligado em desenvolvimento, armazenamento em memória por padrão; sem bloqueio por conta.
- [Better Auth: Admin](https://www.better-auth.com/docs/plugins/admin): papéis `admin` e `user`, ban que revoga sessões, listagem com busca e paginação.
- [NestJS: Passport](https://docs.nestjs.com/recipes/passport): receita oficial cobre login local e JWT; hash, expiração, revogação, confirmação e reset ficam fora do escopo.
- [better-auth no npm](https://www.npmjs.com/package/better-auth): 1.7.14 como `latest` na data da consulta, `"type": "module"`, peer dependency de `prisma` e `@prisma/client` `^5 || ^6 || ^7`, compatível com o ADR-0008.
- [@thallesp/nestjs-better-auth no npm](https://www.npmjs.com/package/@thallesp/nestjs-better-auth): 2.8.0, peer dependency de `@nestjs/core` `^11.1.6 || ^12.0.0` e `better-auth` `>=1.5.0 <2.0.0`, compatível com o NestJS 12 do ADR-0003.
- [Node.js 22: require de ES modules](https://nodejs.org/docs/latest-v22.x/api/modules.html): `require()` de ES module habilitado por padrão desde a 22.12.0, desde que o grafo não tenha top-level await.
