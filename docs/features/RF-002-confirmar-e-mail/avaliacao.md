# Avaliação: RF-002 Confirmar e-mail

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-11-02T02-30-34Z
- Branch: fix/email-token-na-fila
- Commit: 05d1238
- Status: limpo
- Itens: 35 passou, 0 falhou, 0 bloqueado, 0 manual, 0 pulado, de 35
- Critérios: 4 verificado, 0 reprovado, 0 indeterminado, de 4
- Filtros: nenhum

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| Link aberto dentro de 24 horas ativa a conta e não pode ser usado de novo. | ✓ verificado | API-ATIVACAO-01, API-ATIVACAO-02, API-ATIVACAO-03, API-ATIVACAO-04, API-ATIVACAO-05, API-ATIVACAO-06, API-ATIVACAO-07, API-ATIVACAO-08, API-SIGILO-01, UI-ATIVACAO-01, UI-ATIVACAO-02, UI-FALHA-01, UI-FALHA-02, UI-VISUAL-01, E2E-CONFIRMACAO-01 |
| Link aberto depois de 24 horas não ativa a conta e a tela oferece reenvio. | ✓ verificado | API-VENCIDO-01, API-VENCIDO-02, API-LIMPEZA-01, UI-VENCIDO-01, UI-REENVIO-01, UI-REENVIO-02, E2E-REENVIO-01 |
| Depois de um reenvio, o link anterior não ativa mais a conta. | ✓ verificado | API-REENVIO-01, API-REENVIO-02, API-REENVIO-03, API-REENVIO-04, API-REENVIO-05, API-REENVIO-06, API-INVALIDO-01, WRK-REENVIO-01, WRK-REENVIO-02, UI-INVALIDO-01, UI-INVALIDO-02, UI-INVALIDO-03, E2E-REENVIO-01 |
| RF-001 → RF-002: a conta criada no cadastro fica ativa ao abrir o link recebido no e-mail daquele cadastro, e só ela. | ✓ verificado | E2E-INTEGRACAO-01, E2E-CONFIRMACAO-01 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (com `TURBO_FORCE=true`: 5 tarefas, 0 do cache; API 28 arquivos de unidade (182 testes) e 14 de integração (107 testes), SPA 11 arquivos (91 testes), Contratos 3 arquivos (34 testes); "ok: todas as verificações passaram")
- ✓ build: `make build`, código 0 (com `TURBO_FORCE=true`: 4 tarefas, 0 do cache)

## Pré-requisitos

### Serviços em execução
- ✓ api (com o worker do Módulo E-mail): http://localhost:3000, saúde /api/health respondeu 200 `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`, recriada apontando para o banco efêmero `eval_rf002_2026_11_02t02_30_34z` e para o Valkey no banco lógico 3; parada e religada em UI-FALHA-01 e UI-FALHA-02, de volta saudável
- ✓ web: http://localhost:5173/ saudável no Compose
- ✓ postgres: saudável no Compose (PostgreSQL 18)
- ✓ valkey: saudável no Compose (Valkey 9), banco lógico 3 vazio no início; parado e religado em API-REENVIO-05 e API-REENVIO-06, de volta saudável
- ✓ mailpit: saudável no Compose (axllent/mailpit:v1.32), API REST em http://localhost:8025

### Estado persistido
- ✓ `janela-de-cadastro-livre`: chaves `rate-limit:*` apagadas no banco lógico 3 do Valkey antes de cada item; conferido: nenhum cadastro recebeu 429 e cada item fora do navegador usou um IP 203.0.113.x próprio
- ✓ `janela-de-reenvio-livre`: mesmo mecanismo; conferido: os três primeiros reenvios de API-REENVIO-04 responderam 200 e só o quarto do mesmo IP recebeu 429

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env` copiado do `.env.example` (idênticos): NODE_ENV=development e TRUSTED_PROXIES vazia em vigor no container da api (o contrato pede development e vazia); `make db-setup` aplicado ao banco efêmero (migrações aplicadas, "seed: primeiro admin criado")
- ✓ X-Forwarded-For por item: cada cadastro e reenvio fora do navegador levou um IP 203.0.113.x exclusivo do item (de .1 a .21 na API e no Worker, de .101 a .111 no Dado dos itens de UI)
- ✓ Link da conta: lido da mensagem mais recente para o e-mail na caixa do Mailpit (busca `to:"<e-mail>"`), token pelo parâmetro `token`
- ✓ Registro de confirmação: linha de `verification` com identifier `email-verification:<hash>` e value igual ao id da conta; vencimento movido com UPDATE do `expiresAt`

### Dependências externas
- ✓ DEP-1 serviço de envio de e-mail: Mailpit v1.32 do Compose, lido e esvaziado pela API REST (`/api/v1/search`, `/api/v1/message/<id>`, DELETE `/api/v1/messages`)

## Itens

### API HTTP

#### API-ATIVACAO-01
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz status verdadeiro e não traz o código ALREADY_VERIFIED | esperado status true sem ALREADY_VERIFIED, observado {"status": true, "user": null}
- ✓ a resposta não define cookie de sessão | esperado nenhum Set-Cookie de sessão, observado nenhum Set-Cookie
- ✓ o banco tem a conta de lia@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco não tem sessão para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
IP 203.0.113.1
GET verify-email?token=eyJ<mascarado> -> 200 {"status": true, "user": null} set-cookie=[]
```

