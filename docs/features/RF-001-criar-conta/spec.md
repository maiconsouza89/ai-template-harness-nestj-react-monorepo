# Spec: RF-001 Criar conta

PRD: docs/product/prd.md versão 0.1.0
HLD: docs/architecture/hld.md versão 0.2.5
Complexidade: complexa

---

## Escopo

Incluído
- Tela de cadastro em `/cadastro` na SPA, com nome, e-mail e senha, validação no navegador pelo esquema de Contratos e mensagens em pt-BR por campo.
- Cadastro aberto em `POST /api/auth/sign-up/email`: o Better Auth deixa de ter `disableSignUp` e passa a exigir a confirmação do e-mail antes de abrir sessão.
- Validação no servidor por um hook antes do cadastro, com o mesmo esquema de Contratos: nome obrigatório, e-mail válido e regra de senha (mínimo de 8 caracteres, com letra e número).
- Recusa de e-mail já cadastrado, sem diferença entre maiúsculas e minúsculas, com a sugestão de entrar ou recuperar a senha na tela.
- Conta criada com papel usuário e situação pendente (e-mail não verificado), com o e-mail gravado em minúsculas e a senha só como hash.
- Módulo E-mail novo: fila `email.send` no BullMQ, worker no mesmo processo da API, e-mail de confirmação em pt-BR renderizado no envio e entregue por SMTP (Nodemailer) ao Mailpit no ambiente local.
- Link de confirmação válido por 24 horas, apontando para a tela `/confirmar-email` da SPA.
- Tela de "link enviado" com o botão de reenvio sempre visível, pela rota nativa `POST /api/auth/send-verification-email`, o que cobre a falha no envio prevista no RF.
- Rate limit do Better Auth ligado, com contadores no Valkey: 100 requisições a cada 10 segundos por IP e caminho, e 5 cadastros a cada 60 segundos por IP.
- Logs do Better Auth encaminhados ao logger pino da API, para passarem pela mesma redação de dados pessoais.

Entradas
- nenhuma: o RF-001 não depende de outro RF. Da fundação, usa a instância do Better Auth em `apps/api/src/modules/accounts/auth.ts`, a conexão `REDIS` de `apps/api/src/platform/redis/`, o `PrismaService` e o pacote Contratos.
- DEP-1 (fluxo): servidor SMTP lido de `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER` e `SMTP_PASSWORD`, já validados na subida pela fundação.

Saídas
- Conta pendente na tabela `user` (com `emailVerified` falso e `role` igual a `user`) e a credencial na tabela `account`: RF-002 ativa, RF-003 autentica e RF-005 redefine a senha dessa conta.
- E-mail de confirmação com o link `<WEB_ORIGIN>/confirmar-email?token=<token>`, em que o token é o do Better Auth (`emailVerification.expiresIn` de 86400 segundos): RF-002 constrói a tela que abre esse link e chama `GET /api/auth/verify-email?token=`.
- O Módulo E-mail com o caso de uso de pedido de envio exportado por `email.module.ts` e a fila `email.send`: RF-002 (reenvio), RF-005 (recuperação) e RF-007 (aviso de troca) acrescentam um tipo de e-mail cada.
- `passwordSchema` e as mensagens da regra de senha em Contratos: RF-005 e RF-007 aplicam a mesma regra à senha nova.
- O rate limit ligado com armazenamento no Valkey, onde RF-003 e RF-005 acrescentam as regras de sign-in e recuperação.
- A tela `/cadastro`, com os links "Entrar" e "Recuperar a senha" para as rotas `/entrar` e `/recuperar-senha`, que RF-003 e RF-005 constroem.

Fora desta spec
- Abrir o link, ativar a conta, as telas de link vencido ou inválido e a invalidação dos links anteriores no reenvio: RF-002.
- Entrar, bloqueio por tentativas e as regras de rate limit de sign-in: RF-003.
- Recuperação de senha e a regra de rate limit da recuperação: RF-005.
- Revisão do contrato da fundação: o item API-BORDA-05 dela exige o cadastro fechado, que este RF abre (ver Decisões).

---

## Regras e fluxos

