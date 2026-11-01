# Avaliação: RF-002 Confirmar e-mail

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-11-01T12-11-21Z
- Branch: feat/rf-002-confirmar-email
- Commit: f468f21
- Status: limpo
- Itens: 28 passou, 0 falhou, 0 bloqueado, 0 manual, 0 pulado, de 28
- Critérios: 4 verificado, 0 reprovado, 0 indeterminado, de 4
- Filtros: nenhum

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| Link aberto dentro de 24 horas ativa a conta e não pode ser usado de novo. | ✓ verificado | API-ATIVACAO-01, API-ATIVACAO-02, API-ATIVACAO-03, API-ATIVACAO-04, API-ATIVACAO-05, API-ATIVACAO-06, API-SIGILO-01, UI-ATIVACAO-01, UI-ATIVACAO-02, UI-FALHA-01, UI-VISUAL-01, E2E-CONFIRMACAO-01 |
| Link aberto depois de 24 horas não ativa a conta e a tela oferece reenvio. | ✓ verificado | API-VENCIDO-01, API-VENCIDO-02, UI-VENCIDO-01, UI-REENVIO-01, E2E-REENVIO-01 |
| Depois de um reenvio, o link anterior não ativa mais a conta. | ✓ verificado | API-REENVIO-01, API-REENVIO-02, API-REENVIO-03, API-REENVIO-04, API-INVALIDO-01, WRK-REENVIO-01, WRK-REENVIO-02, UI-INVALIDO-01, UI-INVALIDO-02, UI-INVALIDO-03, E2E-REENVIO-01 |
| RF-001 → RF-002: a conta criada no cadastro fica ativa ao abrir o link recebido no e-mail daquele cadastro, e só ela. | ✓ verificado | E2E-INTEGRACAO-01, E2E-CONFIRMACAO-01 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (com `TURBO_FORCE=true`: 5 tarefas, 0 do cache; arquivos de teste 24 de unidade e 11 de integração da API (67 testes de integração), 4 da SPA e 3 de Contratos passaram; "ok: todas as verificações passaram")
- ✓ build: `make build`, código 0 (com `TURBO_FORCE=true`: 4 tarefas, 0 do cache)

## Pré-requisitos

### Serviços em execução
- ✓ api (com o worker do Módulo E-mail): http://localhost:3000, saúde /api/health respondeu 200 `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`, recriada apontando para o banco efêmero `eval_rf002_2026_11_01t12_11_21z` e para o Valkey no banco lógico 3
- ✓ web: http://localhost:5173/ saudável no Compose
- ✓ postgres: saudável no Compose (PostgreSQL 18)
- ✓ valkey: saudável no Compose (Valkey 9), banco lógico 3 vazio no início (`dbsize` 0)
- ✓ mailpit: saudável no Compose (axllent/mailpit:v1.32), API REST em http://localhost:8025