</details>

#### API-ATIVACAO-02
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz o código ALREADY_VERIFIED | esperado ALREADY_VERIFIED, observado {"status": true, "code": "ALREADY_VERIFIED"}
- ✓ a conta de leo@example.com continua com e-mail verificado | esperado t, observado t
- ✓ o banco não tem registro de confirmação para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
IP 203.0.113.2
primeira ativação -> 200 {"status": true, "user": null}
segunda -> 200 {"status": true, "code": "ALREADY_VERIFIED"}
```

</details>

#### API-ATIVACAO-03
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo traz o código INVALID_TOKEN | esperado INVALID_TOKEN, observado {"code": "INVALID_TOKEN", "message": "Este link n\u00e3o vale mais. Pe\u00e7a um novo link abaixo."}
- ✓ a conta de luna@example.com continua com e-mail não verificado | esperado f, observado f

<details>
<summary>Evidência</summary>

```
IP 203.0.113.3
primeira ativação -> 200; emailVerified voltado a false no banco
GET -> 401 {"code": "INVALID_TOKEN", "message": "Este link n\u00e3o vale mais. Pe\u00e7a um novo link abaixo."}
```

</details>

#### API-ATIVACAO-04
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o banco tem a conta de lara@example.com com e-mail verificado | esperado t, observado t

<details>
<summary>Evidência</summary>

```
IP 203.0.113.4
expiresAt movido para 2026-11-02 02:36:41.434 (agora+1min, UTC)
GET -> 200 {"status": true, "user": null}
```

</details>

#### API-ATIVACAO-05
- Veredito: passou
- ✓ o banco tem exatamente um registro de confirmação para a conta de lucas@example.com | esperado 1, observado 1
- ✓ o expiresAt desse registro fica entre 23 horas e 59 minutos e 24 horas e 1 minuto depois da resposta | esperado 86340 a 86460 s, observado 86399.1 s
- ✓ o identifier e o value desse registro não contêm o token do link que chegou para lucas@example.com | esperado token ausente, observado identifier=email-verification:13525751e6e3af369a8ea22091878ee6207d80697..., value=id da conta; token presente=False
- ✓ o expiresAt desse registro é igual, ao segundo, ao instante de expiração (campo exp do payload) do token do link que chegou para lucas@example.com | esperado 1793673342, observado 1793673342

<details>
<summary>Evidência</summary>

```
IP 203.0.113.5
contas lucas antes: 0
POST sign-up -> 200 em 2026-11-02T02:35:42.892042+00:00
registros: [('email-verification:13525751e6e3af369a8ea...', '2026-11-03 02:35:42')]
exp do JWT=1793673342 (2026-11-03T02:35:42+00:00), expiresAt=2026-11-03 02:35:42
```

</details>

#### API-ATIVACAO-06
- Veredito: passou
- ✓ as duas respostas são 200 | esperado [200, 200], observado [200, 200]
- ✓ ao menos uma resposta não traz o código ALREADY_VERIFIED | esperado ao menos uma sem ALREADY_VERIFIED, observado [None, None]
- ✓ o banco tem a conta de lis@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco não tem registro de confirmação para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
IP 203.0.113.6
GET simultâneo 1 -> 200 {"status": true, "user": null}
GET simultâneo 2 -> 200 {"status": true, "user": null}
```

</details>

#### API-ATIVACAO-07
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ a conta continua com e-mail não verificado | esperado f, observado f
- ✓ o banco continua com um registro de confirmação para essa conta | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
IP 203.0.113.7
e-mail trocado no banco para lina.outra@example.com
GET -> 401 {"message": "User not found", "code": "USER_NOT_FOUND"}
```

</details>

#### API-ATIVACAO-08
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o banco tem a conta de lino@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco não tem registro de confirmação para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
IP 203.0.113.8
com e-mail lino.outro: GET -> 401 {"message": "User not found", "code": "USER_NOT_FOUND"}
e-mail de volta; GET -> 200 {"status": true, "user": null}
```

</details>