Regras
- Nome, e-mail e senha são obrigatórios; o nome tem de 1 a 100 caracteres depois de tirar os espaços das pontas (hipótese).
- O e-mail precisa ser válido e ter no máximo 254 caracteres; ele é comparado e gravado em minúsculas, e `Ana@Example.com` é o mesmo e-mail que `ana@example.com` (PRD, RF-001 Fluxos alternativos).
- A senha tem no mínimo 8 caracteres, ao menos uma letra e ao menos um número (PRD, Decisão regra de senha), e no máximo 128 caracteres, o teto padrão do Better Auth (hipótese).
- Senha fora da regra recusa o cadastro sem criar conta, e a resposta e a tela trazem a regra inteira: "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.".
- E-mail já cadastrado recusa o cadastro com 422 e não cria segunda conta; a unicidade é garantida pela constraint única em `user.email`, mesmo com dois cadastros simultâneos.
- A conta nasce com `role` igual a `user` (padrão do plugin admin), `emailVerified` falso e `banned` falso, sem sessão: o cadastro não devolve cookie de sessão (PRD, Decisão confirmação de e-mail obrigatória antes de entrar).
- O link de confirmação vale 24 horas (`emailVerification.expiresIn` de 86400 segundos) e o e-mail diz isso em pt-BR (PRD, RF-001 Fluxo principal).
- Falha ao enfileirar ou ao enviar o e-mail não desfaz a conta; a tela de "link enviado" sempre oferece o reenvio (PRD, RF-001 Erros previstos; HLD, Padrões adotados).
- O job em `email.send` leva o tipo do e-mail, o id da conta e o link; o endereço e o nome são lidos da conta no envio, e a senha nunca entra no job (HLD, Fluxo de dados).
- O envio tenta até 5 vezes, com backoff exponencial a partir de 5 segundos; esgotadas as tentativas, o job fica como falho na fila para inspeção (ADR-0015; HLD, Interfaces públicas).
- Jobs concluídos ficam 24 horas e falhos ficam 7 dias na fila, a retenção que a fundação deixou para quem registrasse a primeira fila (spec da fundação, Hipóteses).
- A senha nunca aparece em texto puro: o campo da tela é do tipo senha, a resposta do cadastro não a devolve, o banco guarda só o hash scrypt em `account.password`, e nem o e-mail nem o job a contêm (PRD, Segurança e autorização).
- Nenhum log da API contém a senha, o nome ou o e-mail do cadastro, nem o token do link (PRD, Compliance; ADR-0018).
- Rate limit por IP: 5 cadastros a cada 60 segundos em `/sign-up/email` e 100 requisições a cada 10 segundos nas demais rotas de `/api/auth`, que passam a valer também em development e test; o pedido além do limite recebe 429 (HLD, Interfaces públicas).
- O IP do rate limit vem do `X-Forwarded-For`, resolvido com `TRUSTED_PROXIES` quando definida; sem ela, vale um `X-Forwarded-For` de um valor só e, sem cabeçalho, o endereço local em development e test (comportamento do `@better-auth/core` 1.7.14, `utils/ip.mjs`).
- Com o Valkey fora do ar, o rate limit libera a requisição (fail-open) e registra o erro, e o cadastro cria a conta mesmo sem enfileirar o e-mail (HLD, Técnicas aplicadas).

Fluxo técnico do caso principal
1. A SPA Web, em `/cadastro`, valida o formulário com `signUpSchema` de Contratos e envia `POST /api/auth/sign-up/email` com nome, e-mail e senha pelo `apiFetch`.
2. O Módulo Contas passa a requisição pelo rate limit do Better Auth, com o contador por IP e caminho no Redis (Valkey).
3. O hook antes do cadastro, no Módulo Contas, valida o corpo com `signUpSchema` e procura a conta pelo e-mail em minúsculas; inválido responde 400 `VALIDATION_ERROR`, existente responde 422 `USER_ALREADY_EXISTS`.
4. O Better Auth grava no PostgreSQL a conta em `user` (com `role` `user` e `emailVerified` falso) e a credencial com o hash em `account`, e gera o token de confirmação de 24 horas.
5. No callback `sendVerificationEmail`, o Módulo Contas monta o link `<WEB_ORIGIN>/confirmar-email?token=<token>` e pede ao Módulo E-mail o envio, que cria o job em `email.send`; a API responde 200 sem cookie de sessão.
6. A SPA Web troca o formulário pela mensagem de link enviado, com o e-mail informado e o botão de reenvio.
7. O worker do Módulo E-mail pega o job, lê nome e e-mail da conta no PostgreSQL, renderiza o e-mail em pt-BR e o entrega ao Servidor SMTP.

