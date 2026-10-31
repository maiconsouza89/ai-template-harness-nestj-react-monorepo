# Avaliação: RF-001 Criar conta

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-10-31T05-09-47Z
- Branch: feat/rf-001-criar-conta
- Commit: e6d5c31
- Status: limpo
- Itens: 54 passou, 0 falhou, 0 bloqueado, 0 manual, 0 pulado, de 54
- Critérios: 4 verificado, 0 reprovado, 0 indeterminado, de 4
- Filtros: nenhum

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| Cadastro com dados válidos cria conta pendente com papel usuário e gera um e-mail de confirmação para o endereço informado. | ✓ verificado | API-CADASTRO-01, API-CADASTRO-02, API-CADASTRO-03, API-SENHA-04, API-CAMPOS-04, API-LIMITE-03, API-PROXY-01, API-PROXY-02, API-FALHA-01, WRK-EMAIL-01, WRK-EMAIL-02, WRK-EMAIL-06, WRK-RETRY-01, WRK-RETRY-02, WRK-FILA-01, WRK-FILA-02, UI-CADASTRO-01, UI-REENVIO-01, UI-FALHA-01, UI-FALHA-02, E2E-CADASTRO-01 |
| Cadastro com e-mail já existente, mesmo com outra combinação de maiúsculas, é recusado e não cria segunda conta. | ✓ verificado | API-DUPLICADO-01, API-DUPLICADO-02, API-DUPLICADO-03, API-ADMIN-01, WRK-EMAIL-05, UI-DUPLICADO-01 |
| Senha sem número, sem letra ou com menos de 8 caracteres é recusada com a regra exibida. | ✓ verificado | API-SENHA-01, API-SENHA-02, API-SENHA-03, UI-SENHA-01 |
| A senha nunca aparece em texto puro na tela, no e-mail ou em registros do sistema. | ✓ verificado | API-SIGILO-01, API-SIGILO-02, API-SIGILO-03, API-SIGILO-04, WRK-EMAIL-03, WRK-EMAIL-04, UI-SIGILO-01, E2E-CADASTRO-01 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (com `TURBO_FORCE=true`: 5 tarefas sem cache; 71 testes unitários e 44 de integração da API e 14 da SPA passaram; rodado com `avaliacao.md`, `orquestracao.md` e `roadmap.md` no estado do commit, veja Avisos)
- ✓ build: `make build`, código 0 (com `TURBO_FORCE=true`: 4 tarefas, nenhuma do cache)

## Pré-requisitos

### Serviços em execução
- ✓ api (com o worker do Módulo E-mail): http://localhost:3000, saúde /api/health respondeu 200 `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`, recriada apontando para o banco efêmero `eval_rf001_2026_10_31t05_09_47z` e para o Valkey no banco lógico 3
- ✓ web: http://localhost:5173/ saudável no Compose
- ✓ postgres: saudável no Compose (PostgreSQL 18)
- ✓ valkey: saudável no Compose (Valkey 9), banco lógico 3 vazio no início (`dbsize` 0)
- ✓ mailpit: saudável no Compose (axllent/mailpit:v1.32), API REST em http://localhost:8025

### Estado persistido
- ✓ `conta-pendente-ana`: criado pelo cadastro (POST /api/auth/sign-up/email com Ana Souza, ana@example.com, Segura123 e X-Forwarded-For 203.0.113.200) em cada item que o usa; conferido: name Ana Souza, role user, emailVerified falso, banned falso, credencial com providerId credential
- ✓ `janela-de-cadastro-livre`: chaves `rate-limit:*` apagadas no banco lógico 3 do Valkey antes de cada item e de novo depois de criar `conta-pendente-ana`; conferido: `EXISTS rate-limit:203.0.113.50|/sign-up/email` igual a 0 antes de API-LIMITE-01
- ✓ `sem-conta-admin`: a conta admin@example.com criada pelo `make db-setup` foi apagada antes de API-ADMIN-01; conferido: 0 contas com lower(email) igual a admin@example.com. O admin foi recriado pelo `make db-setup` depois do item

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env` copiado do `.env.example`: NODE_ENV=development e TRUSTED_PROXIES vazia em vigor no container da api (o contrato pede development e vazia); `make db-setup` aplicado ao banco efêmero (migrações e primeiro admin)
- ✓ X-Forwarded-For por item: cada requisição de cadastro fora do navegador levou um IP 203.0.113.x exclusivo do item (203.0.113.50, .51 e .60 só nos itens de limite)

### Dependências externas
- ✓ DEP-1 serviço de envio de e-mail: Mailpit v1.32 do Compose, lido e esvaziado pela API REST (`/api/v1/messages`), parado e religado com `docker compose stop mailpit` e `docker compose up -d --wait --no-deps mailpit`

## Itens

### API HTTP

#### API-CADASTRO-01
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz o usuário com e-mail bia@example.com, emailVerified falso e role igual a user | observado email bia@example.com, emailVerified False, role user
- ✓ o corpo traz token nulo | observado null
- ✓ a resposta não define cookie de sessão | observado nenhum Set-Cookie

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.116 s) {"token":null,"user":{"name":"Bia Lima","email":"bia@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:14:28.433Z","updatedAt":"2026-10-31T05:14:28.433Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"jRcD52crqRV8OUMjKm3w3DY5K6ZsRn9j"}}
Set-Cookie: []
```

</details>