#### API-VENCIDO-01
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo traz o código TOKEN_EXPIRED | esperado TOKEN_EXPIRED, observado {"code": "TOKEN_EXPIRED", "message": "Este link expirou. Pe\u00e7a um novo link abaixo."}
- ✓ a conta de mia@example.com continua com e-mail não verificado | esperado f, observado f

<details>
<summary>Evidência</summary>

```
IP 203.0.113.9
expiresAt movido para 2026-11-02 02:34:52.795 (agora-1min, UTC)
GET -> 401 {"code": "TOKEN_EXPIRED", "message": "Este link expirou. Pe\u00e7a um novo link abaixo."}
```

</details>

#### API-VENCIDO-02
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo traz o código TOKEN_EXPIRED | esperado TOKEN_EXPIRED, observado {"code": "TOKEN_EXPIRED", "message": "Este link expirou. Pe\u00e7a um novo link abaixo."}
- ✓ a conta de mel@example.com continua com e-mail não verificado | esperado f, observado f

<details>
<summary>Evidência</summary>

```
IP 203.0.113.10
primeiro GET -> 401 {"code": "TOKEN_EXPIRED", "message": "Este link expirou. Pe\u00e7a um novo link abaixo."}
segundo GET -> 401 {"code": "TOKEN_EXPIRED", "message": "Este link expirou. Pe\u00e7a um novo link abaixo."}
```

</details>

#### API-REENVIO-01
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 status true, observado 200 {"status": true}
- ✓ o banco tem exatamente um registro de confirmação para a conta de nina@example.com | esperado 1, observado 1
- ✓ esse registro não é o R1 | esperado id diferente de 1388ecce-a6b6-469d-a30f-5e939d33fd30, observado f74be4d1-6036-446e-a75a-4f9d15c6b376
- ✓ o expiresAt desse registro fica entre 23 horas e 59 minutos e 24 horas e 1 minuto depois da resposta | esperado 86340 a 86460 s, observado 86398.8 s

<details>
<summary>Evidência</summary>

```
IP 203.0.113.11
R1 id=1388ecce-a6b6-469d-a30f-5e939d33fd30
POST send-verification-email -> 200 {"status": true}
registros depois: [('f74be4d1-6036-446e-a75a-4f9d15c6b376', '2026-11-03 02:35:56')]
```

</details>

#### API-REENVIO-02
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo traz o código INVALID_TOKEN | esperado INVALID_TOKEN, observado {"code": "INVALID_TOKEN", "message": "Este link n\u00e3o vale mais. Pe\u00e7a um novo link abaixo."}
- ✓ a conta de noa@example.com continua com e-mail não verificado | esperado f, observado f

<details>
<summary>Evidência</summary>

```
IP 203.0.113.12
reenvio -> 200 {"status": true}
GET T1 -> 401 {"code": "INVALID_TOKEN", "message": "Este link n\u00e3o vale mais. Pe\u00e7a um novo link abaixo."}
```

</details>

#### API-REENVIO-03
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o banco tem a conta de nara@example.com com e-mail verificado | esperado t, observado t
- ✓ T2 é diferente de T1 | esperado diferentes, observado diferentes

<details>
<summary>Evidência</summary>

```
IP 203.0.113.13
reenvio -> 200; T1=eyJ<mascarado> T2=eyJ<mascarado>
GET T2 -> 200 {"status": true, "user": null}
```

</details>

#### API-REENVIO-04
- Veredito: passou
- ✓ a resposta é 429 | esperado 429, observado 429
- ✓ a resposta traz o cabeçalho X-Retry-After | esperado presente, observado 58

<details>
<summary>Evidência</summary>

```
IP 203.0.113.14
três reenvios -> [200, 200, 200] em 1.5 s
quarto -> 429 X-Retry-After=58 {"message": "Too many requests. Please try again later."}
```

</details>

#### API-REENVIO-05
- Veredito: passou
- ✓ a resposta é 500 | esperado 500, observado 500
- ✓ o banco tem exatamente um registro de confirmação para a conta de omar@example.com | esperado 1, observado 1
- ✓ esse registro é o R1 | esperado 1b54e2eb-8d4e-4f51-b751-0f2f1c0fad83, observado 1b54e2eb-8d4e-4f51-b751-0f2f1c0fad83

<details>
<summary>Evidência</summary>

```
IP 203.0.113.15
R1 id=1b54e2eb-8d4e-4f51-b751-0f2f1c0fad83; valkey parado
reenvio -> 500 ""
valkey religado, api saudável
```

</details>

#### API-REENVIO-06
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o banco tem a conta de otto@example.com com e-mail verificado | esperado t, observado t

<details>
<summary>Evidência</summary>

```
IP 203.0.113.16
valkey parado; reenvio -> 500
valkey religado, api saudável
GET T1 -> 200 {"status": true, "user": null}
```

