# Spec: RF-001 Criar conta

PRD: docs/product/prd.md versão 0.1.0
HLD: docs/architecture/hld.md versão 0.2.3
Complexidade: complexa

---

## Escopo

Incluído
- Tela de cadastro em `/cadastro` na SPA, com nome, e-mail e senha, a regra de senha visível e a mensagem de cada campo inválido.
- Cadastro aberto na borda do Better Auth (`POST /api/auth/sign-up/email`), que cria a conta com papel usuário e situação pendente (e-mail não verificado).
- Validação de nome, e-mail e senha por um esquema único em Contratos, aplicado pela tela e pela API.
- E-mail normalizado para minúsculas, e recusa de e-mail já cadastrado em qualquer combinação de maiúsculas, com a tela sugerindo entrar ou recuperar a senha.
- Módulo E-mail: fila `email.send` no BullMQ, worker no processo da API e envio por SMTP do e-mail de confirmação em pt-BR, com o link válido por 24 horas.
- Falha no envio que não desfaz a conta, e o botão "Reenviar link" sempre visível na tela de sucesso.
- Rate limit do Better Auth ligado, com contadores no Valkey e fail-open, que a fundação deixou para este RF.
- Senha fora de tela, e-mail, resposta, job da fila e log.

Entradas
- nenhuma: o RF não depende de outro RF. DEP-1 (envio de e-mail) chega pelo SMTP configurado em `SMTP_HOST`, `SMTP_PORT` e `SMTP_FROM`, que no ambiente local é o Mailpit (ADR-0016).

Saídas
- Conta pendente na tabela `user` (com `emailVerified` falso e `role` igual a `user`) e credencial em `account`, que RF-002 ativa e RF-005 usa na recuperação.
- Link de confirmação `BETTER_AUTH_URL/api/auth/verify-email?token=...&callbackURL=WEB_ORIGIN/confirmar-email`, que RF-002 trata na rota `/confirmar-email` da SPA.
- O Módulo E-mail com a fila `email.send` e o método de enfileirar por tipo de e-mail, que RF-005 (recuperação) e RF-007 (aviso de troca de senha) reutilizam com tipos novos.
- `passwordSchema` e `PASSWORD_RULE_MESSAGE` em Contratos, que RF-005 e RF-007 usam na nova senha.
- O rate limit do Better Auth em `/api/auth`, com as regras de sign-in e recuperação já declaradas para RF-003 e RF-005.
- O helper de IP por teste em `apps/api/test/`, que os testes de integração dos próximos RFs usam nas chamadas a `/api/auth`.

Fora desta spec
- Abrir o link, ativar a conta, invalidar links anteriores e a tela `/confirmar-email` (RF-002).
- Bloquear a entrada de conta pendente e a tela `/entrar` (RF-003); a opção `requireEmailVerification` é ligada aqui porque muda o cadastro, mas o comportamento do login é verificado no RF-003.
- Tela `/recuperar-senha` (RF-005); a tela de cadastro só aponta para ela.
- Bloqueio de 5 tentativas erradas por e-mail (RF-003).

---

## Regras e fluxos

