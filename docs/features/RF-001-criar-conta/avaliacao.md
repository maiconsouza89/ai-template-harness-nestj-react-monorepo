# Avaliação: RF-001 Criar conta

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-10-31T01-55-37Z
- Branch: feat/rf-001-criar-conta
- Commit: 85d8571
- Status: limpo
- Itens: 43 passou, 0 falhou, 0 bloqueado, 0 manual, 0 pulado, de 43
- Critérios: 4 verificado, 0 reprovado, 0 indeterminado, de 4
- Filtros: nenhum

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| Cadastro com dados válidos cria conta pendente com papel usuário e gera um e-mail de confirmação para o endereço informado. | ✓ verificado | API-CADASTRO-01, API-CADASTRO-02, API-CADASTRO-03, API-SENHA-04, API-FALHA-01, WRK-EMAIL-01, WRK-EMAIL-02, WRK-RETRY-01, WRK-RETRY-02, UI-CADASTRO-01, UI-REENVIO-01, E2E-CADASTRO-01 |
| Cadastro com e-mail já existente, mesmo com outra combinação de maiúsculas, é recusado e não cria segunda conta. | ✓ verificado | API-DUPLICADO-01, API-DUPLICADO-02, API-DUPLICADO-03, WRK-EMAIL-05, UI-DUPLICADO-01 |
| Senha sem número, sem letra ou com menos de 8 caracteres é recusada com a regra exibida. | ✓ verificado | API-SENHA-01, API-SENHA-02, API-SENHA-03, UI-SENHA-01 |
| A senha nunca aparece em texto puro na tela, no e-mail ou em registros do sistema. | ✓ verificado | API-SIGILO-01, API-SIGILO-02, API-SIGILO-03, WRK-EMAIL-03, WRK-EMAIL-04, UI-SIGILO-01, E2E-CADASTRO-01 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (com `TURBO_FORCE=true`: lint e testes rodaram sem cache, os 41 testes da API e os dos demais pacotes passaram)
- ✓ build: `make build`, código 0 (com `TURBO_FORCE=true`: 4 tarefas, nenhuma do cache)

## Pré-requisitos

### Serviços em execução
- ✓ api (com o worker do Módulo E-mail): http://localhost:3000, saúde /api/health respondeu 200 `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`, apontada para o banco efêmero `eval_rf001_2026_10_31t01_55_37z` e para o Valkey no banco lógico 3
- ✓ web: http://localhost:5173/ respondeu 200
- ✓ postgres: `pg_isready` saudável no Compose (PostgreSQL 18)
- ✓ valkey: `valkey-cli ping` saudável no Compose (Valkey 9)
- ✓ mailpit: http://localhost:8025/api/v1/info respondeu, versão v1.32.0

### Estado persistido
- ✓ `conta-pendente-ana`: criado pelo cadastro (POST /api/auth/sign-up/email com Ana Souza, ana@example.com, Segura123 e um X-Forwarded-For próprio) em cada item que o usa; conferido: name Ana Souza, role user, emailVerified falso, banned falso, uma credencial com providerId credential
- ✓ `janela-de-cadastro-livre`: chaves `rate-limit:*` apagadas no Valkey antes de cada item; conferido: `exists rate-limit:203.0.113.50|/sign-up/email` igual a 0 antes de API-LIMITE-01

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env` copiado do `.env.example`: mesmos valores (só comentários diferem), NODE_ENV=development e TRUSTED_PROXIES vazia em vigor no container da api; `make db-setup` aplicado ao banco efêmero (migrações e primeiro admin)
- ✓ X-Forwarded-For por item: cada requisição de cadastro fora do navegador levou um IP 203.0.113.x exclusivo do item (203.0.113.50 e .51 só nos itens de limite)

### Dependências externas
- ✓ DEP-1 serviço de envio de e-mail: Mailpit v1.32.0 do Compose, lido e esvaziado pela API REST (`/api/v1/messages`), parado e religado com `docker compose stop mailpit` e `docker compose up -d --wait mailpit`

## Itens

### API HTTP

#### API-CADASTRO-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo traz o usuário com e-mail bia@example.com, emailVerified falso e role igual a user | interpretado como: campos user.email, user.emailVerified e user.role do corpo | observado user.email=bia@example.com, emailVerified=False, role=user | passou
- `*` o corpo traz token nulo | interpretado como: campo token presente e null | observado null | passou
- `*` a resposta não define cookie de sessão | interpretado como: ausência de cabeçalho Set-Cookie com o cookie de sessão do Better Auth | observado nenhum Set-Cookie | passou

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-up/email XFF 203.0.113.11 -> HTTP 200 {"token":null,"user":{"name":"Bia Lima","email":"bia@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:24.552Z","updatedAt":"2026-10-31T02:00:24.552Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"NKP6Vyj9ZGEnYs9jftHkk5WgeOGbZTde"}}
headers: {"X-Powered-By": "Express", "Vary": "Origin", "Access-Control-Allow-Credentials": "true", "content-type": "application/json", "Date": "Sat, 31 Oct 2026 02:00:24 GMT", "Connection": "close", "Transfer-Encoding": "chunked"}
```

</details>

