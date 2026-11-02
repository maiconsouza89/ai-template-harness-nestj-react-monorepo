# Spec: RF-002 Confirmar e-mail

PRD: docs/product/prd.md versão 0.1.0
HLD: docs/architecture/hld.md versão 0.3.0
Complexidade: média

---

## Escopo

Incluído
- Tela `/confirmar-email?token=` na SPA, que abre o link do e-mail, chama `GET /api/auth/verify-email?token=` e mostra um de quatro estados: conta ativada, conta já confirmada, link vencido e link que não vale.
- Ativação da conta pela rota nativa do Better Auth: `emailVerified` passa a verdadeiro, sem abrir sessão.
- Uso único do link: o token de cada envio fica registrado como hash na tabela `verification`, e a ativação consome o registro depois que o Better Auth marca a conta; uma falha antes disso não queima o link.
- Reenvio que invalida os links anteriores: cada envio do e-mail de confirmação (cadastro ou `POST /api/auth/send-verification-email`) grava o registro do link novo, válido por 24 horas, e só apaga os anteriores da conta depois de o pedido de envio entrar na fila.
- Limpeza dos registros de confirmação vencidos há mais de 7 dias, feita em cada envio.
- Conta já ativa: reabrir um link dela responde com o código `ALREADY_VERIFIED`, e a tela informa que a conta já está confirmada e leva para entrar.
- Link vencido e link inválido ou já trocado por reenvio: a tela informa o motivo e oferece o reenvio com um campo de e-mail, que pode ser repetido para outro e-mail sem recarregar a página.
- Página inicial como rota índice da raiz, que decide sozinha mostrar a página de erro com a API fora.
- Botão "Entrar" para `/entrar` nos estados de conta ativada e já confirmada.

Entradas
- RF-001 (dado): a conta pendente na tabela `user` (`emailVerified` falso), o callback `sendVerificationEmail` em `apps/api/src/modules/accounts/infra/verification-email/send-verification-email.ts`, que monta o link `<WEB_ORIGIN>/confirmar-email?token=<token>`, e o caso de uso de pedido de envio do Módulo E-mail com o tipo `verify-email`.
- RF-001 (dado): a rota `POST /api/auth/send-verification-email`, já usada pelo botão de reenvio da tela de link enviado, e o rate limit do Better Auth com contadores no Valkey.
- RF-001 (dado): a base visual de `apps/web/src/styles/app.css` (tokens e classes do `DESIGN.md`) e a barra de navegação da rota raiz.
- DEP-1 (fluxo): o e-mail do reenvio sai pelo mesmo Servidor SMTP (Mailpit no ambiente local).

Saídas
- A situação ativa da conta (`user.emailVerified` verdadeiro), que RF-003 confere para deixar entrar.
- O reenvio que invalida os links anteriores, que a tela de conta pendente do RF-003 reaproveita pela mesma rota.
- Os códigos e as mensagens da confirmação em `packages/contracts/src/accounts.ts`, para o RF-003 tratar a conta pendente com o mesmo texto de reenvio.

Fora desta spec
- Tela `/entrar`, sessão e bloqueio de conta pendente no login: RF-003. Até ele, o botão "Entrar" cai na página de erro da SPA, como o link "Entrar" da barra.
- Métrica de negócio de cadastros sem confirmação após 24 horas (HLD, Observabilidade): decisão da entrevista, fica para um RF futuro.
- Novo modelo de e-mail: o reenvio usa o e-mail de confirmação do RF-001, sem mudança de texto.

---

## Regras e fluxos