### Estado persistido
- ✓ `janela-de-cadastro-livre`: chaves `rate-limit:*` apagadas no banco lógico 3 do Valkey antes de cada item; conferido: o banco lógico 3 começou vazio (`dbsize` 0) e cada item usou um IP próprio, sem nenhum 429 fora do API-REENVIO-04
- ✓ `janela-de-reenvio-livre`: mesmo mecanismo; conferido: os três primeiros reenvios de API-REENVIO-04 responderam 200 e só o quarto do mesmo IP recebeu 429

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env` copiado do `.env.example`: NODE_ENV=development e TRUSTED_PROXIES vazia em vigor no container da api (o contrato pede development e vazia); `make db-setup` aplicado ao banco efêmero ("All migrations have been successfully applied", "seed: primeiro admin criado")
- ✓ X-Forwarded-For por item: cada cadastro e reenvio fora do navegador levou um IP 203.0.113.x exclusivo do item (de .1 a .30)
- ✓ Link da conta: lido da mensagem mais recente para o e-mail na caixa do Mailpit (busca `to:"<e-mail>"`), token pelo parâmetro `token`
- ✓ Registro de confirmação: linha de `verification` com identifier `email-verification:<hash>` e value igual ao id da conta; vencimento movido com UPDATE do `expiresAt` (UTC, o PostgreSQL roda em Etc/UTC)

### Dependências externas
- ✓ DEP-1 serviço de envio de e-mail: Mailpit v1.32 do Compose, lido e esvaziado pela API REST (`/api/v1/search`, `/api/v1/message/<id>`, DELETE `/api/v1/messages`)

## Itens

### API HTTP

#### API-ATIVACAO-01
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz status verdadeiro e não traz o código ALREADY_VERIFIED | observado `{"status": true, "user": null}`
- ✓ a resposta não define cookie de sessão | observado nenhum Set-Cookie
- ✓ o banco tem a conta de lia@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco não tem sessão para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-up/email (Lia Mendes, lia@example.com, X-Forwarded-For 203.0.113.1) -> 200
GET /api/auth/verify-email?token=eyJ<mascarado> -> 200 {"status": true, "user": null}, sem Set-Cookie
select "emailVerified" from "user" where email='lia@example.com' -> t
select count(*) from session where "userId"=<id> -> 0
```

</details>

#### API-ATIVACAO-02
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz o código ALREADY_VERIFIED | observado `{"status": true, "code": "ALREADY_VERIFIED"}`
- ✓ a conta de leo@example.com continua com e-mail verificado | esperado t, observado t
- ✓ o banco não tem registro de confirmação para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
ativação: GET /api/auth/verify-email?token=T1 -> 200 {"status": true, "user": null}
repetição: GET /api/auth/verify-email?token=T1 -> 200 {"status": true, "code": "ALREADY_VERIFIED"}
verification com value=<id da conta> -> 0 linhas
```

</details>

#### API-ATIVACAO-03
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo traz o código INVALID_TOKEN | observado `{"code": "INVALID_TOKEN", "message": "Este link não vale mais. Peça um novo link abaixo."}`
- ✓ a conta de luna@example.com continua com e-mail não verificado | esperado f, observado f

<details>
<summary>Evidência</summary>

```
ativação com T1 -> 200; update "user" set "emailVerified"=false
GET /api/auth/verify-email?token=T1 -> 401 {"code": "INVALID_TOKEN", ...}
```

</details>

#### API-ATIVACAO-04
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o banco tem a conta de lara@example.com com e-mail verificado | esperado t, observado t

<details>
<summary>Evidência</summary>

```
expiresAt movido para 2026-11-01T12:15:43.365 (1 minuto depois de agora)
GET /api/auth/verify-email?token=T1 às 12:14:43 -> 200 {"status": true, "user": null}
```

</details>

#### API-ATIVACAO-05
- Veredito: passou
- ✓ o banco tem exatamente um registro de confirmação para a conta de lucas@example.com | esperado 1, observado 1
- ✓ o expiresAt desse registro fica entre 23 horas e 59 minutos e 24 horas e 1 minuto depois da resposta | esperado entre 86340 s e 86460 s, observado 86399,9 s
- ✓ o identifier e o value desse registro não contêm o token do link que chegou para lucas@example.com | observado identifier `email-verification:62399511...` (hash) e value igual ao id da conta

<details>
<summary>Evidência</summary>

```
antes: nenhuma conta lucas@example.com
POST /api/auth/sign-up/email -> 200, resposta em 2026-11-01T12:14:45.137Z
verification: id c0a5e038-..., identifier email-verification:623995112b9b..., value ztIDK81vCRxdBiCoY5yC5icuoKIulQj9, expiresAt 2026-11-02T12:14:45.000 (segundo inteiro, igual ao exp do JWT)
token do link no Mailpit: eyJ<mascarado>, ausente em identifier e value
```

</details>

#### API-ATIVACAO-06
- Veredito: passou
- ✓ exatamente uma resposta é 200 sem o código ALREADY_VERIFIED | esperado 1, observado 1
- ✓ a outra resposta é 200 com o código ALREADY_VERIFIED ou 401 com o código INVALID_TOKEN | observado 200 `{"status": true, "code": "ALREADY_VERIFIED"}`
- ✓ o banco tem a conta de lis@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco não tem registro de confirmação para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
duas GET /api/auth/verify-email?token=T1 em paralelo (duas threads):
  200 {"status": true, "code": "ALREADY_VERIFIED"}
  200 {"status": true, "user": null}
verification com value=<id da conta> -> 0 linhas
```