---

## Componentes

| Componente do HLD | Caminho | O que muda nesta feature |
| --- | --- | --- |
| Contratos | `packages/contracts/src/accounts.ts`, `packages/contracts/src/index.ts` | Novo `accounts.ts` com `passwordSchema`, `signUpSchema`, as mensagens em pt-BR e os códigos de erro do cadastro (`VALIDATION_ERROR`, `USER_ALREADY_EXISTS`); reexportado pelo `index.ts`. |
| Módulo Contas | `apps/api/src/modules/accounts/auth.ts` | `createAuth` ganha um terceiro parâmetro opcional com as dependências que o seed não usa (callback de envio, hook antes do cadastro, armazenamento do rate limit, logger); liga `requireEmailVerification`, `emailVerification` (`sendOnSignUp`, `expiresIn` de 86400), o rate limit com as regras do cadastro, `advanced.ipAddress.trustedProxies` e tira o `disableSignUp`. |
| Módulo Contas | `apps/api/src/modules/accounts/accounts.module.ts` | Importa o `EmailModule` e monta as dependências de `createAuth` no `useFactory`, injetando `REDIS`, o caso de uso de pedido de envio e o logger. |
| Módulo Contas | `apps/api/src/modules/accounts/presentation/sign-up/sign-up.hook.ts` | Novo. Hook `before` do Better Auth que, só no caminho `/sign-up/email`, valida o corpo com `signUpSchema` e recusa e-mail existente pelo `internalAdapter.findUserByEmail` com o e-mail em minúsculas. |
| Módulo Contas | `apps/api/src/modules/accounts/infra/rate-limit/valkey-rate-limit.storage.ts` | Novo. `customStorage` do rate limit com `consume(key, rule)` atômico no Valkey (INCR com expiração da janela), prefixo `rate-limit:` e fail-open quando o Valkey falha. |
| Módulo Contas | `apps/api/src/modules/accounts/infra/verification-email/send-verification-email.ts` | Novo. Callback `sendVerificationEmail`: monta o link da SPA a partir de `WEB_ORIGIN` e do token e chama o caso de uso de pedido de envio do Módulo E-mail, importado de `email.module.ts`. |
| Módulo E-mail | `apps/api/src/modules/email/email.module.ts` | Novo. Registra a fila `email.send`, o processor, as portas por `useClass` e reexporta o caso de uso de pedido de envio, a fronteira pública do módulo (ADR-0025). |
| Módulo E-mail | `apps/api/src/modules/email/domain/` | Novo. Tipo do pedido (`verify-email`, id da conta, link), portas `EmailQueue`, `EmailRecipients` e `EmailTransport` como classe abstrata, e o template do e-mail de confirmação em pt-BR (assunto, texto e HTML). |
| Módulo E-mail | `apps/api/src/modules/email/application/request-email/`, `apps/api/src/modules/email/application/send-email/` | Novo. `request-email.use-case.ts` enfileira o pedido; `send-email.use-case.ts` lê o destinatário, renderiza e entrega, e descarta o job de conta que não existe mais. |
| Módulo E-mail | `apps/api/src/modules/email/infra/queue/email-send.processor.ts`, `apps/api/src/modules/email/infra/queue/bullmq-email.queue.ts`, `apps/api/src/modules/email/infra/smtp/nodemailer-email.transport.ts`, `apps/api/src/modules/email/infra/prisma-email-recipients.repository.ts` | Novo. Worker de `email.send` (`WorkerHost` do `@nestjs/bullmq`), produtor com 5 tentativas, backoff e retenção, transporte Nodemailer pelas variáveis SMTP e leitura de nome e e-mail pelo Prisma. |
| Redis | `apps/api/src/platform/queue/queue.module.ts`, `apps/api/src/app.module.ts` | Novo `queue.module.ts` com o `BullModule.forRootAsync` a partir de `REDIS_URL`, numa conexão própria do BullMQ, separada da conexão `REDIS` compartilhada; registrado no `AppModule` junto com o `EmailModule`. |
| Redis | `apps/api/src/platform/config/env.ts`, `.env.example`, `apps/api/.env.test` | Variável opcional `TRUSTED_PROXIES`, lista de CIDRs separada por vírgula, vazia no local e no teste, com o aviso de produção no `.env.example`. |
| SPA Web | `apps/web/src/routes/cadastro/route.tsx`, `apps/web/src/routes/cadastro/action.ts`, `apps/web/src/main.tsx` | Nova rota `/cadastro` filha da raiz: formulário, `action` que valida e chama a API, estado de link enviado com o botão de reenvio, mensagens de erro por campo e os links para `/entrar` e `/recuperar-senha`. |
| PostgreSQL | `apps/api/prisma/schema.prisma` | Sem mudança: as tabelas `user` e `account` da fundação já têm o que o cadastro grava, inclusive a constraint única em `email`. |