Regras
- O link de confirmação vale 24 horas a partir do envio que o gerou, cadastro ou reenvio (PRD, RF-001 Fluxo principal e RF-002 Fluxos alternativos).
- Cada envio grava um registro de confirmação na tabela `verification`: identificador `email-verification:<sha256 do token em hexadecimal>`, valor igual ao id da conta e `expiresAt` igual ao instante de expiração do próprio token, 24 horas depois da emissão, para o registro e o token vencerem juntos (hipótese no formato do identificador). O token em texto puro nunca é gravado no banco, e na fila só enquanto o envio precisa dele: o job `verify-email` do cadastro e o do reenvio seguem a regra de sigilo do link na fila da spec do RF-001 (Regras e fluxos), em que o worker tira o link dos dados quando o job conclui ou falha de vez e deixa só `type` e `userId`.
- O envio grava o registro novo sem apagar os anteriores e depois pede o envio ao Módulo E-mail. Com o pedido na fila, apaga os registros da conta criados antes do novo, e os links anteriores deixam de valer (PRD, RF-002 Fluxos alternativos). Se o pedido de envio falha, apaga só o registro novo: os links anteriores continuam valendo e o reenvio responde 500 (decisão da revisão do PR #16).
- Cada envio também apaga até 100 registros de confirmação, de qualquer conta, vencidos há mais de 7 dias (decisão da revisão do PR #16; prazo e lote são hipótese). Depois disso, o link deles cai em "link não vale", que também oferece o reenvio.
- Abrir o link com registro vigente de conta pendente segue para o Better Auth sem apagar o registro. O registro só é apagado quando a biblioteca responde sem erro: o link não ativa uma segunda vez (PRD, RF-002 Critérios). Se a biblioteca recusa ou o banco falha, o registro fica e o mesmo link pode ser aberto de novo (decisão da revisão do PR #16).
- Registro vencido (`expiresAt` no passado) não ativa a conta e responde 401 `TOKEN_EXPIRED`; o registro fica, e reabrir o mesmo link continua dizendo que venceu.
- Link sem registro (já usado, trocado por reenvio, adulterado, ou de uma conta que não existe) não ativa nada e responde 401 `INVALID_TOKEN`, salvo quando o token tem assinatura e prazo válidos e a conta do e-mail dele já está ativa: aí a resposta é 200 com `ALREADY_VERIFIED` (decisão da entrevista).
- Conta já ativa com registro vigente: o registro é apagado e a resposta é 200 com `ALREADY_VERIFIED`, sem tocar na conta.
- Dois pedidos simultâneos com o mesmo link ativam a conta uma vez e nenhum responde erro: os dois que acharem o registro seguem para a biblioteca, que grava `emailVerified` verdadeiro de forma idempotente, e um pedido que chegar depois de o registro ser apagado responde `ALREADY_VERIFIED` pelo token válido de conta ativa (decisão da revisão do PR #16).
- A ativação não abre sessão nem devolve cookie (PRD, Decisão confirmação de e-mail obrigatória antes de entrar; RF-003 é o login).
- O reenvio responde 200 `{ "status": true }` com e sem conta pendente, sem revelar qual, e não envia e-mail para conta já ativa ou inexistente (Better Auth 1.7.14, `routes/email-verification.mjs`).
- O reenvio aceita 3 pedidos a cada 60 segundos por IP, a regra padrão do Better Auth para `/send-verification-email` que o rate limit ligado no RF-001 já aplica; o quarto recebe 429 (`api/rate-limiter/index.mjs`, `getDefaultSpecialRules`).
- Nenhum log da API contém o token, o e-mail ou o nome da conta durante a confirmação e o reenvio; o log de acesso registra só o caminho, sem a query string (PRD, Compliance; ADR-0018; spec da fundação, Regras).
- A SPA chama a API só pelo JavaScript da tela: um scanner de e-mail que faz GET no link da SPA não consome a confirmação (spec do RF-001, Decisões).
- `/confirmar-email` sem `token` mostra o estado de link que não vale, sem chamar a API.
- O reenvio pela tela não refaz a confirmação: a rota não revalida o loader depois da própria `action` (hipótese).
- Contas criadas antes deste RF não têm registro de confirmação; o link delas cai em "link não vale" e o reenvio gera um link com registro.
- Depois de um reenvio pela tela, o aviso genérico vem com o botão "Enviar para outro e-mail", que mostra de novo o campo com o e-mail digitado e o botão "Reenviar o link" (decisão da revisão do PR #16). O limite de 3 reenvios por minuto continua valendo.
- A página inicial é a rota índice da raiz. Com a API fora na primeira leitura, o loader da raiz devolve a sessão anônima com a indicação de servidor fora, e cada rota filha decide o que mostrar: a índice mostra a página de erro, e `/confirmar-email` mostra o próprio aviso (decisão da revisão do PR #16).

Regras visuais (`DESIGN.md`, as mesmas do RF-001)
- O conteúdo fica num `card-content` abaixo da barra de navegação, com título em `display-lg`.
- "Entrar" é `button-primary` e "Reenviar o link" é `button-secondary`, ambos com raio de pílula.
- O campo de e-mail do reenvio é `text-input` com rótulo visível; erro de campo segue a convenção do RF-001 (borda `ink`, ícone, `aria-invalid`, `aria-describedby`).
- O estado da confirmação e o aviso do reenvio são anunciados com `role="status"`; aviso de servidor fora ou limite excedido usa `card-soft-tinted` com `role="alert"`.
- Em 375px de largura a tela não tem rolagem horizontal.

Fluxo técnico do caso principal
1. A pessoa abre o link `<WEB_ORIGIN>/confirmar-email?token=<token>` recebido do Servidor SMTP.
2. O loader da rota na SPA Web chama `GET /api/auth/verify-email?token=<token>` pelo `apiFetch`, sem `callbackURL`.
3. O hook `before` do Módulo Contas para `/verify-email` calcula o hash do token, busca o registro na tabela `verification` do PostgreSQL e confere conta, situação e prazo.
4. Com registro vigente de conta pendente, o hook deixa o pedido seguir para o Better Auth sem apagar o registro.
5. O Better Auth confere a assinatura e o prazo do token, grava `emailVerified` verdadeiro na conta e responde 200 `{ "status": true, "user": null }`, sem cookie.
6. O hook `after` do Módulo Contas para `/verify-email` vê a resposta sem erro e apaga o registro.
7. A SPA Web mostra "E-mail confirmado" e o botão "Entrar" para `/entrar`.

Fluxo técnico do reenvio
1. A tela de link vencido ou que não vale envia `POST /api/auth/send-verification-email` com o e-mail digitado.
2. O Better Auth, para conta pendente, chama o callback `sendVerificationEmail` do Módulo Contas.
3. O callback emite o token do link, grava o registro dele e apaga os vencidos há mais de 7 dias.
4. O callback pede o envio ao Módulo E-mail, que cria o job na fila `email.send` no Redis, e então apaga os registros anteriores da conta; se o pedido falha, apaga o registro novo e a rota responde 500.
5. A SPA Web informa que, se o e-mail tiver conta pendente, um novo link foi enviado.

---

## Componentes

| Componente do HLD | Caminho | O que muda nesta feature |
| --- | --- | --- |
| Contratos | `packages/contracts/src/accounts.ts` | Acrescenta os códigos da confirmação (`TOKEN_EXPIRED`, `INVALID_TOKEN`, `USER_NOT_FOUND`, `ALREADY_VERIFIED`), as mensagens em pt-BR dos quatro estados e do reenvio, e o esquema do corpo do reenvio sobre o `emailSchema` existente. |
| Módulo Contas | `apps/api/src/modules/accounts/domain/email-verification-links.ts` | Novo. Porta `EmailVerificationLinks` como classe abstrata: gravar o registro novo de uma conta, apagar os registros da conta anteriores a um registro, apagar os vencidos há mais de um prazo em lote limitado, buscar pelo hash do token e apagar um registro; e a função que calcula o hash SHA-256 do token. |
| Módulo Contas | `apps/api/src/modules/accounts/infra/email-verification/prisma-email-verification-links.repository.ts` | Novo. Implementação Prisma da porta sobre a tabela `verification`; os anteriores de um registro são os da mesma conta com `createdAt` menor, para dois envios simultâneos não apagarem o registro um do outro (hipótese). |
| Módulo Contas | `apps/api/src/modules/accounts/infra/verification-email/send-verification-email.ts` | O callback emite o próprio token (o JWT do Better Auth com um `jti` aleatório), grava o registro com o `exp` dele, poda os vencidos, pede o envio ao Módulo E-mail e só então apaga os anteriores da conta; com falha no pedido, apaga o registro novo. |
| Módulo Contas | `apps/api/src/modules/accounts/presentation/verify-email/verify-email.plugin.ts` | Novo. Plugin do Better Auth com hooks `before` e `after` só para `/verify-email`: o `before` aplica as regras de prazo e conta já ativa e responde sozinho nos casos que não seguem para a biblioteca; o `after` apaga o registro quando a resposta não é erro. Usa `verifyJWT` de `better-auth/crypto` só no caso sem registro. |
| Módulo Contas | `apps/api/src/modules/accounts/auth.ts`, `apps/api/src/modules/accounts/accounts.module.ts` | `AuthDependencies` ganha o plugin de confirmação, que entra em `plugins` ao lado do `signUpRequestPlugin`; o módulo liga a porta por `useClass` e monta o callback e o plugin. O seed segue chamando `createAuth(env, prisma)` sem eles. |
| Módulo E-mail | `apps/api/src/modules/email/` | Sem mudança: o reenvio usa o tipo `verify-email`, o envio já descarta job de conta verificada, e o job do reenvio segue a regra do RF-001 de tirar o link dos dados quando conclui ou falha de vez. |
| PostgreSQL | `apps/api/prisma/schema.prisma` | Sem mudança: a tabela `verification` da fundação já tem `identifier` indexado, `value` e `expiresAt`. |
| Redis | `apps/api/src/modules/accounts/auth.ts` | Sem mudança de código: a regra padrão de 3 reenvios a cada 60 segundos passa a ser verificada no contrato, com os contadores no Valkey do RF-001. |
| SPA Web | `apps/web/src/routes/confirmar-email/route.tsx`, `loader.ts`, `action.ts`, `apps/web/src/main.tsx` | Nova rota `/confirmar-email`, filha da raiz: o loader confirma o link e devolve o estado; a tela mostra os quatro estados e o reenvio, com o botão "Enviar para outro e-mail" depois do aviso; a `action` envia o reenvio; `shouldRevalidate` evita refazer a confirmação depois da `action`. |
| SPA Web | `apps/web/src/routes/root/route.tsx`, `apps/web/src/routes/home/route.tsx`, `apps/web/src/main.tsx` | A página inicial sai da rota raiz para uma rota `index` própria, que mostra a página de erro quando o loader da raiz indica a API fora; a raiz deixa de deduzir a página inicial pela ausência de tela filha. |

---

## Contratos de interface

`GET /api/auth/verify-email?token=<token>` (anônima, rota do Better Auth com o hook do Módulo Contas)
- 200, conta ativada (resposta nativa do Better Auth 1.7.14, `routes/email-verification.mjs`), sem `Set-Cookie`:

```json
{ "status": true, "user": null }
```

- 200, conta já ativa (resposta do hook):

```json
{ "status": true, "code": "ALREADY_VERIFIED" }
```

- 401, registro vencido:

```json
{ "code": "TOKEN_EXPIRED", "message": "Este link expirou. Peça um novo link abaixo." }
```

- 401, link sem registro, adulterado ou de conta inexistente:

```json
{ "code": "INVALID_TOKEN", "message": "Este link não vale mais. Peça um novo link abaixo." }
```

- 401 `USER_NOT_FOUND`, `INVALID_TOKEN` ou `TOKEN_EXPIRED` vindos da própria biblioteca depois do hook: a SPA trata `USER_NOT_FOUND` como link que não vale.
- 429: além de 100 pedidos a cada 10 segundos por IP, a regra geral do RF-001.

`POST /api/auth/send-verification-email` (anônima, rota do Better Auth, do RF-001)
- Entrada `{ "email": "lia@example.com" }`; 200 `{ "status": true }` com e sem conta pendente; 400 com e-mail inválido; 429 com `X-Retry-After` a partir do quarto pedido em 60 segundos do mesmo IP.

Registro de confirmação (tabela `verification`, interno ao Módulo Contas)

```json
{ "id": "k2Jd8...", "identifier": "email-verification:9f86d081884c7d65...", "value": "Yp3m2...", "expiresAt": "2026-11-01T12:00:00.000Z" }
```

Rota da SPA Web
- `/confirmar-email?token=<token>`: filha da raiz, sob a barra. Estados:
  - ativada: título "E-mail confirmado", texto "Sua conta está ativa." e o botão "Entrar" para `/entrar`;
  - já confirmada: título "Conta já confirmada", texto "Esta conta já está confirmada." e o botão "Entrar";
  - vencido: título "Link expirado", a mensagem de `TOKEN_EXPIRED`, o campo "E-mail" e o botão "Reenviar o link";
  - não vale: título "Link inválido", a mensagem de `INVALID_TOKEN`, o campo "E-mail" e o botão "Reenviar o link";
  - depois do reenvio: "Se o e-mail tiver uma conta pendente, enviamos um novo link." no lugar do campo, com o botão "Enviar para outro e-mail", que volta ao campo com o e-mail digitado e ao botão "Reenviar o link";
  - API fora: "O servidor não respondeu. Tente de novo.", sem dizer que a conta foi confirmada.

---

## Modelo de dados

Sem migração: a tabela `verification` da fundação recebe os registros de confirmação.
- `identifier`: `email-verification:<sha256 hexadecimal do token>`, buscado pelo índice existente em `identifier` na abertura do link.
- `value`: id da conta; a poda dos anteriores no envio filtra por prefixo de `identifier`, `value` e `createdAt`, sem índice, porque o reenvio é raro e limitado a 3 por minuto por IP (hipótese).
- `expiresAt`: o `exp` do token do link, 24 horas depois da emissão; a limpeza do envio apaga por prefixo de `identifier` e `expiresAt` mais de 7 dias no passado, até 100 por vez.
- `createdAt`: ordena os registros da conta para a poda dos anteriores.
- `user.emailVerified`: passa a verdadeiro na ativação, pela biblioteca.

O token de confirmação é o JWT do Better Auth (assinado com o segredo, com o e-mail e o prazo no payload), emitido pelo callback com um `jti` aleatório para cada envio ter um link próprio; a biblioteca o confere em `/verify-email` sem olhar o `jti`. O registro só acrescenta o estado que a biblioteca não guarda.

---

## Tratamento de erros

| Erro | Onde é detectado | Resposta do sistema | O que a pessoa vê |
| --- | --- | --- | --- |
| Link vencido | Módulo Contas, hook de `/verify-email` (registro com `expiresAt` no passado); Better Auth (JWT vencido) | 401 `TOKEN_EXPIRED`, conta continua pendente | "Link expirado", a mensagem e o reenvio com campo de e-mail |
| Link inválido ou já usado | Módulo Contas, hook de `/verify-email` (sem registro) | 401 `INVALID_TOKEN`, nada muda | "Link inválido", a mensagem e o reenvio com campo de e-mail |
| Link trocado por reenvio | Módulo Contas, hook de `/verify-email` (registro apagado no reenvio) | 401 `INVALID_TOKEN`, conta continua pendente | O mesmo estado de link inválido |
| Conta já ativa | Módulo Contas, hook de `/verify-email` | 200 `ALREADY_VERIFIED`, conta não muda | "Conta já confirmada" e o botão "Entrar" |
| Conta do registro não existe mais | Módulo Contas, hook de `/verify-email` | 401 `INVALID_TOKEN` | O estado de link inválido |
| Página aberta sem `token` | SPA Web, loader | Sem requisição à API | O estado de link inválido |
| Falha ao gravar o registro no envio | Módulo Contas, callback `sendVerificationEmail` | No cadastro, o `runInBackgroundOrAwait` registra o erro sem desfazer a conta; no reenvio, a rota responde 500; os registros anteriores ficam | Cadastro: a tela de link enviado do RF-001; reenvio: "O servidor não respondeu. Tente de novo." |
| Falha ao pedir o envio no reenvio (Redis fora) | Módulo Contas, callback `sendVerificationEmail` | 500; o registro novo é apagado e os anteriores continuam valendo | "O servidor não respondeu. Tente de novo."; o link anterior ainda ativa a conta |
| Falha ou recusa da biblioteca depois do hook (PostgreSQL fora, `USER_NOT_FOUND`, JWT recusado) | Better Auth | 500 ou 401 com o código da biblioteca; o registro fica e a conta continua pendente | "O servidor não respondeu. Tente de novo." ou o estado de link inválido; reabrir o mesmo link tenta de novo |
| Reenvio além de 3 por minuto do mesmo IP | Módulo Contas, rate limit do Better Auth | 429 com `X-Retry-After` | "Muitas tentativas. Tente de novo em alguns instantes." |
| E-mail inválido no reenvio | SPA Web, esquema de Contratos; Better Auth | Sem requisição; 400 se chegar à API | Mensagem de e-mail inválido abaixo do campo |
| API inacessível | SPA Web, `apiFetch` | `ApiUnavailableError` tratado no loader e na `action` | "O servidor não respondeu. Tente de novo." sem a página de erro |

---

## Estratégia de testes

Unidade (Vitest, `*.spec.ts` ao lado do código)
- `apps/api/src/modules/accounts/presentation/verify-email/verify-email.plugin.spec.ts`: com a porta dublê, o hook ignora outros caminhos; registro vigente de conta pendente segue sem ser apagado; o `after` apaga o registro na resposta sem erro e o mantém na resposta de erro; vencido responde `TOKEN_EXPIRED` sem apagar; sem registro responde `INVALID_TOKEN`; sem registro com JWT válido de conta ativa responde `ALREADY_VERIFIED`; conta ativa com registro apaga e responde `ALREADY_VERIFIED`.
- `apps/api/src/modules/accounts/domain/email-verification-links.spec.ts`: o hash é o SHA-256 hexadecimal e o identificador tem o prefixo.
- `apps/api/src/modules/accounts/infra/verification-email/send-verification-email.spec.ts`: o callback grava o registro com o `expiresAt` igual ao `exp` do token, pede o envio e só depois apaga os anteriores; não pede o envio quando a gravação falha; apaga só o registro novo quando o pedido falha; poda os vencidos há mais de 7 dias.
- `packages/contracts/src/accounts.spec.ts`: o esquema do reenvio aceita e-mail válido e recusa inválido com a mensagem de e-mail.
- `apps/web/src/routes/confirmar-email/loader.spec.ts` e `action.spec.ts`: com `fetch` dublê, o loader devolve cada estado pelo código, o estado de link inválido sem token e sem chamada, e o de servidor fora; a `action` devolve o aviso genérico no 200, o de limite no 429 e o erro de campo sem chamar a API.
- `apps/web/src/routes/confirmar-email/route.spec.tsx`: depois do aviso, "Enviar para outro e-mail" volta ao campo com o e-mail digitado.
- `apps/web/src/routes/home/route.spec.tsx`: com o loader da raiz indicando a API fora, a rota índice lança a página de erro.

Integração (Vitest, `apps/api/test/integration/**/*.int-spec.ts`, banco `app_test`, Valkey e Mailpit do Compose)
- `verify-email.int-spec.ts`: o cadastro grava um registro; o link do e-mail ativa a conta sem cookie e não ativa de novo; registro vencido responde 401 `TOKEN_EXPIRED`; reenvio troca o registro e o link anterior responde 401 `INVALID_TOKEN`; reenvio com o Valkey fora mantém o registro anterior; recusa da biblioteca mantém o registro; dois pedidos simultâneos ativam uma vez sem erro; o envio apaga os registros vencidos há mais de 7 dias e mantém os mais novos; o quarto reenvio do mesmo IP responde 429.
- `verify-email-logs.int-spec.ts`: com o logger capturado, a confirmação e o reenvio não escrevem token, e-mail nem nome.

Factories
- `apps/api/test/factories/user.factory.ts` ganha uma função que lê o token do último e-mail da conta no Mailpit e outra que move o `expiresAt` do registro de confirmação da conta (hipótese).

Verificação por superfície

| Superfície | Mecanismo | Decisão |
| --- | --- | --- |
| API HTTP | requisições HTTP contra a API em execução no Compose, consulta e alteração do PostgreSQL, leitura das linhas de log do serviço api, serviço valkey parado e religado pelo Compose nos itens de falha da fila | fundação |
| Worker | leitura da caixa do Mailpit pela API REST dele depois dos reenvios | ADR-0016 |
| UI | navegador dirigido pelo `@playwright/cli` contra a SPA em execução, lendo conteúdo, atributos, estilo computado, URL e requisições de rede, com o serviço api parado pelo Compose no item de falha | ADR-0024 |
| E2E | navegador dirigido pelo `@playwright/cli` na SPA, mais a caixa do Mailpit e o estado do PostgreSQL | ADR-0024 |

---

## Decisões e hipóteses

Decisões
- Uso único e invalidação no reenvio por registro do hash do token na tabela `verification` e hooks `before` e `after` em `/verify-email`, escolhido na entrevista. O Better Auth 1.7.14 gera o token de confirmação como JWT sem estado (`createEmailVerificationToken` em `routes/email-verification.mjs`): o link antigo seguiria ativando a conta depois do reenvio, e o HLD já previa uma checagem própria nesse caso (Rastreabilidade, lacuna do RF-002). Alternativas descartadas: endpoint próprio em `/api/v1` com a rota nativa bloqueada, e uma versão do token gravada na conta, que pede migração.
- O hook responde sozinho devolvendo o corpo JSON, o que o Better Auth 1.7.14 aceita: `runBeforeHooks` em `api/dispatch.mjs` devolve o retorno do hook como resposta quando ele não traz `context`.
- O hook entra como plugin com `hooks.before` e `matcher` pelo caminho, como o `signUpRequestPlugin` do RF-001, e não no hook global, que já é o do cadastro.
- Link reaberto de conta já ativa mostra "conta já confirmada" e leva para entrar, e não "link não vale", escolhido na entrevista: o reenvio para conta ativa não faz nada no Better Auth.
- Nas telas de link vencido e inválido, o e-mail do reenvio vem de um campo da tela, escolhido na entrevista: funciona com link adulterado e não depende do formato do token.
- Depois da ativação, a tela mostra o botão "Entrar" para `/entrar`, sem redirecionar sozinha, escolhido na entrevista.
- O registro é a fonte de verdade do prazo, e o `exp` do JWT fica como segunda barreira, escolhido na entrevista: o contrato simula o link vencido movendo o `expiresAt` no banco, sem modo de teste na API.
- `verifyJWT` de `better-auth/crypto` confere assinatura e prazo no caso sem registro; ele devolve nulo tanto para vencido quanto para inválido, por isso o vencimento é decidido pelo registro.
- Superfícies API HTTP, Worker, UI e E2E, com os gates `make check` e `make build`, escolhidas na entrevista.
- A métrica de cadastros sem confirmação após 24 horas fica fora deste RF, escolhido na entrevista.
- Revisão do PR #16, achados 1 e 2: o registro é apagado no hook `after`, depois de a biblioteca responder sem erro, e não no `before`. No `dispatch.mjs` do Better Auth 1.7.14, o `after` recebe o `APIError` em `context.returned` e uma exceção que não é `APIError` (banco fora) sobe sem passar por ele; nos dois casos o registro fica. Pedidos simultâneos seguem os dois para a biblioteca. Alternativas descartadas: apagar no `before` e restaurar no `after` (não cobre a exceção do banco nem a corrida) e manter o consumo antes da biblioteca.
- Revisão do PR #16, achado 5: o envio grava o novo, enfileira e só então apaga os anteriores, desfazendo o novo se o enfileiramento falha. Alternativas descartadas: enfileirar antes de gravar (o worker poderia entregar um link sem registro) e manter a perda coberta pelo reenvio.
- Revisão do PR #16, achado 6: a limpeza dos vencidos roda no próprio envio, sem infraestrutura nova. Alternativas descartadas: um Job Scheduler do BullMQ (ADR-0015) diário, que pede tipo de job novo, e não limpar.
- Revisão do PR #16, achado 7: depois do reenvio, o aviso vem com o botão "Enviar para outro e-mail", que reabre o formulário. Alternativas descartadas: manter o formulário sempre visível junto do aviso e manter o aviso no lugar do campo sem saída.
- Revisão do PR #16, achado 8: a página inicial vira rota `index` da raiz (React Router, Index Routes), e a decisão de mostrar a página de erro com a API fora sai da dedução pela ausência de tela filha. Alternativa descartada: manter a dedução e registrar a regra.
- Revisão do PR #16, achado 4 (corrigido no código): o `expiresAt` do registro é o `exp` do token emitido, para os dois vencerem no mesmo instante.
- O restante segue coberto por ADR aceito: Better Auth (ADR-0010), BullMQ (ADR-0015), Mailpit (ADR-0016), Zod (ADR-0023), `@playwright/cli` (ADR-0024) e Tailwind CSS 4 (ADR-0027).

Hipóteses
- Identificador `email-verification:<sha256 do token>` com o id da conta no valor, para a abertura do link usar o índice de `identifier` (hipótese)
- Registro vencido não é apagado na abertura, para reabrir o link continuar dizendo que venceu; sai no próximo envio da conta ou na limpeza dos vencidos há mais de 7 dias (hipótese)
- Limpeza de até 100 registros vencidos por envio, com prazo de 7 dias depois do vencimento (hipótese)
- Anteriores de um registro são os da mesma conta com `createdAt` menor (hipótese)
- Link já usado aberto depois de 24 horas, de conta ativa, cai em "link não vale", porque `verifyJWT` recusa o token vencido (hipótese)
- Textos dos estados da tela e das mensagens de erro como em Contratos de interface, em `packages/contracts/src/accounts.ts` (hipótese)
- A rota `/confirmar-email` não revalida o loader depois da própria `action`, por `shouldRevalidate` local à rota (hipótese)
- Factories que leem o token do Mailpit e movem o `expiresAt` do registro (hipótese)
- O contrato deste RF não tem item próprio para o link na fila: o job do reenvio é o mesmo `verify-email` do cadastro, com as mesmas opções e o mesmo worker, e os itens WRK-SIGILO do contrato do RF-001, que está no fecho, conferem o tipo (hipótese)

Pendentes de ADR
- nenhuma

---

## Rastreabilidade

| Bloco do PRD ou do HLD | Onde está nesta spec |
| --- | --- |
| Fluxo principal | Regras e fluxos (fluxo técnico), Contratos de interface |
| Fluxos alternativos e exceções | Regras e fluxos (reenvio, conta já ativa), Contratos de interface (estados da tela) |
| Erros previstos | Tratamento de erros |
| Depende de | Escopo, Entradas |
| PRD, Decisão confirmação de e-mail obrigatória e Compliance | Regras e fluxos |
| HLD, Fluxo Cadastro e confirmação e lacuna do RF-002 | Regras e fluxos, Decisões |
| RF-002 Confirmar e-mail: SPA Web, Módulo Contas, Módulo E-mail, Redis; API de autenticação, Fila de e-mail | Componentes |
