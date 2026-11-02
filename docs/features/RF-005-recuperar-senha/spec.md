# Spec: RF-005 Recuperar senha

PRD: docs/product/prd.md versão 0.1.0
HLD: docs/architecture/hld.md versão 0.3.0
Complexidade: média

---

## Escopo

Incluído
- Tela `/recuperar-senha` na SPA, já apontada pelo link "Recuperar a senha" do `/cadastro`, com o campo de e-mail que envia `POST /api/auth/request-password-reset` e responde sempre "Se o e-mail tiver conta, enviamos o link.", com e sem conta.
- Pedido de recuperação pela rota nativa do Better Auth: para conta existente, grava o registro do link na tabela `verification`, válido por 1 hora, e pede ao Módulo E-mail o e-mail de recuperação com o link `<WEB_ORIGIN>/redefinir-senha?token=<token>`.
- Token guardado só como hash: o identificador gravado é `reset-password:<sha256 do token>`, nunca o token em texto puro.
- Link fora da fila depois do envio: o job `reset-password` segue a retenção comum de `email.send`, e o worker tira dele o link com o token quando o job conclui ou falha de vez, pela regra de sigilo do link na fila do RF-001.
- Novo pedido que invalida os links anteriores: com o pedido de envio na fila, os registros de recuperação anteriores da conta são apagados.
- Resposta neutra também com a fila fora: o pedido de uma conta existente responde o mesmo 200 de um e-mail sem conta, e os links anteriores continuam valendo.
- Limite de 5 pedidos de recuperação a cada 60 segundos por IP.
- Novo tipo de e-mail `reset-password` no Módulo E-mail, com o template "Redefina sua senha".
- Checagem do link ao abrir: endpoint `GET /api/auth/reset-password-status?token=`, no plugin do Módulo Contas, que diz se o link ainda vale sem consumi-lo.
- Tela `/redefinir-senha?token=` na SPA: com link válido, os campos "Nova senha" e "Confirme a nova senha"; com link vencido, já usado ou inválido, a mensagem e o caminho para pedir outro.
- Troca da senha pela rota nativa `POST /api/auth/reset-password`, com a regra de senha de Contratos aplicada num hook antes da biblioteca; a troca consome o link e revoga todas as sessões da conta na mesma transação.
- Depois da troca, a tela diz que a senha foi alterada e mostra o botão "Entrar" para `/entrar`.

Entradas
- RF-001 (dado): a conta e o e-mail cadastrados, nas tabelas `user` e `account` (credencial `credential` com o hash scrypt), lidos pelo Better Auth em `/request-password-reset` e `/reset-password`.
- RF-001 (dado): o `passwordSchema` e o `emailSchema` de `packages/contracts/src/accounts.ts`, com a mensagem da regra de senha.
- RF-001 (dado): o caso de uso de pedido de envio do Módulo E-mail (`RequestEmailUseCase`), a fila `email.send` e o rate limit do Better Auth com contadores no Valkey (`ValkeyRateLimitStorage`).
- RF-001 (dado): a base visual de `apps/web/src/styles/app.css`, a barra de navegação da rota raiz e o link "Recuperar a senha" para `/recuperar-senha` na tela de e-mail já cadastrado.
- Fundação: a rota nativa `POST /api/auth/sign-in/email` e `GET /api/v1/session`, que mostram se uma senha entra e se uma sessão ainda vale.
- DEP-1 (fluxo): o e-mail de recuperação sai pelo Servidor SMTP (Mailpit no ambiente local).

Saídas
- nenhuma: nenhum RF depende do RF-005. A tela de entrar do RF-003 pode apontar para `/recuperar-senha`, que fica pronta aqui.

Fora desta spec
- Tela `/entrar`, bloqueio por tentativas e mensagem de conta pendente no login: RF-003. Até ele, o botão "Entrar" cai na página de erro da SPA, como no RF-002.
- Aviso por e-mail de troca de senha: RF-007 (a troca com a senha atual). A recuperação não envia aviso, porque o PRD não o pede neste RF.
- Recuperação de conta desativada: RF-013 decide o efeito da desativação; aqui a biblioteca segue o padrão dela.

---

## Regras e fluxos