</details>

#### API-VENCIDO-01
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo traz o código TOKEN_EXPIRED | observado `{"code": "TOKEN_EXPIRED", "message": "Este link expirou. Peça um novo link abaixo."}`
- ✓ a conta de mia@example.com continua com e-mail não verificado | esperado f, observado f

<details>
<summary>Evidência</summary>

```
expiresAt movido para 2026-11-01T12:13:49.063 (1 minuto antes de agora)
GET /api/auth/verify-email?token=T1 às 12:14:49 -> 401 {"code": "TOKEN_EXPIRED", ...}
```

</details>

#### API-VENCIDO-02
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo traz o código TOKEN_EXPIRED | observado `{"code": "TOKEN_EXPIRED", ...}`
- ✓ a conta de mel@example.com continua com e-mail não verificado | esperado f, observado f

<details>
<summary>Evidência</summary>

```
primeira GET com T1 vencido -> 401 TOKEN_EXPIRED
segunda GET com T1 -> 401 {"code": "TOKEN_EXPIRED", "message": "Este link expirou. Peça um novo link abaixo."}
```

</details>

#### API-REENVIO-01 *
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | observado 200 `{"status": true}`
- ✓ o banco tem exatamente um registro de confirmação para a conta de nina@example.com | esperado 1, observado 1
- `*` esse registro não é o R1 | interpretado como: id e identifier diferentes dos de R1 | observado id 5493b561-... e identifier `...101a591e...` contra R1 b0c04daf-... e `...8b87af74...` | passou
- ✓ o expiresAt desse registro fica entre 23 horas e 59 minutos e 24 horas e 1 minuto depois da resposta | esperado entre 86340 s e 86460 s, observado 86399,3 s

<details>
<summary>Evidência</summary>

```
R1: b0c04daf-24ec-46a2-bbe2-65f2e2f9339d, email-verification:8b87af7427b2..., expiresAt 2026-11-02T12:14:52.000
POST /api/auth/send-verification-email {"email":"nina@example.com"} (203.0.113.10) -> 200 {"status": true}
depois: 1 linha, 5493b561-11e7-460e-b2ae-3c6c8006e800, email-verification:101a591ec634..., expiresAt 2026-11-02T12:14:53.000
```

</details>

#### API-REENVIO-02
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo traz o código INVALID_TOKEN | observado `{"code": "INVALID_TOKEN", ...}`
- ✓ a conta de noa@example.com continua com e-mail não verificado | esperado f, observado f

<details>
<summary>Evidência</summary>

```
reenvio -> 200 {"status": true}
GET /api/auth/verify-email?token=T1 -> 401 {"code": "INVALID_TOKEN", "message": "Este link não vale mais. Peça um novo link abaixo."}
```

</details>

#### API-REENVIO-03
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o banco tem a conta de nara@example.com com e-mail verificado | esperado t, observado t
- ✓ T2 é diferente de T1 | observado diferentes

<details>
<summary>Evidência</summary>

```
reenvio -> 200; caixa com 2 mensagens para nara@example.com; T2 da mais recente
GET /api/auth/verify-email?token=T2 -> 200 {"status": true, "user": null}
```

</details>

