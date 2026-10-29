# Plano: RF-001 Criar conta

Spec: spec.md. Contrato: contract.md.

---

## Pré-requisitos

- Fundação implementada e avaliada (`docs/features/fundacao/avaliacao.md`): Módulo Contas com o Better Auth, Valkey, Mailpit e o banco `app_test`.
- Nenhum RF do fecho: o RF-001 só depende de DEP-1, servida no ambiente local pelo Mailpit.

---

## Fase 1: regra de cadastro compartilhada

1. **Contratos:** criar o esquema de senha, a mensagem da regra, o esquema do cadastro e os códigos e o corpo de erro em `accounts.ts`, e reexportá-los no índice (spec, Regras e fluxos).
2. **Módulo Contas:** criar o hook `before` do cadastro, que valida com o esquema de Contratos, normaliza nome e e-mail e recusa e-mail já cadastrado (spec, Contratos de interface).
3. **Módulo Contas:** abrir o cadastro no `createAuth`, ligar a exigência de e-mail verificado e receber o hook por parâmetro, mantendo o seed funcionando sem ele.
4. **Testes da API:** criar o helper de IP por teste e trocar o teste de integração do cadastro fechado da fundação pelos casos do cadastro aberto.

## Fase 2: e-mail de confirmação pela fila

5. **Módulo E-mail:** instalar BullMQ, `@nestjs/bullmq` e Nodemailer, e registrar a conexão e a fila `email.send` com tentativas, backoff e retenção da spec.
6. **Módulo E-mail:** criar o transporte SMTP a partir da configuração e o modelo do e-mail de confirmação em pt-BR.
7. **Módulo E-mail:** criar o worker que lê o usuário, monta e envia o e-mail e registra só id, tipo e tentativa no log.
8. **Módulo Contas:** criar o callback de envio que agenda o job depois do commit e registra a falha sem desfazer a conta, e ligá-lo no `createAuth` com o prazo do link da spec.
9. **Testes da API:** fazer o `scripts/test.sh` subir o Mailpit, acrescentar `MAILPIT_API_URL` ao `.env.test`, criar o helper do Mailpit e o dublê de fila que falha, e cobrir o envio e a falha ao enfileirar.

## Fase 3: proteção contra abuso

10. **Módulo Contas:** criar o armazenamento do rate limit sobre o Valkey, com fail-open, e ligar o rate limit com as regras do HLD no `createAuth`.
11. **Configuração:** acrescentar `TRUSTED_PROXIES` ao esquema de config e ao `.env.example`, com o aviso sobre a API exposta sem proxy, e passá-la ao Better Auth.
12. **Testes da API:** cobrir o limite de cadastros por IP e a liberação com o Valkey fora.

## Fase 4: tela de cadastro

13. **SPA Web:** criar a rota `/cadastro` com o formulário, a regra de senha visível e as mensagens por campo, pendurada na raiz.
14. **SPA Web:** criar a action que valida com o esquema de Contratos, envia o cadastro e trata sucesso, campos inválidos, duplicado, excesso de tentativas e servidor fora.
15. **SPA Web:** mostrar a tela de sucesso com o e-mail, o aviso de confirmar antes de entrar e o botão "Reenviar link" ligado ao reenvio da biblioteca.
16. **Documentação:** atualizar o comentário do `createAuth` e do Módulo Contas que dizia que o cadastro e o rate limit ficavam para o RF-001.