#### API-CADASTRO-02 *
- Veredito: passou
- `*` o banco tem exatamente uma conta com o e-mail caio@example.com | interpretado como: count(*) em "user" com email igual | observado 1 | passou
- `*` essa conta tem papel user, e-mail não verificado e não está banida | interpretado como: colunas role, emailVerified e banned da linha em "user" | observado [['user', 'f', 'f']] | passou
- `*` essa conta tem uma credencial de senha com providerId credential | interpretado como: linhas de account da conta | observado [['credential', 't']] | passou
- `*` nenhuma sessão existe para essa conta | interpretado como: count(*) em session da conta | observado 0 | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 {"token":null,"user":{"name":"Caio Rocha","email":"caio@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:25.235Z","updatedAt":"2026-10-31T02:00:25.235Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"MUXY16wou7zl56wZCHnv3ZPBhaZMWUao"}}
user: [['user', 'f', 'f']]
account: [['credential', 't']]
```

</details>

#### API-CADASTRO-03 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo traz o e-mail dani.melo@example.com | interpretado como: campo user.email do corpo | observado dani.melo@example.com | passou
- `*` o banco grava a conta com o e-mail dani.melo@example.com, em minúsculas | interpretado como: coluna email da linha em "user" | observado [['dani.melo@example.com']] | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 {"token":null,"user":{"name":"Dani Melo","email":"dani.melo@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:26.814Z","updatedAt":"2026-10-31T02:00:26.814Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"0nXfH3PByzji6TgMF48954y3tZHITL2g"}}
user: [['dani.melo@example.com']]
```

</details>

#### API-DUPLICADO-01 *
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- `*` o corpo traz o código USER_ALREADY_EXISTS | interpretado como: campo code do corpo | observado USER_ALREADY_EXISTS | passou
- `*` o banco continua com exatamente uma conta com o e-mail ana@example.com, de nome Ana Souza | interpretado como: linhas em "user" com email igual | observado [['Ana Souza']] | passou

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 {"token":null,"user":{"name":"Ana Souza","email":"ana@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:27.516Z","updatedAt":"2026-10-31T02:00:27.516Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"Gd9WyS7nJxuHpDFHgDWOlCw7dMN0HVJS"}} [['Ana Souza', 'user', 'f', 'f', 'credential']]
HTTP 422 {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
```

</details>

#### API-DUPLICADO-02 *
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- `*` o corpo traz o código USER_ALREADY_EXISTS | interpretado como: campo code do corpo | observado USER_ALREADY_EXISTS | passou
- `*` o banco continua com exatamente uma conta cujo e-mail em minúsculas é ana@example.com | interpretado como: count(*) em "user" com lower(email) igual | observado 1 | passou

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 {"token":null,"user":{"name":"Ana Souza","email":"ana@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:28.449Z","updatedAt":"2026-10-31T02:00:28.449Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"8K4wuzDvjYtKwNN7T9qTrYG0FljBdmMc"}} [['Ana Souza', 'user', 'f', 'f', 'credential']]
HTTP 422 {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
```

</details>

#### API-DUPLICADO-03 *
- Veredito: passou
- `*` uma resposta é 200 | interpretado como: status das duas respostas concorrentes | observado [200, 422] | passou
- `*` a outra resposta é 422 | interpretado como: status das duas respostas concorrentes | observado [200, 422] | passou
- `*` o banco tem exatamente uma conta com o e-mail davi@example.com | interpretado como: count(*) em "user" | observado 1 | passou

<details>
<summary>Evidência</summary>

```
Davi Um: HTTP 422 {"message":"Failed to create user","code":"FAILED_TO_CREATE_USER"}
Davi Dois: HTTP 200 {"token":null,"user":{"name":"Davi Dois","email":"davi@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:29.592Z","updatedAt":"2026-10-31T02:00:29.592Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"5qmvieTICxM8dGrBev7j4TJfOwFQy1VS"}}
user: [['Davi Dois']]
```

</details>

#### API-SENHA-01 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` o corpo traz o código VALIDATION_ERROR | interpretado como: campo code do corpo | observado VALIDATION_ERROR | passou
- `*` o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | interpretado como: entrada de fields com field=password e a mensagem igual | observado A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número. | passou
- `*` o banco não tem conta com o e-mail elis@example.com | interpretado como: count(*) em "user" | observado 0 | passou

<details>
<summary>Evidência</summary>

```
HTTP 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SENHA-02 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | interpretado como: entrada de fields com field=password e a mensagem igual | observado A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número. | passou
- `*` o banco não tem conta com o e-mail fabio@example.com | interpretado como: count(*) em "user" | observado 0 | passou

<details>
<summary>Evidência</summary>

```
HTTP 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SENHA-03 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | interpretado como: entrada de fields com field=password e a mensagem igual | observado A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número. | passou
- `*` o banco não tem conta com o e-mail gil@example.com | interpretado como: count(*) em "user" | observado 0 | passou

<details>
<summary>Evidência</summary>

```
HTTP 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SENHA-04 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o banco tem uma conta com o e-mail heitor@example.com | interpretado como: count(*) em "user" igual a 1 | observado 1 | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 {"token":null,"user":{"name":"Heitor Paz","email":"heitor@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:32.446Z","updatedAt":"2026-10-31T02:00:32.446Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"69Yq68U5rRwJWbmGQtBUBGI659AozM4S"}}
```

</details>

#### API-CAMPOS-01 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` o corpo traz o código VALIDATION_ERROR e aponta o campo name | interpretado como: campo code e entrada de fields com o campo | observado code=VALIDATION_ERROR, fields=['name'] | passou
- `*` o banco não tem conta com o e-mail iris@example.com | interpretado como: count(*) em "user" | observado 0 | passou

<details>
<summary>Evidência</summary>

```
corpo enviado {"name": "   ", "email": "iris@example.com", "pw": "Segura123"} -> HTTP 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"name","message":"Informe o seu nome."}]}
```

</details>

#### API-CAMPOS-02 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` o corpo traz o código VALIDATION_ERROR e aponta o campo email | interpretado como: campo code e entrada de fields com o campo | observado code=VALIDATION_ERROR, fields=['email'] | passou
- `*` o banco não tem conta com o e-mail joana@ | interpretado como: count(*) em "user" | observado 0 | passou

<details>
<summary>Evidência</summary>

```
corpo enviado {"name": "Joana Luz", "email": "joana@", "pw": "Segura123"} -> HTTP 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"email","message":"Informe um e-mail válido."}]}
```

</details>

#### API-CAMPOS-03 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` o corpo traz o código VALIDATION_ERROR e aponta o campo password | interpretado como: campo code e entrada de fields com o campo | observado code=VALIDATION_ERROR, fields=['password'] | passou
- `*` o banco não tem conta com o e-mail kai@example.com | interpretado como: count(*) em "user" | observado 0 | passou

<details>
<summary>Evidência</summary>

```
corpo enviado {"name": "Kai Lopes", "email": "kai@example.com"} -> HTTP 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SIGILO-01 *
- Veredito: passou
- ✓ o corpo da resposta não contém Sigilo123x | esperado ausente, observado ausente
- `*` a credencial de senha da conta no banco não contém Sigilo123x | interpretado como: coluna password de account da conta | observado não contém (hash scrypt) | passou
- `*` nenhuma coluna da conta em user contém Sigilo123x | interpretado como: row_to_json da linha em "user" | observado ausente | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 {"token":null,"user":{"name":"Lia Matos","email":"lia@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:35.001Z","updatedAt":"2026-10-31T02:00:35.001Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"unqRrrYMpdsMzZEgFy2Hcm0WjjN8yIQR"}}
account.password: <mascarado>
user: [['{"id":"unqRrrYMpdsMzZEgFy2Hcm0WjjN8yIQR","name":"Lia Matos","email":"lia@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:35.001","updatedAt":"2026-10-31T02:00:35.001","role":"user","banned":false,"banReason":null,"banExpires":null}']]
```

</details>

#### API-SIGILO-02 *
- Veredito: passou
- `*` nenhuma linha de log do serviço api escrita durante o item contém Sigilo456y | interpretado como: docker compose logs api --since o início do item, busca do texto em cada linha | observado 0 linhas | passou
- `*` nenhuma dessas linhas contém Mauro Teles | interpretado como: docker compose logs api --since o início do item, busca do texto em cada linha | observado 0 linhas | passou
- `*` nenhuma dessas linhas contém mauro@example.com | interpretado como: docker compose logs api --since o início do item, busca do texto em cada linha | observado 0 linhas | passou
- `*` nenhuma dessas linhas contém o trecho token= | interpretado como: docker compose logs api --since o início do item, busca do texto em cada linha | observado 0 linhas | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 {"token":null,"user":{"name":"Mauro Teles","email":"mauro@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:37.014Z","updatedAt":"2026-10-31T02:00:37.014Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"YECv2zPMCmLZjHB3129udfK4E7VWfuXj"}}
1 linhas de log capturadas desde 1793412034 (10 s depois do cadastro, inclui o job do worker); amostra: {"level":30,"time":1793412039603,"pid":156,"hostname":"4abd3396c828","req":{"id":"c2d1efd9-c7c5-46a4-a1d4-52fceba9e535","method":"GET","url":"/api/health","headers":{"host":"localhost:3000","connection":"keep-alive","accept":"*/*","accept-language":"
```

</details>

#### API-SIGILO-03 *
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- `*` nenhuma linha de log do serviço api escrita durante o item contém Sigilo789z | interpretado como: docker compose logs api --since o início do item, busca do texto em cada linha | observado 0 linhas | passou
- `*` nenhuma dessas linhas contém ana@example.com | interpretado como: docker compose logs api --since o início do item, busca do texto em cada linha | observado 0 linhas | passou

<details>
<summary>Evidência</summary>

```
HTTP 422 {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
0 linhas de log desde 1793412050
```

</details>

#### API-LIMITE-01 *
- Veredito: passou
- ✓ as cinco primeiras respostas são 200 | esperado [200]*5, observado [200, 200, 200, 200, 200]
- ✓ a sexta resposta é 429 | esperado 429, observado 429
- ✓ a sexta resposta traz o cabeçalho X-Retry-After | esperado presente, observado ['60']
- `*` o banco não tem conta com o e-mail limite6@example.com | interpretado como: count(*) em "user" | observado 0 | passou

<details>
<summary>Evidência</summary>

```
#1 limite1@example.com -> HTTP 200 0.085s {"token":null,"user":{"name":"Teste Limite","email":"limite1@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:57.931Z","u
#2 limite2@example.com -> HTTP 200 0.076s {"token":null,"user":{"name":"Teste Limite","email":"limite2@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:58.008Z","u
#3 limite3@example.com -> HTTP 200 0.085s {"token":null,"user":{"name":"Teste Limite","email":"limite3@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:58.092Z","u
#4 limite4@example.com -> HTTP 200 0.087s {"token":null,"user":{"name":"Teste Limite","email":"limite4@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:58.178Z","u
#5 limite5@example.com -> HTTP 200 0.076s {"token":null,"user":{"name":"Teste Limite","email":"limite5@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:58.256Z","u
#6 limite6@example.com -> HTTP 429 0.003s {"message":"Too many requests. Please try again later."} X-Retry-After={'x-retry-after': '60'}
```

</details>

#### API-LIMITE-02 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o banco tem uma conta com o e-mail limite7@example.com | interpretado como: count(*) em "user" igual a 1 | observado 1 | passou

<details>
<summary>Evidência</summary>

```
Dado: rate-limit:203.0.113.50|/sign-up/email = 6, ttl 59s (limite atingido no item anterior)
HTTP 200 {"token":null,"user":{"name":"Teste Limite","email":"limite7@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:00:58.915Z","updatedAt":"2026-10-31T02:00:58.915Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"z8Ab09HcS5SCKBpODpB1zaHcwP9akKJd"}}
```

</details>

#### API-FALHA-01 *
- Veredito: passou
- `*` a resposta é 200 e chega em até 5 segundos | interpretado como: status 200 e tempo de resposta medido no cliente | observado 200 em 0.082 s | passou
- `*` o banco tem uma conta com o e-mail nina@example.com, papel user e e-mail não verificado | interpretado como: linha em "user" com email igual | observado [['user', 'f']] | passou
- `*` o serviço api continua respondendo GET /api/health | interpretado como: a rota responde HTTP (200 ou 503 com o valkey fora), sem erro de transporte | observado HTTP 503 {"status":"error","checks":{"postgres":"up","valkey":"down"}} | passou

<details>
<summary>Evidência</summary>

```
docker compose stop valkey -> 0
docker compose ps valkey: exited
POST sign-up -> HTTP 200 em 0.082s {"token":null,"user":{"name":"Nina Alves","email":"nina@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T02:01:23.982Z","updatedAt":"2026-10-31T02:01:23.982Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"KU7G9vo2fxZxyEkukFdtMnUxYNuGrZM5"}}
user: [['user', 'f']]
GET /api/health -> HTTP 503 {"status":"error","checks":{"postgres":"up","valkey":"down"}} em 1.505s
logs do item (sem health): {"level":50,"time":1793412083911,"pid":156,"hostname":"4abd3396c828","context":"BetterAuth","msg":"Rate limit liberado com o Valkey indisponível: conexão em connecting"}
{"level":50,"time":1793412083989,"pid":156,"hostname":"4abd3396c828","context":"BetterAuth","msg":"Failed to run background task: Error"}
docker compose up -d --wait valkey -> 0
depois de religar: {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
```

</details>

### Worker

#### WRK-EMAIL-01 *
- Veredito: passou
- `*` em até 2 minutos a caixa tem exatamente uma mensagem para otto@example.com | interpretado como: lista do Mailpit filtrada pelo destinatário, consultada a cada 2 s | observado 1 mensagem(ns), primeira em 2.0 s | passou
- `*` o remetente da mensagem é o SMTP_FROM do .env | interpretado como: endereço From da mensagem igual a SMTP_FROM do .env | observado no-reply@localhost | passou
- `*` o assunto é "Confirme seu e-mail" | interpretado como: campo Subject | observado Confirme seu e-mail | passou

<details>
<summary>Evidência</summary>

```
sign-up -> HTTP 200
mailpit /api/v1/messages: [{"To": ["otto@example.com"], "From": {"Name": "", "Address": "no-reply@localhost"}, "Subject": "Confirme seu e-mail"}] (primeira em 2.0s)
```

</details>

#### WRK-EMAIL-02 *
- Veredito: passou
- `*` a mensagem para paula@example.com tem um link que começa com o WEB_ORIGIN do .env seguido de /confirmar-email?token= e um token não vazio | interpretado como: busca do prefixo no texto e no HTML da mensagem | observado 3 ocorrência(s), token com 149 caracteres | passou
- `*` o corpo diz "O link vale por 24 horas." | interpretado como: busca literal no corpo em texto (e no HTML) | observado presente no texto e no HTML | passou
- `*` o corpo cumprimenta pelo nome Paula Dias | interpretado como: linha do texto com o nome, e o nome também no HTML | observado ['Olá, Paula Dias!'] | passou
- `*` o corpo está em português do Brasil, no texto e no HTML | interpretado como: leitura do texto e do HTML da mensagem e atributo lang do <html> | observado texto e HTML em português ("Olá, Paula Dias!", "confirme o seu e-mail", "O link vale por 24 horas."); <html lang="pt-BR"> | passou

<details>
<summary>Evidência</summary>

```
sign-up -> HTTP 200
Text:
Olá, Paula Dias!

Recebemos o seu cadastro. Para ativar a conta, confirme o seu e-mail abrindo o link abaixo:

http://localhost:5173/confirmar-email?token=<mascarado>

O link vale por 24 horas.

Se você não criou esta conta, ignore esta mensagem.
HTML (trecho): <!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>Confirme seu e-mail</title>
  </head>
  <body style="font-family: Helvetica, Arial, sans-serif; color: #000000;">
    <p>Olá, Paula Dias!</p>
    <p>Recebemos o seu cadastro. Para ativar a conta, confirme o seu e-mail:</p>
    <p><a href="http://localhost:5173/confirmar-email?token=<mascarado>">Confirmar e-mail</a></p>
    <p>Se o botão não abrir, copie este endereço no navegador:<br>http://localhost:5173/confirmar-email?token=<mascarado>
    <p>O link vale por 24 horas.</p>
    <p>Se você não criou esta conta, ignore esta mensagem.</p>
  </body>
</html>

```

</details>

#### WRK-EMAIL-03 *
- Veredito: passou
- `*` o corpo em texto da mensagem para quim@example.com não contém Sigilo321w | interpretado como: busca literal no campo Text | observado ausente (texto com 391 caracteres) | passou
- `*` o corpo em HTML não contém Sigilo321w | interpretado como: busca literal no campo HTML | observado ausente | passou
- `*` nenhum cabeçalho da mensagem contém Sigilo321w | interpretado como: busca em /api/v1/message/<id>/headers | observado ausente | passou

<details>
<summary>Evidência</summary>

```
sign-up -> HTTP 200
mensagem 4Wvldii2bts0LmLXj8BNps; cabeçalhos: Content-Type, Date, From, Message-Id, Mime-Version, Received, Return-Path, Subject, To
```

</details>

#### WRK-EMAIL-04 *
- Veredito: passou
- `*` a fila email.send tem um job verify-email com o id da conta de rui@example.com | interpretado como: hashes bull:email.send:<id> no Valkey (db 3) com name verify-email e data.userId igual ao id da conta | observado 1 job(s): [('bull:email.send:22', 'completed')] | passou
- `*` os dados desse job não contêm Sigilo654v | interpretado como: busca literal no campo data do job | observado ausente | passou
- `*` os dados desse job não contêm rui@example.com nem Rui Campos | interpretado como: busca literal no campo data do job | observado rui@example.com ausente, Rui Campos ausente (em texto; o token do link carrega o e-mail em base64url) | passou

<details>
<summary>Evidência</summary>

```
sign-up -> HTTP 200
id da conta Vj1WW6z6l2SVtCu6jTSA6hzfvslnRgfj; jobs: [{"key": "bull:email.send:22", "name": "verify-email", "state": "completed", "data": "{\"type\":\"verify-email\",\"userId\":\"Vj1WW6z6l2SVtCu6jTSA6hzfvslnRgfj\",\"url\":\"http://localhost:5173/confirmar-email?token=<mascarado>\"}"}]
payload do token do link, decodificado de base64url: {"email":"<e-mail da conta>","iat":1793412160,"exp":1793498560}
```

</details>

#### WRK-EMAIL-05 *
- Veredito: passou
- `*` depois de 1 minuto a caixa não tem mensagem para ana@example.com | interpretado como: lista do Mailpit 61 s depois do pedido, filtrada pelo destinatário | observado 0 | passou

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
caixa esvaziada depois do cadastro da conta-pendente-ana: 0
sign-up -> HTTP 422 {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
61 s depois: 0 mensagem(ns) na caixa: []
```

</details>

#### WRK-RETRY-01 *
- Veredito: passou
- `*` em até 2 minutos depois de o mailpit voltar, a caixa tem uma mensagem para sara@example.com | interpretado como: Mailpit consultado a cada 2 s depois do up --wait | observado 1 mensagem(ns) em 2.0 s | passou
- `*` o job verify-email dessa conta fica concluído com mais de uma tentativa registrada | interpretado como: presença no zset completed e campo atm (attemptsMade) do hash do job | observado [('completed', '2', '2')] | passou

<details>
<summary>Evidência</summary>

```
docker compose stop mailpit -> 0
sign-up -> HTTP 200
mailpit religado 21.7 s depois do cadastro -> 0
mensagens para sara@example.com: 1, 2.0 s depois de o mailpit voltar
job bull:email.send:24: estado completed, atm 2, ats 2, returnvalue "sent"; failedReason da primeira tentativa: Connection timeout (nodemailer)
```

</details>

#### WRK-RETRY-02 *
- Veredito: passou
- `*` em até 3 minutos o job verify-email dessa conta fica no estado falho | interpretado como: zset failed da fila, consultado a cada 3 s | observado failed em 121.6 s | passou
- `*` o job registra 5 tentativas | interpretado como: campo atm (attemptsMade) do hash do job | observado 5 | passou
- `*` a conta de tais@example.com continua no banco, pendente | interpretado como: linha em "user" com emailVerified falso | observado [['user', 'f']] | passou

<details>
<summary>Evidência</summary>

```
docker compose stop mailpit -> 0
sign-up -> HTTP 200
job: [{"ats": "5", "failedReason": "connect EHOSTUNREACH 172.18.0.5:1025", "atm": "5", "_state": "failed", "_key": "bull:email.send:25"}]; falho em 121.6 s
user: [['user', 'f']]
mailpit religado -> 0
```

</details>

### UI

#### UI-CADASTRO-01 *
- Veredito: passou
- `*` a tela mostra que o link de confirmação foi enviado para ugo@example.com | interpretado como: texto visível menciona o envio do link e o endereço | observado Enviamos um link de confirmação para ugo@example.com. Confirme o e-mail antes de entrar. | passou
- `*` a tela diz que é preciso confirmar o e-mail antes de entrar | interpretado como: texto visível com "confirm..." e "entrar" | observado Confirme seu e-mail / Enviamos um link de confirmação para ugo@example.com. Confirme o e-mail antes de entrar. | passou
- ✓ o botão "Reenviar o link" está visível | esperado visível, observado visível
- `*` o formulário de cadastro não está mais visível | interpretado como: ausência do campo Nome e do formulário de cadastro | observado campo Nome: ausente; forms visíveis: 1 | passou
- ✓ base visual (mecânica) após envio | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
texto visível após envio:
App
Entrar
Criar conta
Confirme seu e-mail

Enviamos um link de confirmação para ugo@example.com. Confirme o e-mail antes de entrar.

Reenviar o link
requisições de cadastro: 1; POST http://localhost:3000/api/auth/sign-up/email -> 200
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-CADASTRO-01-envio.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-REENVIO-01 *
- Veredito: passou
- ✓ base visual (mecânica) após tela-de-link-enviado | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0
- `*` a página envia POST /api/auth/send-verification-email com o e-mail vera@example.com | interpretado como: registro de rede do clique; campo email do corpo JSON | observado POST corpo {"email":"vera@example.com"} | passou
- ✓ essa requisição recebe 200 | esperado 200, observado 200
- `*` a tela informa que um novo link foi enviado | interpretado como: texto visível com "novo link" | observado Reenviar o link / Enviamos um novo link para vera@example.com. | passou
- ✓ base visual (mecânica) após reenvio | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
Dado: tela após cadastro: App
Entrar
Criar conta
Confirme seu e-mail

Enviamos um link de confirmação para vera@example.com. Confirme o e-mail antes de entrar.

Reenviar o link
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-REENVIO-01-tela-de-link-enviado.png
requisições após o clique: POST http://localhost:3000/api/auth/send-verification-email; corpo: {"email":"vera@example.com"}; resposta: 200 {"status":true}
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-REENVIO-01-reenvio.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-DUPLICADO-01 *
- Veredito: passou
- `*` a tela diz que o e-mail já tem conta | interpretado como: texto visível com "já tem conta" | observado Este e-mail já tem conta. Entre ou recupere a senha. | passou
- `*` a tela tem um link para /entrar | interpretado como: elemento a com href igual, em qualquer lugar da tela | observado Entrar (nav), Entrar | passou
- `*` a tela tem um link para /recuperar-senha | interpretado como: elemento a com href igual, em qualquer lugar da tela | observado Recuperar a senha | passou
- `*` o formulário continua visível com o nome e o e-mail preenchidos | interpretado como: campos visíveis com os valores digitados (e-mail comparado sem caixa) | observado visível=true, Nome=Outra Ana, E-mail=ANA@example.com | passou
- ✓ base visual (mecânica) após envio | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: [['Ana Souza', 'user', 'f']]
texto visível:
App
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
cadastro -> 422 {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-DUPLICADO-01-envio.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-SENHA-01 *
- Veredito: passou
- `*` abaixo do campo de senha aparece "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | interpretado como: elemento do aria-describedby do campo Senha, abaixo dele, com o texto | observado [{"text":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.","below":true,"id":"cadastro-password-erro"}] | passou
- ✓ a página não envia requisição a /api/auth/sign-up/email | esperado 0 requisições, observado 0
- `*` o formulário continua visível | interpretado como: campo Nome do formulário visível | observado visível | passou
- ✓ base visual (mecânica) após envio | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
mensagens do campo Senha: [{"text":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.","below":true,"id":"cadastro-password-erro"}]
texto visível: App
Entrar
Criar conta
Crie sua conta
Nome
E-mail
Senha

A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.

Criar conta
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-SENHA-01-envio.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-CAMPOS-01 *
- Veredito: passou
- `*` abaixo do campo de nome aparece a mensagem de campo obrigatório | interpretado como: elemento descrito pelo campo Nome, abaixo dele, pedindo o nome (obrigatório ou "Informe") | observado [{"text":"Informe o seu nome.","below":true,"id":"cadastro-name-erro"}] | passou
- `*` o foco fica no campo de nome | interpretado como: document.activeElement e o rótulo dele | observado Nome | passou
- ✓ a página não envia requisição a /api/auth/sign-up/email | esperado 0 requisições, observado 0
- ✓ base visual (mecânica) após envio | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
mensagens do campo Nome: [{"text":"Informe o seu nome.","below":true,"id":"cadastro-name-erro"}]
validationMessage nativa do campo Nome: ""
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-CAMPOS-01-envio.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-CAMPOS-02 *
- Veredito: passou
- `*` abaixo do campo de e-mail aparece a mensagem de e-mail inválido | interpretado como: elemento descrito pelo campo E-mail, abaixo dele, falando de e-mail válido ou inválido | observado [{"text":"Informe um e-mail válido.","below":true,"id":"cadastro-email-erro"}] | passou
- ✓ a página não envia requisição a /api/auth/sign-up/email | esperado 0 requisições, observado 0
- ✓ base visual (mecânica) após envio | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
mensagens do campo E-mail: [{"text":"Informe um e-mail válido.","below":true,"id":"cadastro-email-erro"}]
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-CAMPOS-02-envio.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-SIGILO-01 *
- Veredito: passou
- `*` o campo de senha é do tipo senha, com o valor mascarado | interpretado como: atributo type do campo Senha (o navegador mascara campos password) | observado type=password | passou
- `*` o texto visível da página não contém Oculta123 | interpretado como: innerText do body depois do envio | observado ausente | passou
- ✓ a URL não contém Oculta123 | esperado ausente, observado http://localhost:5173/cadastro
- `*` a requisição de cadastro leva a senha no corpo, nunca na URL | interpretado como: registro de rede: corpo e URL de todas as requisições | observado corpo com a senha: true; URLs com a senha: 0 | passou
- ✓ base visual (mecânica) após envio | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
type do campo Senha depois do envio: password
cadastro: POST http://localhost:3000/api/auth/sign-up/email -> 422; corpo traz a senha: true
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-SIGILO-01-envio.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-LAYOUT-01 *
- Veredito: passou
- `*` o topo da página tem a barra de navegação com o nome do app como link para / | interpretado como: primeiro nav/header da página, top da caixa e link com href / e texto não vazio | observado {"top":0,"home":[{"t":"App","href":"/"}]} | passou
- ✓ a barra tem o link "Criar conta" para /cadastro | esperado Criar conta -> /cadastro, observado [{"t":"Criar conta","href":"/cadastro"}]
- ✓ a barra tem o link "Entrar" para /entrar | esperado Entrar -> /entrar, observado [{"t":"Entrar","href":"/entrar"}]
- `*` a página continua mostrando, em português do Brasil, que não há sessão aberta | interpretado como: texto visível em português sobre a ausência de sessão | observado Entrar / Criar conta / Nenhuma sessão aberta. / Ainda não tem conta? Cadastre-se. | passou
- ✓ base visual (mecânica) após raiz | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
barra: {"top":0,"links":[{"t":"App","href":"/"},{"t":"Entrar","href":"/entrar"},{"t":"Criar conta","href":"/cadastro"}]}
texto visível: App
Entrar
Criar conta
App

Nenhuma sessão aberta.

Ainda não tem conta? Cadastre-se.
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-LAYOUT-01-raiz.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-LAYOUT-02 *
- Veredito: passou
- ✓ a URL passa a /cadastro | esperado /cadastro, observado /cadastro
- `*` o formulário de cadastro está visível | interpretado como: campo Nome do formulário visível | observado visível | passou
- `*` a barra de navegação continua no topo da página | interpretado como: caixa do nav no topo da janela | observado top=0 | passou
- ✓ base visual (mecânica) após clique-criar-conta | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
Dado: raiz aberta no item anterior, navegador sem cookie
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-LAYOUT-02-clique-criar-conta.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-LAYOUT-03 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que a página não foi encontrada | interpretado como: texto visível com "não ... encontrada" | observado Página não encontrada | passou
- `*` o font-family computado do texto da página começa com "Inter Variable" | interpretado como: font-family computado do body e do primeiro elemento de texto | observado {"body":"\"Inter Variable\", system-ui, \"Helvetica Neue\", Arial, sans-serif","el":"\"Inter Variable\", system-ui, \"Helvetica Neue\", Arial, sans-serif","tag":"H1"} | passou
- ✓ base visual (mecânica) após nao-existe | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
texto visível: App
Entrar
Criar conta
Página não encontrada

O endereço que você abriu não existe neste aplicativo.

Voltar ao início
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-LAYOUT-03-nao-existe.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-VISUAL-01 *
- Veredito: passou
- ✓ o botão "Criar conta" do formulário tem fundo computado rgb(0, 0, 0) e cor rgb(255, 255, 255) | esperado bg rgb(0, 0, 0), color rgb(255, 255, 255), observado bg rgb(0, 0, 0), color rgb(255, 255, 255)
- ✓ esse botão tem border-radius computado de 999px | esperado 999px, observado 999px
- `*` o rótulo desse botão tem font-size de 16px e font-weight 500 | interpretado como: estilo computado do texto do botão | observado 16px, 500 | passou
- `*` esse botão tem pelo menos 44px de altura | interpretado como: altura da caixa do botão | observado 44px | passou
- ✓ base visual (mecânica) após cadastro | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
estilo computado do botão: {"bg":"rgb(0, 0, 0)","color":"rgb(255, 255, 255)","radius":"999px","fs":"16px","fw":"500","h":44}
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-VISUAL-01-cadastro.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-VISUAL-02 *
- Veredito: passou
- `*` a fonte "Inter Variable" consta como carregada nas fontes do documento | interpretado como: document.fonts com status loaded | observado ["Inter Variable 100 900"] | passou
- ✓ o font-family computado do body começa com "Inter Variable" | esperado começa com "Inter Variable", observado "Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif
- ✓ o título "Crie sua conta" tem font-weight 700, font-size de 32px e letter-spacing normal | esperado 700, 32px, normal, observado {"fw":"700","fs":"32px","ls":"normal"}
- `*` toda requisição de arquivo de fonte vai à origem da SPA | interpretado como: registro de rede de recursos de fonte | observado 1 requisição(ões), 0 fora da origem | passou

<details>
<summary>Evidência</summary>

```
document.fonts carregadas: ["Inter Variable 100 900"]
requisições de fonte: ["http://localhost:5173/@fs/app/node_modules/.pnpm/@fontsource-variable+inter@5.3.0/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"]
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-VISUAL-03 *
- Veredito: passou
- `*` o card do formulário tem fundo computado rgb(255, 255, 255), border-radius de 16px e box-shadow none | interpretado como: primeiro ancestral do form com fundo não transparente, tomado como o card | observado bg rgb(255, 255, 255), 16px, none | passou
- `*` o card tem no máximo 490px de largura | interpretado como: largura da caixa do card a 1280px | observado 490px | passou
- ✓ os campos de nome, e-mail e senha têm fundo computado rgb(239, 239, 239) e border-radius de 8px | esperado cada campo bg rgb(239, 239, 239), 8px, observado name: rgb(239, 239, 239), 8px; email: rgb(239, 239, 239), 8px; password: rgb(239, 239, 239), 8px
- `*` cada campo tem um rótulo visível associado a ele | interpretado como: label com for igual ao id do campo, com caixa visível | observado name: Nome (visível); email: E-mail (visível); password: Senha (visível) | passou

<details>
<summary>Evidência</summary>

```
{"card":{"tag":"DIV","cls":"card-content mx-auto w-full max-w-[490px]","bg":"rgb(255, 255, 255)","radius":"16px","shadow":"none","w":490},"fields":[{"name":"name","bg":"rgb(239, 239, 239)","radius":"8px","label":"Nome","labelVisible":true},{"name":"email","bg":"rgb(239, 239, 239)","radius":"8px","label":"E-mail","labelVisible":true},{"name":"password","bg":"rgb(239, 239, 239)","radius":"8px","label":"Senha","labelVisible":true}]}
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-VISUAL-04 *
- Veredito: passou
- ✓ o campo de e-mail tem aria-invalid igual a true | esperado true, observado true
- `*` o aria-describedby do campo de e-mail aponta para o elemento com a mensagem de e-mail inválido | interpretado como: elemento do id em aria-describedby existe e tem a mensagem sobre e-mail | observado cadastro-email-erro -> "Informe um e-mail válido." | passou
- `*` o campo de e-mail tem borda computada de 2px na cor rgb(0, 0, 0) | interpretado como: border-width e border-color computados nos quatro lados | observado 2px 2px 2px 2px; rgb(0, 0, 0) rgb(0, 0, 0) rgb(0, 0, 0) rgb(0, 0, 0); solid | passou
- `*` a mensagem tem cor computada rgb(0, 0, 0) e um ícone antes do texto | interpretado como: cor do elemento da mensagem e primeiro filho (svg) ou ::before antes do texto | observado color rgb(0, 0, 0); ícone {"tag":"svg","isFirst":true,"ariaHidden":"true"} | passou
- ✓ base visual (mecânica) após envio | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
{"inv":"true","desc":"cadastro-email-erro","dtext":"Informe um e-mail válido.","dcolor":"rgb(0, 0, 0)","bw":"2px 2px 2px 2px","bc":"rgb(0, 0, 0) rgb(0, 0, 0) rgb(0, 0, 0) rgb(0, 0, 0)","bs":"solid","icon":{"tag":"svg","isFirst":true,"ariaHidden":"true"}}
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-VISUAL-04-envio.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-VISUAL-05 *
- Veredito: passou
- `*` a largura de rolagem do documento não passa de 375px | interpretado como: documentElement.scrollWidth | observado 375 | passou
- `*` o card do formulário fica a 16px de cada borda da janela | interpretado como: distância da caixa do card às bordas laterais da janela | observado esquerda 16px, direita 16px | passou
- `*` os links "Entrar" e "Criar conta" da barra de navegação estão visíveis | interpretado como: caixa dos links dentro da janela | observado Entrar visível, Criar conta visível | passou
- ✓ base visual (mecânica) após cadastro-375 | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
{"sw":375,"vw":375,"left":16,"right":16,"entrar":"visível","criar":"visível"}
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-VISUAL-05-cadastro-375.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

#### UI-VISUAL-06 *
- Veredito: passou
- `*` o aviso de e-mail já cadastrado aparece acima do formulário com role igual a alert | interpretado como: elemento [role=alert] com o aviso e caixa acima da caixa do form | observado {"text":"Este e-mail já tem conta. Entre ou recupere a senha.\n\nEntrar\nRecuperar a senha","above":true,"alertBottom":352,"formTop":376} | passou
- ✓ o aviso tem fundo computado rgb(239, 239, 239) e border-radius de 16px | esperado rgb(239, 239, 239), 16px, observado rgb(239, 239, 239), 16px
- `*` nenhum elemento visível da página tem cor de texto, fundo ou borda fora da paleta do DESIGN.md, sem contar o transparente | interpretado como: color, background-color e border-color computados de todo elemento visível, contra as 10 cores do front-matter do DESIGN.md; alfa 0 ignorado | observado nenhuma fora da paleta | passou
- ✓ base visual (mecânica) após envio | esperado imagens carregadas; elementos dentro da janela, sem corte por overflow e recebendo o clique no centro, observado imagens 0 (quebradas 0); fora da janela 0; cortados 0; cobertos 0

<details>
<summary>Evidência</summary>

```
{"alert":{"text":"Este e-mail já tem conta. Entre ou recupere a senha.\n\nEntrar\nRecuperar a senha","bg":"rgb(239, 239, 239)","radius":"16px","above":true,"formTop":376,"alertBottom":352},"offenders":[]}
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/UI-VISUAL-06-envio.png
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

### E2E

#### E2E-CADASTRO-01 *
- Veredito: passou
- ✓ base visual (mecânica) após envio | esperado imagens carregadas; elementos dentro da janela e recebendo o clique no centro, observado imagens 0; problemas 0
- `*` a tela mostra que o link de confirmação foi enviado para zelia@example.com | interpretado como: texto visível menciona o envio do link e o endereço | observado Enviamos um link de confirmação para zelia@example.com. Confirme o e-mail antes de entrar. | passou
- `*` em até 2 minutos a caixa tem uma mensagem para zelia@example.com com um link para /confirmar-email?token= | interpretado como: Mailpit consultado a cada 2 s; busca de /confirmar-email?token= seguido de token no texto e no HTML | observado 1 mensagem(ns) em 0 s; link presente | passou
- `*` o banco tem a conta de zelia@example.com com papel user e e-mail não verificado | interpretado como: linha em "user" com email igual | observado [['user', 'f']] | passou
- `*` nem a mensagem nem as linhas de log do serviço api escritas durante a jornada contêm Jornada123 | interpretado como: busca literal no JSON da mensagem e dos cabeçalhos do Mailpit e em cada linha do docker compose logs api desde o início | observado mensagem (corpo e cabeçalhos): ausente; logs: 0 linha(s) | passou
- `*` nenhuma dessas linhas de log contém Zélia Dias ou zelia@example.com | interpretado como: busca literal em cada linha de log | observado Zélia Dias: 0; zelia@example.com: 0 | passou

<details>
<summary>Evidência</summary>

```
Dado: contas não admin apagadas, contadores de rate limit limpos, caixa do Mailpit vazia (0 mensagens); início dos logs 1793412883
texto visível: App
Entrar
Criar conta
Confirme seu e-mail

Enviamos um link de confirmação para zelia@example.com. Confirme o e-mail antes de entrar.

Reenviar o link
screenshot: /tmp/evaluator-rf001-2026-10-31T01-55-37Z/shots/E2E-CADASTRO-01-envio.png
Mailpit: {"n":1,"el":0,"link":true,"pw":false,"subject":"Confirme seu e-mail"}
user: [['user', 'f']]
2 linhas de log da api desde 1793412883; fora do health: {"level":30,"time":1793412886153,"pid":156,"hostname":"4abd3396c828","req":{"id":"29a6b489-79ea-4350-9911-b334744e2b1b","method":"GET","url":"/api/v1/session","headers":{"host":"localhost:3000","conne
screenshot revisado (passada por screenshot): sem corte, sobreposição ou render quebrado no escopo do item
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `compose.yaml`: o serviço api instala nos volumes ao subir; `scripts/db-setup.sh` garante as dependências |
| Ambiente e serviços | 1 e 2 | contrato (Docker Compose) e `compose.yaml`: o ambiente local já no ar, com a api recriada por um arquivo de override do Compose na pasta temporária |
| Banco efêmero e migração | 5 | `scripts/db-setup.sh`: banco `eval_rf001_2026_10_31t01_55_37z` no postgres do Compose, `DATABASE_URL` da api trocada pelo override (`COMPOSE_FILE`), `make db-setup` migra e cria o admin |
| Isolamento do Valkey | 6 | `REDIS_URL=redis://valkey:6379/3` no override: rate limit e fila `email.send` no banco lógico 3, vazio antes da avaliação |
| Estado persistido | 1 | contrato: `conta-pendente-ana` "criada pelo cadastro", por POST /api/auth/sign-up/email |
| Limpeza entre itens | 6 | DELETE das contas sem papel admin no banco efêmero, apagar `rate-limit:*` no Valkey e DELETE /api/v1/messages no Mailpit |
| Gates | 1 | contrato: `make check` e `make build` na raiz |
| Cliente HTTP | 6 | `urllib` do Python, com o X-Forwarded-For do contrato |
| Logs da api | 1 e 3 | contrato e spec, Verificação por superfície: `docker compose logs api --since <início do item>` |
| Fila | 3 | spec, Verificação por superfície: hashes `bull:email.send:<id>` e zsets `completed` e `failed` lidos com `valkey-cli` |
| Caixa de e-mail | 3 | spec, Verificação por superfície (ADR-0016): API REST do Mailpit |
| Navegador | 3 | spec, Verificação por superfície (ADR-0024): Chromium headless pelo `playwright-core` do `@playwright/cli` 0.1.22 no cache do npx, dirigido por script Node |
| Base visual | 6 | `evaluate` no navegador (imagens, caixas na janela, corte por `overflow`, `elementFromPoint`) e screenshot por item |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_rf001_*` e nenhuma pasta `evaluator-rf001-*` no início.
- Derrubada: completa. Nenhum PID no `processos.lock` (os navegadores fecharam com cada script); api recriada sem o override, de volta a `DATABASE_URL` do banco `app` e ao Valkey no banco 0, saudável; banco `eval_rf001_2026_10_31t01_55_37z` apagado; banco lógico 3 do Valkey esvaziado; pasta `/tmp/evaluator-rf001-2026-10-31T01-55-37Z` apagada, com os screenshots.

## Avisos

- Avaliado com 3 arquivos fora de commit: `.claude/skills/evaluator/SKILL.md`, `.claude/skills/fix-runner/SKILL.md` e `docs/features/RF-001-criar-conta/orquestracao.md`, nenhum deles código avaliado.
- O gate `make build` no host recompila `apps/api/dist`, que o serviço api do Compose usa pelo bind mount: a app em watch caiu com `ERR_MODULE_NOT_FOUND` em `dist/app.module.js` e ficou esperando mudança de arquivo, enquanto o healthcheck do container seguia saudável. A api foi reiniciada antes dos itens; é interação entre o gate e o ambiente de desenvolvimento, não item do contrato.
- API-DUPLICADO-03: a requisição perdedora recebeu 422 com `code` `FAILED_TO_CREATE_USER`, não `USER_ALREADY_EXISTS`; o item pede só o 422.
- WRK-EMAIL-04: os dados do job não trazem o e-mail em texto, mas o token da URL do link é um JWT cujo payload carrega o e-mail em base64url; o item confere a busca literal e passa.
- API-FALHA-01: com o Valkey parado, a api registrou, além do aviso do rate limit liberado, a linha `Failed to run background task: Error` do Better Auth, sem dado pessoal.
- As requisições de cadastro não geram linha no log da api no nível info; os itens de log (API-SIGILO-02, API-SIGILO-03, E2E-CADASTRO-01) passam pela ausência dos valores nas linhas capturadas.
- Os itens usam o Valkey e o Mailpit compartilhados do ambiente de desenvolvimento: a caixa do Mailpit, que tinha 2 mensagens antes, foi esvaziada como o contrato pede, e os dois serviços foram parados e religados nos itens de falha.
- `make check` avisa que os diagramas C4 de `template-web.md` foram gerados do HLD 0.2.5 (o atual é 0.2.6) e que `docs/features/fundacao/spec.md` foi escrita sobre o HLD 0.2.5 e cita o componente 'API NestJS' ausente do HLD.

## Motivo do aborto

Nenhum.