Regras
- O link de recuperação vale 1 hora a partir do pedido que o gerou e é de uso único (PRD, RF-005 Fluxo principal; Regras de produto, links de uso único).
- A resposta do pedido é a mesma para e-mail com e sem conta: 200 `{ "status": true, "message": ... }` com o mesmo corpo, e a tela mostra o mesmo texto (PRD, RF-005 Critérios; Decisão recuperação com link de 1 hora e resposta neutra).
- Para conta existente, o Better Auth grava o registro `reset-password:<token>` com `value` igual ao id da conta e `expiresAt` 1 hora depois; a opção `verification.storeIdentifier` grava em vez dele `reset-password:<sha256 hexadecimal do token>`, e a biblioteca aplica o mesmo hash ao buscar e consumir o registro (escolhido na entrevista).
- O callback de envio pede o e-mail ao Módulo E-mail e, com o pedido na fila, apaga os registros de recuperação da conta criados antes do novo: os links anteriores deixam de valer (PRD, RF-005 Fluxos alternativos).
- Se o pedido à fila falha, o callback apaga só o registro novo, registra a falha no log sem e-mail nem token e não propaga o erro: a resposta é o mesmo 200 neutro, e os links anteriores continuam valendo (escolhido na entrevista; HLD, Fluxo de dados: a perda é coberta por um novo pedido).
- Cada pedido de conta existente também apaga os registros de recuperação vencidos, de qualquer conta (hipótese).
- O job `reset-password` da fila `email.send` tem as mesmas tentativas, backoff e retenção do `verify-email` (concluído fica 24 horas, falho fica 7 dias) e segue a regra de sigilo do link na fila da spec do RF-001 (Regras e fluxos): o link com o token fica nos dados do job só enquanto ele está pendente ou esperando nova tentativa, e quando o job conclui ou falha de vez o worker regrava os dados só com `type` e `userId`. Assim o token em texto puro não fica guardado nem no banco nem na fila depois do envio (decisão da revisão de segurança do PR #18, "apagar só o link", que substitui a remoção do job inteiro).
- O pedido de recuperação aceita 5 pedidos a cada 60 segundos por IP; o sexto recebe 429 com `X-Retry-After` (HLD, Interfaces públicas).
- A checagem do link não consome o registro: responde 200 com registro dentro do prazo e 400 `INVALID_TOKEN` com registro vencido, ausente ou de conta que não existe mais.
- A nova senha segue o `passwordSchema` de Contratos: no mínimo 8 caracteres, com ao menos uma letra e um número, no máximo 128 (PRD, Decisão regra de senha). Fora da regra, o hook antes de `/reset-password` responde 400 `VALIDATION_ERROR` com a regra e não chega à biblioteca: o link continua valendo e a senha não muda (PRD, RF-005 Erros previstos).
- A troca consome o registro, revoga todas as sessões da conta e grava o hash novo numa transação só (`revokeSessionsOnPasswordReset`): uma falha em qualquer passo deixa os três como estavam e o link pode ser usado de novo (Better Auth 1.7.14, `utils/password.mjs`, `resetCredentialPassword`).
- Link vencido, já usado, trocado por novo pedido ou inválido não troca a senha: `POST /api/auth/reset-password` responde 400 `INVALID_TOKEN` (PRD, RF-005 Critérios).
- Dois pedidos simultâneos de troca com o mesmo link trocam a senha uma vez: o consumo do registro é atômico (`consumeVerificationValue`), e o outro responde 400 `INVALID_TOKEN`.
- Conta pendente de confirmação troca a senha e continua pendente; a recuperação não confirma o e-mail (escolhido na entrevista).
- A troca não abre sessão nem devolve cookie: a pessoa entra pela tela do RF-003.
- Nenhum log da API contém o token, a senha, o e-mail ou o nome da conta durante o pedido, a checagem e a troca; o log de acesso registra só o caminho, sem a query string (PRD, Compliance; ADR-0018; spec da fundação, Regras).
- A SPA chama a API só pelo JavaScript da tela: um scanner de e-mail que faz GET no link da SPA não consome o link, e a checagem ao abrir também não.
- `/redefinir-senha` sem `token` mostra o estado de link que não vale, sem chamar a API.
- A tela de redefinição não refaz a checagem do link depois da própria `action`: com o link já consumido, a revalidação trocaria "Senha alterada" por "link não vale".
- Os dois campos de senha precisam ser iguais; a comparação é só da SPA, com a mensagem "As senhas não conferem." no campo de confirmação, sem chamar a API (escolhido na entrevista).
- Depois do pedido pela tela, o aviso neutro vem com o botão "Enviar para outro e-mail", que mostra de novo o campo com o e-mail digitado, como no reenvio do RF-002 (hipótese).

Regras visuais (`DESIGN.md`, as mesmas do RF-001 e do RF-002)
- O conteúdo fica num `card-content` abaixo da barra de navegação, com título em `display-lg`.
- "Enviar o link", "Salvar a nova senha" e "Entrar" são `button-primary`; "Pedir outro link" e "Enviar para outro e-mail" são `button-secondary`, todos com raio de pílula.
- Os campos são `text-input` com rótulo visível; erro de campo segue a convenção do RF-001 (borda `ink`, ícone, `aria-invalid`, `aria-describedby`); os campos de senha têm `type="password"` e `autocomplete="new-password"`.
- Avisos de estado são anunciados com `role="status"`; aviso de servidor fora ou limite excedido usa `card-soft-tinted` com `role="alert"`.
- Em 375px de largura as telas não têm rolagem horizontal.

Fluxo técnico do pedido
1. A pessoa informa o e-mail em `/recuperar-senha`; a `action` da SPA Web valida com o `emailSchema` e envia `POST /api/auth/request-password-reset` pelo `apiFetch`, sem `redirectTo`.
2. O Módulo Contas aplica o rate limit por IP com os contadores no Redis.
3. Sem conta, o Better Auth responde 200 neutro. Com conta, grava o registro do hash do token na tabela `verification` do PostgreSQL e chama o callback `sendResetPassword`.
4. O callback apaga os registros de recuperação vencidos, pede o envio ao Módulo E-mail com o tipo `reset-password` e o link da SPA e, com o job na fila `email.send`, apaga os registros anteriores da conta.
5. O Better Auth responde o mesmo 200 neutro, e a SPA Web mostra "Se o e-mail tiver conta, enviamos o link.".

Fluxo técnico da troca
1. A pessoa abre `<WEB_ORIGIN>/redefinir-senha?token=<token>` recebido do Servidor SMTP.
2. O loader da rota na SPA Web chama `GET /api/auth/reset-password-status?token=<token>`; o endpoint do plugin do Módulo Contas busca o registro pelo hash e responde se vale.
3. Com link válido, a tela mostra os dois campos; a `action` valida a regra e a igualdade e envia `POST /api/auth/reset-password` com o token e a nova senha.
4. O hook antes de `/reset-password` do Módulo Contas confere a nova senha com o `passwordSchema`.
5. O Better Auth consome o registro, revoga as sessões da conta e grava o hash scrypt novo numa transação, e responde 200 `{ "status": true }`.
6. A SPA Web mostra "Senha alterada" e o botão "Entrar" para `/entrar`.

---

## Componentes

| Componente do HLD | Caminho | O que muda nesta feature |
| --- | --- | --- |
| Contratos | `packages/contracts/src/accounts.ts` | Acrescenta o esquema do corpo do pedido (sobre o `emailSchema`), o da troca (token e `newPassword` com o `passwordSchema`), o do formulário da SPA com a confirmação da senha, o código `INVALID_TOKEN` da recuperação, os textos dos estados das duas telas e a forma do erro 400 `VALIDATION_ERROR` da troca. |
| Módulo Contas | `apps/api/src/modules/accounts/domain/password-reset-links.ts` | Novo. Porta `PasswordResetLinks` como classe abstrata: buscar o registro pelo identificador gravado, apagar os registros da conta anteriores a um registro, apagar um registro e apagar os vencidos; e a função de hash do identificador `reset-password:<token>` para `reset-password:<sha256 hexadecimal do token>`. |
| Módulo Contas | `apps/api/src/modules/accounts/infra/password-reset/prisma-password-reset-links.repository.ts` | Novo. Implementação Prisma da porta sobre a tabela `verification`, filtrando pelo prefixo `reset-password:`; os anteriores de um registro são os da mesma conta com `createdAt` menor. |
| Módulo Contas | `apps/api/src/modules/accounts/infra/password-reset-email/send-reset-password.ts` | Novo. Callback `emailAndPassword.sendResetPassword`: monta o link da SPA, limpa os vencidos, pede o envio ao Módulo E-mail e só então apaga os anteriores; com falha, apaga o registro novo, registra a falha e não propaga o erro. |
| Módulo Contas | `apps/api/src/modules/accounts/presentation/reset-password/reset-password.plugin.ts` | Novo. Plugin do Better Auth com o hook antes de `/reset-password`, que aplica o `passwordSchema` à nova senha, e o endpoint `GET /reset-password-status`, que confere o registro sem consumi-lo. |
| Módulo Contas | `apps/api/src/modules/accounts/auth.ts`, `apps/api/src/modules/accounts/accounts.module.ts` | `emailAndPassword` ganha `sendResetPassword`, `resetPasswordTokenExpiresIn` de 3600 e `revokeSessionsOnPasswordReset`; `verification.storeIdentifier` ganha o override com o hash de `reset-password:`; `RATE_LIMIT.customRules` ganha `/request-password-reset` com 5 a cada 60 segundos; `AuthDependencies` ganha o callback, o plugin e a função de hash, que entram só com `deps`. O módulo liga a porta por `useClass` e monta o callback e o plugin. |
| Módulo E-mail | `apps/api/src/modules/email/domain/email-request.ts`, `apps/api/src/modules/email/domain/reset-password.template.ts`, `apps/api/src/modules/email/application/send-email/send-email.use-case.ts`, `apps/api/src/modules/email/infra/queue/email-send.queue.ts` | Tipo `reset-password` em `EMAIL_TYPES`, template novo em pt-BR com o link e a validade de 1 hora, e o envio renderiza o template pelo tipo. O descarte de conta que não existe mais vale também para ele. O job `reset-password` entra com as opções comuns de `email.send`, sem retenção própria, e o worker do RF-001 tira o link dos dados dele quando conclui ou falha de vez. |
| PostgreSQL | `apps/api/prisma/schema.prisma` | Sem mudança: a tabela `verification` da fundação guarda os registros de recuperação, e `session` e `account` recebem a revogação e o hash novo. |
| Redis | `apps/api/src/modules/accounts/auth.ts` | Sem mudança de código no armazenamento: a regra de 5 pedidos a cada 60 segundos usa os contadores no Valkey do RF-001, e o job de recuperação entra na fila `email.send`. |
| SPA Web | `apps/web/src/routes/recuperar-senha/route.tsx`, `action.ts` | Nova rota `/recuperar-senha`, filha da raiz: o formulário de e-mail, o aviso neutro com "Enviar para outro e-mail" e os avisos de limite e de servidor fora. |
| SPA Web | `apps/web/src/routes/redefinir-senha/route.tsx`, `loader.ts`, `action.ts`, `apps/web/src/main.tsx` | Nova rota `/redefinir-senha`, filha da raiz: o loader checa o link e devolve o estado; a tela mostra o formulário, o link que não vale com "Pedir outro link" e a senha alterada com "Entrar"; a `action` envia a troca; `shouldRevalidate` evita refazer a checagem depois da `action`. |

---

## Contratos de interface

`POST /api/auth/request-password-reset` (anônima, rota nativa do Better Auth)
- Entrada:

```json
{ "email": "rosa@example.com" }
```

- 200, com e sem conta, mesmo corpo (resposta nativa do Better Auth 1.7.14, `routes/password.mjs`), também com a fila fora:

```json
{ "status": true, "message": "If this email exists in our system, check your email for the reset link" }
```

- 400 com e-mail fora do formato.
- 429 com `X-Retry-After` a partir do sexto pedido em 60 segundos do mesmo IP.

`GET /api/auth/reset-password-status?token=<token>` (anônima, endpoint do plugin do Módulo Contas, nome em hipótese)
- 200, registro dentro do prazo, sem consumir:

```json
{ "valid": true }
```

- 400, registro vencido, ausente ou de conta inexistente, e token ausente:

```json
{ "code": "INVALID_TOKEN", "message": "Este link não vale mais. Peça outro link." }
```

`POST /api/auth/reset-password` (anônima, rota nativa do Better Auth, com o hook do Módulo Contas)
- Entrada:

```json
{ "token": "Xk3...", "newPassword": "Nova12345" }
```

- 200, senha trocada, sem `Set-Cookie`:

```json
{ "status": true }
```

- 400 da regra de senha (resposta do hook):

```json
{ "code": "VALIDATION_ERROR", "message": "Confira os campos destacados.", "fields": [{ "field": "newPassword", "message": "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." }] }
```

- 400 `INVALID_TOKEN` (resposta nativa, mensagem em inglês da biblioteca) com link vencido, já usado, trocado por novo pedido ou inválido; 400 `USER_NOT_FOUND` se a conta do registro sumiu. A SPA trata os dois como link que não vale e mostra o texto de Contratos.

Pedido de envio ao Módulo E-mail (job da fila `email.send`)

```json
{ "type": "reset-password", "userId": "Yp3m2...", "url": "http://localhost:5173/redefinir-senha?token=Xk3..." }
```

- Opções e retenção comuns da fila, da spec do RF-001 (Contratos de interface). Dados do job concluído ou falho de vez, depois de o worker tirar o link:

```json
{ "type": "reset-password", "userId": "Yp3m2..." }
```

E-mail de recuperação (hipótese nos textos)
- Assunto "Redefina sua senha"; saudação "Olá, <nome>!"; o link; "O link vale por 1 hora e só pode ser usado uma vez."; "Se você não pediu a troca, ignore esta mensagem: sua senha continua a mesma.". Texto e HTML, com o nome escapado no HTML.

Rotas da SPA Web
- `/recuperar-senha`: título "Recuperar a senha", campo "E-mail" e botão "Enviar o link". Depois do 200: "Se o e-mail tiver conta, enviamos o link." no lugar do campo, com o botão "Enviar para outro e-mail". 429: "Muitas tentativas. Tente de novo em alguns instantes.". API fora: "O servidor não respondeu. Tente de novo.".
- `/redefinir-senha?token=<token>`, estados:
  - formulário: título "Definir nova senha", campos "Nova senha" e "Confirme a nova senha" e botão "Salvar a nova senha";
  - senha alterada: título "Senha alterada", texto "Sua senha foi trocada. Entre com a nova senha." e o botão "Entrar" para `/entrar`;
  - link que não vale: título "Link inválido", texto "Este link não vale mais. Peça outro link." e o botão "Pedir outro link" para `/recuperar-senha`;
  - API fora: "O servidor não respondeu. Tente de novo.", sem a página de erro.

---

## Modelo de dados

Sem migração: as tabelas da fundação cobrem a feature.
- `verification.identifier`: `reset-password:<sha256 hexadecimal do token>`, gravado e buscado pelo Better Auth com a função de hash do override e pelo índice existente em `identifier`.
- `verification.value`: id da conta; a remoção dos anteriores filtra por prefixo de `identifier`, `value` e `createdAt`, sem índice, porque o pedido é limitado a 5 por minuto por IP (hipótese).
- `verification.expiresAt`: 1 hora depois do pedido (`resetPasswordTokenExpiresIn` de 3600 segundos); a limpeza de cada pedido apaga os registros `reset-password:` com `expiresAt` no passado.
- `verification.createdAt`: ordena os registros da conta para a remoção dos anteriores.
- `account.password`: recebe o hash scrypt da nova senha na troca.
- `session`: todas as linhas da conta são apagadas na troca.
- `user.emailVerified`: não muda na recuperação.

O token é o `generateId(24)` do Better Auth, alfanumérico, de 24 caracteres; o registro com o hash é a única fonte de verdade do prazo e do uso.

---

## Tratamento de erros

| Erro | Onde é detectado | Resposta do sistema | O que a pessoa vê |
| --- | --- | --- | --- |
| Link vencido, já usado ou inválido, ao abrir | Módulo Contas, endpoint `/reset-password-status` | 400 `INVALID_TOKEN`, nada muda | "Link inválido", a mensagem e o botão "Pedir outro link" |
| Link vencido, já usado ou trocado por novo pedido, ao salvar | Better Auth, `/reset-password` | 400 `INVALID_TOKEN`, senha e sessões não mudam | O mesmo estado de link inválido |
| Conta do registro não existe mais | Módulo Contas, endpoint de checagem; Better Auth, `/reset-password` | 400 `INVALID_TOKEN` ou `USER_NOT_FOUND` | O estado de link inválido |
| Página aberta sem `token` | SPA Web, loader | Sem requisição à API | O estado de link inválido |
| Nova senha fora da regra | SPA Web, esquema de Contratos; Módulo Contas, hook antes de `/reset-password` | Sem requisição; 400 `VALIDATION_ERROR` se chegar à API, link continua valendo | A regra abaixo do campo "Nova senha" |
| Senhas diferentes nos dois campos | SPA Web, esquema do formulário | Sem requisição | "As senhas não conferem." abaixo do campo de confirmação |
| Dois pedidos de troca simultâneos com o mesmo link | Better Auth, `consumeVerificationValue` | Um 200, o outro 400 `INVALID_TOKEN` | Quem perdeu a corrida vê o estado de link inválido |
| Falha na transação da troca (PostgreSQL fora) | Better Auth | 500; registro, sessões e senha ficam como estavam | "O servidor não respondeu. Tente de novo."; o mesmo link pode ser usado de novo |
| Falha no envio do e-mail (SMTP fora ou recusando) | Módulo E-mail, worker | Nova tentativa até 5, com backoff exponencial a partir de 5 s e o link ainda nos dados; depois o job fica como falho, só com `type` e `userId` nos dados (regra do RF-001) | O mesmo aviso neutro; nenhum e-mail chega, e um novo pedido gera outro link |
| Fila fora no pedido (Redis fora) | Módulo Contas, callback `sendResetPassword` | 200 neutro; o registro novo é apagado, os anteriores continuam valendo, a falha vai para o log sem dado pessoal | O mesmo aviso neutro; nenhum e-mail chega |
| Pedido além de 5 por minuto do mesmo IP | Módulo Contas, rate limit do Better Auth | 429 com `X-Retry-After` | "Muitas tentativas. Tente de novo em alguns instantes." |
| E-mail inválido no pedido | SPA Web, esquema de Contratos; Better Auth | Sem requisição; 400 se chegar à API | "Informe um e-mail válido." abaixo do campo |
| API inacessível | SPA Web, `apiFetch` | `ApiUnavailableError` tratado no loader e nas `action`s | "O servidor não respondeu. Tente de novo." sem a página de erro |

---

## Estratégia de testes

Unidade (Vitest, `*.spec.ts` ao lado do código)
- `apps/api/src/modules/accounts/domain/password-reset-links.spec.ts`: o hash do identificador mantém o prefixo, usa SHA-256 hexadecimal do token e é estável.
- `apps/api/src/modules/accounts/infra/password-reset-email/send-reset-password.spec.ts`: com a porta e o pedido de envio dublês, o callback monta o link `<WEB_ORIGIN>/redefinir-senha?token=`, limpa os vencidos, pede o envio e só depois apaga os anteriores; com falha no pedido, apaga o registro novo, registra a falha e resolve sem erro.
- `apps/api/src/modules/accounts/presentation/reset-password/reset-password.plugin.spec.ts`: o hook ignora outros caminhos, recusa nova senha fora da regra com `VALIDATION_ERROR` e deixa seguir a válida; a checagem responde válido com registro no prazo e `INVALID_TOKEN` com registro vencido, ausente, sem token ou de conta inexistente, sem apagar nada.
- `apps/api/src/modules/email/domain/reset-password.template.spec.ts`: assunto, saudação, link, validade e nome escapado no HTML.
- `apps/api/src/modules/email/application/send-email/send-email.use-case.spec.ts`: o tipo `reset-password` renderiza o template de recuperação.
- `apps/api/src/modules/email/infra/queue/bullmq-email.queue.spec.ts`: o job `reset-password` entra com as mesmas tentativas, backoff e retenção do `verify-email`.
- `apps/api/src/modules/email/infra/queue/email-send.processor.spec.ts`: o job `reset-password` tem os dados regravados só com `type` e `userId` quando conclui e quando falha de vez, como o `verify-email`.
- `packages/contracts/src/accounts.spec.ts`: os esquemas do pedido, da troca e do formulário, inclusive a mensagem de senhas diferentes.
- `apps/web/src/routes/recuperar-senha/action.spec.ts`: o aviso neutro no 200, o de limite no 429, o de servidor fora e o erro de campo sem chamar a API.
- `apps/web/src/routes/redefinir-senha/loader.spec.ts` e `action.spec.ts`: o loader devolve formulário, link inválido (inclusive sem token, sem chamada) e servidor fora; a `action` devolve senha alterada no 200, link inválido no 400 `INVALID_TOKEN` e `USER_NOT_FOUND`, erros de campo no `VALIDATION_ERROR` e sem chamar a API com senhas diferentes.
- `apps/web/src/routes/redefinir-senha/route.spec.tsx`: depois da `action` com sucesso, a tela continua em "Senha alterada" sem refazer a checagem.

Integração (Vitest, `apps/api/test/integration/**/*.int-spec.ts`, banco `app_test`, Valkey e Mailpit do Compose)
- `reset-password.int-spec.ts`: pedido com e sem conta com o mesmo corpo; registro gravado só como hash e com prazo de 1 hora; novo pedido apaga o anterior; fila fora mantém o anterior e responde 200; a checagem não consome; a troca muda a senha, apaga as sessões e consome o link; link vencido, usado e trocado respondem `INVALID_TOKEN`; regra de senha mantém o link; troca simultânea troca uma vez; conta pendente continua pendente; o sexto pedido do mesmo IP responde 429; o job que entregou o e-mail continua na fila como concluído, só com `type` e `userId` nos dados e sem o token.
- `reset-password-logs.int-spec.ts`: com o logger capturado, pedido, checagem e troca não escrevem token, senha, e-mail nem nome.

Factories
- `apps/api/test/factories/user.factory.ts` ganha a conta ativa com e-mail, nome e senha dados, criada no banco com a instância do Better Auth da aplicação de teste, a leitura do token do último e-mail de recuperação da conta no Mailpit (pelo assunto) e a função que move o `expiresAt` do registro de recuperação da conta (hipótese).

Verificação por superfície

| Superfície | Mecanismo | Decisão |
| --- | --- | --- |
| API HTTP | requisições HTTP contra a API em execução no Compose, consulta e alteração do PostgreSQL, leitura das linhas de log do serviço api, serviço valkey parado e religado pelo Compose no item de fila fora | fundação |
| Worker | leitura da caixa do Mailpit pela API REST dele depois dos pedidos e das chaves da fila `email.send` no Valkey, com o serviço mailpit parado pelo Compose no item de falha de envio | ADR-0016 |
| UI | navegador dirigido pelo `@playwright/cli` contra a SPA em execução, lendo conteúdo, atributos, estilo computado, URL e requisições de rede, com o serviço api parado pelo Compose no item de falha | ADR-0024 |
| E2E | navegador dirigido pelo `@playwright/cli` na SPA, mais a caixa do Mailpit, requisições HTTP à API e o estado do PostgreSQL | ADR-0024 |

---

## Decisões e hipóteses

Decisões
- Recuperação pelas rotas nativas do Better Auth (`/request-password-reset` e `/reset-password`), com o callback, o hook e o endpoint de checagem do Módulo Contas, pelo ADR-0010 e pela tabela de componentes do HLD (Módulo Contas monta a recuperação).
- Token guardado como `reset-password:<sha256 do token>` por `verification.storeIdentifier` com override só para `reset-password:` e função de hash própria, escolhido na entrevista. O Better Auth 1.7.14 grava o token em texto puro por padrão (`routes/password.mjs`) e aplica a função de hash do override em `createVerificationValue`, `findVerificationValue` e no consumo (`db/verification-token-storage.mjs`, `db/internal-adapter.mjs`). Alternativas descartadas: o modo `hashed` nativo, que perde o prefixo e impede apagar os anteriores por ele, e o texto puro.
- Novo pedido invalida os anteriores no callback, depois de o pedido entrar na fila, como no reenvio do RF-002: a biblioteca não apaga os registros anteriores sozinha.
- O job `reset-password` segue a retenção comum de `email.send` e só perde o link quando conclui ou falha de vez, pela regra do RF-001, decidido pela pessoa na revisão de segurança do PR #18 ("apagar só o link"). A primeira correção do achado removia o job inteiro ao concluir e ao falhar de vez (`removeOnComplete` e `removeOnFail` verdadeiros), exceção ao ADR-0015, que manda o job que esgota as tentativas ficar como falho para inspeção; a regra comum tira o token da fila sem apagar o job. Ponto fraco aceito pela pessoa: se o worker cair entre o job terminar e a regravação dos dados, o link fica guardado até a retenção vencer (24 horas concluído, 7 dias falho), embora o token perca a validade em 1 hora.
- Pedido com a fila fora responde o 200 neutro, escolhido na entrevista: responder 500 só para conta existente revelaria a conta. O registro novo é apagado e os anteriores continuam valendo.
- Validade do link checada ao abrir, por um endpoint do plugin, escolhido na entrevista: a rota nativa `GET /reset-password/:token` só redireciona, e a SPA não lê o destino do redirecionamento pelo `fetch`. O endpoint usa `createAuthEndpoint` de `better-auth/api` e busca pelo `internalAdapter`, que aplica o mesmo hash.
- Conta pendente troca a senha e continua pendente, escolhido na entrevista: a confirmação de e-mail fica só no RF-002.
- Depois da troca, a tela mostra o botão "Entrar" para `/entrar`, sem redirecionar sozinha, escolhido na entrevista.
- Formulário com "Nova senha" e "Confirme a nova senha", com a igualdade conferida só na SPA, escolhido na entrevista.
- Revogação de todas as sessões por `revokeSessionsOnPasswordReset`, que no Better Auth 1.7.14 apaga as sessões no banco dentro da mesma transação do consumo do link e da senha nova (`utils/password.mjs`, `resetCredentialPassword`; `@better-auth/core`, `types/init-options.d.mts`).
- Rate limit de 5 pedidos a cada 60 segundos em `/request-password-reset` por `customRules`, que no Better Auth 1.7.14 sobrepõem a regra padrão de 3 a cada 60 segundos (`api/rate-limiter/index.mjs`, `resolveRateLimitConfig`), conforme o HLD.
- A senha antiga e a nova são conferidas no contrato por `POST /api/auth/sign-in/email`, a rota nativa que o contrato da fundação já exercita: o contrato não depende da tela nem das regras do RF-003. Credencial errada responde 401 `INVALID_EMAIL_OR_PASSWORD` (`routes/sign-in.mjs`).
- O callback, o plugin e a função de hash entram por `AuthDependencies`, e não por import, porque `auth.ts` é carregado direto no Node pelo seed (spec do RF-001, Decisões).
- Superfícies API HTTP, Worker, UI e E2E, com os gates `make check` e `make build`, escolhidas na entrevista.
- O restante segue coberto por ADR aceito: Better Auth (ADR-0010), Valkey (ADR-0014), BullMQ (ADR-0015), Mailpit (ADR-0016), Zod (ADR-0023), `@playwright/cli` (ADR-0024) e Tailwind CSS 4 (ADR-0027).

Hipóteses
- Endpoint de checagem em `GET /api/auth/reset-password-status?token=`, com 200 `{ "valid": true }` e 400 `INVALID_TOKEN` (hipótese)
- Link vencido, já usado e inválido mostram um só estado, "Link inválido", porque o PRD os trata como um erro só e a biblioteca não distingue vencido de ausente na troca (hipótese)
- Limpeza dos registros de recuperação vencidos, de qualquer conta, a cada pedido de conta existente (hipótese)
- Anteriores de um registro são os da mesma conta com `createdAt` menor, para dois pedidos simultâneos não apagarem o registro um do outro (hipótese)
- Textos das telas, dos avisos e do e-mail como em Contratos de interface, em `packages/contracts/src/accounts.ts` e no template do Módulo E-mail (hipótese)
- O aviso neutro de `/recuperar-senha` vem com o botão "Enviar para outro e-mail", como no reenvio do RF-002 (hipótese)
- O tempo de resposta do pedido não é igualado entre e-mail com e sem conta além do que a biblioteca já simula; o critério é sobre a resposta na tela (hipótese)
- Factories da conta ativa, do token do e-mail de recuperação e do vencimento do registro (hipótese)

Pendentes de ADR
- nenhuma

---

## Rastreabilidade

| Bloco do PRD ou do HLD | Onde está nesta spec |
| --- | --- |
| Fluxo principal | Regras e fluxos (fluxos técnicos do pedido e da troca), Contratos de interface |
| Fluxos alternativos e exceções | Regras e fluxos (novo pedido invalida os anteriores), Componentes (callback) |
| Erros previstos | Tratamento de erros |
| Depende de | Escopo, Entradas |
| PRD, Decisão recuperação com link de 1 hora e resposta neutra, Decisão regra de senha e Compliance | Regras e fluxos |
| HLD, Fluxo de dados (perda coberta por novo pedido), Interfaces públicas (rate limit) e Segurança (links de uso único) | Regras e fluxos, Decisões |
| Spec do RF-001, regra de sigilo do link na fila, e ADR-0015 (job falho para inspeção) | Regras e fluxos, Contratos de interface, Decisões |
| RF-005 Recuperar senha: SPA Web, Módulo Contas, Módulo E-mail, Redis; API de autenticação, Fila de e-mail | Componentes |