---

## Contratos de interface

`POST /api/auth/sign-up/email` (anônima, rota do Better Auth)
- Entrada:

```json
{ "name": "Ana Souza", "email": "Ana@Example.com", "password": "Segura123" }
```

- 200: conta criada, sem `Set-Cookie` de sessão e com `token` nulo (Better Auth 1.7.14, `routes/sign-up.mjs`, `shouldSkipAutoSignIn` com `requireEmailVerification`).

```json
{ "token": null, "user": { "id": "Yp3m2...", "name": "Ana Souza", "email": "ana@example.com", "emailVerified": false, "role": "user", "banned": false, "createdAt": "2026-10-30T12:00:00.000Z", "updatedAt": "2026-10-30T12:00:00.000Z" } }
```

- 400: corpo fora do esquema, com um item por campo recusado.

```json
{ "code": "VALIDATION_ERROR", "message": "Confira os campos destacados.", "fields": [ { "field": "password", "message": "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." } ] }
```

- 422: e-mail já cadastrado, em qualquer combinação de maiúsculas.

```json
{ "code": "USER_ALREADY_EXISTS", "message": "Este e-mail já tem conta. Entre ou recupere a senha." }
```

- 422 `FAILED_TO_CREATE_USER`: corrida entre dois cadastros simultâneos com o mesmo e-mail, barrada pela constraint única (Better Auth 1.7.14, `routes/sign-up.mjs`); a SPA mostra a mesma mensagem do 422 de e-mail existente.
- 429: limite de 5 cadastros a cada 60 segundos por IP, com o cabeçalho `X-Retry-After` em segundos (Better Auth 1.7.14, `api/rate-limiter/index.mjs`).

`POST /api/auth/send-verification-email` (anônima, rota do Better Auth, usada pelo botão de reenvio)
- Entrada `{ "email": "ana@example.com" }`; responde 200 `{ "status": true }` para e-mail com e sem conta pendente, sem revelar qual (Better Auth 1.7.14, `routes/email-verification.mjs`); limite padrão da biblioteca de 3 pedidos a cada 60 segundos por IP.

Fila `email.send` (interna, BullMQ)
- Job com o nome `verify-email`:

```json
{ "type": "verify-email", "userId": "Yp3m2...", "url": "http://localhost:5173/confirmar-email?token=eyJ..." }
```

- Opções: `attempts` 5, `backoff` exponencial com `delay` de 5000 ms, `removeOnComplete` com `age` de 86400 s e `removeOnFail` com `age` de 604800 s.

E-mail de confirmação (Módulo E-mail para o Servidor SMTP)
- Remetente `SMTP_FROM`, destinatário o e-mail da conta, assunto "Confirme seu e-mail", corpo em texto e HTML em pt-BR com a saudação pelo nome, o link e a frase "O link vale por 24 horas.".

Rotas da SPA Web
- `/cadastro`: formulário e, depois do 200, a mensagem "Enviamos um link de confirmação para <e-mail>. Confirme o e-mail antes de entrar." com o botão "Reenviar o link".

---

## Modelo de dados

Sem migração: o cadastro grava nas tabelas da fundação.
- `user`: `email` em minúsculas na constraint única existente, `emailVerified` falso, `role` `user`, `banned` falso.
- `account`: uma linha com `providerId` `credential`, `accountId` igual ao id da conta e `password` com o hash scrypt do Better Auth.
- `verification`: não recebe linha no cadastro, porque o token de confirmação do Better Auth 1.7.14 é um JWT assinado com o segredo (`createEmailVerificationToken` em `routes/email-verification.mjs`); o HLD diz o contrário em Modelo de dados, e o uso único fica com o RF-002, como a lacuna do HLD já registra.