Regras
- Nome obrigatório, de 1 a 100 caracteres depois de tirar os espaços das pontas.
- E-mail obrigatório, em formato válido, gravado em minúsculas e sem espaços nas pontas; `Ana@Example.com` e `ana@example.com` são o mesmo e-mail (PRD, RF-001 Fluxos alternativos).
- Senha com no mínimo 8 e no máximo 128 caracteres, com pelo menos uma letra e um número (PRD, Decisão regra de senha; 128 é o `maxPasswordLength` padrão do Better Auth).
- Cadastro com e-mail já existente é recusado com 422 e não cria segunda conta (PRD, RF-001 Erros previstos).
- A conta nasce com `role` igual a `user`, `emailVerified` falso e sem banimento: é a situação pendente do HLD (Modelo de dados).
- O cadastro não abre sessão: a resposta não define cookie de sessão (PRD, Decisão confirmação de e-mail obrigatória antes de entrar).
- O link de confirmação vale 24 horas (`emailVerification.expiresIn` de 86400 segundos; PRD, Segurança e autorização).
- O job de e-mail entra na fila só depois do commit da conta; erro ao enfileirar é registrado no log e não desfaz a conta nem muda a resposta (PRD, RF-001 Erros previstos; HLD, Fluxo Cadastro e confirmação).
- O job tenta até 5 vezes, com backoff exponencial a partir de 5 segundos; esgotadas as tentativas, fica como falho para inspeção (HLD, Interfaces públicas, Fila de e-mail).
- Jobs concluídos são removidos depois de 24 horas e jobs falhos depois de 7 dias (hipótese da spec da fundação, aplicada aqui por ser a primeira fila).
- O e-mail de confirmação chega à caixa em até 2 minutos após o cadastro (PRD, Performance).
- O e-mail é em português do Brasil e informa que o link vale 24 horas (PRD, Compatibilidade).
- A senha nunca aparece em texto puro na tela, no e-mail, na resposta da API, nos dados do job ou no log (PRD, RF-001 critério e Compliance).
- O log do Módulo E-mail registra o id do job, o tipo e a tentativa, nunca o endereço, o nome nem o link, que carrega o token (PRD, Compliance).
- Rate limit por IP em `/api/auth`: 100 requisições a cada 10 segundos, e 5 a cada 60 segundos em `/sign-up/email`, `/sign-in/email` e `/request-password-reset` (HLD, Interfaces públicas); acima do limite, 429 com o cabeçalho `X-Retry-After`.
- Com o Valkey fora do ar, o rate limit deixa a requisição passar e registra aviso (fail-open; HLD, Escalabilidade e disponibilidade).

Fluxo técnico do caso principal
1. A pessoa abre `/cadastro` na SPA Web; a `action` da rota valida o formulário com `signUpSchema` de Contratos e, válido, chama `POST /api/auth/sign-up/email` com nome, e-mail, senha e `callbackURL` igual a `WEB_ORIGIN/confirmar-email`.
2. No Módulo Contas, o rate limit do Better Auth consome o contador do IP no Redis.
3. O hook `before` do Módulo Contas valida o corpo com o mesmo `signUpSchema`, normaliza nome e e-mail, procura o e-mail em minúsculas e recusa duplicado com 422.
4. O Better Auth grava em uma transação no PostgreSQL o usuário (papel `user` pelo `defaultRole` do plugin admin) e a credencial com hash scrypt, e chama `sendVerificationEmail` com o link de 24 horas.
5. O callback registra, com `queueAfterTransactionHook`, o enfileiramento no Módulo E-mail; depois do commit, o job `{ kind: "verify-email", userId, url }` entra em `email.send` no Redis.
6. A API responde 200 sem sessão e a SPA mostra que o link foi enviado, que é preciso confirmar antes de entrar e o botão "Reenviar link".
7. O worker do Módulo E-mail pega o job, lê nome e e-mail do usuário no PostgreSQL, monta o e-mail em pt-BR e envia por SMTP; erro gera nova tentativa pelo BullMQ.

---

## Componentes

