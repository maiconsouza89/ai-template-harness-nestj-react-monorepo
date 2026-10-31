# Avaliação: RF-001 Criar conta

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-10-31T04-04-02Z
- Branch: feat/rf-001-criar-conta
- Commit: 2aa0cbc
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

- ✓ check: `make check`, código 0 (com `TURBO_FORCE=true`: 5 tarefas sem cache; 64 testes unitários e 43 de integração da API, 18 de Contratos e 14 da SPA passaram)
- ✓ build: `make build`, código 0 (com `TURBO_FORCE=true`: 4 tarefas, nenhuma do cache)

## Pré-requisitos

### Serviços em execução
- ✓ api (com o worker do Módulo E-mail): http://localhost:3000, saúde /api/health respondeu 200 `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`, recriada apontando para o banco efêmero `eval_rf001_2026_10_31t04_04_02z` e para o Valkey no banco lógico 3
- ✓ web: http://localhost:5173/ respondeu 200
- ✓ postgres: `pg_isready` aceitando conexões no Compose (PostgreSQL 18)
- ✓ valkey: `valkey-cli ping` respondeu PONG no Compose (Valkey 9)
- ✓ mailpit: http://localhost:8025/api/v1/info respondeu, versão v1.32.0

### Estado persistido
- ✓ `conta-pendente-ana`: criado pelo cadastro (POST /api/auth/sign-up/email com Ana Souza, ana@example.com, Segura123 e um X-Forwarded-For próprio) em cada item que o usa; conferido: name Ana Souza, role user, emailVerified falso, banned falso, uma credencial com providerId credential
- ✓ `janela-de-cadastro-livre`: chaves `rate-limit:*` apagadas no banco lógico 3 do Valkey antes de cada item (e de novo depois de criar `conta-pendente-ana` nos itens de UI); conferido: `exists rate-limit:203.0.113.50|/sign-up/email` igual a 0 antes de API-LIMITE-01

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env` copiado do `.env.example`: mesmos valores (difere só em comentários), NODE_ENV=development e TRUSTED_PROXIES vazia em vigor no container da api (o contrato pede development e vazia); `make db-setup` aplicado ao banco efêmero (migrações e primeiro admin)
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
- `*` a resposta não define cookie de sessão | interpretado como: ausência de cabeçalho Set-Cookie | observado nenhum Set-Cookie | passou

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-up/email XFF 203.0.113.11 -> HTTP 200 {"token":null,"user":{"name":"Bia Lima","email":"bia@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T04:07:33.144Z","updatedAt":"2026-10-31T04:07:33.144Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"a9CioHqBXQg4d0AANnmHQH708CVYrDHN"}}
headers: {"X-Powered-By": "Express", "Access-Control-Allow-Origin": "http://localhost:5173", "Vary": "Origin", "Access-Control-Allow-Credentials": "true", "content-type": "application/json", "Date": "Sat, 31 Oct 2026 04:07:33 GMT", "Connection": "close", "Transfer-Encoding": "chunked"}
```

</details>