#### API-REENVIO-04
- Veredito: passou
- ✓ a resposta é 429 | esperado 429, observado 429
- ✓ a resposta traz o cabeçalho X-Retry-After | observado `x-retry-after: 58`

<details>
<summary>Evidência</summary>

```
três POST /api/auth/send-verification-email (nico@example.com, 203.0.113.16) em 1,52 s -> 200, 200, 200
quarto POST do mesmo IP -> 429 {"message": "Too many requests. Please try again later."}, x-retry-after: 58
```

</details>

#### API-INVALIDO-01
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo traz o código INVALID_TOKEN | observado `{"code": "INVALID_TOKEN", ...}`
- ✓ a conta de olga@example.com continua com e-mail não verificado | esperado f, observado f
- ✓ o banco continua com um registro de confirmação para essa conta | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
token T1 com o último caractere trocado
GET /api/auth/verify-email?token=<alterado> -> 401 {"code": "INVALID_TOKEN", ...}
```

</details>

#### API-SIGILO-01
- Veredito: passou
- ✓ nenhuma linha de log do serviço api escrita durante o item contém T1 | esperado 0, observado 0 de 0 linhas
- ✓ nenhuma dessas linhas contém pia@example.com | esperado 0, observado 0
- ✓ nenhuma dessas linhas contém Pia Torres | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
GET /api/auth/verify-email?token=T1 -> 200
docker compose logs api --since <início do item> -> 0 linhas na janela
conferência ampla: docker compose logs api --since 10m -> 57 linhas, 0 com T1, pia@example.com ou Pia Torres, 0 com verify-email
```

</details>

### Worker

#### WRK-REENVIO-01
- Veredito: passou
- ✓ em até 2 minutos a caixa tem exatamente duas mensagens para rita@example.com | esperado 2, observado 2 na primeira consulta (0,0 s depois da resposta)
- ✓ a mais recente tem um link que começa com o WEB_ORIGIN do .env seguido de /confirmar-email?token= | esperado `http://localhost:5173/confirmar-email?token=`, observado `http://localhost:5173/confirmar-email?token=eyJ<mascarado>`
- ✓ o token desse link é diferente do token da mensagem do cadastro | observado diferente
- ✓ o corpo da mais recente diz "O link vale por 24 horas." | observado presente no texto

<details>
<summary>Evidência</summary>

```
POST /api/auth/send-verification-email {"email":"rita@example.com"} -> 200 {"status": true}
Mailpit: 2 mensagens "Confirme seu e-mail", a mais recente criada em 2026-11-01T12:15:16.829Z
```

</details>