#### API-CADASTRO-02
- Veredito: passou
- ✓ o banco tem exatamente uma conta com o e-mail caio@example.com | esperado 1, observado 1 conta(s)
- ✓ essa conta tem papel user, e-mail não verificado e não está banida | observado ["user", "f", "f"]
- ✓ essa conta tem uma credencial de senha com providerId credential | observado [["credential", "t"]]
- ✓ nenhuma sessão existe para essa conta | esperado 0, observado 0 sessão(ões)

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.072 s) {"token":null,"user":{"name":"Caio Rocha","email":"caio@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:14:28.718Z","updatedAt":"2026-10-31T05:14:28.718Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"l4rynVnHeMSovpSiMytLw6RYQ8CaZEpj"}}
user: [['l4rynVnHeMSovpSiMytLw6RYQ8CaZEpj', 'user', 'f', 'f']]
account: [['credential', 't']]
```

</details>

#### API-CADASTRO-03
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz o e-mail dani.melo@example.com | observado dani.melo@example.com
- ✓ o banco grava a conta com o e-mail dani.melo@example.com, em minúsculas | observado [["dani.melo@example.com"]]

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.07 s) {"token":null,"user":{"name":"Dani Melo","email":"dani.melo@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:14:29.568Z","updatedAt":"2026-10-31T05:14:29.568Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"gzXnCf9hfAtAe9hQPXLR2wa5oIMXm3Ab"}}
user: [['dani.melo@example.com']]
```

</details>

#### API-DUPLICADO-01
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- ✓ o corpo traz o código USER_ALREADY_EXISTS | observado USER_ALREADY_EXISTS
- ✓ o banco continua com exatamente uma conta com o e-mail ana@example.com, de nome Ana Souza | observado [["Ana Souza"]]

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
HTTP 422 (0.005 s) {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
```

</details>

#### API-DUPLICADO-02
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- ✓ o corpo traz o código USER_ALREADY_EXISTS | observado USER_ALREADY_EXISTS
- ✓ o banco continua com exatamente uma conta cujo e-mail em minúsculas é ana@example.com | observado [["Ana Souza"]]

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
HTTP 422 (0.005 s) {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
```

</details>

#### API-DUPLICADO-03
- Veredito: passou
- ✓ uma resposta é 200 | observado [200, 422]
- ✓ a outra resposta é 422 | observado [200, 422]
- ✓ o banco tem exatamente uma conta com o e-mail davi@example.com | observado [["Davi Um"]]

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.077 s) {"token":null,"user":{"name":"Davi Um","email":"davi@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:14:31.355Z","updatedAt":"2026-10-31T05:14:31.355Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"59yVPzMoS1W2orEfVfIh46UrbATWeR8G"}}
HTTP 422 (0.108 s) {"message":"Failed to create user","code":"FAILED_TO_CREATE_USER"}
user: [['Davi Um']]
```

</details>

#### API-SENHA-01
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR | observado VALIDATION_ERROR
- ✓ o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | observado [{"field": "password", "message": "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]
- ✓ o banco não tem conta com o e-mail elis@example.com | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 400 (0.004 s) {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SENHA-02
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | observado [{"field": "password", "message": "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]
- ✓ o banco não tem conta com o e-mail fabio@example.com | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 400 (0.004 s) {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SENHA-03
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | observado [{"field": "password", "message": "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]
- ✓ o banco não tem conta com o e-mail gil@example.com | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 400 (0.004 s) {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SENHA-04
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o banco tem uma conta com o e-mail heitor@example.com | observado 1 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.071 s) {"token":null,"user":{"name":"Heitor Paz","email":"heitor@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:14:33.667Z","updatedAt":"2026-10-31T05:14:33.667Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"k5Inm74ZFOM0TbX9fbzhA2O849SJvaR0"}}
```

</details>

#### API-CAMPOS-01
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e aponta o campo name | observado VALIDATION_ERROR, [{'field': 'name', 'message': 'Informe o seu nome.'}]
- ✓ o banco não tem conta com o e-mail iris@example.com | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 400 (0.004 s) {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"name","message":"Informe o seu nome."}]}
```

</details>

#### API-CAMPOS-02
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e aponta o campo email | observado VALIDATION_ERROR, [{'field': 'email', 'message': 'Informe um e-mail válido.'}]
- ✓ o banco não tem conta com o e-mail joana@ | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 400 (0.004 s) {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"email","message":"Informe um e-mail válido."}]}
```

</details>

#### API-CAMPOS-03
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e aponta o campo password | observado VALIDATION_ERROR, [{'field': 'password', 'message': 'A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.'}]
- ✓ o banco não tem conta com o e-mail kai@example.com | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 400 (0.003 s) {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-CAMPOS-04
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz o usuário sem image, ou com image nulo | observado image None
- ✓ a conta de kelly@example.com no banco tem a coluna image nula | observado [["<null>"]]

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.072 s) {"token":null,"user":{"name":"Kelly Nunes","email":"kelly@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:14:35.552Z","updatedAt":"2026-10-31T05:14:35.552Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"ou7mYhTbO0RvlFLD8VvrWx3rDr6eunYq"}}
user.image: [['<null>']]
```

</details>

#### API-ADMIN-01
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- ✓ o corpo traz o código USER_ALREADY_EXISTS | observado USER_ALREADY_EXISTS
- ✓ o banco continua sem conta com o e-mail do ADMIN_EMAIL em qualquer combinação de maiúsculas | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
sem-conta-admin: 0 conta(s) com lower(email)=admin@example.com
HTTP 422 (0.004 s) {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
admin recriado por make db-setup: código 0
```

</details>

#### API-SIGILO-01
- Veredito: passou
- ✓ o corpo da resposta não contém Sigilo123x | observado ausente
- ✓ a credencial de senha da conta no banco não contém Sigilo123x | observado 1 credencial(is), hash sem a senha
- ✓ nenhuma coluna da conta em user contém Sigilo123x | observado ausente

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.186 s) {"token":null,"user":{"name":"Lia Matos","email":"lia@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:14:56.186Z","updatedAt":"2026-10-31T05:14:56.186Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"ryWH463VJvm0uTjV0gqRABnc3N6shRMb"}}
account.password: ['ac188f4<mascarado>']
```

</details>

#### API-SIGILO-02
- Veredito: passou
- ✓ nenhuma linha de log do serviço api escrita durante o item contém Sigilo456y | observado ausente
- ✓ nenhuma dessas linhas contém Mauro Teles | observado ausente
- ✓ nenhuma dessas linhas contém mauro@example.com | observado ausente
- ✓ nenhuma dessas linhas contém o trecho token= | observado ausente

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.074 s) {"token":null,"user":{"name":"Mauro Teles","email":"mauro@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:14:56.897Z","updatedAt":"2026-10-31T05:14:56.897Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"Nl6SewzAHfoc8g61qqZzX0QITKt265Pc"}}

0 linha(s) de log da api no item
```

</details>

#### API-SIGILO-03
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- ✓ nenhuma linha de log do serviço api escrita durante o item contém Sigilo789z | observado ausente
- ✓ nenhuma dessas linhas contém ana@example.com | observado ausente

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
HTTP 422 (0.011 s) {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}

0 linha(s) de log da api no item
```

</details>

#### API-SIGILO-04 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` ao menos uma linha de log do serviço api escrita durante o item registra a falha do Valkey | interpretado como: linha com valkey ou redis no texto | observado ["{\"level\":50,\"time\":1793423707254,\"pid\":511,\"hostname\":\"2bb48adb6e3f\",\"context\":\"BetterAuth\",\"msg\":\"Rate limit liberado com o Valkey indisponível: conexão em reconnecting\"}"] | passou
- ✓ nenhuma dessas linhas contém o host e a porta do REDIS_URL do `.env` | observado ausente
- ✓ nenhuma dessas linhas contém o trecho ECONNREFUSED seguido de endereço | observado ausente

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.074 s) {"token":null,"user":{"name":"Ondina Reis","email":"ondina@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:15:07.318Z","updatedAt":"2026-10-31T05:15:07.318Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"wLSbca62BXdeuvcglEbiohUMf20D7Uyn"}}
{"level":50,"time":1793423707254,"pid":511,"hostname":"2bb48adb6e3f","context":"BetterAuth","msg":"Rate limit liberado com o Valkey indisponível: conexão em reconnecting"}
{"level":50,"time":1793423707324,"pid":511,"hostname":"2bb48adb6e3f","context":"BetterAuth","msg":"Failed to run background task: Error"}
{"level":30,"time":1793423713626,"pid":511,"hostname":"2bb48adb6e3f","req":{"id":"c0a33b17-d3e9-4d3e-b0d2-cd0055aedff9","method":"GET","url":"/api/health","headers":{"accept-encoding":"identity","host":"localhost:3000","user-agent":"Python-urllib/3.13","origin":"http://localhost:5173","connection":"close"},"remoteAddress":"::ffff:172.18.0.1","remotePort":44598},"res":{"statusCode":503,"headers":{"x-powered-by":"Express","access-control-allow-origin":"http://localhost:5173","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"c0a33b17-d3e9-4d3e-b0d2-cd0055aedff9","content-type":"application/json; charset=utf-8","content-length":"61","etag":"W/\"3d-b+JDH81KgNO/cBcWS4T3IfP7TNI\""}},"err":{"type":"Error","message":"failed with status code 503","stack":"Error: failed with status code 503\n    at onResFinished (/app/node_modules/.pnpm/pino-http@11.0.0/node_modules/pino-http/logger.js:115:39)\n    at ServerResponse.onResponseComplete (/app/node_modules/.pnpm/pino-http@11.0.0/node_modules/pino-http/logger.js:178:14)\n    at ServerResponse.emit (node:events:526:24)\n    at onFinish (node:_http_outgoing:1275:10)\n    at callback (node:internal/streams/writable:805:21)\n    at afterWrite (node:internal/streams/writable:749:5)\n    at afterWriteTick (node:internal/streams/writable:735:10)\n    at process.processTicksAndRejections (node:internal/process/task_queues:89:21)"},"responseTime":2296,"msg":"request errored"}
```

</details>

#### API-LIMITE-01
- Veredito: passou
- ✓ as cinco primeiras respostas são 200 | observado [200, 200, 200, 200, 200]
- ✓ a sexta resposta é 429 | esperado 429, observado 429
- ✓ a sexta resposta traz o cabeçalho X-Retry-After | observado 60
- ✓ o banco não tem conta com o e-mail limite6@example.com | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
exists rate-limit:203.0.113.50|/sign-up/email = 0
6 requisições em 0.4 s: [200, 200, 200, 200, 200, 429]
6a: HTTP 429 headers {X-Retry-After: None} {"message":"Too many requests. Please try again later."}
```

</details>

#### API-LIMITE-02
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o banco tem uma conta com o e-mail limite7@example.com | observado 1 conta(s)

<details>
<summary>Evidência</summary>

```
IP 203.0.113.50 confere o limite atingido: HTTP 429
HTTP 200 {"token":null,"user":{"name":"Teste Limite","email":"limite7@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:15:20.121Z","updatedAt":"2026-10-31T05:15:20.121Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"Xic0tFLFYOd93GQ4z75HkzKxcdX8FLt6"}}
```

</details>

#### API-LIMITE-03
- Veredito: passou
- ✓ exatamente cinco respostas são 200 | observado [200, 200, 200, 200, 200, 429]
- ✓ exatamente uma resposta é 429 | observado [200, 200, 200, 200, 200, 429]
- ✓ o banco tem exatamente cinco contas com e-mails entre rajada1@example.com e rajada6@example.com | esperado 5, observado 5 conta(s)

<details>
<summary>Evidência</summary>

```
api religada; linha 'Nest application successfully started' no log: True
status: [200, 200, 200, 200, 200, 429]
```

</details>

#### API-PROXY-01 *
- Veredito: passou
- ✓ GET /api/health não passa a responder | observado nenhuma resposta em 30 tentativas ao longo de 150 s
- ✓ o log do serviço api traz um erro de configuração que nomeia TRUSTED_PROXIES | observado Configuração inválida; corrija no .env: TRUSTED_PROXIES (ausente)
- `*` nenhuma linha desse log traz o valor de outra variável do `.env` | interpretado como: busca literal de cada valor não vazio do .env (exceto TRUSTED_PROXIES) nas 16 linhas do log desde a recriação | observado nenhum valor encontrado | passou

<details>
<summary>Evidência</summary>

```
override do Compose: NODE_ENV=production, TRUSTED_PROXIES vazia; container recriado
GET /api/health a cada 5 s por 150 s: ['None'] (30 tentativas, nenhuma resposta)
log (trecho):
[5:16:26 AM] Starting compilation in watch mode...
[5:16:30 AM] Found 0 errors. Watching for file changes.
Configuração inválida; corrija no .env: TRUSTED_PROXIES (ausente)
 Error  The application exited with code 1. Waiting for file changes before restarting...
```

</details>

#### API-PROXY-02
- Veredito: passou
- ✓ GET /api/health responde 200 | esperado 200, observado 200
- ✓ o log do serviço api não traz erro de configuração que nomeie TRUSTED_PROXIES | observado ausente em 38 linha(s)

<details>
<summary>Evidência</summary>

```
override do Compose: NODE_ENV=production, TRUSTED_PROXIES=10.0.0.0/8; container recriado
GET /api/health: [None, None, None, None, 200]
```

</details>

#### API-FALHA-01 *
- Veredito: passou
- ✓ a resposta é 200 e chega em até 5 segundos | observado 200 em 0.071 s
- ✓ o banco tem uma conta com o e-mail nina@example.com, papel user e e-mail não verificado | observado [["user", "f"]]
- `*` o serviço api continua respondendo GET /api/health | interpretado como: o processo responde HTTP à rota (503 com o Valkey parado conta como resposta) | observado HTTP 503 | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.071 s) {"token":null,"user":{"name":"Nina Alves","email":"nina@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:15:28.872Z","updatedAt":"2026-10-31T05:15:28.872Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"VvX0WjM8GolkRRLkNFgjuS3G7TCAlwo7"}}
GET /api/health com o valkey parado: HTTP 503 {"status":"error","checks":{"postgres":"up","valkey":"down"}}
```

</details>

### UI

#### UI-CADASTRO-01 *
- Veredito: passou
- `*` a tela mostra que o link de confirmação foi enviado para ugo@example.com | interpretado como: texto visível | observado Enviamos um link de confirmação para ugo@example.com. Confirme o e-mail antes de entrar. | passou
- `*` a tela diz que é preciso confirmar o e-mail antes de entrar | interpretado como: texto visível | observado Confirme o e-mail antes de entrar. | passou
- ✓ o botão "Reenviar o link" está visível | observado visível
- ✓ o formulário de cadastro não está mais visível | observado ausente
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
texto: App
Entrar
Criar conta
Confirme seu e-mail

Enviamos um link de confirmação para ugo@example.com. Confirme o e-mail antes de entrar.

Reenviar o link
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-CADASTRO-01.png
```

</details>

#### UI-REENVIO-01 *
- Veredito: passou
- ✓ a página envia POST /api/auth/send-verification-email com o e-mail vera@example.com | observado ["POST {\"email\":\"vera@example.com\"}"]
- ✓ essa requisição recebe 200 | observado 200
- `*` a tela informa que um novo link foi enviado | interpretado como: texto visível | observado Enviamos um novo link para vera@example.com. | passou
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
requisições: [{"m":"POST","url":"http://localhost:3000/api/auth/send-verification-email","body":"{\"email\":\"vera@example.com\"}"}]
texto: App
Entrar
Criar conta
Confirme seu e-mail

Enviamos um link de confirmação para vera@example.com. Confirme o e-mail antes de entrar.

Reenviar o link

Enviamos um novo link para vera@example.com.
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-REENVIO-01.png
```

</details>

#### UI-DUPLICADO-01 *
- Veredito: passou
- `*` a tela diz que o e-mail já tem conta | interpretado como: texto visível | observado Este e-mail já tem conta. Entre ou recupere a senha. | passou
- `*` a tela tem um link para /entrar | interpretado como: link dentro do aviso | observado ["/entrar","/recuperar-senha"] | passou
- `*` a tela tem um link para /recuperar-senha | interpretado como: link dentro do aviso | observado ["/entrar","/recuperar-senha"] | passou
- ✓ o formulário continua visível com o nome e o e-mail preenchidos | observado ["Outra Ana","ANA@example.com"]
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: (200, [['Ana Souza', 'user', 'f', 'f', 'credential']])
texto: App
Entrar
Criar conta
Crie sua conta

Este e-mail já tem conta. Entre ou recupere a senha.

Entrar
Recuperar a senha

Nome
E-mail
Senha
Criar conta
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-DUPLICADO-01.png
```

</details>

#### UI-FALHA-01 *
- Veredito: passou
- `*` a tela mostra o aviso de que o servidor não respondeu | interpretado como: texto do aviso role=alert | observado O servidor não respondeu. Tente de novo. | passou
- `*` a página não mostra a página de erro | interpretado como: ausência dos títulos da página de erro e do erro padrão do React Router | observado sem página de erro | passou
- ✓ o formulário continua visível com o nome Iago Bento e o e-mail iago@example.com preenchidos | observado ["Iago Bento","iago@example.com"]
- ✓ a URL continua em /cadastro | observado /cadastro
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
api parada: 
texto: App
Entrar
Criar conta
Crie sua conta

O servidor não respondeu. Tente de novo.

Nome
E-mail
Senha
Criar conta; URL http://localhost:5173/cadastro
api religada e saudável: True
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-FALHA-01.png
```

</details>

#### UI-FALHA-02 *
- Veredito: passou
- `*` a tela mostra o aviso de que o servidor não respondeu | interpretado como: texto do aviso role=alert | observado O servidor não respondeu. Tente de novo. | passou
- `*` a página não mostra a página de erro | interpretado como: ausência dos títulos da página de erro e do erro padrão do React Router | observado sem página de erro | passou
- ✓ o formulário continua visível com o nome Ivo Lemos e o e-mail ivo@example.com preenchidos | observado ["Ivo Lemos","ivo@example.com"]
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
api parada: 
texto: App
Entrar
Criar conta
Crie sua conta

O servidor não respondeu. Tente de novo.

Nome
E-mail
Senha
Criar conta; URL http://localhost:5173/cadastro/?origem=barra
api religada e saudável: True
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-FALHA-02.png
```

</details>

#### UI-SENHA-01 *
- Veredito: passou
- ✓ abaixo do campo de senha aparece "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | observado A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.
- ✓ a página não envia requisição a /api/auth/sign-up/email | observado 0 requisição(ões)
- ✓ o formulário continua visível | observado visível
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
mensagem: A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.; abaixo do campo: true
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-SENHA-01.png
```

</details>

#### UI-CAMPOS-01 *
- Veredito: passou
- `*` abaixo do campo de nome aparece a mensagem de campo obrigatório | interpretado como: mensagem associada ao campo de nome, pedindo o nome | observado Informe o seu nome. | passou
- ✓ o foco fica no campo de nome | observado cadastro-name
- ✓ a página não envia requisição a /api/auth/sign-up/email | observado 0 requisição(ões)
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
mensagem: Informe o seu nome.; foco: cadastro-name
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-CAMPOS-01.png
```

</details>

#### UI-CAMPOS-02 *
- Veredito: passou
- `*` abaixo do campo de e-mail aparece a mensagem de e-mail inválido | interpretado como: mensagem associada ao campo de e-mail, sobre e-mail inválido | observado Informe um e-mail válido. | passou
- ✓ a página não envia requisição a /api/auth/sign-up/email | observado 0 requisição(ões)
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
mensagem: Informe um e-mail válido.
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-CAMPOS-02.png
```

</details>

#### UI-SIGILO-01 *
- Veredito: passou
- ✓ o campo de senha é do tipo senha, com o valor mascarado | observado type password / password
- ✓ o texto visível da página não contém Oculta123 | observado ausente
- ✓ a URL não contém Oculta123 | observado http://localhost:5173/cadastro
- ✓ a requisição de cadastro leva a senha no corpo, nunca na URL | observado 1 requisição(ões), senha no corpo
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: (200, [['Ana Souza', 'user', 'f', 'f', 'credential']])
type antes password, depois password; URL http://localhost:5173/cadastro; requisições [{"url":"http://localhost:3000/api/auth/sign-up/email","body":"{\"name\":\"Outra Ana\",\"email\":\"ana@example.com\",\"password\":\"<senha>\"}"}]
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-SIGILO-01.png
```

</details>

#### UI-LAYOUT-01 *
- Veredito: passou
- ✓ o topo da página tem a barra de navegação com o nome do app como link para / | observado {"top":0,"links":[["App","/"],["Entrar","/entrar"],["Criar conta","/cadastro"]]}
- ✓ a barra tem o link "Criar conta" para /cadastro | observado [["App","/"],["Entrar","/entrar"],["Criar conta","/cadastro"]]
- ✓ a barra tem o link "Entrar" para /entrar | observado [["App","/"],["Entrar","/entrar"],["Criar conta","/cadastro"]]
- `*` a página continua mostrando, em português do Brasil, que não há sessão aberta | interpretado como: texto do conteúdo, fora da barra, dizendo em pt-BR que não há sessão | observado ["Nenhuma sessão aberta.","Ainda não tem conta? Cadastre-se."] | passou
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
nav: {"top":0,"links":[["App","/"],["Entrar","/entrar"],["Criar conta","/cadastro"]]}; texto: App
Entrar
Criar conta
App

Nenhuma sessão aberta.

Ainda não tem conta? Cadastre-se.
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-LAYOUT-01.png
```

</details>

#### UI-LAYOUT-02 *
- Veredito: passou
- ✓ a URL passa a /cadastro | observado /cadastro
- ✓ o formulário de cadastro está visível | observado visível
- ✓ a barra de navegação continua no topo da página | observado top 0
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
URL http://localhost:5173/cadastro; nav top 0
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-LAYOUT-02.png
```

</details>

#### UI-LAYOUT-03 *
- Veredito: passou
- ✓ a página mostra, em português do Brasil, que a página não foi encontrada | observado Página não encontrada
- ✓ o font-family computado do texto da página começa com "Inter Variable" | observado "Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
texto: App
Entrar
Criar conta
Página não encontrada

O endereço que você abriu não existe neste aplicativo.

Voltar ao início; font-family: "Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-LAYOUT-03.png
```

</details>

#### UI-VISUAL-01 *
- Veredito: passou
- ✓ o botão "Criar conta" do formulário tem fundo computado rgb(0, 0, 0) e cor rgb(255, 255, 255) | observado rgb(0, 0, 0), rgb(255, 255, 255)
- ✓ esse botão tem border-radius computado de 999px | observado 999px
- ✓ o rótulo desse botão tem font-size de 16px e font-weight 500 | observado 16px, 500
- ✓ esse botão tem pelo menos 44px de altura | observado 44px
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
{"bg":"rgb(0, 0, 0)","color":"rgb(255, 255, 255)","br":"999px","fs":"16px","fw":"500","h":44}
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-VISUAL-01.png
```

</details>

#### UI-VISUAL-02 *
- Veredito: passou
- ✓ a fonte "Inter Variable" consta como carregada nas fontes do documento | observado ["Inter Variable"]
- ✓ o font-family computado do body começa com "Inter Variable" | observado "Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif
- ✓ o título "Crie sua conta" tem font-weight 700, font-size de 32px e letter-spacing normal | observado {"fw":"700","fs":"32px","ls":"normal"}
- ✓ toda requisição de arquivo de fonte vai à origem da SPA | observado ["http://localhost:5173/@fs/app/node_modules/.pnpm/@fontsource-variable+inter@5.3.0/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"]
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
{"loaded":["Inter Variable"],"body":"\"Inter Variable\", system-ui, \"Helvetica Neue\", Arial, sans-serif","h1":{"fw":"700","fs":"32px","ls":"normal"},"fontReqs":["http://localhost:5173/@fs/app/node_modules/.pnpm/@fontsource-variable+inter@5.3.0/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"]}
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-VISUAL-02.png
```

</details>

#### UI-VISUAL-03 *
- Veredito: passou
- `*` o card do formulário tem fundo computado rgb(255, 255, 255), border-radius de 16px e box-shadow none | interpretado como: o card é o contêiner do título e do formulário | observado rgb(255, 255, 255), 16px, none | passou
- ✓ o card tem no máximo 490px de largura | observado 490px
- ✓ os campos de nome, e-mail e senha têm fundo computado rgb(239, 239, 239) e border-radius de 8px | observado ["name rgb(239, 239, 239) 8px","email rgb(239, 239, 239) 8px","password rgb(239, 239, 239) 8px"]
- ✓ cada campo tem um rótulo visível associado a ele | observado ["name: Nome","email: E-mail","password: Senha"]
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
{"card":{"bg":"rgb(255, 255, 255)","br":"16px","sh":"none","w":490,"cls":"card-content mx-auto w-full max-w-[490px]"},"ins":[{"n":"name","bg":"rgb(239, 239, 239)","br":"8px","label":"Nome","labelVisible":true},{"n":"email","bg":"rgb(239, 239, 239)","br":"8px","label":"E-mail","labelVisible":true},{"n":"password","bg":"rgb(239, 239, 239)","br":"8px","label":"Senha","labelVisible":true}]}
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-VISUAL-03.png
```

</details>

#### UI-VISUAL-04 *
- Veredito: passou
- ✓ o campo de e-mail tem aria-invalid igual a true | observado true
- ✓ o aria-describedby do campo de e-mail aponta para o elemento com a mensagem de e-mail inválido | observado cadastro-email-erro -> Informe um e-mail válido.
- ✓ o campo de e-mail tem borda computada de 2px na cor rgb(0, 0, 0) | observado ["2px","2px","2px","2px","rgb(0, 0, 0)","rgb(0, 0, 0)","rgb(0, 0, 0)","rgb(0, 0, 0)"]
- ✓ a mensagem tem cor computada rgb(0, 0, 0) e um ícone antes do texto | observado rgb(0, 0, 0), primeiro filho svg
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
{"inv":"true","d":"cadastro-email-erro","msg":"Informe um e-mail válido.","bw":"2px","bc":"rgb(0, 0, 0)","bs":"solid","allB":["2px","2px","2px","2px","rgb(0, 0, 0)","rgb(0, 0, 0)","rgb(0, 0, 0)","rgb(0, 0, 0)"],"mcolor":"rgb(0, 0, 0)","icon":"svg","iconBefore":true}
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-VISUAL-04.png
```

</details>

#### UI-VISUAL-05 *
- Veredito: passou
- ✓ a largura de rolagem do documento não passa de 375px | observado 375px
- ✓ o card do formulário fica a 16px de cada borda da janela | observado 16px e 16px
- ✓ os links "Entrar" e "Criar conta" da barra de navegação estão visíveis | observado Entrar true, Criar conta true
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
{"sw":375,"left":16,"right":16,"iw":375,"entrar":true,"criar":true}
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-VISUAL-05.png
```

</details>

#### UI-VISUAL-06 *
- Veredito: passou
- `*` o aviso de e-mail já cadastrado aparece acima do formulário com role igual a alert | interpretado como: elemento role=alert antes do form no DOM e com a base acima do topo do form | observado true | passou
- ✓ o aviso tem fundo computado rgb(239, 239, 239) e border-radius de 16px | observado rgb(239, 239, 239), 16px
- `*` nenhum elemento visível da página tem cor de texto, fundo ou borda fora da paleta do DESIGN.md, sem contar o transparente | interpretado como: color, background-color e border-*-color (com borda visível) computados de cada elemento visível contra as cores de colors no DESIGN.md | observado nenhum fora da paleta | passou
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: (200, [['Ana Souza', 'user', 'f', 'f', 'credential']])
{"above":true,"bg":"rgb(239, 239, 239)","br":"16px","bad":[]}
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/UI-VISUAL-06.png
```

</details>

### Worker

#### WRK-EMAIL-01
- Veredito: passou
- ✓ em até 2 minutos a caixa tem exatamente uma mensagem para otto@example.com | observado 1 mensagem(ns) em 2.0 s
- ✓ o remetente da mensagem é o SMTP_FROM do .env | esperado no-reply@localhost, observado no-reply@localhost
- ✓ o assunto é "Confirme seu e-mail" | observado Confirme seu e-mail

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.118 s) {"token":null,"user":{"name":"Otto Brandão","email":"otto@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:20:52.445Z","updatedAt":"2026-10-31T05:20:52.445Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"hYJ5JlOpf3xN2F7Pi3Z9m12fXZXV74U0"}}
mensagens: [('no-reply@localhost', 'Confirme seu e-mail')] (primeira em 2.0 s)
```

</details>

#### WRK-EMAIL-02 *
- Veredito: passou
- ✓ a mensagem para paula@example.com tem um link que começa com o WEB_ORIGIN do .env seguido de /confirmar-email?token= e um token não vazio | observado texto True, HTML True
- ✓ o corpo diz "O link vale por 24 horas." | observado texto True, HTML True
- `*` o corpo cumprimenta pelo nome Paula Dias | interpretado como: o nome aparece no texto e no HTML junto da saudação | observado texto True, HTML True | passou
- `*` o corpo está em português do Brasil, no texto e no HTML | interpretado como: atributo lang="pt-BR" no HTML e frases em português (confirme, e-mail, vale por) nas duas versões | observado lang pt-BR, termos em português no texto e no HTML | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.075 s) {"token":null,"user":{"name":"Paula Dias","email":"paula@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:20:59.751Z","updatedAt":"2026-10-31T05:20:59.751Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"PWnZXZhYkNqGRwPLni24m0o9L7b4vBxe"}}
texto: Olá, Paula Dias!

Recebemos o seu cadastro. Para ativar a conta, confirme o seu e-mail abrindo o link abaixo:

http://localhost:5173/confirmar-email?token=<mascarado>

O link vale por 24 horas.

Se você não criou esta conta, ignore esta mensagem.
html (trecho): <!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>Confirme seu e-mail</title>
  </head>
  <body style="font-family: Helvetica, Arial, sans-serif; color: #000000;">
    <p>Olá, Paula Dias!</p>
    <p>Recebemos o seu cadastro. Para ativar a conta, confirme o seu e-mail:</p>
    <p><a href="http://localhost:5173/confirmar-email?token=<mascarado>
```

</details>

#### WRK-EMAIL-03
- Veredito: passou
- ✓ o corpo em texto da mensagem para quim@example.com não contém Sigilo321w | observado ausente
- ✓ o corpo em HTML não contém Sigilo321w | observado ausente
- ✓ nenhum cabeçalho da mensagem contém Sigilo321w | observado ausente

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.074 s) {"token":null,"user":{"name":"Quim Moura","email":"quim@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:21:02.033Z","updatedAt":"2026-10-31T05:21:02.033Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"LNMJxltNqCEqOh5HRNSq8fjebIgZlyxh"}}
cabeçalhos: ['Content-Type', 'Date', 'From', 'Message-Id', 'Mime-Version', 'Received', 'Return-Path', 'Subject', 'To']
```

</details>

#### WRK-EMAIL-04 *
- Veredito: passou
- `*` a fila email.send tem um job verify-email com o id da conta de rui@example.com | interpretado como: hash bull:email.send:<id> com name verify-email e data com o userId | observado 1 job(s), ids ['26'] | passou
- `*` os dados desse job não contêm Sigilo654v | interpretado como: campo data do hash | observado ausente | passou
- `*` os dados desse job não contêm rui@example.com nem Rui Campos | interpretado como: campo data do hash | observado ausentes | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.073 s) {"token":null,"user":{"name":"Rui Campos","email":"rui@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:21:04.311Z","updatedAt":"2026-10-31T05:21:04.311Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"IJG2z1Ktix4fVIOkCeM0xbRbyaavNQqj"}}
userId IJG2z1Ktix4fVIOkCeM0xbRbyaavNQqj
jobs: [{"id": "26", "name": "verify-email", "data": "{\"type\":\"verify-email\",\"userId\":\"IJG2z1Ktix4fVIOkCeM0xbRbyaavNQqj\",\"url\":\"http://localhost:5173/confirmar-email?token=<mascarado>\"}", "atm": "1", "ats": "1", "state": "completed", "failedReason": null}]
```

</details>

#### WRK-EMAIL-05
- Veredito: passou
- ✓ depois de 1 minuto a caixa não tem mensagem para ana@example.com | esperado 0, observado 0 mensagem(ns)

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
e-mail do cadastro de Ana entregue antes do item: 1; caixa esvaziada
HTTP 422 (0.006 s) {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
```

</details>

#### WRK-EMAIL-06 *
- Veredito: passou
- ✓ depois de 2 minutos da volta, a caixa não tem mensagem para ulisses@example.com | esperado 0, observado 0 mensagem(ns)
- `*` o job verify-email dessa conta fica concluído, sem ficar no estado falho | interpretado como: job na zset completed e fora da failed | observado [["completed", "1"]] | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.076 s) {"token":null,"user":{"name":"Ulisses Prado","email":"ulisses@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:29:56.594Z","updatedAt":"2026-10-31T05:29:56.594Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"uXNmytOET1pnRuB1RCQdgRnwuSAicXwJ"}}
conta marcada com e-mail verificado: [['t']]
job antes da volta: [('33', 'active', None)]
mailpit antes de religar: exited 2026-10-31T05:29:49.676637312Z
mailpit religado cerca de 3 s depois da marcação: running 2026-10-31T05:30:00.456623993Z
job depois de 2 min: [('33', 'verify-email', 'completed', '1', None)]
```

</details>

#### WRK-RETRY-01 *
- Veredito: passou
- ✓ em até 2 minutos depois de o mailpit voltar, a caixa tem uma mensagem para sara@example.com | observado 1 mensagem(ns) em 8.0 s
- `*` o job verify-email dessa conta fica concluído com mais de uma tentativa registrada | interpretado como: estado completed e campo atm do hash maior que 1 | observado [["completed", "3"]] | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.081 s) {"token":null,"user":{"name":"Sara Pinto","email":"sara@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:32:05.927Z","updatedAt":"2026-10-31T05:32:05.927Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"JzJKguu7TnUW2EVUaGRO9GE3eC8fM4Tw"}}
mailpit 20 s depois do cadastro, antes de religar: exited 2026-10-31T05:30:00.456623993Z; job [('34', 'delayed', '2')]
mensagens: 1 em 8.0 s depois da volta; job: [('34', 'completed', '3')]
```

</details>

#### WRK-RETRY-02 *
- Veredito: passou
- ✓ em até 3 minutos o job verify-email dessa conta fica no estado falho | observado failed em 119 s
- `*` o job registra 5 tentativas | interpretado como: campo atm do hash | observado 5 | passou
- ✓ a conta de tais@example.com continua no banco, pendente | observado [["user", "f"]]

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.072 s) {"token":null,"user":{"name":"Tais Rangel","email":"tais@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:32:41.211Z","updatedAt":"2026-10-31T05:32:41.211Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"C2rwRdmixDFdpolv1HFIQPi0eQeOKjq0"}}
estados do mailpit durante a espera: ['exited']; agora exited 2026-10-31T05:32:27.13191365Z
job: [('35', 'failed', '5', 'Connection timeout')] (119 s)
```

</details>

#### WRK-FILA-01
- Veredito: passou
- ✓ em até 2 minutos a caixa tem exatamente uma mensagem para tulio@example.com | observado 1 mensagem(ns) em 0.0 s
- ✓ o job verify-email dessa conta fica concluído | observado [["completed", "1"]]

<details>
<summary>Evidência</summary>

```
valkey parado por 20 s e religado; api não reiniciada
HTTP 200 (0.076 s) {"token":null,"user":{"name":"Túlio Faria","email":"tulio@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:28:46.771Z","updatedAt":"2026-10-31T05:28:46.771Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"quv0km8aUmL4lqvKzTo7rhjUbN1VInVY"}}
mensagens: 1 em 0.0 s; job: [('31', 'completed', '1')]
```

</details>

#### WRK-FILA-02 *
- Veredito: passou
- ✓ em até 1 minuto depois da retomada, a fila email.send tem um job verify-email com o id da conta de valeria@example.com | observado 1 job(s) em 0 s
- `*` uma linha de log do serviço api escrita depois da retomada traz o id desse job | interpretado como: docker compose logs api desde o unpause, linha com o id do job num campo de job | observado ["{\"level\":40,\"time\":1793424537460,\"pid\":209,\"hostname\":\"19bbbfe3e296\",\"context\":\"BullMqEmailQueue\",\"msg\":\"Pedido da conta qVobnZvQr2Hs1O5ye8k2l3oznwBgHX2S entrou na fila email.send depois do limite, como job 32\"}"] | passou
- ✓ em até 2 minutos a caixa tem exatamente uma mensagem para valeria@example.com | observado 1 mensagem(ns)

<details>
<summary>Evidência</summary>

```
HTTP 200 (3.582 s) {"token":null,"user":{"name":"Valéria Cruz","email":"valeria@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T05:28:52.914Z","updatedAt":"2026-10-31T05:28:52.914Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"qVobnZvQr2Hs1O5ye8k2l3oznwBgHX2S"}}
job: [('32', 'completed', '1')] (0 s depois da retomada)
log desde a retomada (trecho): {"level":40,"time":1793424537460,"pid":209,"hostname":"19bbbfe3e296","context":"BullMqEmailQueue","msg":"Pedido da conta qVobnZvQr2Hs1O5ye8k2l3oznwBgHX2S entrou na fila email.send depois do limite, como job 32"}
```

</details>

### E2E

#### E2E-CADASTRO-01 *
- Veredito: passou
- `*` a tela mostra que o link de confirmação foi enviado para zelia@example.com | interpretado como: texto visível | observado Enviamos um link de confirmação para zelia@example.com. Confirme o e-mail antes de entrar. | passou
- ✓ em até 2 minutos a caixa tem uma mensagem para zelia@example.com com um link para /confirmar-email?token= | observado 1 mensagem(ns), link true
- `*` o banco tem a conta de zelia@example.com com papel user e e-mail não verificado | interpretado como: role e emailVerified em "user" | observado [["user","f"]] | passou
- `*` nem a mensagem nem as linhas de log do serviço api escritas durante a jornada contêm Jornada123 | interpretado como: texto, HTML e cabeçalhos da mensagem e log da api desde o início do item | observado ausente em 3 linha(s) de log e na mensagem | passou
- `*` nenhuma dessas linhas de log contém Zélia Dias ou zelia@example.com | interpretado como: mesma captura do log | observado ausentes | passou
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
texto: App
Entrar
Criar conta
Confirme seu e-mail

Enviamos um link de confirmação para zelia@example.com. Confirme o e-mail antes de entrar.

Reenviar o link
{"n":1,"link":true,"pwMsg":false,"rows":[["user","f"]],"nlog":3,"pwLog":[],"piiLog":[]}
screenshot: /tmp/evaluator-rf001-2026-10-31T05-09-47Z/shots/E2E-CADASTRO-01.png
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `compose.yaml`: o serviço api instala nos volumes ao subir; `scripts/db-setup.sh` garante as dependências |
| Ambiente e serviços | 1 e 2 | contrato (Docker Compose) e `compose.yaml`: o ambiente local já no ar, com a api recriada por um arquivo de override do Compose na pasta temporária (`COMPOSE_FILE`) |
| Banco efêmero e migração | 5 | `scripts/db-setup.sh`: banco `eval_rf001_2026_10_31t05_09_47z` no postgres do Compose, `DATABASE_URL` da api trocada pelo override, `make db-setup` migra e cria o admin |
| Isolamento do Valkey | 6 | `REDIS_URL=redis://valkey:6379/3` no override: rate limit e fila `email.send` no banco lógico 3, vazio antes da avaliação |
| Estado persistido | 1 | contrato: `conta-pendente-ana` "criada pelo cadastro", por POST /api/auth/sign-up/email; `sem-conta-admin` pelo DELETE da conta do seed |
| Configuração de produção | 6 | override do Compose com NODE_ENV=production e TRUSTED_PROXIES (vazia ou 10.0.0.0/8) sobre o `.env`, sem editar o `.env` do repositório |
| Limpeza entre itens | 6 | DELETE das contas sem papel admin e da tabela verification no banco efêmero (account e session caem em cascata), apagar `rate-limit:*` no Valkey e DELETE /api/v1/messages no Mailpit |
| Gates | 1 | contrato: `make check` e `make build` na raiz |
| Cliente HTTP | 6 | `urllib` do Python, com o X-Forwarded-For do contrato e o Origin da SPA nas chamadas à api |
| Logs da api | 1 e 3 | contrato e spec, Verificação por superfície: `docker compose logs api --since <início do item>` |
| Fila | 3 | spec, Verificação por superfície: hashes `bull:email.send:<id>` (campos name, data, atm, returnvalue, failedReason) e zsets `completed` e `failed`, lidos por um cliente RESP mínimo em Python |
| Caixa de e-mail | 3 | spec, Verificação por superfície (ADR-0016): API REST do Mailpit |
| Navegador | 3 | spec, Verificação por superfície (ADR-0024): Chromium headless pelo `playwright-core` do `@playwright/cli` no cache do npx, dirigido por script Node, um contexto sem cookie por item |
| Base visual | 6 | `evaluate` no navegador (imagens, caixas na janela, corte por `overflow`, `elementFromPoint`) e screenshot por item, revisado sem achados |
| Paleta do DESIGN.md | 3 | as cores de `colors` no front-matter do `DESIGN.md`, comparadas em rgb com color, background-color e border-color computados |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_rf001_*`, nenhuma pasta `evaluator-rf001-*` e nenhum PID de avaliação anterior no início.
- Derrubada: completa. Nenhum PID no `processos.lock` (o navegador fechou com o script); api recriada sem o override, de volta à `DATABASE_URL` do banco `app`, ao Valkey no banco 0 e a NODE_ENV=development, saudável; banco `eval_rf001_2026_10_31t05_09_47z` apagado; banco lógico 3 do Valkey esvaziado; pasta `/tmp/evaluator-rf001-2026-10-31T05-09-47Z` apagada, com os screenshots.

## Avisos

- Avaliado com 3 arquivos fora de commit, só documentação: `avaliacao.md`, `orquestracao.md` e `docs/product/roadmap.md` (a avaliação anterior deixou RF-001 `em andamento` no roadmap). Com eles, `make check` falha em `check-prd` (o roadmap difere do versionado) e em `check-eval` (roadmap do commit `feito` contra avaliação `reprovado` no working tree); por isso o gate `check` rodou com os três arquivos trocados temporariamente pela versão do commit e devolvidos em seguida. O código avaliado é o do commit e6d5c31.
- Interferência no ambiente compartilhado: durante a primeira passada de WRK-EMAIL-06, WRK-RETRY-01 e WRK-RETRY-02 o mailpit foi religado por outro processo (provavelmente um `make test`, que roda `docker compose up -d --wait postgres valkey mailpit`), e os três itens rodaram sem o pré-requisito "mailpit parado" (jobs concluídos na primeira tentativa). Os três foram repetidos conferindo o estado do container (`docker inspect`) antes de religar e durante a espera; o veredito registrado é o da repetição, com o mailpit parado de fato. O mailpit voltou a ser religado por fora depois dos itens.
- O `make db-setup` de API-ADMIN-01 regenerou o cliente Prisma e o watch da api recompilou e reiniciou a aplicação (cerca de 05:14:55); os itens seguintes responderam normalmente.
- API-SIGILO-02 e API-SIGILO-03: o cadastro não escreve linha de log na api (0 e poucas linhas capturadas); os bullets de ausência passam sobre o que foi capturado.
- API-DUPLICADO-03: a requisição perdedora recebeu 422 com `code` `FAILED_TO_CREATE_USER`, não `USER_ALREADY_EXISTS`; o item pede só o 422.
- API-FALHA-01: com o Valkey parado, GET /api/health respondeu 503 com `valkey` down; o bullet foi lido como "o processo continua respondendo HTTP".
- API-LIMITE-03: a avaliação não chamou GET /api/health depois de religar a api (a subida foi conferida pela linha "Nest application successfully started"), mas o healthcheck do Compose chama a rota de dentro do container a cada 10 s.
- WRK-EMAIL-06: o job foi processado com o mailpit parado e terminou com `returnvalue` `already-verified` logo depois de o mailpit voltar (atm 1); o resultado é o esperado pelo contrato.
- WRK-FILA-02: a resposta do cadastro chegou em 3,6 s, antes da retomada (5 s depois do envio); a linha de log com o id do job ("como job 32") foi escrita depois do comando de retomada.
- Os itens usam o Valkey (banco lógico 3) e o Mailpit compartilhados do ambiente de desenvolvimento: a caixa do Mailpit foi esvaziada antes de cada item, e os dois serviços foram parados, pausados e religados nos itens que pedem.

## Motivo do aborto

Nenhum.