Valkey (efêmero)
- `rate-limit:<chave do Better Auth>`: contador inteiro com expiração igual à janela da regra (60 s no cadastro, 10 s no geral).
- Chaves do BullMQ da fila `email.send`, com a retenção de Regras e fluxos.

---

## Tratamento de erros

| Erro | Onde é detectado | Resposta do sistema | O que a pessoa vê |
| --- | --- | --- | --- |
| E-mail já cadastrado | Módulo Contas, hook antes do cadastro; constraint única de `user.email` na corrida | 422 `USER_ALREADY_EXISTS` (ou `FAILED_TO_CREATE_USER` na corrida), sem criar conta | "Este e-mail já tem conta." com os links "Entrar" e "Recuperar a senha" |
| Senha fora da regra | SPA Web, `signUpSchema`; Módulo Contas, hook antes do cadastro | 400 `VALIDATION_ERROR` com o campo `password`, sem criar conta | A regra inteira abaixo do campo de senha |
| Campo obrigatório vazio ou e-mail inválido | SPA Web, `signUpSchema`; Módulo Contas, hook antes do cadastro | 400 `VALIDATION_ERROR` com cada campo recusado, sem criar conta | Mensagem abaixo do campo, com o foco no primeiro campo recusado |
| Falha no envio do e-mail (Valkey fora ao enfileirar) | Módulo E-mail, produtor da fila | Erro capturado pelo `runInBackgroundOrAwait` do Better Auth e registrado no log, sem dado pessoal; o cadastro responde 200 com a conta criada | A mensagem de link enviado com o botão "Reenviar o link" |
| Falha no envio do e-mail (SMTP fora ou recusando) | Módulo E-mail, worker | Nova tentativa até 5, com backoff exponencial a partir de 5 s; depois o job fica como falho | A mesma tela; o botão "Reenviar o link" gera um novo job |
| Conta do job não existe mais | Módulo E-mail, caso de uso de envio | Job concluído sem envio, com log pelo id da conta | nada |
| Limite de cadastros por IP excedido | Módulo Contas, rate limit do Better Auth | 429 com `X-Retry-After` | "Muitas tentativas. Tente de novo em alguns instantes." |
| Valkey fora do ar no rate limit | Módulo Contas, `valkey-rate-limit.storage.ts` | Libera a requisição (fail-open) e registra o erro | nada; o cadastro segue |
| API inacessível ao enviar o formulário | SPA Web, `apiFetch` | `ApiUnavailableError` tratado na `action` | "O servidor não respondeu. Tente de novo." sem perder o que foi digitado, exceto a senha |

---

## Estratégia de testes

Unidade (Vitest, `*.spec.ts` ao lado do código)
- `packages/contracts/src/accounts.spec.ts`: `passwordSchema` aceita `Segura123` e recusa `segurança` (sem número), `12345678` (sem letra) e `Seg123` (curta), sempre com a mensagem da regra; `signUpSchema` recusa nome em branco e e-mail inválido.
- `apps/api/src/modules/accounts/presentation/sign-up/sign-up.hook.spec.ts`: o hook ignora outros caminhos, devolve 400 com a lista de campos e 422 quando o `internalAdapter` dublê acha o e-mail em minúsculas.
- `apps/api/src/modules/accounts/infra/rate-limit/valkey-rate-limit.storage.spec.ts`: `consume` libera até o máximo, recusa o seguinte com `retryAfter` e libera com o Valkey dublê lançando erro.
- `apps/api/src/modules/accounts/infra/verification-email/send-verification-email.spec.ts`: o link usa `WEB_ORIGIN` e o token, e o pedido não leva senha.
- `apps/api/src/modules/email/domain/verify-email.template.spec.ts`: assunto, nome, link e a frase das 24 horas no texto e no HTML.
- `apps/api/src/modules/email/application/send-email/send-email.use-case.spec.ts`: lê o destinatário, entrega pelo transporte dublê e descarta conta inexistente.
- `apps/web/src/routes/cadastro/action.spec.ts`: a `action` devolve erros por campo sem chamar a API, o estado de link enviado no 200, a mensagem de e-mail existente no 422 e a de servidor fora com `fetch` dublê.

