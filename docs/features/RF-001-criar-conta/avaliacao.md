# Avaliação: RF-001 Criar conta

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-11-02T02-02-31Z
- Branch: fix/email-token-na-fila
- Commit: 05d1238
- Status: limpo
- Itens: 57 passou, 0 falhou, 0 bloqueado, 0 manual, 0 pulado, de 57
- Critérios: 4 verificado, 0 reprovado, 0 indeterminado, de 4
- Filtros: nenhum

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| Cadastro com dados válidos cria conta pendente com papel usuário e gera um e-mail de confirmação para o endereço informado. | ✓ verificado | API-CADASTRO-01, API-CADASTRO-02, API-CADASTRO-03, API-SENHA-04, API-CAMPOS-04, API-LIMITE-03, API-PROXY-01, API-PROXY-02, API-FALHA-01, WRK-EMAIL-01, WRK-EMAIL-02, WRK-EMAIL-06, WRK-RETRY-01, WRK-RETRY-02, WRK-FILA-01, WRK-FILA-02, WRK-SIGILO-01, WRK-SIGILO-02, WRK-SIGILO-03, UI-CADASTRO-01, UI-REENVIO-01, UI-FALHA-01, UI-FALHA-02, E2E-CADASTRO-01 |
| Cadastro com e-mail já existente, mesmo com outra combinação de maiúsculas, é recusado e não cria segunda conta. | ✓ verificado | API-DUPLICADO-01, API-DUPLICADO-02, API-DUPLICADO-03, API-ADMIN-01, WRK-EMAIL-05, UI-DUPLICADO-01 |
| Senha sem número, sem letra ou com menos de 8 caracteres é recusada com a regra exibida. | ✓ verificado | API-SENHA-01, API-SENHA-02, API-SENHA-03, UI-SENHA-01 |
| A senha nunca aparece em texto puro na tela, no e-mail ou em registros do sistema. | ✓ verificado | API-SIGILO-01, API-SIGILO-02, API-SIGILO-03, API-SIGILO-04, WRK-EMAIL-03, WRK-EMAIL-04, UI-SIGILO-01, E2E-CADASTRO-01 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (com `TURBO_FORCE=true`: 5 tarefas sem cache; testes de Contratos 34, da SPA 91, de unidade da API 182 e de integração da API 107 passaram; lint com 1 aviso e 0 erros na API)
- ✓ build: `make build`, código 0 (com `TURBO_FORCE=true`: 4 tarefas, nenhuma do cache)

## Pré-requisitos

### Serviços em execução
- ✓ api (com o worker do Módulo E-mail): http://localhost:3000, saúde /api/health respondeu 200 `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`, recriada apontando para o banco efêmero `eval_rf001_2026_11_02t02_02_31z` e para o Valkey no banco lógico 3
- ✓ web: http://localhost:5173/ saudável no Compose
- ✓ postgres: saudável no Compose (PostgreSQL 18)
- ✓ valkey: saudável no Compose (Valkey 9), banco lógico 3 vazio no início (`dbsize` 0)
- ✓ mailpit: saudável no Compose (axllent/mailpit:v1.32), API REST em http://localhost:8025