#### WRK-REENVIO-02
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | observado 200 `{"status": true}`
- ✓ depois de 1 minuto a caixa continua com uma só mensagem para raul@example.com | esperado 1, observado 1 (depois de 61 s)
- ✓ o banco não tem registro de confirmação para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
ativação com o link do cadastro -> 200
POST /api/auth/send-verification-email {"email":"raul@example.com"} -> 200 {"status": true}
espera de 61 s; Mailpit: 1 mensagem para raul@example.com; verification: 0 linhas
```

</details>

### UI

#### UI-ATIVACAO-01 *
- Veredito: passou
- ✓ a página envia GET /api/auth/verify-email com o token do link e recebe 200 | observado GET `/api/auth/verify-email?token=<token do link>` com 200
- `*` a tela diz que o e-mail foi confirmado | interpretado como: título e texto do card anunciam a confirmação | observado "E-mail confirmado" e "Sua conta está ativa." | passou
- ✓ a tela tem um link ou botão "Entrar" para /entrar | observado `<a href="/entrar">Entrar</a>` no card
- ✓ a tela não mostra campo de e-mail nem o botão "Reenviar o link" | observado nenhum campo de e-mail e nenhum botão no card além de "Entrar"
- ✓ base visual mecânica | nenhuma imagem na página; nenhum elemento fora da janela, cortado ou com clique interceptado
- `*` base visual por screenshot | interpretado como: sem corte, sobreposição ou layout desmontado | observado nenhum achado | passou

<details>
<summary>Evidência</summary>

```
rede: GET /api/auth/verify-email?token=eyJ<mascarado> 200; GET /api/v1/session 401
main: "E-mail confirmado\n\nSua conta está ativa.\n\nEntrar"
banco: sara.m@example.com emailVerified t
screenshot: <tmp>/evaluator-rf002-2026-11-01T12-11-21Z/UI_ATIVACAO_01.png (apagado na derrubada)
```

</details>

#### UI-ATIVACAO-02 *
- Veredito: passou
- `*` a tela diz que a conta já está confirmada | interpretado como: título e texto do card | observado "Conta já confirmada" e "Esta conta já está confirmada." | passou
- ✓ a tela tem um link ou botão "Entrar" para /entrar | observado `<a href="/entrar">Entrar</a>` no card
- ✓ a tela não mostra o botão "Reenviar o link" | observado ausente
- ✓ base visual mecânica | nenhum achado
- `*` base visual por screenshot | observado nenhum achado | passou

<details>
<summary>Evidência</summary>

```
ativação prévia por GET /api/auth/verify-email -> 200
rede no navegador: GET /api/auth/verify-email?token=eyJ<mascarado> 200 (corpo com ALREADY_VERIFIED)
main: "Conta já confirmada\n\nEsta conta já está confirmada.\n\nEntrar"
```

</details>

#### UI-VENCIDO-01 *
- Veredito: passou
- `*` a tela diz que o link expirou | interpretado como: título e texto do card | observado "Link expirado" e "Este link expirou. Peça um novo link abaixo." | passou
- ✓ a tela mostra o campo de e-mail com rótulo visível e o botão "Reenviar o link" | observado input type=email com label "E-mail" visível e botão "Reenviar o link"
- `*` a tela não diz que o e-mail foi confirmado | interpretado como: nenhum texto de confirmação no card | observado ausente | passou
- ✓ a conta de tais@example.com continua com e-mail não verificado no banco | esperado f, observado f
- ✓ base visual mecânica | nenhum achado
- `*` base visual por screenshot | observado nenhum achado | passou

<details>
<summary>Evidência</summary>

```
expiresAt movido para 1 minuto antes de agora
rede: GET /api/auth/verify-email?token=eyJ<mascarado> 401
main: "Link expirado\n\nEste link expirou. Peça um novo link abaixo.\n\nE-mail\nReenviar o link"
```

</details>

#### UI-REENVIO-01 *
- Veredito: passou
- ✓ a página envia POST /api/auth/send-verification-email com o e-mail teo@example.com e recebe 200 | observado corpo `{"email":"teo@example.com"}`, status 200
- `*` a tela informa que um novo link foi enviado se o e-mail tiver conta pendente | interpretado como: mensagem de confirmação do envio, condicionada à conta pendente | observado "Se o e-mail tiver uma conta pendente, enviamos um novo link." | passou
- ✓ a página não envia uma segunda requisição a /api/auth/verify-email | esperado 1 requisição no total, observado 1 (só a da abertura)
- ✓ base visual mecânica, antes e depois do clique | nenhum achado
- `*` base visual por screenshot, antes e depois do clique | observado nenhum achado | passou

<details>
<summary>Evidência</summary>

```
rede: GET /api/auth/verify-email?token=eyJ<mascarado> 401; GET /api/v1/session 401;
      POST /api/auth/send-verification-email {"email":"teo@example.com"} 200; GET /api/v1/session 401