Integração (Vitest, `apps/api/test/integration/**/*.int-spec.ts`, banco `app_test` e Valkey e Mailpit do Compose)
- `sign-up.int-spec.ts` (substitui o da fundação, que provava o cadastro fechado): cadastro válido cria a conta pendente sem cookie; e-mail com maiúsculas é gravado em minúsculas; duplicado em outra caixa é recusado com 422; senha e campos fora da regra respondem 400 sem criar conta; o sexto cadastro do mesmo IP em 60 s responde 429. Cada caso manda um `X-Forwarded-For` próprio, e o `createTestApp` apaga as chaves `rate-limit:*` na subida.
- `verification-email.int-spec.ts`: depois do cadastro, o e-mail chega ao Mailpit pela API REST dele, com o link da SPA e sem a senha; com o transporte trocado por um dublê que falha via `overrideProvider()`, o job tenta de novo.
- `sign-up-logs.int-spec.ts`: com o logger capturado, um cadastro completo não escreve senha, nome, e-mail nem token em nenhuma linha.

Factories
- `apps/api/test/factories/user.factory.ts` ganha `contaPendente`, que cria pelo próprio `POST /api/auth/sign-up/email` a conta usada pelos casos de duplicado.

Verificação por superfície

| Superfície | Mecanismo | Decisão |
| --- | --- | --- |
| API HTTP | requisições HTTP contra a API em execução no Compose, consulta ao PostgreSQL e às chaves do Valkey, leitura dos logs do serviço api | fundação |
| Worker | leitura da caixa do Mailpit pela API REST dele e das chaves da fila `email.send` no Valkey, com serviços do Compose parados e religados | ADR-0016 |
| UI | navegador dirigido pelo `@playwright/cli` contra a SPA em execução | ADR-0024 |
| E2E | navegador dirigido pelo `@playwright/cli` na SPA, mais a caixa do Mailpit e os logs da API | ADR-0024 |

---

## Decisões e hipóteses