| Componente do HLD | Caminho | O que muda nesta feature |
| --- | --- | --- |
| Contratos | `packages/contracts/src/accounts.ts`, `packages/contracts/src/index.ts` | Novo `accounts.ts` com `passwordSchema`, `PASSWORD_RULE_MESSAGE`, `signUpSchema`, os códigos de erro do cadastro e o esquema do corpo de erro; o índice o reexporta. |
| Módulo Contas | `apps/api/src/modules/accounts/auth.ts` | Abre o cadastro (`disableSignUp` falso), liga `requireEmailVerification`, `emailVerification` (`sendOnSignUp`, `expiresIn` 86400, `sendVerificationEmail`), o hook `before` e o rate limit; recebe as dependências por parâmetro, para o seed seguir carregando o arquivo direto no Node. |
| Módulo Contas | `apps/api/src/modules/accounts/sign-up/` | Novo caso de uso: `sign-up.hook.ts` (validação, normalização e recusa de duplicado) e `send-verification-email.ts` (callback que agenda o job depois do commit), com os `*.spec.ts`. |
| Módulo Contas | `apps/api/src/modules/accounts/infra/valkey-rate-limit.storage.ts`, `apps/api/src/modules/accounts/accounts.module.ts` | Novo `customStorage` do rate limit sobre o ioredis compartilhado, com fail-open; o módulo importa o Módulo E-mail e monta as dependências do `createAuth`. |
| Módulo E-mail | `apps/api/src/modules/email/` | Novo: `email.module.ts` (registro do BullMQ e da fila `email.send`), `email-queue.ts` (enfileirar por tipo, com tentativas, backoff e retenção), `infra/queue/email-send.processor.ts` (worker), `infra/smtp/mail-transport.ts` (Nodemailer) e `templates/verify-email.ts`. |
| PostgreSQL | nenhum arquivo novo | Sem migração: o cadastro usa `user` e `account` da migração inicial. |
| Redis | `apps/api/src/modules/email/email.module.ts`, `apps/api/src/modules/accounts/infra/valkey-rate-limit.storage.ts` | Passa a guardar os jobs de `email.send` e os contadores do rate limit. |
| SPA Web | `apps/web/src/routes/sign-up/route.tsx`, `apps/web/src/routes/sign-up/action.ts`, `apps/web/src/main.tsx` | Nova rota `/cadastro` filha da raiz, com formulário, mensagens por campo, mensagem de duplicado, tela de sucesso e reenvio. |

Arquivos de configuração tocados: `apps/api/src/platform/config/env.ts` e `.env.example` (variável `TRUSTED_PROXIES`), `apps/api/.env.test` (`MAILPIT_API_URL`) e `scripts/test.sh` (sobe também o `mailpit`).

---

## Contratos de interface

`POST /api/auth/sign-up/email` (anônima, rota do Better Auth)

Entrada:

```json
{
  "name": "Ana Souza",
  "email": "Ana@Example.com",
  "password": "senha1234",
  "callbackURL": "http://localhost:5173/confirmar-email"
}
```

200, sem `Set-Cookie` de sessão (formato da biblioteca, `token` nulo porque `requireEmailVerification` pula o login automático):

```json
{
  "token": null,
  "user": {
    "id": "Yp3m2...",
    "name": "Ana Souza",
    "email": "ana@example.com",
    "emailVerified": false,
    "image": null,
    "createdAt": "2026-10-29T12:00:00.000Z",
    "updatedAt": "2026-10-29T12:00:00.000Z",
    "role": "user"
  }
}
```