main depois do clique: "Link expirado\n\nEste link expirou. Peça um novo link abaixo.\n\nSe o e-mail tiver uma conta pendente, enviamos um novo link."
```

</details>

#### UI-INVALIDO-01 *
- Veredito: passou
- `*` a tela diz que o link não vale | interpretado como: título e texto do card | observado "Link inválido" e "Este link não vale mais. Peça um novo link abaixo." | passou
- ✓ a tela mostra o campo de e-mail e o botão "Reenviar o link" | observado os dois
- `*` a tela não diz que o e-mail foi confirmado | observado ausente | passou
- ✓ base visual mecânica | nenhum achado
- `*` base visual por screenshot | observado nenhum achado | passou

<details>
<summary>Evidência</summary>

```
/confirmar-email?token=abc; rede: GET /api/auth/verify-email?token=abc 401
main: "Link inválido\n\nEste link não vale mais. Peça um novo link abaixo.\n\nE-mail\nReenviar o link"
```

</details>

#### UI-INVALIDO-02 *
- Veredito: passou
- `*` a tela diz que o link não vale | observado "Link inválido" e "Este link não vale mais. Peça um novo link abaixo." | passou
- ✓ a página não envia requisição a /api/auth/verify-email | esperado 0, observado 0 (só GET /api/v1/session)
- ✓ a tela mostra o botão "Reenviar o link" | observado presente
- ✓ base visual mecânica | nenhum achado
- `*` base visual por screenshot | observado nenhum achado | passou

<details>
<summary>Evidência</summary>

```
/confirmar-email sem token; rede durante 2,3 s: GET /api/v1/session 401
main: "Link inválido\n\nEste link não vale mais. Peça um novo link abaixo.\n\nE-mail\nReenviar o link"
```

</details>

#### UI-INVALIDO-03 *
- Veredito: passou
- `*` a tela diz que o link não vale | observado "Link inválido" e "Este link não vale mais. Peça um novo link abaixo." | passou
- ✓ a tela mostra o campo de e-mail e o botão "Reenviar o link" | observado os dois
- ✓ a conta de ugo.r@example.com continua com e-mail não verificado no banco | esperado f, observado f
- ✓ base visual mecânica | nenhum achado
- `*` base visual por screenshot | observado nenhum achado | passou

<details>
<summary>Evidência</summary>

```
reenvio prévio (203.0.113.28) -> 200 {"status": true}
L1 no navegador: GET /api/auth/verify-email?token=eyJ<mascarado> 401
```

</details>

#### UI-FALHA-01 *
- Veredito: passou
- `*` a tela mostra o aviso de que o servidor não respondeu | interpretado como: aviso no card | observado "O servidor não respondeu. Tente de novo." | passou
- `*` a tela não diz que o e-mail foi confirmado | observado ausente; título "Confirmação de e-mail" | passou
- `*` a página não mostra a página de erro | interpretado como: a tela continua com a barra de navegação e o card da confirmação, sem a página de erro da aplicação nem a do roteador | observado barra "App, Entrar, Criar conta" e card com o aviso | passou
- ✓ base visual mecânica | nenhum achado
- `*` base visual por screenshot | observado nenhum achado | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api; estado do container: exited
rede: GET /api/v1/session e GET /api/auth/verify-email?token=eyJ<mascarado>, as duas net::ERR_CONNECTION_REFUSED
main: "Confirmação de e-mail\n\nO servidor não respondeu. Tente de novo."
api religada pelo Compose depois do item; vera.c@example.com emailVerified f
```

</details>

#### UI-VISUAL-01 *
- Veredito: passou
- ✓ o "Entrar" tem fundo #000, texto #fff e raio de borda de 999px | observado background-color rgb(0, 0, 0), color rgb(255, 255, 255), border-radius 999px (o "Entrar" do card)
- ✓ o card da confirmação tem fundo #fff e raio de borda de 16px | observado rgb(255, 255, 255) e 16px
- ✓ a família de fonte computada do título começa por Inter Variable | observado `"Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif`
- ✓ a página não tem rolagem horizontal | observado scrollWidth 375 igual a clientWidth 375
- `*` a barra de navegação está visível acima do card | interpretado como: nav visível e com a borda de baixo acima do topo do card | observado nav de 0 a 76 px, card a partir de 108 px | passou
- ✓ base visual mecânica | nenhum achado
- `*` base visual por screenshot | observado nenhum achado | passou