Decisões
- E-mail duplicado é recusado com 422 `USER_ALREADY_EXISTS` por um hook `before` em `/sign-up/email`, escolhido na entrevista. Com `requireEmailVerification`, o Better Auth 1.7.14 responde 200 com um usuário sintético ao e-mail existente (`routes/sign-up.mjs`, `shouldReturnGenericDuplicateResponse`), o que contraria o erro previsto e o critério do RF; o hook também evita o log da biblioteca que interpola o e-mail. Alternativa descartada: manter a resposta genérica e revisar o PRD.
- O link do e-mail leva à SPA em `/confirmar-email?token=`, e não à rota `GET /api/auth/verify-email` com `callbackURL`, escolhido na entrevista: scanner de e-mail que faz GET no link não roda JavaScript e não consome a confirmação, e as mensagens de erro ficam em pt-BR na tela do RF-002. Consequência: até o RF-002, o link cai na página de erro da SPA.
- O botão de reenvio fica sempre visível na tela de link enviado, escolhido na entrevista: o Better Auth chama o `sendVerificationEmail` por `runInBackgroundOrAwait`, que captura o erro e só registra (`context/create-context.mjs`), então a resposta do cadastro não tem como avisar a falha. Alternativa descartada: sinalizar a falha por hook `after`, que não cobre a falha no SMTP.
- O rate limit guarda os contadores no Valkey por `rateLimit.customStorage`, escolhido na entrevista. Na entrevista o custo apresentado foi o de leitura e escrita sem atomicidade, e isso estava errado: no 1.7.14 o `customStorage` precisa implementar `consume(key, rule)` atômico (`@better-auth/core`, `types/init-options.d.mts`, `BetterAuthRateLimitStorage`), feito com INCR e expiração no Valkey. Alternativa descartada: `secondaryStorage`, que leva sessões e verificações para o Valkey se `session.storeSessionInDatabase` e `verification.storeInDatabase` não forem ligados (`db/internal-adapter.mjs`), contra o HLD.
- `TRUSTED_PROXIES` opcional, lista de CIDRs para `advanced.ipAddress.trustedProxies`, escolhido na entrevista. Sem ela o Better Auth confia num `X-Forwarded-For` de um valor só e, sem cabeçalho, usa 127.0.0.1 em development e test (`@better-auth/core`, `utils/ip.mjs`); o `.env.example` avisa que em produção atrás de proxy ela é necessária para o IP não ser forjado. Alternativa descartada: exigi-la com `NODE_ENV=production`.
- Rota `/cadastro` na SPA, escolhida na entrevista.
- Erro de validação em 400 `VALIDATION_ERROR` com a lista `fields`, no formato de `APIError` do Better Auth, escolhido na entrevista. Alternativa descartada: os códigos nativos `INVALID_EMAIL` e `PASSWORD_TOO_SHORT`, um por vez, que aceitam nome vazio (`name: z.string()` em `routes/sign-up.mjs`).
- Superfícies API HTTP, Worker, UI e E2E, com os gates `make check` e `make build`, escolhidas na entrevista.
- O BullMQ usa conexão própria a partir de `REDIS_URL`, e não a conexão `REDIS` da plataforma, porque o worker exige `maxRetriesPerRequest` nulo (BullMQ 6.5.1, `classes/redis-connection.js`) e a conexão compartilhada usa 1. O produtor usa `enableOfflineQueue` falso para falhar rápido com o Valkey fora, como recomenda o guia de produção do BullMQ (docs.bullmq.io, Going to production), em vez de segurar a resposta do cadastro.
- `createAuth` recebe as dependências novas num parâmetro opcional, e não por import em `auth.ts`, porque o seed carrega `auth.ts` direto no Node sem compilar (comentário de `auth.ts`), e o seed segue chamando `createAuth(env, prisma)` sem fila nem rate limit.
- Ligar o rate limit no RF-001 faz valer o padrão do Better Auth de 3 sign-ins a cada 10 segundos até o RF-003 definir os 5 a cada 60 segundos do HLD (`api/rate-limiter/index.mjs`, `getDefaultSpecialRules`); os testes de integração existentes que entram com o admin passam a mandar `X-Forwarded-For` próprio.
- O contrato da fundação precisa de revisão com `/spec-writer` depois deste RF: API-BORDA-05 dela exige 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`, e a spec da fundação já dizia que o RF-001 reabre o cadastro. A proteção contra pré-registro do e-mail de `ADMIN_EMAIL` continua no seed, que recusa conta existente sem papel admin (CLI-ADMIN-04 da fundação).

Hipóteses
- Nome com 1 a 100 caracteres depois de tirar os espaços das pontas, e e-mail com no máximo 254 caracteres (hipótese)
- Senha com no máximo 128 caracteres, o `maxPasswordLength` padrão do Better Auth (hipótese)
- Os logs do Better Auth vão para o logger pino da API por `logger.log`, no nível `warn` padrão da biblioteca, para sair em JSON e passar pela redação (hipótese)
- Mensagens da tela e do e-mail com o texto de Contratos de interface (hipótese)
- Os textos e códigos de erro vivem em `packages/contracts/src/accounts.ts`, para a SPA e a API usarem as mesmas mensagens (hipótese)

Pendentes de ADR
- nenhuma: Better Auth (ADR-0010), BullMQ (ADR-0015), Mailpit (ADR-0016), Nodemailer (ADR-0017), Zod (ADR-0023) e `@playwright/cli` (ADR-0024) cobrem a feature.

---

## Rastreabilidade

| Bloco do PRD ou do HLD | Onde está nesta spec |
| --- | --- |
| Fluxo principal | Regras e fluxos, Contratos de interface |
| Fluxos alternativos e exceções | Regras e fluxos (e-mail em minúsculas) |
| Erros previstos | Tratamento de erros |
| Depende de | Escopo, Entradas |
| PRD, Decisão regra de senha e Decisão confirmação de e-mail obrigatória | Regras e fluxos |
| PRD, Segurança e autorização e Compliance | Regras e fluxos, Estratégia de testes |
| HLD, Fluxo Cadastro e confirmação | Regras e fluxos (fluxo técnico) |
| HLD, Interfaces públicas (API de autenticação, Fila de e-mail) | Contratos de interface |
| RF-001 Criar conta: SPA Web, Módulo Contas, Módulo E-mail, PostgreSQL, Redis; API de autenticação, Fila de e-mail | Componentes |