400, campo inválido (código e corpo do projeto, lançados pelo hook `before`; `fields` traz uma entrada por campo):

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Dados de cadastro inválidos.",
  "fields": [
    { "field": "password", "message": "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." }
  ]
}
```

422, e-mail já cadastrado (código da própria biblioteca, reaproveitado):

```json
{ "code": "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", "message": "User already exists. Use another email." }
```

429, rate limit (formato da biblioteca, com cabeçalho `X-Retry-After` em segundos):

```json
{ "message": "Too many requests. Please try again later." }
```

`POST /api/auth/send-verification-email` (anônima, rota do Better Auth, usada pelo botão "Reenviar link")
- Entrada `{ "email": "ana@example.com", "callbackURL": "http://localhost:5173/confirmar-email" }`; resposta 200 `{ "status": true }` com ou sem conta pendente para o e-mail (comportamento da biblioteca, `email-verification.mjs`).
- Limite padrão da biblioteca de 3 requisições a cada 60 segundos por IP, mantido.

Fila `email.send` (BullMQ, interna)
- Job `verify-email` com dados `{ "kind": "verify-email", "userId": "Yp3m2...", "url": "http://localhost:3000/api/auth/verify-email?token=...&callbackURL=..." }`.
- Opções: `attempts` 5, `backoff` exponencial com `delay` de 5000 ms, `removeOnComplete` com idade de 24 horas e `removeOnFail` com idade de 7 dias.
- O worker procura o usuário por `userId`; sem usuário, o job falha sem nova tentativa (`UnrecoverableError`).

E-mail de confirmação
- Para o e-mail da conta, de `SMTP_FROM`, assunto "Confirme seu e-mail", em texto e HTML, com o nome da pessoa, o link e a frase de que ele vale por 24 horas.

Variável nova
- `TRUSTED_PROXIES` (opcional): lista separada por vírgula de IPs ou CIDRs dos proxies à frente da API, passada a `advanced.ipAddress.trustedProxies`.

---

## Modelo de dados

Sem tabela nem coluna nova. O cadastro grava, pela migração inicial da fundação:
- `user`: `email` em minúsculas (único), `name`, `emailVerified` falso, `role` igual a `user`, `banned` nulo.
- `account`: `providerId` igual a `credential`, `accountId` igual ao id do usuário e `password` com o hash scrypt.
- O token do link não é gravado em `verification`: o better-auth 1.7.14 o emite como JWT assinado com `BETTER_AUTH_SECRET` e expiração embutida (`dist/api/routes/email-verification.mjs`).

No Redis, fora do PostgreSQL:
- Chaves do BullMQ com o prefixo padrão `bull:email.send:`.
- Contadores do rate limit em `rate-limit:<chave do Better Auth>`, com expiração igual à janela da regra.

---

## Tratamento de erros

| Erro | Onde é detectado | Resposta do sistema | O que a pessoa vê |
| --- | --- | --- | --- |
| E-mail já cadastrado, em qualquer combinação de maiúsculas | Módulo Contas, hook `before` | 422 com `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, nada é gravado | "Este e-mail já tem conta." com links para Entrar (`/entrar`) e Recuperar senha (`/recuperar-senha`) |
| Senha fora da regra | SPA Web (action) e Módulo Contas, hook `before` | 400 com `VALIDATION_ERROR` e o campo `password`, nada é gravado | A regra "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." junto ao campo |
| Campo obrigatório vazio ou e-mail inválido | SPA Web (action) e Módulo Contas, hook `before` | 400 com `VALIDATION_ERROR` e um item por campo, nada é gravado | Mensagem junto a cada campo inválido; os campos preenchidos continuam, menos a senha |
| Falha ao enfileirar o e-mail (Valkey fora do ar) | Módulo Contas, hook depois do commit | Erro no log sem dado pessoal; a conta fica criada e a resposta é 200 | Tela de sucesso com "Reenviar link" |
| Falha no envio SMTP | Módulo E-mail, worker | Nova tentativa até 5, com backoff exponencial a partir de 5 s; depois, job falho | Nada na hora; a tela de sucesso já oferece "Reenviar link" |
| Usuário do job não encontrado | Módulo E-mail, worker | Job falho sem nova tentativa, com aviso no log | nada |
| Rate limit excedido | Módulo Contas, Better Auth | 429 com `X-Retry-After` | "Muitas tentativas. Aguarde um minuto e tente de novo." |
| Valkey fora do ar no rate limit | Módulo Contas, `customStorage` | Requisição liberada, aviso no log | nada |
| API inacessível no envio do formulário | SPA Web, `apiFetch` | `ApiUnavailableError` tratado na action | "O servidor não respondeu. Tente de novo." no formulário |

---

## Estratégia de testes

Unidade (Vitest, `*.spec.ts` ao lado do código)
- `packages/contracts/src/accounts.spec.ts`: `passwordSchema` aceita `abcdefg1` e recusa `abcdefgh`, `12345678`, `abc1234` e 129 caracteres; `signUpSchema` recusa nome vazio, só espaços e 101 caracteres, aceita 100, e recusa e-mail inválido.
- `apps/api/src/modules/accounts/sign-up/sign-up.hook.spec.ts`: o hook ignora outras rotas, recusa corpo inválido com `VALIDATION_ERROR` e os campos, normaliza nome e e-mail, e recusa duplicado com o adaptador trocado por dublê; a mensagem de erro nunca contém a senha.
- `apps/api/src/modules/accounts/sign-up/send-verification-email.spec.ts`: o enfileiramento é agendado depois do commit e um erro ao enfileirar é registrado sem lançar.
- `apps/api/src/modules/accounts/infra/valkey-rate-limit.storage.spec.ts`: conta até o limite, recusa acima com `retryAfter` e libera com o Redis trocado por dublê que falha.
- `apps/api/src/modules/email/templates/verify-email.spec.ts`: assunto e corpo em pt-BR, com o link e as 24 horas.
- `apps/api/src/modules/email/infra/queue/email-send.processor.spec.ts`: monta e envia com o transporte trocado por dublê; usuário inexistente vira `UnrecoverableError`; o log não leva endereço nem link.
- `apps/web/src/routes/sign-up/action.spec.ts`: a action devolve erros por campo sem chamar a API, trata 200, 400, 422, 429 e falha de rede, e o reenvio, com `fetch` trocado por dublê.