</details>

#### API-LIMPEZA-01
- Veredito: passou
- ✓ o banco não tem registro de confirmação para a conta de paulo@example.com | esperado 0, observado 0
- ✓ o banco continua com um registro de confirmação para a conta de pedro@example.com | esperado 1, observado 1
- ✓ o banco tem exatamente um registro de confirmação para a conta de priscila@example.com | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
IP 203.0.113.17
paulo expiresAt=2026-10-25 02:36:23.355; pedro expiresAt=2026-11-01 02:36:23.746
contas priscila antes: 0
POST sign-up priscila -> 200
```

</details>

#### API-INVALIDO-01
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo traz o código INVALID_TOKEN | esperado INVALID_TOKEN, observado {"code": "INVALID_TOKEN", "message": "Este link n\u00e3o vale mais. Pe\u00e7a um novo link abaixo."}
- ✓ a conta de olga@example.com continua com e-mail não verificado | esperado f, observado f
- ✓ o banco continua com um registro de confirmação para essa conta | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
IP 203.0.113.18
último caractere trocado: 'Y' -> 'A'
GET token alterado -> 401 {"code": "INVALID_TOKEN", "message": "Este link n\u00e3o vale mais. Pe\u00e7a um novo link abaixo."}
```

</details>

#### API-SIGILO-01 *
- Veredito: passou
- `*` nenhuma linha de log do serviço api escrita durante o item contém T1 | interpretado como: "durante o item" lido como todo o item, do Dado ao Então (1 linhas); no Quando sozinho, 0 de 1 | observado 0 de 1 linhas | passou
- `*` nenhuma dessas linhas contém pia@example.com | interpretado como: "durante o item" lido como todo o item, do Dado ao Então (1 linhas); no Quando sozinho, 0 de 1 | observado 0 de 1 linhas | passou
- `*` nenhuma dessas linhas contém Pia Torres | interpretado como: "durante o item" lido como todo o item, do Dado ao Então (1 linhas); no Quando sozinho, 0 de 1 | observado 0 de 1 linhas | passou

<details>
<summary>Evidência</summary>

```
IP 203.0.113.19
GET -> 200; linhas de log da api: 1 desde o Quando (2026-11-02T02:36:29.323131Z), 1 desde o início do item (2026-11-02T02:36:27.641195Z)
  {"level":30,"time":1793586990932,"pid":179,"hostname":"3422bc3c136c","req":{"id":"128d7621-68b9-42e2-9dd6-dcfbc3c9df4a","method":"GET","url":"/api/health","headers":{"host":"localhost:3000","connection":"keep-alive","accept":"*/*","accept-language":"*","sec-fetch-mode":"cors","user-agent":"node","ac
```

</details>

### Worker

#### WRK-REENVIO-01
- Veredito: passou
- ✓ em até 2 minutos a caixa tem exatamente duas mensagens para rita@example.com | esperado 2, observado 2
- ✓ a mais recente tem um link que começa com o WEB_ORIGIN do .env seguido de /confirmar-email?token= | esperado http://localhost:5173/confirmar-email?token=..., observado http://localhost:5173/confirmar-email?token=...
- ✓ o token desse link é diferente do token da mensagem do cadastro | esperado diferentes, observado diferentes
- ✓ o corpo da mais recente diz "O link vale por 24 horas." | esperado presente, observado presente

<details>
<summary>Evidência</summary>

```
IP 203.0.113.20
reenvio -> 200 {"status": true}
caixa: 2 mensagens para rita@example.com em 1.0 s; assuntos ['Confirme seu e-mail', 'Confirme seu e-mail']
link mais recente: http://localhost:5173/confirmar-email?token=eyJ<mascarado>
```

</details>