<details>
<summary>Evidência</summary>

```
viewport 375x812
entrar: class btn-primary, bg rgb(0, 0, 0), color rgb(255, 255, 255), radius 999px
card: class card-content, bg rgb(255, 255, 255), radius 16px
```

</details>

### E2E

#### E2E-CONFIRMACAO-01 *
- Veredito: passou
- `*` na primeira abertura a tela diz que o e-mail foi confirmado | observado "E-mail confirmado" e "Sua conta está ativa." | passou
- `*` na segunda abertura a tela diz que a conta já está confirmada | observado "Conta já confirmada" e "Esta conta já está confirmada." | passou
- ✓ o banco tem a conta de xenia.p@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco não tem sessão para essa conta | esperado 0, observado 0
- ✓ base visual mecânica, no cadastro e nas duas aberturas | nenhum achado
- `*` base visual por screenshot | observado nenhum achado | passou

<details>
<summary>Evidência</summary>

```
antes: nenhuma conta xenia.p@example.com
/cadastro: POST /api/auth/sign-up/email {"name":"Xênia Paz","email":"xenia.p@example.com",...} 200; tela "Confirme seu e-mail"
Mailpit: 1 mensagem; primeira abertura GET verify-email 200; segunda abertura GET verify-email 200 (ALREADY_VERIFIED)
```

</details>

#### E2E-INTEGRACAO-01 *
- Veredito: passou
- `*` a tela diz que o e-mail foi confirmado | observado "E-mail confirmado" e "Sua conta está ativa." | passou
- ✓ o banco tem a conta de yuri@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco tem a conta de yasmin@example.com com e-mail não verificado | esperado f, observado f
- ✓ base visual mecânica | nenhum achado
- `*` base visual por screenshot | observado nenhum achado | passou

<details>
<summary>Evidência</summary>

```
antes: nenhuma das duas contas
/cadastro duas vezes (Yuri, Yasmin, senha Jornada123): os dois POST 200
Mailpit: 1 mensagem para cada; só o link de yuri@example.com aberto: GET verify-email 200
```

</details>

#### E2E-REENVIO-01 *
- Veredito: passou
- `*` o primeiro link mostra que expirou e oferece o reenvio | observado "Link expirado", "Este link expirou. Peça um novo link abaixo.", campo de e-mail e botão "Reenviar o link" | passou
- ✓ em até 2 minutos a caixa tem a mensagem nova para zeca@example.com com um token diferente do primeiro | observado 2 mensagens na primeira consulta depois do reenvio, tokens diferentes
- `*` o link novo mostra que o e-mail foi confirmado | observado "E-mail confirmado" e "Sua conta está ativa." | passou
- ✓ o banco tem a conta de zeca@example.com com e-mail verificado | esperado t, observado t
- ✓ base visual mecânica, em cada tela | nenhum achado
- `*` base visual por screenshot | observado nenhum achado | passou

<details>
<summary>Evidência</summary>