Integração (Vitest, `apps/api/test/integration/**/*.int-spec.ts`, banco `app_test` e Mailpit do Compose)
- `sign-up.int-spec.ts` (substitui o teste da fundação que esperava o cadastro fechado): cadastro válido cria a conta pendente com papel `user` e sem cookie; e-mail em maiúsculas é gravado em minúsculas; duplicado em outra caixa responde 422 sem segunda conta; senha fora da regra e campos inválidos respondem 400 sem conta; resposta sem a senha.
- `sign-up-email.int-spec.ts`: o cadastro gera uma mensagem no Mailpit para o endereço, com o link e sem a senha; com a fila trocada por dublê que falha (`apps/api/test/doubles/failing-email-queue.ts`), a conta é criada e a resposta é 200.
- `rate-limit.int-spec.ts`: o sexto cadastro do mesmo IP em 60 s responde 429 e outro IP passa.
- Todas as chamadas a `/api/auth` usam o helper `apps/api/test/http/client-ip.ts`, que manda um `X-Forwarded-For` aleatório por teste; o Mailpit é lido pelo helper `apps/api/test/mailpit.ts` em `MAILPIT_API_URL`.

Verificação por superfície

| Superfície | Mecanismo | Decisão |
| --- | --- | --- |
| API HTTP | requisições HTTP contra a API em execução no Compose, com consulta ao PostgreSQL e leitura dos logs do serviço api | não precisa |
| UI | navegador dirigido pelo `@playwright/cli` contra a SPA em execução | ADR-0024 |
| Worker | API REST do Mailpit para as mensagens e consulta às chaves do BullMQ no Valkey | ADR-0016 |
| E2E | navegador dirigido pelo `@playwright/cli` na SPA e API REST do Mailpit para a caixa | ADR-0024 |

---

## Decisões e hipóteses

Decisões
- E-mail duplicado recusado por `hooks.before` em `/sign-up/email`, com 422 e o código da biblioteca: escolhido na entrevista. Motivo: no better-auth 1.7.14 (`dist/api/routes/sign-up.mjs`), com `requireEmailVerification` ou `autoSignIn` falso, o duplicado responde 200 genérico, contra o erro previsto do PRD. Alternativas descartadas: endpoint próprio em `/api/v1`, e manter a resposta neutra revisando o PRD.
- Job enfileirado depois do commit com `queueAfterTransactionHook` de `@better-auth/core/context` (1.7.14, a mesma do better-auth, passa a dependência direta da API) e `onError` que só registra: escolhido na entrevista. Motivo: o better-auth chama `sendVerificationEmail` dentro de `runWithTransaction`, e um erro ali desfaria a conta; o hook roda depois do commit (`dist/context/transaction.mjs`). Alternativas descartadas: enfileirar dentro da transação, e job com o e-mail no lugar do id.
- "Reenviar link" sempre visível na tela de sucesso, chamando `POST /api/auth/send-verification-email`: escolhido na entrevista. Alternativa descartada: a API sinalizar a falha na resposta, que não cobre a falha no SMTP.
- Rate limit com `rateLimit.customStorage` sobre o ioredis compartilhado (contrato `consume(key, rule)` do better-auth 1.7.14, `dist/api/rate-limiter/index.mjs`), com fail-open: escolhido na entrevista. Alternativa descartada: `secondaryStorage`, que leva as sessões para o Valkey e quebra a sessão com ele fora do ar.
- Testes de integração com um `X-Forwarded-For` por teste, sem interruptor do rate limit: escolhido na entrevista. Em desenvolvimento e teste, sem cabeçalho, o better-auth usa `127.0.0.1` para todos (`getIP` em `@better-auth/core/dist/utils/ip.mjs`); sem `trustedProxies`, aceita um único valor de `X-Forwarded-For`.
- Esquema único `signUpSchema` em Contratos, usado pela action da SPA e pelo hook `before`: escolhido na entrevista.
- Nome de 1 a 100 caracteres: escolhido na entrevista.
- Superfícies API HTTP, Worker, UI e E2E: escolhidas na entrevista.
- `requireEmailVerification` ligado já no RF-001: sem ele o cadastro abriria sessão para conta pendente (`shouldSkipAutoSignIn` em `sign-up.mjs`), contra a Decisão confirmação de e-mail obrigatória do PRD.
- `customRules` do rate limit sobrescrevem a regra padrão da biblioteca para `/sign-up` e `/sign-in` (10 s e 3 requisições) com 60 s e 5, como o HLD pede; `/send-verification-email` fica com o padrão de 60 s e 3.
- BullMQ 6 com `@nestjs/bullmq` 12 (ADR-0015; npm em 2026-10-29: bullmq 6.5.1, `@nestjs/bullmq` 12.0.0 com peer `@nestjs/core` ^12 e `bullmq` ^6) e Nodemailer 10 (ADR-0017; npm: 10.3.1). O BullMQ abre conexões próprias a partir de `REDIS_URL`, porque o worker exige `maxRetriesPerRequest` nulo e o ioredis compartilhado usa 1; a fila do produtor usa `enableOfflineQueue` falso para falhar rápido com o Valkey fora (doc do BullMQ, Going to production).
- `auth.ts` continua importando só pacotes e tipos, porque o seed o carrega direto no Node (`apps/api/prisma/seed.ts`); o hook, o callback e o `customStorage` entram por parâmetro do `createAuth`, montados pelo `AccountsModule`, e o seed chama sem eles.
- Convenções de teste, seed, fixtures e dublês da spec da fundação, sem divergência; `scripts/test.sh` passa a subir o `mailpit`, porque a convenção da fundação já diz que a integração usa o Mailpit do Compose.