### Estado persistido
- ✓ `conta-pendente-ana`: criado pelo cadastro (POST /api/auth/sign-up/email com Ana Souza, ana@example.com, Segura123 e X-Forwarded-For 203.0.113.200) em cada item que o usa; conferido: name Ana Souza, role user, emailVerified falso, banned falso, credencial com providerId credential
- ✓ `janela-de-cadastro-livre`: chaves `rate-limit:*` apagadas no banco lógico 3 do Valkey antes de cada item e de novo depois de criar `conta-pendente-ana`; conferido: `EXISTS rate-limit:203.0.113.50|/sign-up/email` igual a 0 antes de API-LIMITE-01
- ✓ `sem-conta-admin`: a conta admin@example.com criada pelo `make db-setup` foi apagada antes de API-ADMIN-01; conferido: 0 contas com lower(email) igual a admin@example.com. O admin foi recriado pelo seed (`prisma db seed`) depois do item

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
HTTP 200 (0.134 s) {"token":null,"user":{"name":"Bia Lima","email":"bia@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:07:03.203Z","updatedAt":"2026-11-02T02:07:03.203Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"geAg3L5ycjfEl2vfIYXAGTHOxczaiq1q"}}
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
HTTP 200 (0.077 s) {"token":null,"user":{"name":"Caio Rocha","email":"caio@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:07:03.848Z","updatedAt":"2026-11-02T02:07:03.848Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"K6PYECArqrjuyeTmOenT7c4XEuuHOQhx"}}
user: [['K6PYECArqrjuyeTmOenT7c4XEuuHOQhx', 'user', 'f', 'f']]
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
HTTP 200 (0.075 s) {"token":null,"user":{"name":"Dani Melo","email":"dani.melo@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:07:05.049Z","updatedAt":"2026-11-02T02:07:05.049Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"fKd6n07hHwgIyKwPiNPJVd0tf8a27xob"}}
user: [['dani.melo@example.com']]
```

</details>

#### API-DUPLICADO-01
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- ✓ o corpo traz o código USER_ALREADY_EXISTS | observado USER_ALREADY_EXISTS
- ✓ o banco continua com exatamente uma conta com o e-mail ana@example.com, de nome Ana Souza | observado [["Ana Souza", "ana@example.com"]]

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
HTTP 422 (0.008 s) {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
user: [['Ana Souza', 'ana@example.com']]
```

</details>

#### API-DUPLICADO-02
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- ✓ o corpo traz o código USER_ALREADY_EXISTS | observado USER_ALREADY_EXISTS
- ✓ o banco continua com exatamente uma conta cujo e-mail em minúsculas é ana@example.com | esperado 1, observado 1 conta(s): [['Ana Souza', 'ana@example.com']]

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
HTTP 422 (0.006 s) {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
user: [['Ana Souza', 'ana@example.com']]
```

</details>

#### API-DUPLICADO-03
- Veredito: passou
- ✓ uma resposta é 200 | observado [200, 422]
- ✓ a outra resposta é 422 | observado [200, 422]
- ✓ o banco tem exatamente uma conta com o e-mail davi@example.com | esperado 1, observado 1 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 422 (0.115 s) {"message":"Failed to create user","code":"FAILED_TO_CREATE_USER"}
HTTP 200 (0.117 s) {"token":null,"user":{"name":"Davi Dois","email":"davi@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:07:08.827Z","updatedAt":"2026-11-02T02:07:08.827Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"kBptm0MnjgLorilTPMOMHBTqflBG7jbd"}}
```

</details>

#### API-SENHA-01
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR | observado VALIDATION_ERROR
- ✓ o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | observado A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.
- ✓ o banco não tem conta com o e-mail elis@example.com | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 400 (0.005 s) {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SENHA-02
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | observado A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.
- ✓ o banco não tem conta com o e-mail fabio@example.com | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 400 (0.005 s) {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SENHA-03
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | observado A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.
- ✓ o banco não tem conta com o e-mail gil@example.com | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 400 (0.003 s) {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SENHA-04
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o banco tem uma conta com o e-mail heitor@example.com | observado 1 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.075 s) {"token":null,"user":{"name":"Heitor Paz","email":"heitor@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:07:12.177Z","updatedAt":"2026-11-02T02:07:12.177Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"GwnQ3xCiChdaMLErArtX3geQsfMyVM3V"}}
```

</details>

#### API-CAMPOS-01
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e aponta o campo name | observado code VALIDATION_ERROR, campos ['name']
- ✓ o banco não tem conta com o e-mail iris@example.com | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 400 (0.003 s) {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"name","message":"Informe o seu nome."}]}
```

</details>

#### API-CAMPOS-02
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e aponta o campo email | observado code VALIDATION_ERROR, campos ['email']
- ✓ o banco não tem conta com o e-mail joana@ | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 400 (0.003 s) {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"email","message":"Informe um e-mail válido."}]}
```

</details>

#### API-CAMPOS-03
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e aponta o campo password | observado code VALIDATION_ERROR, campos ['password']
- ✓ o banco não tem conta com o e-mail kai@example.com | esperado 0, observado 0 conta(s)

<details>
<summary>Evidência</summary>

```
HTTP 400 (0.004 s) {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-CAMPOS-04
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz o usuário sem image, ou com image nulo | observado null
- ✓ a conta de kelly@example.com no banco tem a coluna image nula | observado [["t"]]

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.077 s) {"token":null,"user":{"name":"Kelly Nunes","email":"kelly@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:07:15.113Z","updatedAt":"2026-11-02T02:07:15.113Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"5GNOjczSJMNq4u80AcYMuiYfR9ojFu2c"}}
image IS NULL: [['t']]
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
sem-conta-admin: 0 conta(s) com lower(email)=admin@example.com antes do item
HTTP 422 (0.004 s) {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
admin recriado pelo seed depois do item: código 0, 1 admin(s)
```

</details>

#### API-SIGILO-01
- Veredito: passou
- ✓ o corpo da resposta não contém Sigilo123x | observado ausente
- ✓ a credencial de senha da conta no banco não contém Sigilo123x | observado ausente (hash com 161 caracteres)
- ✓ nenhuma coluna da conta em user contém Sigilo123x | observado ausente

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.09 s) {"token":null,"user":{"name":"Lia Matos","email":"lia@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:07:19.883Z","updatedAt":"2026-11-02T02:07:19.883Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"y64zhgqdT7NBnks55R8rURan8bhFkVcB"}}
account.password: <mascarado> (161 caracteres)
user: [['{"id":"y64zhgqdT7NBnks55R8rURan8bhFkVcB","name":"Lia Matos","email":"lia@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:07:19.883","updatedAt":"2026-11-02T02:07:19.883","role":"user","banned":false,"banReason":null,"banExpires":null}']]
```

</details>

#### API-SIGILO-02
- Veredito: passou
- ✓ nenhuma linha de log do serviço api escrita durante o item contém Sigilo456y | observado ausente em 0 linha(s)
- ✓ nenhuma dessas linhas contém Mauro Teles | observado ausente em 0 linha(s)
- ✓ nenhuma dessas linhas contém mauro@example.com | observado ausente em 0 linha(s)
- ✓ nenhuma dessas linhas contém o trecho token= | observado ausente em 0 linha(s)

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.081 s) {"token":null,"user":{"name":"Mauro Teles","email":"mauro@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:07:20.946Z","updatedAt":"2026-11-02T02:07:20.946Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"olffnlAp3b08kYRwii76ZsloXPNWWXd5"}}
log:

```

</details>

#### API-SIGILO-03
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- ✓ nenhuma linha de log do serviço api escrita durante o item contém Sigilo789z | observado ausente em 1 linha(s)
- ✓ nenhuma dessas linhas contém ana@example.com | observado ausente em 1 linha(s)

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
HTTP 422 (0.005 s) {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
log:
{"level":30,"time":1793585251124,"pid":218,"hostname":"951c765a16f1","req":{"id":"c2e9054c-2c53-437f-ac70-228357547928","method":"GET","url":"/api/health","headers":{"host":"localhost:3000","connection":"keep-alive","accept":"*/*","accept-language":"*","sec-fetch-mode":"cors","user-agent":"node","accept-encoding":"gzip, deflate"},"remoteAddress":"::ffff:127.0.0.1","remotePort":38832},"res":{"statusCode":200,"headers":{"x-powered-by":"Express","vary":"Origin","access-control-allow-credentials":"true","x-request-id":"c2e9054c-2c53-437f-ac70-228357547928","content-type":"application/json; charset
```

</details>

#### API-SIGILO-04 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` ao menos uma linha de log do serviço api escrita durante o item registra a falha do Valkey | interpretado como: linha com valkey ou redis no texto que descreve a indisponibilidade | observado ["{\"level\":50,\"time\":1793585587303,\"pid\":185,\"hostname\":\"0191b4a9704b\",\"context\":\"BetterAuth\",\"msg\":\"Rate limit liberado com o Valkey indisponível: sem resposta em 500 ms\"}", "{\"level\":40,\"time\":1793585591377,\"pid\":185,\"hostname\":\"0191b4a9704b\",\"req\":{\"id\":\"64d08656-c560-4817-aed6-1c12aee50444\",\"method\":\"GET\",\"url\":\"/api/health\",\"headers\":{\"host\":\"localhost:3000\",\"connection\":\"keep-alive\",\"accept\":\"*/*\",\"accept-language\":\"*\",\"sec-fetch-mode\":\"cors\",\"user-agent\":\"node\",\"ac"] | passou
- `*` nenhuma dessas linhas contém o host e a porta do REDIS_URL do `.env` | interpretado como: nenhuma linha com a porta 6379 do REDIS_URL, sozinha ou junto do host valkey | observado porta 6379 ausente em 7 linha(s); host valkey sem porta em 1 linha(s) (ENOTFOUND valkey) | passou
- ✓ nenhuma dessas linhas contém o trecho ECONNREFUSED seguido de endereço | observado ausente

<details>
<summary>Evidência</summary>

```
valkey antes do cadastro: exited 2026-11-02T02:11:58.078721856Z
HTTP 200 (0.587 s) {"token":null,"user":{"name":"Ondina Reis","email":"ondina@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:13:07.369Z","updatedAt":"2026-11-02T02:13:07.369Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"veC2Oi9ORdnPGDbtRewEhkHb7rTsJa34"}}
log:
{"level":50,"time":1793585587303,"pid":185,"hostname":"0191b4a9704b","context":"BetterAuth","msg":"Rate limit liberado com o Valkey indisponível: sem resposta em 500 ms"}
{"level":50,"time":1793585587385,"pid":185,"hostname":"0191b4a9704b","context":"BetterAuth","msg":"Failed to run background task: Error"}
{"level":30,"time":1793585588878,"pid":185,"hostname":"0191b4a9704b","req":{"id":"9624a2e9-e5ca-4f96-b3e1-63d17863dd28","method":"GET","url":"/api/health","headers":{"host":"localhost:3000","connection":"keep-alive","accept":"*/*","accept-language":"*","sec-fetch-mode":"cors","user-agent":"node","accept-encoding":"gzip, deflate"},"remoteAddress":"::ffff:127.0.0.1","remotePort":41940},"res":{"statusCode":503,"headers":{"x-powered-by":"Express","vary":"Origin","access-control-allow-credentials":"t
{"level":40,"time":1793585591377,"pid":185,"hostname":"0191b4a9704b","req":{"id":"64d08656-c560-4817-aed6-1c12aee50444","method":"GET","url":"/api/health","headers":{"host":"localhost:3000","connection":"keep-alive","accept":"*/*","accept-language":"*","sec-fetch-mode":"cors","user-agent":"node","accept-encoding":"gzip, deflate"},"remoteAddress":"::ffff:127.0.0.1","remotePort":40952},"context":"Redis","msg":"Valkey indisponível: getaddrinfo ENOTFOUND valkey"}
{"level":40,"time":1793585592178,"pid":185,"hostname":"0191b4a9704b","context":"EmailSendProcessor","msg":"Worker de email.send indisponível: Error (ENOTFOUND)"}
{"level":40,"time":1793585592179,"pid":185,"hostname":"0191b4a9704b","context":"BullMqEmailQueue","msg":"Fila email.send indisponível: Error (ENOTFOUND)"}
{"level":40,"time":1793585592194,"pid":185,"hostname":"0191b4a9704b","context":"EmailSendProcessor","msg":"Worker de email.send indisponível: Error (ENOTFOUND)"}
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
6 requisições em 0.43 s: [200, 200, 200, 200, 200, 429]
6a: HTTP 429 X-Retry-After: 60 {"message":"Too many requests. Please try again later."}
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
HTTP 200 (0.075 s) {"token":null,"user":{"name":"Teste Limite","email":"limite7@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:08:16.678Z","updatedAt":"2026-11-02T02:08:16.678Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"As7LRixMlIiQutXQ1PNDMOuVjjlukkdp"}}
```

</details>

#### API-LIMITE-03
- Veredito: passou
- ✓ exatamente cinco respostas são 200 | observado [200, 200, 200, 200, 429, 200]
- ✓ exatamente uma resposta é 429 | observado [200, 200, 200, 200, 429, 200]
- ✓ o banco tem exatamente cinco contas com e-mails entre rajada1@example.com e rajada6@example.com | esperado 5, observado 5 conta(s)

<details>
<summary>Evidência</summary>

```
api religada; linha 'Nest application successfully started' no log: True (7.9 s)
status: [200, 200, 200, 200, 429, 200]
linhas de /api/health no log até o fim do item: 2
HTTP 200 (0.34 s) {"token":null,"user":{"name":"Teste Rajada","email":"rajada1@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:08:26.082Z","updatedAt":"2026-11-02T02:08:26.0
HTTP 200 (0.339 s) {"token":null,"user":{"name":"Teste Rajada","email":"rajada2@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:08:26.070Z","updatedAt":"2026-11-02T02:08:26.
HTTP 200 (0.353 s) {"token":null,"user":{"name":"Teste Rajada","email":"rajada3@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:08:26.107Z","updatedAt":"2026-11-02T02:08:26.
HTTP 200 (0.363 s) {"token":null,"user":{"name":"Teste Rajada","email":"rajada4@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:08:26.170Z","updatedAt":"2026-11-02T02:08:26.
HTTP 429 (0.092 s) {"message":"Too many requests. Please try again later."}
HTTP 200 (0.364 s) {"token":null,"user":{"name":"Teste Rajada","email":"rajada6@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:08:26.167Z","updatedAt":"2026-11-02T02:08:26.
```

</details>

#### API-PROXY-01 *
- Veredito: passou
- ✓ GET /api/health não passa a responder | observado nenhuma resposta em 30 tentativas ao longo de 150 s
- ✓ o log do serviço api traz um erro de configuração que nomeia TRUSTED_PROXIES | observado ["Configuração inválida; corrija no .env: TRUSTED_PROXIES (ausente)"]
- `*` nenhuma linha desse log traz o valor de outra variável do `.env` | interpretado como: busca literal de cada valor não vazio do .env com 4 ou mais caracteres (exceto TRUSTED_PROXIES) nas 16 linhas do log desde a recriação | observado nenhum valor encontrado | passou

<details>
<summary>Evidência</summary>

```
override do Compose: NODE_ENV=production, TRUSTED_PROXIES vazia; container recriado
printenv: 'production\n\n'
GET /api/health a cada 5 s: [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None]
log (trecho):
Already up to date
Done in 5.7s using pnpm v12.16.1
$ tsc -p tsconfig.build.json
$ prisma generate
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma/schema.prisma.
✔ Generated Prisma Client (7.10.1) to ./src/generated/prisma in 249ms
$ nest start --watch --exec ./bin/node-with-otel.sh --no-shell
[2J[3J[H[[90m2:08:35 AM[0m] Starting compilation in watch mode...
[[90m2:08:39 AM[0m] Found 0 errors. Watching for file changes.
Configuração inválida; corrija no .env: TRUSTED_PROXIES (ausente)
 Error  The application exited with code 1. Waiting for file changes before restarting...
api restaurada: código 0
```

</details>

#### API-PROXY-02
- Veredito: passou
- ✓ GET /api/health responde 200 | esperado 200, observado 200
- ✓ o log do serviço api não traz erro de configuração que nomeie TRUSTED_PROXIES | observado ausente em 40 linha(s)

<details>
<summary>Evidência</summary>

```
override do Compose: NODE_ENV=production, TRUSTED_PROXIES=10.0.0.0/8; container recriado
printenv: 'production\n10.0.0.0/8\n'
GET /api/health: [None, None, 200]
api restaurada: código 0
```

</details>

#### API-FALHA-01 *
- Veredito: passou
- ✓ a resposta é 200 e chega em até 5 segundos | observado 200 em 0.631 s
- ✓ o banco tem uma conta com o e-mail nina@example.com, papel user e e-mail não verificado | observado [["user", "f"]]
- `*` o serviço api continua respondendo GET /api/health | interpretado como: o processo responde HTTP à rota (503 com o Valkey parado conta como resposta) | observado HTTP 503 | passou

<details>
<summary>Evidência</summary>

```
valkey antes do cadastro: exited 2026-11-02T02:08:09.562988405Z
HTTP 200 (0.631 s) {"token":null,"user":{"name":"Nina Alves","email":"nina@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:11:56.070Z","updatedAt":"2026-11-02T02:11:56.070Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"urbg0hW375kawosSMwHYPpehKAt1W2EL"}}
GET /api/health com o valkey parado: HTTP 503 {"status":"error","checks":{"postgres":"up","valkey":"down"}}
```

</details>

### Worker

#### WRK-EMAIL-01
- Veredito: passou
- ✓ em até 2 minutos a caixa tem exatamente uma mensagem para otto@example.com | esperado 1, observado 1 mensagem(ns) em 1.0 s
- ✓ o remetente da mensagem é o SMTP_FROM do .env | esperado no-reply@localhost, observado no-reply@localhost
- ✓ o assunto é "Confirme seu e-mail" | observado Confirme seu e-mail

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.085 s) {"token":null,"user":{"name":"Otto Brandão","email":"otto@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:13:27.292Z","updatedAt":"2026-11-02T02:13:27.292Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"VdIF4fJE9nK7QbDqHTUOJgD4INxrRImL"}}
mensagens: [('no-reply@localhost', 'Confirme seu e-mail')] (primeira em 1.0 s)
```

</details>

#### WRK-EMAIL-02 *
- Veredito: passou
- ✓ a mensagem para paula@example.com tem um link que começa com o WEB_ORIGIN do .env seguido de /confirmar-email?token= e um token não vazio | observado texto True, HTML True
- ✓ o corpo diz "O link vale por 24 horas." | observado texto True, HTML True
- `*` o corpo cumprimenta pelo nome Paula Dias | interpretado como: saudação "Olá, Paula Dias" no texto e no HTML | observado texto True, HTML True | passou
- `*` o corpo está em português do Brasil, no texto e no HTML | interpretado como: atributo lang="pt-BR" no HTML e frases em português (confirme, e-mail, vale por) nas duas versões | observado lang pt-BR True, termos em português no texto True e no HTML True | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.077 s) {"token":null,"user":{"name":"Paula Dias","email":"paula@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:13:31.928Z","updatedAt":"2026-11-02T02:13:31.928Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"2nXKnPx7mbY9lXkyQOUnrxndykFikOOh"}}
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
    <p><a href="http://localhost:5173/confirmar-email?token=<mascarado>">Confirmar e-mail</a></p>
    <p>Se o botão não abrir, copie este endereço no navegador:<br>http://localhost:517
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
HTTP 200 (0.077 s) {"token":null,"user":{"name":"Quim Moura","email":"quim@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:13:33.544Z","updatedAt":"2026-11-02T02:13:33.544Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"C5mYUW5u6Oum48l0KsB2AXytZxK0wg5L"}}
mensagem em 1.0 s; cabeçalhos: ['Content-Type', 'Date', 'From', 'Message-Id', 'Mime-Version', 'Received', 'Return-Path', 'Subject', 'To']
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
HTTP 200 (0.077 s) {"token":null,"user":{"name":"Rui Campos","email":"rui@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:13:35.176Z","updatedAt":"2026-11-02T02:13:35.176Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"Gcg13RmXNatmCmagcoBmlWahfspu42V0"}}
userId Gcg13RmXNatmCmagcoBmlWahfspu42V0
jobs: [{"id": "26", "name": "verify-email", "data": "{\"type\":\"verify-email\",\"userId\":\"Gcg13RmXNatmCmagcoBmlWahfspu42V0\"}", "atm": "1", "state": "completed"}]
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
HTTP 422 (0.008 s) {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
```

</details>

#### WRK-EMAIL-06 *
- Veredito: passou
- ✓ depois de 2 minutos da volta, a caixa não tem mensagem para ulisses@example.com | esperado 0, observado 0 mensagem(ns)
- `*` o job verify-email dessa conta fica concluído, sem ficar no estado falho | interpretado como: job na zset completed e fora da failed | observado [["completed", "2"]] | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.086 s) {"token":null,"user":{"name":"Ulisses Prado","email":"ulisses@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:14:49.765Z","updatedAt":"2026-11-02T02:14:49.765Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"YWkg0R0bO3dI5SAz0opFchGuctAwTxvT"}}
mailpit parado: exited 2026-11-01T15:07:07.130033221Z
conta marcada com e-mail verificado: [['t']]
job antes da volta: [('28', 'verify-email', 'active', None, None)]
mailpit antes de religar: exited 2026-11-01T15:07:07.130033221Z
mailpit religado: running 2026-11-02T02:15:01.654832126Z; estados durante a espera: ['running']
job depois de 2 min: [('28', 'verify-email', 'completed', '2', 'Connection timeout')] returnvalue ['"already-verified"']
```

</details>

#### WRK-RETRY-01 *
- Veredito: passou
- ✓ em até 2 minutos depois de o mailpit voltar, a caixa tem uma mensagem para sara@example.com | observado 1 mensagem(ns) em 18.0 s
- `*` o job verify-email dessa conta fica concluído com mais de uma tentativa registrada | interpretado como: estado completed e campo atm do hash maior que 1 | observado [["completed", "4"]] | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.084 s) {"token":null,"user":{"name":"Sara Pinto","email":"sara@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:17:20.331Z","updatedAt":"2026-11-02T02:17:20.331Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"YK4URuMvw3bP9fpFfoQ8EJe36ofrvdnL"}}
mailpit parado: exited 2026-11-02T02:15:01.654832126Z
mailpit 20 s depois do cadastro, antes de religar: exited 2026-11-02T02:15:01.654832126Z; job [('29', 'verify-email', 'delayed', '2', 'connect EHOSTUNREACH 172.18.0.4:1025')]
mensagens: 1 em 18.0 s depois da volta; job: [('29', 'verify-email', 'completed', '4', 'connect EHOSTUNREACH 172.18.0.4:1025')]
```

</details>

#### WRK-RETRY-02 *
- Veredito: passou
- ✓ em até 3 minutos o job verify-email dessa conta fica no estado falho | observado ['failed'] em 112.8 s
- `*` o job registra 5 tentativas | interpretado como: campo atm do hash | observado ["5"] | passou
- ✓ a conta de tais@example.com continua no banco, pendente | observado [["user", "f"]]

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.086 s) {"token":null,"user":{"name":"Tais Rangel","email":"tais@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:18:24.082Z","updatedAt":"2026-11-02T02:18:24.082Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"yvgLEiSLsEnA86c1jtWnVf02zFlCNkmI"}}
mailpit parado: exited 2026-11-02T02:17:52.325355525Z; estados durante a espera: ['exited']; no fim: exited 2026-11-02T02:17:52.325355525Z
job: [('30', 'verify-email', 'failed', '5', 'connect EHOSTUNREACH 172.18.0.4:1025')] (112.8 s)
```

</details>

#### WRK-FILA-01
- Veredito: passou
- ✓ em até 2 minutos a caixa tem exatamente uma mensagem para tulio@example.com | esperado 1, observado 1 mensagem(ns) em 0.0 s
- ✓ o job verify-email dessa conta fica concluído | observado [["completed", "1"]]

<details>
<summary>Evidência</summary>

```
valkey parado: exited 2026-11-02T02:13:13.595351588Z; religado 20 s depois: running 2026-11-02T02:20:41.070498907Z; api (não reiniciada): running 2026-11-02T02:11:38.285232668Z
HTTP 200 (0.089 s) {"token":null,"user":{"name":"Túlio Faria","email":"tulio@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:21:17.939Z","updatedAt":"2026-11-02T02:21:17.939Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"BylA0uNqr8dTYJ2xdPacNSUzA2SS0h5B"}}
mensagens: 1 em 0.0 s; job: [('31', 'verify-email', 'completed', '1', None)]
```

</details>

#### WRK-FILA-02 *
- Veredito: passou
- ✓ em até 1 minuto depois da retomada, a fila email.send tem um job verify-email com o id da conta de valeria@example.com | observado 1 job(s) em 11.3 s
- `*` uma linha de log do serviço api escrita depois da retomada traz o id desse job | interpretado como: docker compose logs api desde o unpause, linha que cita o id do job como job | observado ["{\"level\":40,\"time\":1793586099115,\"pid\":185,\"hostname\":\"0191b4a9704b\",\"context\":\"BullMqEmailQueue\",\"msg\":\"Pedido da conta kyh8oBvgrHWmZ7uML6u0vJZuPYpqfHog entrou na fila email.send depois do limite, como job 32\"}"] | passou
- ✓ em até 2 minutos a caixa tem exatamente uma mensagem para valeria@example.com | esperado 1, observado 1 mensagem(ns)

<details>
<summary>Evidência</summary>

```
valkey pausado: paused 2026-11-02T02:20:41.070498907Z
HTTP 200 (3.589 s) {"token":null,"user":{"name":"Valéria Cruz","email":"valeria@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:21:34.566Z","updatedAt":"2026-11-02T02:21:34.566Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"kyh8oBvgrHWmZ7uML6u0vJZuPYpqfHog"}}
retomada em 2026-11-02T02:21:38.992468Z
job: [('32', 'verify-email', 'completed', '1', None)] (11.3 s depois da retomada)
log desde a retomada (trecho): {"level":40,"time":1793586099115,"pid":185,"hostname":"0191b4a9704b","context":"BullMqEmailQueue","msg":"Pedido da conta kyh8oBvgrHWmZ7uML6u0vJZuPYpqfHog entrou na fila email.send depois do limite, como job 32"}
```

</details>

#### WRK-SIGILO-01 *
- Veredito: passou
- ✓ em até 2 minutos a caixa tem uma mensagem para wesley@example.com com um link para /confirmar-email?token= | observado 1 mensagem(ns) em 0.0 s, link True
- `*` o job verify-email dessa conta fica concluído na fila email.send | interpretado como: hash bull:email.send:<id> com name verify-email na zset completed | observado [["33", "completed", "1"]] | passou
- `*` os dados desse job concluído têm só os campos type e userId | interpretado como: chaves do JSON do campo data do hash | observado [["type", "userId"]] | passou
- `*` nenhum campo desse job no Valkey contém o token do link da mensagem | interpretado como: busca literal do token da mensagem em todos os campos do hash do job e nas chaves auxiliares bull:email.send:<id>:* | observado token ausente nos campos ['atm', 'ats', 'data', 'delay', 'finishedOn', 'name', 'opts', 'priority', 'processedOn', 'returnvalue', 'timestamp'] | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.083 s) {"token":null,"user":{"name":"Wesley Prates","email":"wesley@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:21:58.306Z","updatedAt":"2026-11-02T02:21:58.306Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"zE61viVuR8On8HJlFymtw8JdVLgW0jb8"}}
userId zE61viVuR8On8HJlFymtw8JdVLgW0jb8
mensagem em 0.0 s, token de 211 caracteres (<mascarado>)
job concluído em 11.8 s; chaves de data na primeira leitura como concluído: [['type', 'userId']]; 2 s depois: [['type', 'userId']]
hash: [{"opts": "{\"removeOnFail\":{\"age\":604800},\"attempts\":5,\"removeOnComplete\":{\"age\":86400},\"tm\":\"{}\",\"backoff\":{\"type\":\"exponential\",\"delay\":5000}}", "processedOn": "1793586118314", "atm": "1", "finishedOn": "1793586118336", "ats": "1", "name": "verify-email", "data": "{\"type\":\"verify-email\",\"userId\":\"zE61viVuR8On8HJlFymtw8JdVLgW0jb8\"}", "timestamp": "1793586118313", "delay": "0", "priority": "0", "returnvalue": "\"sent\"", "id": "33", "state": "completed", "key": "bull:email.send:33"}]
```

</details>

#### WRK-SIGILO-02 *
- Veredito: passou
- ✓ em até 3 minutos o job verify-email dessa conta fica no estado falho na fila email.send | observado ['failed'] em 125.5 s
- `*` o job registra 5 tentativas | interpretado como: campo atm do hash | observado ["5"] | passou
- `*` os dados desse job falho têm só os campos type e userId | interpretado como: chaves do JSON do campo data do hash | observado [["type", "userId"]] | passou
- `*` nenhum campo desse job no Valkey contém o trecho token= | interpretado como: busca literal em todos os campos do hash do job e nas chaves auxiliares bull:email.send:<id>:* | observado ausente nos campos ['atm', 'ats', 'data', 'delay', 'failedReason', 'finishedOn', 'name', 'opts', 'priority', 'processedOn', 'stacktrace', 'timestamp', 'tm'] | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.082 s) {"token":null,"user":{"name":"Yara Leme","email":"yara@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:22:26.531Z","updatedAt":"2026-11-02T02:22:26.531Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"4j0RNW0xMuWvnJsheObV45spTMsKM2jr"}}
mailpit parado: exited 2026-11-02T02:20:17.752375392Z; estados durante a espera: ['exited']; no fim: exited 2026-11-02T02:20:17.752375392Z
job: [('34', 'verify-email', 'failed', '5', 'Connection timeout')] (125.5 s)
hash: [{"opts": "{\"removeOnFail\":{\"age\":604800},\"attempts\":5,\"removeOnComplete\":{\"age\":86400},\"tm\":\"{}\",\"backoff\":{\"type\":\"exponential\",\"delay\":5000}}", "processedOn": "1793586248675", "failedReason": "Connection timeout", "tm": "{}", "atm": "5", "finishedOn": "1793586258679", "ats": "5", "name": "verify-email", "data": "{\"type\":\"verify-email\",\"userId\":\"4j0RNW0xMuWvnJsheObV45spTMsKM2jr\"}", "timestamp": "1793586146541", "delay": "0", "priority": "0", "stacktrace": "[\"Error: Connection timeout\\n    at timeoutError (file:///app/node_modules/.pnpm/nodemailer@10.3.1/node_modules/nodemailer/dist/esm/smtp-connection/index.js:31:17)\\n    at SMTPConnection._setupConnectionHandlers (file:///app/node_modules/.pnpm/nodemailer@10.3.1/node_modules/nodemailer/dist/esm/smtp-", "id": "34", "state": "failed", "key": "bull:email.send:34"}]
```

</details>

#### WRK-SIGILO-03 *
- Veredito: passou
- ✓ em até 2 minutos da volta o job verify-email dessa conta fica concluído na fila email.send | observado [('completed', '2')] em 12.2 s
- `*` os dados desse job concluído têm só os campos type e userId | interpretado como: chaves do JSON do campo data do hash | observado [["type", "userId"]] | passou
- `*` nenhum campo desse job no Valkey contém o trecho token= | interpretado como: busca literal em todos os campos do hash do job e nas chaves auxiliares bull:email.send:<id>:* | observado ausente nos campos ['atm', 'ats', 'data', 'delay', 'failedReason', 'finishedOn', 'name', 'opts', 'priority', 'processedOn', 'returnvalue', 'stacktrace', 'timestamp', 'tm'] | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 (0.083 s) {"token":null,"user":{"name":"Wilma Seixas","email":"wilma@example.com","emailVerified":false,"image":null,"createdAt":"2026-11-02T02:24:49.461Z","updatedAt":"2026-11-02T02:24:49.461Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"zIk0i7xVxGciMKCPwfYNuoNeajJtbdv5"}}
mailpit parado: exited 2026-11-02T02:24:46.888024506Z
conta marcada com e-mail verificado: [['t']]
job antes da volta: [('35', 'verify-email', 'active', None, None)]
mailpit antes de religar: exited 2026-11-02T02:24:46.888024506Z; religado: running 2026-11-02T02:25:04.615929293Z
job: [('35', 'verify-email', 'completed', '2', 'Connection timeout')] (12.2 s depois da volta) returnvalue ['"already-verified"']
hash: [{"opts": "{\"removeOnFail\":{\"age\":604800},\"attempts\":5,\"removeOnComplete\":{\"age\":86400},\"tm\":\"{}\",\"backoff\":{\"type\":\"exponential\",\"delay\":5000}}", "processedOn": "1793586305442", "failedReason": "Connection timeout", "tm": "{}", "atm": "2", "finishedOn": "1793586305448", "ats": "2", "name": "verify-email", "data": "{\"type\":\"verify-email\",\"userId\":\"zIk0i7xVxGciMKCPwfYNuoNeajJtbdv5\"}", "timestamp": "1793586289471", "delay": "0", "priority": "0", "stacktrace": "[\"Error: Connection timeout\\n    at timeoutError (file:///app/node_modules/.pnpm/nodemailer@10.3.1/node_modules/nodemailer/dist/esm/smtp-connection/index.js:31:17)\\n    at SMTPConnection._setupConnectionHandlers (file:///app/node_modules/.pnpm/nodemailer@10.3.1/node_modules/nodemailer/dist/esm/smtp-", "returnvalue": "\"already-verified\"", "id": "35", "state": "completed", "key": "bull:email.send:35"}]
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
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-CADASTRO-01.png
```

</details>

#### UI-REENVIO-01 *
- Veredito: passou
- ✓ a página envia POST /api/auth/send-verification-email com o e-mail vera@example.com | observado ["POST {\"email\":\"vera@example.com\"}"]
- ✓ essa requisição recebe 200 | observado 200
- `*` a tela informa que um novo link foi enviado | interpretado como: texto da região role=status | observado Enviamos um novo link para vera@example.com. | passou
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
requisições: [{"m":"POST","url":"http://localhost:3000/api/auth/send-verification-email","body":"{\"email\":\"vera@example.com\"}"}]
status: Enviamos um novo link para vera@example.com.
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-REENVIO-01.png
```

</details>

#### UI-DUPLICADO-01 *
- Veredito: passou
- `*` a tela diz que o e-mail já tem conta | interpretado como: texto do aviso role=alert | observado Este e-mail já tem conta. Entre ou recupere a senha. | passou
- `*` a tela tem um link para /entrar | interpretado como: link dentro do aviso | observado ["/entrar", "/recuperar-senha"] | passou
- `*` a tela tem um link para /recuperar-senha | interpretado como: link dentro do aviso | observado ["/entrar", "/recuperar-senha"] | passou
- ✓ o formulário continua visível com o nome e o e-mail preenchidos | observado ["Outra Ana", "ANA@example.com"]
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
aviso: Este e-mail já tem conta. Entre ou recupere a senha.

Entrar
Recuperar a senha
links visíveis: [["App","/"],["Entrar","/entrar"],["Criar conta","/cadastro"],["Entrar","/entrar"],["Recuperar a senha","/recuperar-senha"]]
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-DUPLICADO-01.png
```

</details>

#### UI-FALHA-01 *
- Veredito: passou
- `*` a tela mostra o aviso de que o servidor não respondeu | interpretado como: texto do aviso role=alert | observado O servidor não respondeu. Tente de novo. | passou
- `*` a página não mostra a página de erro | interpretado como: ausência da página de erro da SPA e do erro padrão do React Router, com o formulário no lugar | observado sem página de erro | passou
- ✓ o formulário continua visível com o nome Iago Bento e o e-mail iago@example.com preenchidos | observado ["Iago Bento", "iago@example.com"]
- ✓ a URL continua em /cadastro | observado /cadastro
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
api parada: exited 2026-11-02T02:11:38.285232668Z
texto: App
Entrar
Criar conta
Crie sua conta

O servidor não respondeu. Tente de novo.

Nome
E-mail
Senha
Criar conta
URL http://localhost:5173/cadastro
api religada: {"state":"running 2026-11-02T02:26:03.596631549Z","health":200}
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-FALHA-01.png
```

</details>

#### UI-FALHA-02 *
- Veredito: passou
- `*` a tela mostra o aviso de que o servidor não respondeu | interpretado como: texto do aviso role=alert | observado O servidor não respondeu. Tente de novo. | passou
- `*` a página não mostra a página de erro | interpretado como: ausência da página de erro da SPA e do erro padrão do React Router, com o formulário no lugar | observado sem página de erro | passou
- ✓ o formulário continua visível com o nome Ivo Lemos e o e-mail ivo@example.com preenchidos | observado ["Ivo Lemos", "ivo@example.com"]
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
api parada: exited 2026-11-02T02:26:03.596631549Z
texto: App
Entrar
Criar conta
Crie sua conta

O servidor não respondeu. Tente de novo.

Nome
E-mail
Senha
Criar conta
URL http://localhost:5173/cadastro/?origem=barra
api religada: {"state":"running 2026-11-02T02:26:16.192003931Z","health":200}
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-FALHA-02.png
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
mensagem: {"msg":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.","below":true}
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-SENHA-01.png
```

</details>

#### UI-CAMPOS-01 *
- Veredito: passou
- `*` abaixo do campo de nome aparece a mensagem de campo obrigatório | interpretado como: mensagem associada ao campo de nome, logo abaixo dele, pedindo o nome | observado Informe o seu nome. | passou
- ✓ o foco fica no campo de nome | observado cadastro-name
- ✓ a página não envia requisição a /api/auth/sign-up/email | observado 0 requisição(ões)
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
mensagem: {"msg":"Informe o seu nome.","below":true,"focus":"cadastro-name"}
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-CAMPOS-01.png
```

</details>

#### UI-CAMPOS-02 *
- Veredito: passou
- `*` abaixo do campo de e-mail aparece a mensagem de e-mail inválido | interpretado como: mensagem associada ao campo de e-mail, logo abaixo dele, sobre e-mail inválido | observado Informe um e-mail válido. | passou
- ✓ a página não envia requisição a /api/auth/sign-up/email | observado 0 requisição(ões)
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
mensagem: {"msg":"Informe um e-mail válido.","below":true}
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-CAMPOS-02.png
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
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
URL http://localhost:5173/cadastro; requisições [{"url":"http://localhost:3000/api/auth/sign-up/email","body":"{\"name\":\"Outra Ana\",\"email\":\"ana@example.com\",\"password\":\"<senha>\"}"}]
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-SIGILO-01.png
```

</details>

#### UI-LAYOUT-01 *
- Veredito: passou
- ✓ o topo da página tem a barra de navegação com o nome do app como link para / | observado {"tag": "header", "top": 0, "links": [["App", "/"], ["Entrar", "/entrar"], ["Criar conta", "/cadastro"]]}
- ✓ a barra tem o link "Criar conta" para /cadastro | observado [["App", "/"], ["Entrar", "/entrar"], ["Criar conta", "/cadastro"]]
- ✓ a barra tem o link "Entrar" para /entrar | observado [["App", "/"], ["Entrar", "/entrar"], ["Criar conta", "/cadastro"]]
- `*` a página continua mostrando, em português do Brasil, que não há sessão aberta | interpretado como: texto do conteúdo, fora da barra, dizendo em pt-BR que não há sessão | observado App

Nenhuma sessão aberta.

Ainda não tem conta? Cadastre-se. | passou
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
nav: {"tag":"header","top":0,"links":[["App","/"],["Entrar","/entrar"],["Criar conta","/cadastro"]]}
conteúdo: ["App\n\nNenhuma sessão aberta.\n\nAinda não tem conta? Cadastre-se.","App\n\nNenhuma sessão aberta.\n\nAinda não tem conta? Cadastre-se.","App","Nenhuma sessão aberta.","Ainda não tem conta? Cadastre-se."]
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-LAYOUT-01.png
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
URL http://localhost:5173/cadastro; nav {"tag":"header","top":0,"links":[["App","/"],["Entrar","/entrar"],["Criar conta","/cadastro"]]}
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-LAYOUT-02.png
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

Voltar ao início
font-family do h1: "Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-LAYOUT-03.png
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
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-VISUAL-01.png
```

</details>

#### UI-VISUAL-02 *
- Veredito: passou
- ✓ a fonte "Inter Variable" consta como carregada nas fontes do documento | observado ["Inter Variable"]
- ✓ o font-family computado do body começa com "Inter Variable" | observado "Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif
- ✓ o título "Crie sua conta" tem font-weight 700, font-size de 32px e letter-spacing normal | observado {"fw": "700", "fs": "32px", "ls": "normal"}
- ✓ toda requisição de arquivo de fonte vai à origem da SPA | observado ["http://localhost:5173/@fs/app/node_modules/.pnpm/@fontsource-variable+inter@5.3.0/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"]
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
{"loaded":["Inter Variable"],"body":"\"Inter Variable\", system-ui, \"Helvetica Neue\", Arial, sans-serif","h1":{"fw":"700","fs":"32px","ls":"normal"},"fontReqs":["http://localhost:5173/@fs/app/node_modules/.pnpm/@fontsource-variable+inter@5.3.0/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"]}
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-VISUAL-02.png
```

</details>

#### UI-VISUAL-03 *
- Veredito: passou
- `*` o card do formulário tem fundo computado rgb(255, 255, 255), border-radius de 16px e box-shadow none | interpretado como: o card é o contêiner do título e do formulário | observado rgb(255, 255, 255), 16px, none | passou
- ✓ o card tem no máximo 490px de largura | observado 490px
- ✓ os campos de nome, e-mail e senha têm fundo computado rgb(239, 239, 239) e border-radius de 8px | observado ["name rgb(239, 239, 239) 8px", "email rgb(239, 239, 239) 8px", "password rgb(239, 239, 239) 8px"]
- ✓ cada campo tem um rótulo visível associado a ele | observado ["name: Nome", "email: E-mail", "password: Senha"]
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
{"card":{"bg":"rgb(255, 255, 255)","br":"16px","sh":"none","w":490,"cls":"card-content mx-auto w-full max-w-[490px]"},"ins":[{"n":"name","bg":"rgb(239, 239, 239)","br":"8px","label":"Nome","labelVisible":true,"labels":1},{"n":"email","bg":"rgb(239, 239, 239)","br":"8px","label":"E-mail","labelVisible":true,"labels":1},{"n":"password","bg":"rgb(239, 239, 239)","br":"8px","label":"Senha","labelVisible":true,"labels":1}]}
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-VISUAL-03.png
```

</details>

#### UI-VISUAL-04 *
- Veredito: passou
- ✓ o campo de e-mail tem aria-invalid igual a true | observado true
- ✓ o aria-describedby do campo de e-mail aponta para o elemento com a mensagem de e-mail inválido | observado cadastro-email-erro -> Informe um e-mail válido.
- ✓ o campo de e-mail tem borda computada de 2px na cor rgb(0, 0, 0) | observado ["2px", "2px", "2px", "2px", "rgb(0, 0, 0)", "rgb(0, 0, 0)", "rgb(0, 0, 0)", "rgb(0, 0, 0)"]
- ✓ a mensagem tem cor computada rgb(0, 0, 0) e um ícone antes do texto | observado rgb(0, 0, 0), primeiro filho svg
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
{"inv":"true","d":"cadastro-email-erro","msg":"Informe um e-mail válido.","allB":["2px","2px","2px","2px","rgb(0, 0, 0)","rgb(0, 0, 0)","rgb(0, 0, 0)","rgb(0, 0, 0)"],"bs":"solid","mcolor":"rgb(0, 0, 0)","icon":"svg","iconBefore":true} (medido sem foco no campo)
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-VISUAL-04.png
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
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-VISUAL-05.png
```

</details>

#### UI-VISUAL-06 *
- Veredito: passou
- `*` o aviso de e-mail já cadastrado aparece acima do formulário com role igual a alert | interpretado como: elemento role=alert antes do form no DOM e com a base acima do topo do form | observado true | passou
- ✓ o aviso tem fundo computado rgb(239, 239, 239) e border-radius de 16px | observado rgb(239, 239, 239), 16px
- `*` nenhum elemento visível da página tem cor de texto, fundo ou borda fora da paleta do DESIGN.md, sem contar o transparente | interpretado como: color, background-color e border-*-color (com borda visível) computados de cada elemento visível, sem foco nem hover, contra as cores de colors no front-matter do DESIGN.md | observado nenhum fora da paleta | passou
- ✓ base visual mecânica: imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | observado nenhum achado
- `*` base visual por screenshot | interpretado como: revisão do screenshot do escopo do item | observado sem corte, sobreposição ou layout desmontado | passou

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
{"above":true,"bg":"rgb(239, 239, 239)","br":"16px","bad":[]}
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/UI-VISUAL-06.png
```

</details>

### E2E

#### E2E-CADASTRO-01 *
- Veredito: passou
- `*` a tela mostra que o link de confirmação foi enviado para zelia@example.com | interpretado como: texto visível | observado Enviamos um link de confirmação para zelia@example.com. Confirme o e-mail antes de entrar. | passou
- ✓ em até 2 minutos a caixa tem uma mensagem para zelia@example.com com um link para /confirmar-email?token= | observado 1 mensagem(ns) em 0 s, link true
- ✓ o banco tem a conta de zelia@example.com com papel user e e-mail não verificado | observado [["user", "f"]]
- `*` nem a mensagem nem as linhas de log do serviço api escritas durante a jornada contêm Jornada123 | interpretado como: texto, HTML e cabeçalhos da mensagem e log da api desde o início do item | observado ausente em 2 linha(s) de log e na mensagem | passou
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
mensagens 1 em 0 s, link true
banco: [["user","f"]]
linhas de log: 2
screenshot: /tmp/evaluator-rf001-2026-11-02T02-02-31Z/shots/E2E-CADASTRO-01.png
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `compose.yaml`: o serviço api instala nos volumes ao subir; `scripts/db-setup.sh` garante as dependências |
| Ambiente e serviços | 1 e 2 | contrato (Docker Compose) e `compose.yaml`: o ambiente local já no ar, com a api recriada por um arquivo de override do Compose na pasta temporária (`COMPOSE_FILE`) |
| Banco efêmero e migração | 5 | `scripts/db-setup.sh`: banco `eval_rf001_2026_11_02t02_02_31z` no postgres do Compose, `DATABASE_URL` da api trocada pelo override, `make db-setup` migra e cria o admin |
| Isolamento do Valkey | 6 | `REDIS_URL=redis://valkey:6379/3` no override: rate limit e fila `email.send` no banco lógico 3, vazio antes da avaliação |
| Estado persistido | 1 | contrato: `conta-pendente-ana` "criada pelo cadastro", por POST /api/auth/sign-up/email; `sem-conta-admin` pelo DELETE da conta do seed |
| Configuração de produção | 6 | override do Compose com NODE_ENV=production e TRUSTED_PROXIES (vazia ou 10.0.0.0/8) sobre o `.env`, sem editar o `.env` do repositório |
| Limpeza entre itens | 6 | DELETE das contas sem papel admin e da tabela verification no banco efêmero (account e session caem em cascata), apagar `rate-limit:*` no Valkey e DELETE /api/v1/messages no Mailpit |
| Gates | 1 | contrato: `make check` e `make build` na raiz |
| Cliente HTTP | 6 | `urllib` do Python, com o X-Forwarded-For do contrato e o Origin da SPA nas chamadas à api |
| Logs da api | 1 e 3 | contrato e spec, Verificação por superfície: `docker compose logs api --since <início do item>` |
| Fila | 3 | spec, Verificação por superfície: hashes `bull:email.send:<id>` (todos os campos, e as chaves auxiliares `bull:email.send:<id>:*`) e o estado pelas zsets `completed`, `failed` e `delayed` e listas `wait` e `active`, lidos com `valkey-cli` no container |
| Caixa de e-mail | 3 | spec, Verificação por superfície (ADR-0016): API REST do Mailpit |
| Navegador | 3 | spec, Verificação por superfície (ADR-0024): Chromium headless pelo `playwright-core` do `@playwright/cli` no cache do npx, dirigido por script Node, um contexto sem cookie por item |
| Base visual | 6 | `evaluate` no navegador (imagens, caixas na janela, corte por `overflow`, `elementFromPoint`) e screenshot por item, revisado sem achados |
| Paleta do DESIGN.md | 3 | as cores de `colors` no front-matter do `DESIGN.md`, comparadas em rgb com color, background-color e border-color computados |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_rf001_*`, nenhuma pasta `evaluator-rf001-*` e nenhum PID de avaliação anterior no início.
- Derrubada: completa. Os PIDs do `processos.lock` (scripts do navegador) já tinham terminado; api recriada sem o override, de volta à `DATABASE_URL` do banco `app`, ao Valkey no banco 0 e a NODE_ENV=development, saudável; banco `eval_rf001_2026_11_02t02_02_31z` apagado; banco lógico 3 do Valkey esvaziado (`dbsize` 0); caixa do Mailpit esvaziada; valkey e mailpit no ar e saudáveis; pasta `/tmp/evaluator-rf001-2026-11-02T02-02-31Z` apagada, com os screenshots.

## Avisos

- O gate `make build` compila a API em `apps/api/dist`, que é o mesmo bind mount do watch do serviço api: depois do gate, a api do Compose caiu com `ERR_MODULE_NOT_FOUND` para `/app/apps/api/dist/app.module.js` e ficou parada esperando mudança de arquivo. A primeira passada de 14 itens de API rodou contra a api fora (erro de transporte) e foi descartada; a api foi recriada com o override e todos os itens rodaram de novo. O veredito registrado é o da segunda passada. Quem rodar `make build` com o Compose no ar deixa a api dele parada.
- Cinco itens de UI sem estado (UI-LAYOUT-03, UI-VISUAL-01, UI-VISUAL-02, UI-VISUAL-03 e UI-VISUAL-05) rodaram uma vez como teste do script do navegador enquanto os itens de Worker corriam; repetiram depois, na ordem, um por vez, e o veredito registrado é o da repetição.
- API-SIGILO-04: com o Valkey parado, uma linha de log do contexto Redis traz `Valkey indisponível: getaddrinfo ENOTFOUND valkey`, que nomeia o host do REDIS_URL sem a porta. O bullet pede "o host e a porta" e passa; se a intenção do contrato é não nomear nem o host, o item precisa dizer isso.
- API-SIGILO-02 e API-SIGILO-03: o cadastro não escreve linha de log na api (0 linhas e 1 linha de health check capturadas); os bullets de ausência passam sobre o que foi capturado.
- API-DUPLICADO-03: a requisição perdedora recebeu 422 com `code` `FAILED_TO_CREATE_USER`, não `USER_ALREADY_EXISTS`; o item pede só o 422.
- API-FALHA-01: com o Valkey parado, GET /api/health respondeu 503 com `valkey` down; o bullet foi lido como "o processo continua respondendo HTTP".
- API-LIMITE-03: a avaliação não chamou GET /api/health depois de religar a api (a subida foi conferida pela linha "Nest application successfully started"), mas o healthcheck do Compose chama a rota de dentro do container a cada 10 s; 2 linhas de /api/health aparecem no log até o fim do item.
- WRK-EMAIL-06 e WRK-SIGILO-03: o job tentou com o mailpit parado e terminou com `returnvalue` `already-verified` (atm 2) logo depois de o mailpit voltar; é o resultado que o contrato espera.
- WRK-FILA-02: a resposta do cadastro chegou em 3,6 s, antes da retomada (5 s depois do envio); a linha de log com o id do job ("como job 32") foi escrita depois do comando de retomada.
- Os tempos de detecção de estado de job nos itens de Worker incluem o custo da varredura por `valkey-cli` no container (cerca de 10 s): em WRK-SIGILO-01 o job terminou 22 ms depois de começar (`processedOn` e `finishedOn`), e a varredura o viu concluído em 11,8 s.
- Os itens usam o Valkey (banco lógico 3) e o Mailpit compartilhados do ambiente de desenvolvimento: a caixa do Mailpit foi esvaziada antes de cada item, e os dois serviços foram parados, pausados e religados nos itens que pedem.

## Motivo do aborto

Nenhum.