#### API-CADASTRO-02 *
- Veredito: passou
- `*` o banco tem exatamente uma conta com o e-mail caio@example.com | interpretado como: count(*) em "user" com email igual | observado 1 | passou
- `*` essa conta tem papel user, e-mail não verificado e não está banida | interpretado como: colunas role, emailVerified e banned da linha em "user" | observado [['user', 'f', 'f']] | passou
- `*` essa conta tem uma credencial de senha com providerId credential | interpretado como: linhas de account da conta (providerId, password não nula) | observado [['credential', 't']] | passou
- `*` nenhuma sessão existe para essa conta | interpretado como: count(*) em session da conta | observado 0 | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 {"token":null,"user":{"name":"Caio Rocha","email":"caio@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T04:07:33.824Z","updatedAt":"2026-10-31T04:07:33.824Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"WQFV9I41FWDCWVBDv4HERuBBIbHReSvA"}}
user: [['user', 'f', 'f']]
account: [['credential', 't']]
session: 0
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
HTTP 200 {"token":null,"user":{"name":"Dani Melo","email":"dani.melo@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T04:07:35.474Z","updatedAt":"2026-10-31T04:07:35.474Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"UfyK5p0nja7c2Ubr8Wr1eeDuvt6LqUQW"}}
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
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
HTTP 422 {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
```

</details>

#### API-DUPLICADO-02 *
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- `*` o corpo traz o código USER_ALREADY_EXISTS | interpretado como: campo code do corpo | observado USER_ALREADY_EXISTS | passou
- `*` o banco continua com exatamente uma conta cujo e-mail em minúsculas é ana@example.com | interpretado como: linhas em "user" com lower(email) igual | observado [['ana@example.com']] | passou

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
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
Davi Um: HTTP 200 {"token":null,"user":{"name":"Davi Um","email":"davi@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T04:07:38.778Z","updatedAt":"2026-10-31T04:07:38.778Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"492ZghelwBWBZB6GcrS3HHBY9dq0HGFT"}}
Davi Dois: HTTP 422 {"message":"Failed to create user","code":"FAILED_TO_CREATE_USER"}
```

</details>

#### API-SENHA-01 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` o corpo traz o código VALIDATION_ERROR | interpretado como: campo code do corpo | observado VALIDATION_ERROR | passou
- `*` o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | interpretado como: entrada de fields com field=password e a mensagem igual | observado ['A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.'] | passou
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
- `*` o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | interpretado como: entrada de fields com field=password e a mensagem igual | observado ['A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.'] | passou
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
- `*` o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | interpretado como: entrada de fields com field=password e a mensagem igual | observado ['A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.'] | passou
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
HTTP 200 {"token":null,"user":{"name":"Heitor Paz","email":"heitor@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T04:07:42.220Z","updatedAt":"2026-10-31T04:07:42.220Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"N2yKfVX9z2lndhiBNQv2NofkL1Ez4RIZ"}}
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
HTTP 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"name","message":"Informe o seu nome."}]}
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
HTTP 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"email","message":"Informe um e-mail válido."}]}
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
HTTP 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SIGILO-01 *
- Veredito: passou
- `*` o corpo da resposta não contém Sigilo123x | interpretado como: busca literal no corpo | observado ausente | passou
- `*` a credencial de senha da conta no banco não contém Sigilo123x | interpretado como: busca literal em account.password | observado ausente (hash de 161 caracteres) | passou
- `*` nenhuma coluna da conta em user contém Sigilo123x | interpretado como: busca literal em row_to_json da linha em "user" | observado ausente | passou

<details>
<summary>Evidência</summary>

```
HTTP 200 {"token":null,"user":{"name":"Lia Matos","email":"lia@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T04:07:45.767Z","updatedAt":"2026-10-31T04:07:45.767Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"3rakKjhRjPmXvwrpBTdvg71pc44b347e"}}
user: {"id":"3rakKjhRjPmXvwrpBTdvg71pc44b347e","name":"Lia Matos","email":"lia@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T04:07:45.767","updatedAt":"2026-10-31T04:07:45.767","role":"user","banned":false,"banReason":null,"banExpires":null}
```

</details>

#### API-SIGILO-02 *
- Veredito: passou
- `*` nenhuma linha de log do serviço api escrita durante o item contém Sigilo456y | interpretado como: busca literal nas 0 linhas de docker compose logs api desde o início do item, incluídos 4 s para a entrega do e-mail | observado 0 linha(s) | passou
- `*` nenhuma dessas linhas contém Mauro Teles | interpretado como: busca literal nas 0 linhas de docker compose logs api desde o início do item, incluídos 4 s para a entrega do e-mail | observado 0 linha(s) | passou
- `*` nenhuma dessas linhas contém mauro@example.com | interpretado como: busca literal nas 0 linhas de docker compose logs api desde o início do item, incluídos 4 s para a entrega do e-mail | observado 0 linha(s) | passou
- `*` nenhuma dessas linhas contém o trecho token= | interpretado como: busca literal nas 0 linhas de docker compose logs api desde o início do item, incluídos 4 s para a entrega do e-mail | observado 0 linha(s) | passou

<details>
<summary>Evidência</summary>

```
HTTP 200
linhas capturadas (0):
```

</details>

#### API-SIGILO-03 *
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- `*` nenhuma linha de log do serviço api escrita durante o item contém Sigilo789z | interpretado como: busca literal nas 0 linhas de docker compose logs api desde o envio | observado 0 linha(s) | passou
- `*` nenhuma dessas linhas contém ana@example.com | interpretado como: busca literal nas 0 linhas de docker compose logs api desde o envio | observado 0 linha(s) | passou

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
HTTP 422 {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
linhas capturadas (0):
```

</details>

#### API-LIMITE-01 *
- Veredito: passou
- ✓ as cinco primeiras respostas são 200 | esperado [200, 200, 200, 200, 200], observado [200, 200, 200, 200, 200]
- ✓ a sexta resposta é 429 | esperado 429, observado 429
- ✓ a sexta resposta traz o cabeçalho X-Retry-After | esperado presente, observado 59
- `*` o banco não tem conta com o e-mail limite6@example.com | interpretado como: count(*) em "user" | observado 0 | passou

<details>
<summary>Evidência</summary>

```
antes: exists rate-limit:203.0.113.50|/sign-up/email = 0
seis requisições em 0.6s: [200, 200, 200, 200, 200, 429]
sexta: HTTP 429 {"message":"Too many requests. Please try again later."} X-Retry-After=['59']
```

</details>

#### API-LIMITE-02 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o banco tem uma conta com o e-mail limite7@example.com | interpretado como: count(*) em "user" igual a 1 | observado 1 | passou

<details>
<summary>Evidência</summary>

```
conferência do Dado: sexta requisição de 203.0.113.50 -> HTTP 429
203.0.113.51 -> HTTP 200 {"token":null,"user":{"name":"Teste Limite","email":"limite7@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T04:08:01.376Z","updatedAt":"2026-10-31T04:08:01.376Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"b3zYUD4Zpt7V7xCoUBKxw4dDYIoZnmwY"}}
```

</details>

#### API-FALHA-01 *
- Veredito: passou
- `*` a resposta é 200 e chega em até 5 segundos | interpretado como: status e tempo da resposta medidos no cliente | observado 200 em 0.58s | passou
- `*` o banco tem uma conta com o e-mail nina@example.com, papel user e e-mail não verificado | interpretado como: linha em "user" com role e emailVerified | observado [['user', 'f']] | passou
- `*` o serviço api continua respondendo GET /api/health | interpretado como: GET /api/health devolve uma resposta HTTP (qualquer status), sem erro de transporte, com o Valkey parado | observado HTTP 503 {"status":"error","checks":{"postgres":"up","valkey":"down"}} | passou

<details>
<summary>Evidência</summary>

```
docker compose stop valkey: rc=0
cadastro: HTTP 200 em 0.58s {"token":null,"user":{"name":"Nina Alves","email":"nina@example.com","emailVerified":false,"image":null,"createdAt":"2026-10-31T04:08:03.386Z","updatedAt":"2026-10-31T04:08:03.386Z","role":"user","banned":false,"banReason":null,"banExpires":null,"id":"EsGkN9Am2uD3ETdruprPyXISAET6piU4"}}
health: HTTP 503 {"status":"error","checks":{"postgres":"up","valkey":"down"}}
docker compose up -d --wait valkey: rc=0; api saudável de novo: True
log da api (3 linhas):
{"level":50,"time":1793419683323,"pid":202,"hostname":"230ff702e313","context":"BetterAuth","msg":"Rate limit liberado com o Valkey indisponível: sem resposta em 500 ms"}
{"level":50,"time":1793419683392,"pid":202,"hostname":"230ff702e313","context":"BetterAuth","msg":"Failed to run background task: Error"}
{"level":30,"time":1793419685092,"pid":202,"hostname":"230ff702e313","req":{"id":"15d1031c-6bc0-4ef8-a230-a15cf26ec7a7","method":"GET","url":"/api/health","headers":{"accept-encoding":"identity","host":"localhost:3000","user-agent":"Python-urllib/3.1
```

</details>

### Worker

#### WRK-EMAIL-01 *
- Veredito: passou
- `*` em até 2 minutos a caixa tem exatamente uma mensagem para otto@example.com | interpretado como: mensagens da API REST do Mailpit com To igual, consultadas até 120 s e de novo 3 s depois | observado 1 mensagem(ns), primeira em 1.0s | passou
- `*` o remetente da mensagem é o SMTP_FROM do .env | interpretado como: From.Address da mensagem igual a SMTP_FROM (no-reply@localhost) | observado no-reply@localhost | passou
- ✓ o assunto é "Confirme seu e-mail" | esperado Confirme seu e-mail, observado Confirme seu e-mail

<details>
<summary>Evidência</summary>

```
caixa no início: 0 mensagem(ns)
cadastro HTTP 200
mensagem: {"From": {"Name": "", "Address": "no-reply@localhost"}, "To": [{"Name": "", "Address": "otto@example.com"}], "Subject": "Confirme seu e-mail"}
```

</details>

#### WRK-EMAIL-02 *
- Veredito: passou
- `*` a mensagem para paula@example.com tem um link que começa com o WEB_ORIGIN do .env seguido de /confirmar-email?token= e um token não vazio | interpretado como: links do texto e do HTML que começam com http://localhost:5173/confirmar-email?token= e têm token | observado 3 link(s), token de 149 caracteres | passou
- `*` o corpo diz "O link vale por 24 horas." | interpretado como: busca literal no texto e no HTML | observado texto=True, html=True | passou
- `*` o corpo cumprimenta pelo nome Paula Dias | interpretado como: linha do texto com o nome e o mesmo nome no HTML | observado ['Olá, Paula Dias!'] | passou
- `*` o corpo está em português do Brasil, no texto e no HTML | interpretado como: texto e HTML com as frases em português (Recebemos o seu cadastro, O link vale por 24 horas., Se você não criou esta conta) e o atributo lang do <html> igual a pt-BR | observado lang=pt-BR, texto pt=True, html pt=True | passou

<details>
<summary>Evidência</summary>

```
cadastro HTTP 200
texto:
Olá, Paula Dias!

Recebemos o seu cadastro. Para ativar a conta, confirme o seu e-mail abrindo o link abaixo:

http://localhost:5173/confirmar-email?token=eyJ<mascarado>

O link vale por 24 horas.

Se você não criou esta conta, ignore esta mensagem.
```

</details>

#### WRK-EMAIL-03 *
- Veredito: passou
- `*` o corpo em texto da mensagem para quim@example.com não contém Sigilo321w | interpretado como: busca literal no Text da mensagem | observado ausente | passou
- `*` o corpo em HTML não contém Sigilo321w | interpretado como: busca literal no HTML da mensagem | observado ausente | passou
- `*` nenhum cabeçalho da mensagem contém Sigilo321w | interpretado como: busca literal em /api/v1/message/<id>/headers | observado ausente | passou

<details>
<summary>Evidência</summary>

```
cadastro HTTP 200; mensagem 6fCWnvQlxaBJ8nUYoVM8UM; cabeçalhos: ['Content-Type', 'Date', 'From', 'Message-Id', 'Mime-Version', 'Received', 'Return-Path', 'Subject', 'To']
```

</details>

#### WRK-EMAIL-04 *
- Veredito: passou
- `*` a fila email.send tem um job verify-email com o id da conta de rui@example.com | interpretado como: hash bull:email.send:<id> com name verify-email e data com userId igual ao id da conta | observado job 31, userId=mBtz2w7mMOpImL2ZmMpNQzhWEFoRmC0F | passou
- `*` os dados desse job não contêm Sigilo654v | interpretado como: busca literal no campo data do hash | observado ausente | passou
- `*` os dados desse job não contêm rui@example.com nem Rui Campos | interpretado como: busca literal no campo data do hash | observado ausentes | passou

<details>
<summary>Evidência</summary>

```
cadastro HTTP 200; conta mBtz2w7mMOpImL2ZmMpNQzhWEFoRmC0F; job 31; data: {"type":"verify-email","userId":"mBtz2w7mMOpImL2ZmMpNQzhWEFoRmC0F","url":"http://localhost:5173/confirmar-email?token=eyJ<mascarado>"}
```

</details>

#### WRK-EMAIL-05 *
- Veredito: passou
- `*` depois de 1 minuto a caixa não tem mensagem para ana@example.com | interpretado como: mensagens com To ana@example.com 60 s depois do cadastro recusado | observado 0 mensagem(ns) | passou

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [['Ana Souza', 'user', 'f', 'f', 'credential']]
caixa esvaziada depois do e-mail do próprio handle (Dado comum: caixa vazia no início do item): 0 mensagem(ns)
cadastro HTTP 422 {"code":"USER_ALREADY_EXISTS","message":"Este e-mail já tem conta. Entre ou recupere a senha."}
```

</details>

#### WRK-RETRY-01 *
- Veredito: passou
- `*` em até 2 minutos depois de o mailpit voltar, a caixa tem uma mensagem para sara@example.com | interpretado como: mensagens com To igual, consultadas até 120 s depois do mailpit saudável | observado 1 mensagem(ns) em 7.0s | passou
- `*` o job verify-email dessa conta fica concluído com mais de uma tentativa registrada | interpretado como: job no zset bull:email.send:completed e campo atm (attemptsMade) maior que 1 no hash | observado estado=completed, atm=3 | passou

<details>
<summary>Evidência</summary>

```
docker compose stop mailpit: rc=0
20 s depois, docker compose up -d --wait mailpit: rc=0
cadastro HTTP 200; job 33: estado=completed atm=3
```

</details>

#### WRK-RETRY-02 *
- Veredito: passou
- `*` em até 3 minutos o job verify-email dessa conta fica no estado falho | interpretado como: job no zset bull:email.send:failed, consultado até 180 s | observado estado=failed em 99.6s | passou
- `*` o job registra 5 tentativas | interpretado como: campo atm (attemptsMade) do hash | observado 5 | passou
- `*` a conta de tais@example.com continua no banco, pendente | interpretado como: linha em "user" com emailVerified falso | observado [['user', 'f']] | passou

<details>
<summary>Evidência</summary>

```
docker compose stop mailpit: rc=0
cadastro HTTP 200; job 34: atm=5 failedReason=connect EHOSTUNREACH 172.18.0.3:1025
docker compose up -d --wait mailpit: rc=0
```

</details>

### UI

#### UI-CADASTRO-01 *
- Veredito: passou
- `*` a tela mostra que o link de confirmação foi enviado para ugo@example.com | interpretado como: texto visível com "link de confirmação" e o e-mail | observado Enviamos um link de confirmação para ugo@example.com. Confirme o e-mail antes de entrar. | passou
- `*` a tela diz que é preciso confirmar o e-mail antes de entrar | interpretado como: texto visível com "Confirme o e-mail antes de entrar" | observado presente | passou
- `*` o botão "Reenviar o link" está visível | interpretado como: getByRole button com o nome, visível | observado true | passou
- `*` o formulário de cadastro não está mais visível | interpretado como: campos #cadastro-name, -email e -password ausentes | observado ausente | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-CADASTRO-01-final.png
main: Confirme seu e-mail /  / Enviamos um link de confirmação para ugo@example.com. Confirme o e-mail antes de entrar. /  / Reenviar o link
```

</details>

#### UI-REENVIO-01 *
- Veredito: passou
- ✓ base visual mecânica (link-enviado): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []
- `*` a página envia POST /api/auth/send-verification-email com o e-mail vera@example.com | interpretado como: requisição de rede POST com email no corpo JSON | observado POST http://localhost:3000/api/auth/send-verification-email corpo {"email":"vera@example.com"} | passou
- ✓ essa requisição recebe 200 | esperado 200, observado 200
- `*` a tela informa que um novo link foi enviado | interpretado como: texto do role=status com "novo link" | observado Enviamos um novo link para vera@example.com. | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-REENVIO-01-link-enviado.png
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-REENVIO-01-final.png
resposta: 200 {"status":true}
```

</details>

#### UI-DUPLICADO-01 *
- Veredito: passou
- `*` a tela diz que o e-mail já tem conta | interpretado como: texto do aviso role=alert com "já tem conta" | observado Este e-mail já tem conta. Entre ou recupere a senha. /  / Entrar / Recuperar a senha | passou
- `*` a tela tem um link para /entrar | interpretado como: link com href /entrar dentro do aviso (fora da barra de navegação) | observado 1 | passou
- `*` a tela tem um link para /recuperar-senha | interpretado como: link com href /recuperar-senha no conteúdo da página | observado 1 | passou
- `*` o formulário continua visível com o nome e o e-mail preenchidos | interpretado como: formulário visível e valores dos campos nome e e-mail | observado visível=true, nome=Outra Ana, e-mail=ANA@example.com | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [Ana Souza|user|f|f|credential]; rate-limit:* apagadas de novo (janela-de-cadastro-livre)
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-DUPLICADO-01-final.png
```

</details>

#### UI-SENHA-01 *
- Veredito: passou
- `*` abaixo do campo de senha aparece "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | interpretado como: texto de #cadastro-password-erro igual e posicionado abaixo do campo | observado A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número. (abaixo=true) | passou
- `*` a página não envia requisição a /api/auth/sign-up/email | interpretado como: registro de rede da página sem URL com /api/auth/sign-up/email | observado 0 requisição(ões) | passou
- `*` o formulário continua visível | interpretado como: campo #cadastro-name visível | observado true | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-SENHA-01-final.png
```

</details>

#### UI-CAMPOS-01 *
- Veredito: passou
- `*` abaixo do campo de nome aparece a mensagem de campo obrigatório | interpretado como: texto não vazio em #cadastro-name-erro, abaixo do campo, pedindo o nome | observado "Informe o seu nome." (abaixo=true) | passou
- `*` o foco fica no campo de nome | interpretado como: document.activeElement.id | observado cadastro-name | passou
- `*` a página não envia requisição a /api/auth/sign-up/email | interpretado como: registro de rede da página sem URL com /api/auth/sign-up/email | observado 0 requisição(ões) | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-CAMPOS-01-final.png
```

</details>

#### UI-CAMPOS-02 *
- Veredito: passou
- `*` abaixo do campo de e-mail aparece a mensagem de e-mail inválido | interpretado como: texto de #cadastro-email-erro sobre e-mail válido | observado "Informe um e-mail válido." | passou
- `*` a página não envia requisição a /api/auth/sign-up/email | interpretado como: registro de rede da página sem URL com /api/auth/sign-up/email | observado 0 requisição(ões) | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-CAMPOS-02-final.png
```

</details>

#### UI-SIGILO-01 *
- Veredito: passou
- `*` o campo de senha é do tipo senha, com o valor mascarado | interpretado como: atributo type do campo antes e depois do envio | observado antes=password, depois=password | passou
- `*` o texto visível da página não contém Oculta123 | interpretado como: busca literal em document.body.innerText | observado ausente | passou
- `*` a URL não contém Oculta123 | interpretado como: busca literal em page.url() | observado http://localhost:5173/cadastro | passou
- `*` a requisição de cadastro leva a senha no corpo, nunca na URL | interpretado como: requisições a /api/auth/sign-up/email: POST com a senha no corpo e nenhuma URL com a senha | observado POST http://localhost:3000/api/auth/sign-up/email corpo_tem_senha=true | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [Ana Souza|user|f|f|credential]; rate-limit:* apagadas de novo (janela-de-cadastro-livre)
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-SIGILO-01-final.png
```

</details>

#### UI-LAYOUT-01 *
- Veredito: passou
- `*` o topo da página tem a barra de navegação com o nome do app como link para / | interpretado como: nav no topo (top da caixa) e primeiro link com o nome do app e href / | observado top=0, link=["App","/"] | passou
- `*` a barra tem o link "Criar conta" para /cadastro | interpretado como: link com o nome na nav e o href | observado /cadastro | passou
- `*` a barra tem o link "Entrar" para /entrar | interpretado como: link com o nome na nav e o href | observado /entrar | passou
- `*` a página continua mostrando, em português do Brasil, que não há sessão aberta | interpretado como: texto "Nenhuma sessão aberta." no main | observado App /  / Nenhuma sessão aberta. /  / Ainda não tem conta? Cadastre-se. | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-LAYOUT-01-final.png
```

</details>

#### UI-LAYOUT-02 *
- Veredito: passou
- ✓ a URL passa a /cadastro | esperado /cadastro, observado /cadastro
- `*` o formulário de cadastro está visível | interpretado como: campo #cadastro-name visível | observado true | passou
- `*` a barra de navegação continua no topo da página | interpretado como: top da caixa da nav | observado 0 | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-LAYOUT-02-final.png
```

</details>

#### UI-LAYOUT-03 *
- Veredito: passou
- `*` a página mostra, em português do Brasil, que a página não foi encontrada | interpretado como: texto "Página não encontrada" no main | observado Página não encontrada /  / O endereço que você abriu não existe neste aplicativo. /  / Voltar ao início | passou
- `*` o font-family computado do texto da página começa com "Inter Variable" | interpretado como: fontFamily computado do parágrafo do main | observado "Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-LAYOUT-03-final.png
```

</details>

#### UI-VISUAL-01 *
- Veredito: passou
- `*` o botão "Criar conta" do formulário tem fundo computado rgb(0, 0, 0) e cor rgb(255, 255, 255) | interpretado como: backgroundColor e color computados do botão submit do formulário | observado rgb(0, 0, 0), rgb(255, 255, 255) | passou
- `*` esse botão tem border-radius computado de 999px | interpretado como: borderRadius computado | observado 999px | passou
- `*` o rótulo desse botão tem font-size de 16px e font-weight 500 | interpretado como: fontSize e fontWeight computados do botão | observado 16px, 500 | passou
- `*` esse botão tem pelo menos 44px de altura | interpretado como: altura da caixa do botão | observado 44px | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
{"bg":"rgb(0, 0, 0)","color":"rgb(255, 255, 255)","br":"999px","fs":"16px","fw":"500","h":44,"t":"Criar conta"}
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-VISUAL-01-final.png
```

</details>

#### UI-VISUAL-02 *
- Veredito: passou
- `*` a fonte "Inter Variable" consta como carregada nas fontes do documento | interpretado como: document.fonts com family Inter Variable e status loaded | observado ["Inter Variable:100 900:unloaded","Inter Variable:100 900:unloaded","Inter Variable:100 900:unloaded","Inter Variable:100 900:unloaded","Inter Variable:100 900:unloaded","Inter Variable:100 900:unloaded","Inter Variable:100 900:loaded"] | passou
- `*` o font-family computado do body começa com "Inter Variable" | interpretado como: fontFamily computado do body | observado "Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif | passou
- `*` o título "Crie sua conta" tem font-weight 700, font-size de 32px e letter-spacing normal | interpretado como: texto e estilo computado do h1 | observado {"t":"Crie sua conta","fw":"700","fs":"32px","ls":"normal"} | passou
- `*` toda requisição de arquivo de fonte vai à origem da SPA | interpretado como: requisições de tipo font (ou extensão de fonte) com URL na origem http://localhost:5173 | observado http://localhost:5173/@fs/app/node_modules/.pnpm/@fontsource-variable+inter@5.3.0/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2 | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-VISUAL-02-final.png
```

</details>

#### UI-VISUAL-03 *
- Veredito: passou
- `*` o card do formulário tem fundo computado rgb(255, 255, 255), border-radius de 16px e box-shadow none | interpretado como: estilo computado do pai do h1 (card) | observado rgb(255, 255, 255), 16px, none | passou
- `*` o card tem no máximo 490px de largura | interpretado como: largura da caixa do card | observado 490px (max-width 490px) | passou
- `*` os campos de nome, e-mail e senha têm fundo computado rgb(239, 239, 239) e border-radius de 8px | interpretado como: backgroundColor e borderRadius computados de cada input | observado [["name","rgb(239, 239, 239)","8px"],["email","rgb(239, 239, 239)","8px"],["password","rgb(239, 239, 239)","8px"]] | passou
- `*` cada campo tem um rótulo visível associado a ele | interpretado como: label[for=id] visível para cada campo | observado [["name","Nome",true],["email","E-mail",true],["password","Senha",true]] | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
{"cls":"card-content mx-auto w-full max-w-[490px]","bg":"rgb(255, 255, 255)","br":"16px","sh":"none","w":490,"mw":"490px"}
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-VISUAL-03-final.png
```

</details>

#### UI-VISUAL-04 *
- Veredito: passou
- ✓ o campo de e-mail tem aria-invalid igual a true | esperado true, observado true
- `*` o aria-describedby do campo de e-mail aponta para o elemento com a mensagem de e-mail inválido | interpretado como: id do aria-describedby resolve para o elemento com a mensagem | observado cadastro-email-erro -> "Informe um e-mail válido." | passou
- `*` o campo de e-mail tem borda computada de 2px na cor rgb(0, 0, 0) | interpretado como: border-width e border-color computados nos quatro lados | observado 2px 2px 2px 2px / rgb(0, 0, 0) | passou
- `*` a mensagem tem cor computada rgb(0, 0, 0) e um ícone antes do texto | interpretado como: color computado do elemento da mensagem e primeiro filho svg | observado rgb(0, 0, 0), primeiro filho svg | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-VISUAL-04-final.png
```

</details>

#### UI-VISUAL-05 *
- Veredito: passou
- `*` a largura de rolagem do documento não passa de 375px | interpretado como: document.documentElement.scrollWidth | observado 375px | passou
- `*` o card do formulário fica a 16px de cada borda da janela | interpretado como: distância da caixa do card às bordas esquerda e direita da janela | observado esquerda 16px, direita 16px | passou
- `*` os links "Entrar" e "Criar conta" da barra de navegação estão visíveis | interpretado como: isVisible dos links da nav | observado Entrar=true, Criar conta=true | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-VISUAL-05-final.png
```

</details>

#### UI-VISUAL-06 *
- Veredito: passou
- `*` o aviso de e-mail já cadastrado aparece acima do formulário com role igual a alert | interpretado como: elemento role=alert com a base acima do topo do form | observado {"above":true,"role":"alert","bg":"rgb(239, 239, 239)","br":"16px"} | passou
- `*` o aviso tem fundo computado rgb(239, 239, 239) e border-radius de 16px | interpretado como: backgroundColor e borderRadius computados | observado rgb(239, 239, 239), 16px | passou
- `*` nenhum elemento visível da página tem cor de texto, fundo ou borda fora da paleta do DESIGN.md, sem contar o transparente | interpretado como: color, backgroundColor e border-color (lados com largura) computados de cada elemento visível, comparados às 10 cores de colors no DESIGN.md | observado [] | passou
- ✓ base visual mecânica (final): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []

<details>
<summary>Evidência</summary>

```
conta-pendente-ana: HTTP 200 [Ana Souza|user|f|f|credential]; rate-limit:* apagadas de novo (janela-de-cadastro-livre)
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/UI-VISUAL-06-final.png
```

</details>

### E2E

#### E2E-CADASTRO-01 *
- Veredito: passou
- `*` a tela mostra que o link de confirmação foi enviado para zelia@example.com | interpretado como: texto visível com "link de confirmação" e o e-mail | observado Enviamos um link de confirmação para zelia@example.com. Confirme o e-mail antes de entrar. | passou
- ✓ base visual mecânica (link-enviado): imagens carregadas, elementos dentro da janela, sem corte por overflow e recebendo o clique | esperado [], observado []
- `*` em até 2 minutos a caixa tem uma mensagem para zelia@example.com com um link para /confirmar-email?token= | interpretado como: mensagem com To igual, consultada até 120 s, com o link no texto e no HTML | observado mensagem em 0.0s, link=true | passou
- `*` o banco tem a conta de zelia@example.com com papel user e e-mail não verificado | interpretado como: linha em "user" com role e emailVerified | observado user|f | passou
- `*` nem a mensagem nem as linhas de log do serviço api escritas durante a jornada contêm Jornada123 | interpretado como: busca literal no texto, HTML e cabeçalhos da mensagem e nas 2 linhas de docker compose logs api desde o início da jornada | observado mensagem=ausente, log=0 linha(s) | passou
- `*` nenhuma dessas linhas de log contém Zélia Dias ou zelia@example.com | interpretado como: busca literal nas mesmas linhas | observado 0 linha(s) | passou

<details>
<summary>Evidência</summary>

```
screenshot /tmp/evaluator-rf001-2026-10-31T04-04-02Z/shots/E2E-CADASTRO-01-link-enviado.png
tela: Enviamos um link de confirmação para zelia@example.com. Confirme o e-mail antes de entrar.
banco: user|f
linhas de log capturadas: 2
{"level":30,"time":1793420119609,"pid":202,"hostname":"230ff702e313","req":{"id":"8f038033-83af-4930-a01f-ce3fb385a885","method":"GET","url":"/api/v1/session","headers":{"host":"localhost:3000","connection":"keep-alive","sec-ch-ua-platform":"\"Linux\
{"level":30,"time":1793420120434,"pid":202,"hostname":"230ff702e313","req":{"id":"0dadd4c2-08e3-4bb2-90ea-92a52afa7db3","method":"GET","url":"/api/v1/session","headers":{"host":"localhost:3000","connection":"keep-alive","sec-ch-ua-platform":"\"Linux\
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `compose.yaml`: o serviço api instala nos volumes ao subir; `scripts/db-setup.sh` garante as dependências |
| Ambiente e serviços | 1 e 2 | contrato (Docker Compose) e `compose.yaml`: o ambiente local já no ar, com a api recriada por um arquivo de override do Compose na pasta temporária (`COMPOSE_FILE`) |
| Banco efêmero e migração | 5 | `scripts/db-setup.sh`: banco `eval_rf001_2026_10_31t04_04_02z` no postgres do Compose, `DATABASE_URL` da api trocada pelo override, `make db-setup` migra e cria o admin |
| Isolamento do Valkey | 6 | `REDIS_URL=redis://valkey:6379/3` no override: rate limit e fila `email.send` no banco lógico 3, vazio antes da avaliação |
| Estado persistido | 1 | contrato: `conta-pendente-ana` "criada pelo cadastro", por POST /api/auth/sign-up/email |
| Limpeza entre itens | 6 | DELETE das contas sem papel admin no banco efêmero (account e session caem em cascata), apagar `rate-limit:*` no Valkey e DELETE /api/v1/messages no Mailpit |
| Gates | 1 | contrato: `make check` e `make build` na raiz |
| Cliente HTTP | 6 | `urllib` do Python, com o X-Forwarded-For do contrato e o Origin da SPA nas chamadas à api |
| Logs da api | 1 e 3 | contrato e spec, Verificação por superfície: `docker compose logs api --since <início do item>` |
| Fila | 3 | spec, Verificação por superfície: hashes `bull:email.send:<id>` (campos name, data, atm, failedReason) e zsets `completed` e `failed` lidos com `valkey-cli` |
| Caixa de e-mail | 3 | spec, Verificação por superfície (ADR-0016): API REST do Mailpit |
| Navegador | 3 | spec, Verificação por superfície (ADR-0024): Chromium headless pelo `playwright-core` do `@playwright/cli` no cache do npx, dirigido por script Node, um contexto sem cookie por item |
| Base visual | 6 | `evaluate` no navegador (imagens, caixas na janela, corte por `overflow`, `elementFromPoint`) e screenshot por item, revisado sem achados |
| Paleta do DESIGN.md | 3 | as 10 cores de `colors` no front-matter do `DESIGN.md`, comparadas em rgb com color, background-color e border-color computados |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_rf001_*`, nenhuma pasta `evaluator-rf001-*` e nenhum PID de avaliação anterior no início.
- Derrubada: completa. Nenhum PID no `processos.lock` (os navegadores fecharam com o script); api recriada sem o override, de volta a `DATABASE_URL` do banco `app` e ao Valkey no banco 0, saudável; banco `eval_rf001_2026_10_31t04_04_02z` apagado; banco lógico 3 do Valkey esvaziado; pasta `/tmp/evaluator-rf001-2026-10-31T04-04-02Z` apagada, com os screenshots.

## Avisos

- Avaliado com 1 arquivo fora de commit: `docs/features/RF-001-criar-conta/orquestracao.md`, só documentação; o código avaliado é o do commit 2aa0cbc.
- Os itens de Worker rodaram duas vezes: na primeira passada o cliente da avaliação mandou o cabeçalho Origin também ao Mailpit, que respondeu 403, e WRK-EMAIL-01, -02, -03, -05 e WRK-RETRY-01 pararam com erro de leitura da caixa (falha do avaliador, não da implementação). Corrigido o cliente, os 7 itens de Worker rodaram de novo, com o ambiente limpo antes de cada um; os vereditos acima são dessa segunda passada.
- Os gates rodaram antes de a api ser recriada com o override: `make build` no host recompila `apps/api/dist`, que o serviço api usa pelo bind mount. A api subiu depois dos gates, saudável.
- `make check` passou com 1 aviso de lint em `@app/api` e com os avisos de documentação já conhecidos: os diagramas C4 de `template-web.md` foram gerados do HLD 0.2.5 (o atual é 0.2.6) e `docs/features/fundacao/spec.md` foi escrita sobre o HLD 0.2.5 e cita o componente 'API NestJS' ausente do HLD.
- API-DUPLICADO-03: a requisição perdedora recebeu 422 com `code` `FAILED_TO_CREATE_USER`, não `USER_ALREADY_EXISTS`; o item pede só o 422.
- API-FALHA-01: com o Valkey parado, GET /api/health respondeu 503 com `valkey` down (o item pede que a api continue respondendo); a api registrou "Rate limit liberado com o Valkey indisponível: sem resposta em 500 ms" e a linha `Failed to run background task: Error` do Better Auth, sem dado pessoal. Depois de religar o Valkey, a api voltou a 200 e o worker processou os jobs dos itens seguintes.
- As requisições de cadastro e a entrega do e-mail não geram linha no log da api no nível info; os itens de log (API-SIGILO-02, API-SIGILO-03, E2E-CADASTRO-01) passam pela ausência dos valores nas linhas capturadas. A captura funciona: em API-FALHA-01 e E2E-CADASTRO-01 ela trouxe as linhas do mesmo intervalo.
- O `.env` difere do `.env.example` só em comentários; os valores são os mesmos.
- Os itens usam o Valkey (banco lógico 3) e o Mailpit compartilhados do ambiente de desenvolvimento: a caixa do Mailpit foi esvaziada antes de cada item, e os dois serviços foram parados e religados nos itens de falha.

## Motivo do aborto

Nenhum.