```
/cadastro (Zeca, zeca@example.com, Jornada123) -> POST 200; expiresAt movido para 1 minuto antes de agora
link 1: GET verify-email 401; reenvio pela tela: POST /api/auth/send-verification-email {"email":"zeca@example.com"} 200
link 2: GET verify-email 200
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `compose.yaml`: o serviço api instala nos volumes ao subir; `scripts/db-setup.sh` garante as dependências |
| Ambiente e serviços | 1 e 2 | contrato (Docker Compose) e `compose.yaml`: o ambiente local já no ar, com a api recriada por um override do Compose na pasta temporária (`COMPOSE_FILE`) |
| Banco efêmero e migração | 5 | `scripts/db-setup.sh`: banco `eval_rf002_2026_11_01t12_11_21z` no postgres do Compose, `DATABASE_URL` da api trocada pelo override, `make db-setup` migra e cria o admin |
| Isolamento do Valkey | 4 e 6 | avaliação do RF-001: `REDIS_URL=redis://valkey:6379/3` no override, banco lógico 3 vazio antes da avaliação |
| Estado persistido | 1 | contrato: janelas de rate limit livres; chaves `rate-limit:*` apagadas no Valkey |
| Limpeza entre itens | 4 e 6 | como no RF-001: DELETE da tabela verification e das contas sem papel admin (account e session em cascata), `rate-limit:*` no Valkey e DELETE /api/v1/messages no Mailpit |
| Gates | 1 | contrato: `make check` e `make build` na raiz |
| Cliente HTTP | 6 | `urllib` do Python, com o X-Forwarded-For do contrato e o Origin da SPA |
| Logs da api | 1 e 3 | contrato e spec, Verificação por superfície: `docker compose logs api --since <início do item>` |
| Caixa de e-mail | 3 | spec, Verificação por superfície (ADR-0016): API REST do Mailpit |
| Banco | 1 | contrato, Configuração: registro em `verification` por identifier `email-verification:` e value igual ao id da conta |
| Navegador | 3 | spec, Verificação por superfície (ADR-0024): Chromium headless pelo `playwright-core` 1.64 do `@playwright/cli` no cache do npx, dirigido por script Node, um contexto sem cookie por item |
| Serviço api parado | 3 | spec: `docker compose stop api` e religada com `docker compose up -d --wait --no-deps api` |
| Base visual | 6 | `evaluate` no navegador (imagens, caixas na janela, corte por `overflow`, `elementFromPoint`) e screenshot por item, revisado sem achados |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_rf002_*`, nenhuma pasta `evaluator-rf002-*` e nenhum PID de avaliação anterior no início.
- Derrubada: completa. Nenhum PID no `processos.lock` (o navegador fechou com cada script); api recriada sem o override, de volta à `DATABASE_URL` do banco `app` e ao Valkey no banco 0, saudável; banco lógico 3 do Valkey esvaziado; caixa do Mailpit esvaziada; banco `eval_rf002_2026_11_01t12_11_21z` apagado; pasta `/tmp/evaluator-rf002-2026-11-01T12-11-21Z` apagada, com os screenshots.

## Avisos

- Avaliado com 1 arquivo fora de commit, só documentação: `docs/features/RF-002-confirmar-e-mail/orquestracao.md`. O código avaliado é o do commit f468f21.
- Os gates rodaram antes de a api ser recriada apontando para o banco efêmero: o `make build` no host reescreve `apps/api/dist`, que é bind mount do `nest start --watch` do container, e derrubou a api na avaliação anterior. Nesta ordem a api subiu saudável depois do build e não houve erro de transporte em nenhum item.
- API-SIGILO-01: a rota `/api/auth/verify-email` não escreve linha de log na api (0 linhas capturadas na janela do item); os bullets de ausência passam sobre o que foi capturado, e uma busca ampla nos últimos 10 minutos de log (57 linhas) não achou token, e-mail, nome nem `verify-email`.
- A SPA mostra "Entrar" também na barra de navegação; os bullets de "Entrar" (UI-ATIVACAO-01, UI-ATIVACAO-02, UI-VISUAL-01) foram conferidos no "Entrar" do card da confirmação.
- Os itens usam o Valkey (banco lógico 3) e o Mailpit compartilhados do ambiente de desenvolvimento: a caixa do Mailpit foi esvaziada antes de cada item.
- E2E-INTEGRACAO-01 e E2E-REENVIO-01 não dão nome às contas; o cadastro usou Yuri, Yasmin e Zeca.

## Motivo do aborto

Nenhum.