Hipóteses
- `callbackURL` do link igual a `WEB_ORIGIN/confirmar-email`, a rota que o RF-002 cria; alternativa descartada: a raiz da SPA, que obrigaria o RF-002 a mudar o cadastro (hipótese)
- Corpo do 400 com `code`, `message` e `fields`, lançado por `APIError` no hook; alternativa descartada: só a mensagem do primeiro erro, que não aponta os campos (hipótese)
- Nome e e-mail normalizados pelo hook `before`, que devolve o corpo alterado ao Better Auth; alternativa descartada: só a SPA normalizar, deixando a API gravar espaços (hipótese)
- Rota `/cadastro` filha da raiz, com sucesso e reenvio na mesma rota pelo dado da action, sem o e-mail na URL (hipótese)
- Variável `TRUSTED_PROXIES` opcional; sem ela, fora do ambiente local, a API exposta direto aceita o `X-Forwarded-For` do cliente e o rate limit pode ser contornado, o que vai no comentário do `.env.example` (hipótese)
- Contadores em `rate-limit:<chave>` com `INCR` e `EXPIRE` na mesma transação do Redis (hipótese)
- Usuário inexistente no worker falha o job sem nova tentativa (hipótese)
- Textos da tela e do e-mail em pt-BR como estão em Tratamento de erros e Contratos de interface (hipótese)

Pendentes de ADR
- nenhuma

---

## Rastreabilidade

| Bloco do PRD ou do HLD | Onde está nesta spec |
| --- | --- |
| Fluxo principal | Regras e fluxos |
| Fluxos alternativos e exceções | Regras e fluxos (e-mail em minúsculas) |
| Erros previstos | Tratamento de erros |
| Depende de (DEP-1) | Escopo, Entradas |
| PRD, Decisões regra de senha e confirmação obrigatória | Regras e fluxos, Decisões e hipóteses |
| PRD, Performance (e-mail em 2 minutos) e Compliance | Regras e fluxos |
| HLD, Fluxo Cadastro e confirmação | Regras e fluxos |
| HLD, Interfaces públicas (API de autenticação, Fila de e-mail) | Contratos de interface |
| RF-001 Criar conta: SPA Web, Módulo Contas, Módulo E-mail, PostgreSQL, Redis; API de autenticação, Fila de e-mail | Componentes |