#### WRK-REENVIO-02
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 status true, observado 200 {"status": true}
- ✓ depois de 1 minuto a caixa continua com uma só mensagem para raul@example.com | esperado 1, observado 1
- ✓ o banco não tem registro de confirmação para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
IP 203.0.113.21
ativada -> 200; mensagens na caixa: 1
reenvio -> 200 {"status": true}
depois de 61 s: 1 mensagens
```

</details>

### UI

#### UI-ATIVACAO-01 *
- Veredito: passou
- ✓ a página envia GET /api/auth/verify-email com o token do link e recebe 200 | esperado GET com o token do link, 200, observado GET token igual=true 200
- `*` a tela diz que o e-mail foi confirmado | interpretado como: o título "E-mail confirmado" no card | observado E-mail confirmado | passou
- ✓ a tela tem um link ou botão "Entrar" para /entrar | esperado link "Entrar" com href /entrar, observado 1 link(s), href /entrar
- ✓ a tela não mostra campo de e-mail nem o botão "Reenviar o link" | esperado nenhum dos dois, observado campo false, botão false
- ✓ base visual (confirmado): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado

<details>
<summary>Evidência</summary>

```
IP 203.0.113.101
abriu http://localhost:5173/confirmar-email?token=eyJ<mascarado>; requisições verify-email: GET 200
main: "E-mail confirmado\n\nSua conta está ativa.\n\nEntrar"
screenshot <pasta temporária>/shots/UI-ATIVACAO-01-1-confirmado.png
```

</details>

#### UI-ATIVACAO-02 *
- Veredito: passou
- `*` a tela diz que a conta já está confirmada | interpretado como: o título "Conta já confirmada" e o texto "Esta conta já está confirmada." | observado Conta já confirmada | passou
- ✓ a tela tem um link ou botão "Entrar" para /entrar | esperado link "Entrar" com href /entrar, observado 1 link(s), href /entrar
- ✓ a tela não mostra o botão "Reenviar o link" | esperado ausente, observado ausente
- ✓ base visual (ja-confirmada): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado

<details>
<summary>Evidência</summary>

```
IP 203.0.113.102
ativada antes pelo link: GET -> 200
main: "Conta já confirmada\n\nEsta conta já está confirmada.\n\nEntrar"
screenshot <pasta temporária>/shots/UI-ATIVACAO-02-2-ja-confirmada.png
```

</details>

#### UI-VENCIDO-01 *
- Veredito: passou
- `*` a tela diz que o link expirou | interpretado como: o título "Link expirado" e o texto "Este link expirou..." | observado Link expirado | passou
- ✓ a tela mostra o campo de e-mail com rótulo visível e o botão "Reenviar o link" | esperado campo com rótulo visível e botão, observado campo true, rótulo "E-mail", botão true
- `*` a tela não diz que o e-mail foi confirmado | interpretado como: a ausência do título "E-mail confirmado" | observado ausente | passou
- ✓ a conta de tais@example.com continua com e-mail não verificado no banco | esperado f, observado f
- ✓ base visual (expirado): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado

<details>
<summary>Evidência</summary>

```
IP 203.0.113.103
expiresAt movido para 2026-11-02 02:38:56.352
main: "Link expirado\n\nEste link expirou. Peça um novo link abaixo.\n\nE-mail\nReenviar o link"
screenshot <pasta temporária>/shots/UI-VENCIDO-01-3-expirado.png
```

</details>

#### UI-REENVIO-01
- Veredito: passou
- ✓ a página envia POST /api/auth/send-verification-email com o e-mail teo@example.com e recebe 200 | esperado POST {"email":"teo@example.com"} 200, observado POST {"email":"teo@example.com"} 200
- ✓ a tela informa que um novo link foi enviado se o e-mail tiver conta pendente | esperado "Se o e-mail tiver uma conta pendente, enviamos um novo link.", observado presente
- ✓ a tela mostra o botão "Enviar para outro e-mail" | esperado presente, observado presente
- ✓ a tela não mostra o campo de e-mail | esperado ausente, observado ausente
- ✓ a página não envia uma segunda requisição a /api/auth/verify-email | esperado 1 requisição no total (a da abertura), observado 1 antes do clique, 1 depois
- ✓ base visual (link-enviado): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado

<details>
<summary>Evidência</summary>

```
IP 203.0.113.104
tela aberta: Link expirado
requisições de reenvio: POST {"email":"teo@example.com"} 200
main: "Link expirado\n\nEste link expirou. Peça um novo link abaixo.\n\nSe o e-mail tiver uma conta pendente, enviamos um novo link.\n\nEnviar para outro e-mail"
screenshot <pasta temporária>/shots/UI-REENVIO-01-4-link-enviado.png
```

</details>

#### UI-REENVIO-02 *
- Veredito: passou
- ✓ a tela mostra o campo de e-mail com rótulo visível e o valor tina@example.com | esperado campo com rótulo visível e valor tina@example.com, observado campo true, rótulo "E-mail", valor tina@example.com
- ✓ a tela mostra o botão "Reenviar o link" | esperado presente, observado presente
- `*` a página não envia requisição a /api/auth/verify-email | interpretado como: nenhuma requisição a verify-email depois do clique em "Enviar para outro e-mail" (a da abertura do link é o Dado) | observado 0 nova(s) | passou
- ✓ base visual (outro-email): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado

<details>
<summary>Evidência</summary>

```
IP 203.0.113.105
tela aberta: Link expirado
aviso de link enviado na tela
campo true, rótulo E-mail, valor tina@example.com
screenshot <pasta temporária>/shots/UI-REENVIO-02-5-outro-email.png
```

</details>

#### UI-INVALIDO-01 *
- Veredito: passou
- `*` a tela diz que o link não vale | interpretado como: o título "Link inválido" e o texto "Este link não vale mais..." | observado Link inválido | passou
- ✓ a tela mostra o campo de e-mail e o botão "Reenviar o link" | esperado os dois, observado campo true, botão true
- `*` a tela não diz que o e-mail foi confirmado | interpretado como: a ausência do título "E-mail confirmado" | observado ausente | passou
- ✓ base visual (invalido): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado

<details>
<summary>Evidência</summary>

```
IP 203.0.113.106
verify-email: GET 401
main: "Link inválido\n\nEste link não vale mais. Peça um novo link abaixo.\n\nE-mail\nReenviar o link"
screenshot <pasta temporária>/shots/UI-INVALIDO-01-6-invalido.png
```

</details>

#### UI-INVALIDO-02 *
- Veredito: passou
- `*` a tela diz que o link não vale | interpretado como: o título "Link inválido" e o texto "Este link não vale mais..." | observado Link inválido | passou
- ✓ a página não envia requisição a /api/auth/verify-email | esperado 0, observado 0
- ✓ a tela mostra o botão "Reenviar o link" | esperado presente, observado presente
- ✓ base visual (sem-token): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado

<details>
<summary>Evidência</summary>

```
IP 203.0.113.107
main: "Link inválido\n\nEste link não vale mais. Peça um novo link abaixo.\n\nE-mail\nReenviar o link"
screenshot <pasta temporária>/shots/UI-INVALIDO-02-7-sem-token.png
```

</details>

#### UI-INVALIDO-03 *
- Veredito: passou
- `*` a tela diz que o link não vale | interpretado como: o título "Link inválido" e o texto "Este link não vale mais..." | observado Link inválido | passou
- ✓ a tela mostra o campo de e-mail e o botão "Reenviar o link" | esperado os dois, observado campo true, botão true
- ✓ a conta de ugo.r@example.com continua com e-mail não verificado no banco | esperado f, observado f
- ✓ base visual (l1-invalido): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado

<details>
<summary>Evidência</summary>

```
IP 203.0.113.108
reenvio pela API -> 200
main: "Link inválido\n\nEste link não vale mais. Peça um novo link abaixo.\n\nE-mail\nReenviar o link"
screenshot <pasta temporária>/shots/UI-INVALIDO-03-8-l1-invalido.png
```

</details>

#### UI-FALHA-01 *
- Veredito: passou
- `*` a tela mostra o aviso de que o servidor não respondeu | interpretado como: o aviso role=alert com "O servidor não respondeu" dentro da tela de confirmação | observado "O servidor não respondeu. Tente de novo." | passou
- `*` a tela não diz que o e-mail foi confirmado | interpretado como: a ausência do título "E-mail confirmado" | observado ausente | passou
- `*` a página não mostra a página de erro | interpretado como: a ausência do título e do botão "Voltar ao início" da página de erro da raiz | observado título "Confirmação de e-mail", "Voltar ao início" 0 | passou
- ✓ base visual (api-fora): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado

<details>
<summary>Evidência</summary>

```
IP 203.0.113.109
serviço api parado
verify-email: GET falhou: net::ERR_CONNECTION_REFUSED
h1 "Confirmação de e-mail"; main: "Confirmação de e-mail\n\nO servidor não respondeu. Tente de novo."
screenshot <pasta temporária>/shots/UI-FALHA-01-9-api-fora.png
```

</details>

#### UI-FALHA-02
- Veredito: passou
- ✓ a página mostra que o servidor não respondeu | esperado "O servidor não respondeu", observado presente
- ✓ a página não mostra o texto "Nenhuma sessão aberta." | esperado ausente, observado ausente
- ✓ base visual (raiz-api-fora): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado

<details>
<summary>Evidência</summary>

```
IP 203.0.113.110
serviço api parado (estado antes: parado)
body: "App\nEntrar\nCriar conta\nO servidor não respondeu\n\nNão foi possível falar com a API. Tente de novo em alguns instantes.\n\nVoltar ao início"
screenshot <pasta temporária>/shots/UI-FALHA-02-10-raiz-api-fora.png
api religada: {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
```

</details>

#### UI-VISUAL-01 *
- Veredito: passou
- ✓ o "Entrar" tem fundo #000, texto #fff e raio de borda de 999px | esperado rgb(0, 0, 0), rgb(255, 255, 255), 999px, observado rgb(0, 0, 0), rgb(255, 255, 255), 999px 999px
- ✓ o card da confirmação tem fundo #fff e raio de borda de 16px | esperado rgb(255, 255, 255), 16px, observado rgb(255, 255, 255), 16px 16px
- ✓ a família de fonte computada do título começa por Inter Variable | esperado começa por Inter Variable, observado "Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif
- ✓ a página não tem rolagem horizontal | esperado scrollWidth <= clientWidth, observado 375 <= 375
- `*` a barra de navegação está visível acima do card | interpretado como: a barra visível e a base dela acima do topo do card | observado visível true, base 76, topo do card 108 | passou
- ✓ base visual (375px): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado

<details>
<summary>Evidência</summary>

```
IP 203.0.113.111
{"entrar":{"bg":"rgb(0, 0, 0)","color":"rgb(255, 255, 255)","radius":"999px 999px"},"card":{"bg":"rgb(255, 255, 255)","radius":"16px 16px"},"font":"\"Inter Variable\", system-ui, \"Helvetica Neue\", Arial, sans-serif","scroll":{"sw":375,"cw":375},"nav":{"visible":true,"bottom":76,"cardTop":108}}
screenshot <pasta temporária>/shots/UI-VISUAL-01-11-375px.png
```

</details>

### E2E

#### E2E-CONFIRMACAO-01 *
- Veredito: passou
- ✓ base visual (cadastro-aceito): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado
- ✓ base visual (primeira-abertura): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado
- `*` na primeira abertura a tela diz que o e-mail foi confirmado | interpretado como: o título da tela | observado E-mail confirmado | passou
- `*` na segunda abertura a tela diz que a conta já está confirmada | interpretado como: o título da tela | observado Conta já confirmada | passou
- ✓ base visual (segunda-abertura): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado
- ✓ o banco tem a conta de xenia.p@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco não tem sessão para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
IP 203.0.113.112
contas antes: 0
screenshot <pasta temporária>/shots/E2E-CONFIRMACAO-01-12-cadastro-aceito.png
link recebido: http://localhost:5173/confirmar-email?token=eyJ<mascarado>
screenshot <pasta temporária>/shots/E2E-CONFIRMACAO-01-13-primeira-abertura.png
primeira abertura: E-mail confirmado; segunda: Conta já confirmada
screenshot <pasta temporária>/shots/E2E-CONFIRMACAO-01-14-segunda-abertura.png
```

</details>

#### E2E-INTEGRACAO-01 *
- Veredito: passou
- `*` a tela diz que o e-mail foi confirmado | interpretado como: o título da tela | observado E-mail confirmado | passou
- ✓ base visual (yuri-confirmado): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado
- ✓ o banco tem a conta de yuri@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco tem a conta de yasmin@example.com com e-mail não verificado | esperado f, observado f

<details>
<summary>Evidência</summary>

```
IP 203.0.113.113
contas antes: yuri 0, yasmin 0
links recebidos: yuri eyJ<mascarado>, yasmin eyJ<mascarado>; tokens diferentes true
screenshot <pasta temporária>/shots/E2E-INTEGRACAO-01-15-yuri-confirmado.png
```

</details>

#### E2E-REENVIO-01 *
- Veredito: passou
- `*` o primeiro link mostra que expirou e oferece o reenvio | interpretado como: o título "Link expirado" com o campo de e-mail e o botão "Reenviar o link" | observado título "Link expirado", campo true, botão true | passou
- ✓ base visual (expirado): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado
- ✓ base visual (reenvio-enviado): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado
- ✓ em até 2 minutos a caixa tem a mensagem nova para zeca@example.com com um token diferente do primeiro | esperado mensagem nova com token diferente, observado 2 mensagens, token diferente
- `*` o link novo mostra que o e-mail foi confirmado | interpretado como: o título da tela | observado E-mail confirmado | passou
- ✓ base visual (link-novo): imagens carregadas e elementos visíveis dentro da janela, sem corte e clicáveis | esperado nenhuma imagem quebrada, nenhum elemento fora, cortado ou encoberto, observado 0 imagens (0 quebradas); nenhum achado
- ✓ o banco tem a conta de zeca@example.com com e-mail verificado | esperado t, observado t

<details>
<summary>Evidência</summary>

```
IP 203.0.113.114
contas antes: 0
expiresAt movido para 2026-11-02 02:39:37.224
screenshot <pasta temporária>/shots/E2E-REENVIO-01-16-expirado.png
reenvio pela tela: POST 200
screenshot <pasta temporária>/shots/E2E-REENVIO-01-17-reenvio-enviado.png
mensagem nova em 0.1 s; 2 mensagens; token novo eyJ<mascarado>
screenshot <pasta temporária>/shots/E2E-REENVIO-01-18-link-novo.png
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `compose.yaml`: o serviço api instala nos volumes ao subir; `scripts/db-setup.sh` garante as dependências |
| Ambiente e serviços | 1 e 2 | contrato (Docker Compose) e `compose.yaml`: o ambiente local já no ar, com a api recriada por um override do Compose na pasta temporária (`COMPOSE_FILE`) |
| Banco efêmero e migração | 5 | `scripts/db-setup.sh`: banco `eval_rf002_2026_11_02t02_30_34z` no postgres do Compose, `DATABASE_URL` da api trocada pelo override, `make db-setup` migra e cria o admin |
| Isolamento do Valkey | 4 e 6 | avaliações anteriores: `REDIS_URL=redis://valkey:6379/3` no override, banco lógico 3 vazio antes da avaliação |
| Estado persistido | 1 | contrato: janelas de rate limit livres; chaves `rate-limit:*` (prefixo de `valkey-rate-limit.storage.ts`) apagadas no Valkey |
| Limpeza entre itens | 4 e 6 | DELETE da tabela verification e das contas sem papel admin (account e session em cascata), `rate-limit:*` no Valkey e DELETE /api/v1/messages no Mailpit |
| Gates | 1 | contrato: `make check` e `make build` na raiz |
| Cliente HTTP | 6 | `urllib` do Python, com o X-Forwarded-For do contrato e o Origin da SPA |
| Logs da api | 1 e 3 | contrato e spec, Verificação por superfície: `docker compose logs api --since <início do item>` |
| Caixa de e-mail | 3 | spec, Verificação por superfície (ADR-0016): API REST do Mailpit |
| Banco | 1 | contrato, Configuração: registro em `verification` por identifier `email-verification:` e value igual ao id da conta |
| Serviço valkey parado | 1 e 3 | contrato e spec: `docker compose stop valkey` e religado com `docker compose up -d --wait --no-deps valkey` |
| Navegador | 3 | spec, Verificação por superfície (ADR-0024): Chromium headless pelo `playwright-core` 1.64 do `@playwright/cli` no cache do npx, dirigido por script Node, um contexto sem cookie por item |
| Serviço api parado | 3 | spec: `docker compose stop api` e religada com `docker compose up -d --wait --no-deps api` |
| Base visual | 6 | `evaluate` no navegador (imagens, caixas na janela, corte por `overflow`, `elementFromPoint`) e screenshot por estado, revisado sem achados |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_rf002_*`, nenhuma pasta `evaluator-rf002-*` e nenhum PID de avaliação anterior no início.
- Derrubada: completa. Nenhum PID no `processos.lock` (o navegador fechou com o script); api recriada sem o override, de volta à `DATABASE_URL` do banco `app` e ao Valkey no banco 0, saudável; banco lógico 3 do Valkey esvaziado; caixa do Mailpit esvaziada; banco `eval_rf002_2026_11_02t02_30_34z` apagado; pasta `/tmp/evaluator-rf002-2026-11-02T02-30-34Z` apagada, com os screenshots.

## Avisos

- Avaliado com 1 arquivo fora de commit, só documentação e de outra avaliação: `docs/features/RF-001-criar-conta/avaliacao.md`. O código avaliado é o do commit 05d1238.
- Os gates rodaram antes de a api ser recriada apontando para o banco efêmero: o `make build` no host reescreve `apps/api/dist`, bind mount do `nest start --watch` do container, e a api do Compose caiu com `ERR_MODULE_NOT_FOUND` em `dist/app.module.js` logo depois dos gates. A recriação para o banco efêmero a trouxe de volta saudável, e a recriação do fim também.
- API-SIGILO-01: a rota `/api/auth/verify-email` não escreve linha de log na api; a janela do item inteiro, do cadastro ao Então, capturou 1 linha, a do healthcheck do Compose em `/api/health`, sem token, e-mail nem nome.
- A SPA mostra "Entrar" também na barra de navegação; os bullets de "Entrar" (UI-ATIVACAO-01, UI-ATIVACAO-02, UI-VISUAL-01) foram conferidos no "Entrar" do card da confirmação.
- Os itens usam o Valkey (banco lógico 3) e o Mailpit compartilhados do ambiente de desenvolvimento: a caixa do Mailpit foi esvaziada antes de cada item. API-REENVIO-05 e API-REENVIO-06 pararam o serviço valkey inteiro, compartilhado com o ambiente de desenvolvimento, e o religaram no fim do item.
- O banco lógico 1 do Valkey passou de 136 para 148 chaves durante os gates (`make test`); não tem o marcador da avaliação e ficou como estava.
- Itens que não dão nome às contas (API-ATIVACAO-02 a 08, API-VENCIDO, API-REENVIO, API-LIMPEZA-01 para Paulo e Pedro, WRK, UI e E2E-INTEGRACAO-01, E2E-REENVIO-01) usaram como nome o primeiro nome do e-mail; E2E-REENVIO-01, que não dá senha, usou Jornada123.

## Motivo do aborto

Nenhum.
