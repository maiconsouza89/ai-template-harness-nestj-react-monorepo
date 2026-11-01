# Avaliação: RF-002 Confirmar e-mail

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-11-01T12-53-30Z
- Branch: feat/rf-002-confirmar-email
- Commit: 60486b4
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

- ✓ check: `make check`, código 0 (com `TURBO_FORCE=true`: 5 tarefas, 0 do cache; API 24 arquivos de unidade (129 testes) e 11 de integração (70 testes), SPA 6 arquivos (44 testes), Contratos 3 arquivos (21 testes); "ok: todas as verificações passaram")
- ✓ build: `make build`, código 0 (com `TURBO_FORCE=true`: 4 tarefas, 0 do cache)

## Pré-requisitos

### Serviços em execução
- ✓ api (com o worker do Módulo E-mail): http://localhost:3000, saúde /api/health respondeu 200 `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`, recriada apontando para o banco efêmero `eval_rf002_2026_11_01t12_53_30z` e para o Valkey no banco lógico 3
- ✓ web: http://localhost:5173/ saudável no Compose
- ✓ postgres: saudável no Compose (PostgreSQL 18)
- ✓ valkey: saudável no Compose (Valkey 9), banco lógico 3 vazio no início (`dbsize` 0); parado e religado em API-REENVIO-05 e API-REENVIO-06, de volta saudável
- ✓ mailpit: saudável no Compose (axllent/mailpit:v1.32), API REST em http://localhost:8025

### Estado persistido
- ✓ `janela-de-cadastro-livre`: chaves `rate-limit:*` apagadas no banco lógico 3 do Valkey antes de cada item; conferido: nenhum cadastro recebeu 429 e cada item usou um IP 203.0.113.x próprio
- ✓ `janela-de-reenvio-livre`: mesmo mecanismo; conferido: os três primeiros reenvios de API-REENVIO-04 responderam 200 e só o quarto do mesmo IP recebeu 429

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env` copiado do `.env.example` (idênticos): NODE_ENV=development e TRUSTED_PROXIES vazia em vigor no container da api (o contrato pede development e vazia); `make db-setup` aplicado ao banco efêmero (migrações aplicadas, "seed: primeiro admin criado")
- ✓ X-Forwarded-For por item: cada cadastro e reenvio fora do navegador levou um IP 203.0.113.x exclusivo do item (de .1 a .38)
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
- ✓ a resposta não define cookie de sessão | esperado nenhum Set-Cookie, observado nenhum Set-Cookie
- ✓ o banco tem a conta de lia@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco não tem sessão para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
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
primeira ativação -> 200
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
expiresAt movido para 2026-11-01T12:58:10.681 (agora+1min)
GET -> 200 {"status": true, "user": null}
```

</details>

#### API-ATIVACAO-05
- Veredito: passou
- ✓ o banco tem exatamente um registro de confirmação para a conta de lucas@example.com | esperado 1, observado 1
- ✓ o expiresAt desse registro fica entre 23 horas e 59 minutos e 24 horas e 1 minuto depois da resposta | esperado 86340 a 86460 s, observado 86399.7 s
- ✓ o identifier e o value desse registro não contêm o token do link que chegou para lucas@example.com | esperado token ausente, observado identifier=email-verification:213b294f964455ae614e5071a4079b468511d6d81..., value=id da conta; token presente=False
- ✓ o expiresAt desse registro é igual, ao segundo, ao instante de expiração (campo exp do payload) do token do link que chegou para lucas@example.com | esperado 1793624232, observado 1793624232

<details>
<summary>Evidência</summary>

```
contas lucas antes: 0
POST sign-up -> 200 em 2026-11-01T12:57:12.272026+00:00
registros: [('email-verification:213b294f964455ae614e5...', '2026-11-02T12:57:12.000')]
exp do JWT=1793624232 (2026-11-02T12:57:12+00:00), expiresAt=2026-11-02T12:57:12.000
```

</details>

#### API-ATIVACAO-06
- Veredito: passou
- ✓ as duas respostas são 200 | esperado 200, 200, observado 200, 200
- ✓ ao menos uma resposta não traz o código ALREADY_VERIFIED | esperado >=1, observado 2
- ✓ o banco tem a conta de lis@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco não tem registro de confirmação para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
GET concorrente -> 200 {"status": true, "user": null}
GET concorrente -> 200 {"status": true, "user": null}
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
e-mail trocado para lina.outra@example.com
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
com e-mail trocado -> 401 {"message": "User not found", "code": "USER_NOT_FOUND"}
e-mail trocado de volta
GET -> 200 {"status": true, "user": null}
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
expiresAt movido para agora-1min (2026-11-01T12:56:21.633)
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
expiresAt movido para agora-1min (2026-11-01T12:56:23.935)
primeira -> 401 {"code": "TOKEN_EXPIRED", "message": "Este link expirou. Pe\u00e7a um novo link abaixo."}
GET -> 401 {"code": "TOKEN_EXPIRED", "message": "Este link expirou. Pe\u00e7a um novo link abaixo."}
```

</details>

#### API-REENVIO-01
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 status true, observado 200 {"status": true}
- ✓ o banco tem exatamente um registro de confirmação para a conta de nina@example.com | esperado 1, observado 1
- ✓ esse registro não é o R1 | esperado id diferente de 832fcc8e-321a-4272-931a-b33707726c8f, observado 5d8ad266-1a9c-40c2-abbb-9244f478a208
- ✓ o expiresAt desse registro fica entre 23 horas e 59 minutos e 24 horas e 1 minuto depois da resposta | esperado 86340 a 86460 s, observado 86399.0 s

<details>
<summary>Evidência</summary>

```
R1=832fcc8e-321a-4272-931a-b33707726c8f exp=2026-11-02T12:57:25.000
POST send-verification-email -> 200 {"status": true}
depois: [('5d8ad266-1a9c-40c2-abbb-9244f478a208', '2026-11-02T12:57:26.000')]
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
reenvio -> 200
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
reenvio -> 200
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
reenvio 1 -> 200
reenvio 2 -> 200
reenvio 3 -> 200
quarto -> 429 X-Retry-After=58
```

</details>

#### API-REENVIO-05
- Veredito: passou
- ✓ a resposta é 500 | esperado 500, observado 500
- ✓ o banco tem exatamente um registro de confirmação para a conta de omar@example.com | esperado 1, observado 1
- ✓ esse registro é o R1 | esperado d3b51a9f-0f19-4ae2-b4f6-78e4203505b8, observado d3b51a9f-0f19-4ae2-b4f6-78e4203505b8

<details>
<summary>Evidência</summary>

```
R1=d3b51a9f-0f19-4ae2-b4f6-78e4203505b8
docker compose stop valkey
POST send-verification-email -> 500 ""
valkey religado
```

</details>

#### API-REENVIO-06
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o banco tem a conta de otto@example.com com e-mail verificado | esperado t, observado t

<details>
<summary>Evidência</summary>

```
reenvio com valkey parado -> 500
valkey religado
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
paulo exp=2026-10-24T12:57:54.511, pedro exp=2026-10-31T12:57:54.754
sign-up priscila -> 200
registros: paulo=0 pedro=1 priscila=1
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
último caractere k -> A
GET -> 401 {"code": "INVALID_TOKEN", "message": "Este link n\u00e3o vale mais. Pe\u00e7a um novo link abaixo."}
```

</details>

#### API-SIGILO-01
- Veredito: passou
- ✓ nenhuma linha de log do serviço api escrita durante o item contém T1 | esperado 0, observado 0
- ✓ nenhuma dessas linhas contém pia@example.com | esperado 0, observado 0
- ✓ nenhuma dessas linhas contém Pia Torres | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
GET -> 200; linhas de log da api desde 2026-11-01T12:58:01Z: 0
busca ampla: docker compose logs api --since 30m (236 linhas): 0 com pia@example.com, Pia Torres, verify-email ou eyJ
```

</details>

### Worker

#### WRK-REENVIO-01
- Veredito: passou
- ✓ em até 2 minutos a caixa tem exatamente duas mensagens para rita@example.com | esperado 2, observado 2
- ✓ a mais recente tem um link que começa com o WEB_ORIGIN do .env seguido de /confirmar-email?token= | esperado http://localhost:5173/confirmar-email?token=, observado http://localhost:5173/confirmar-email?token=
- ✓ o token desse link é diferente do token da mensagem do cadastro | esperado diferentes, observado diferentes
- ✓ o corpo da mais recente diz "O link vale por 24 horas." | esperado presente, observado presente

<details>
<summary>Evidência</summary>

```
reenvio -> 200
link: http://localhost:5173/confirmar-email?token=eyJ<mascarado>
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
ativação -> 200
reenvio -> 200 {"status": true}
```

</details>

### UI

#### UI-ATIVACAO-01 *
- Veredito: passou
- ✓ a página envia GET /api/auth/verify-email com o token do link e recebe 200 | esperado GET com o token, 200, observado GET token igual=true -> 200
- ✓ `*` a tela diz que o e-mail foi confirmado | interpretado como: título do card "E-mail confirmado" | observado E-mail confirmado | passou
- ✓ a tela tem um link ou botão "Entrar" para /entrar | esperado /entrar, observado /entrar
- ✓ a tela não mostra campo de e-mail nem o botão "Reenviar o link" | esperado 0 e 0, observado 0 e 0
- ✓ `*` base visual mecânica (confirmado) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 8 elementos e 0 imagens conferidos, sem achados | passou

<details>
<summary>Evidência</summary>

```
requisições à API: GET http://localhost:3000/api/v1/session -> 401, GET http://localhost:3000/api/auth/verify-email?token=eyJ<mascarado> -> 200
card: E-mail confirmado | Sua conta está ativa. | Entrar
screenshot shots/UI-ATIVACAO-01-confirmado.png
```

</details>

#### UI-ATIVACAO-02 *
- Veredito: passou
- ✓ `*` a tela diz que a conta já está confirmada | interpretado como: título do card "Conta já confirmada" | observado Conta já confirmada | passou
- ✓ a tela tem um link ou botão "Entrar" para /entrar | esperado /entrar, observado /entrar
- ✓ a tela não mostra o botão "Reenviar o link" | esperado 0, observado 0
- ✓ `*` base visual mecânica (ja-confirmada) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 8 elementos e 0 imagens conferidos, sem achados | passou

<details>
<summary>Evidência</summary>

```
ativação prévia -> 200
card: Conta já confirmada | Esta conta já está confirmada. | Entrar
screenshot shots/UI-ATIVACAO-02-ja-confirmada.png
```

</details>

#### UI-VENCIDO-01 *
- Veredito: passou
- ✓ `*` a tela diz que o link expirou | interpretado como: texto do card com "expirou" ("Link expirado", "Este link expirou...") | observado Link expirado |  | passou
- ✓ a tela mostra o campo de e-mail com rótulo visível e o botão "Reenviar o link" | esperado campo com rótulo visível e botão, observado campo=1 rótulo visível=true botão=true
- ✓ a tela não diz que o e-mail foi confirmado | esperado ausente, observado ausente
- ✓ a conta de tais@example.com continua com e-mail não verificado no banco | esperado f, observado f
- ✓ `*` base visual mecânica (expirado) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 9 elementos e 0 imagens conferidos, sem achados | passou

<details>
<summary>Evidência</summary>

```
card: Link expirado | Este link expirou. Peça um novo link abaixo. | E-mail | Reenviar o link; verify -> 401
screenshot shots/UI-VENCIDO-01-expirado.png
```

</details>

#### UI-REENVIO-01 *
- Veredito: passou
- ✓ a página envia POST /api/auth/send-verification-email com o e-mail teo@example.com e recebe 200 | esperado POST {email: teo@example.com} -> 200, observado POST {"email":"teo@example.com"} -> 200
- ✓ `*` a tela informa que um novo link foi enviado se o e-mail tiver conta pendente | interpretado como: aviso "Se o e-mail tiver uma conta pendente, enviamos um novo link." no card | observado Se o e-mail tiver uma conta pendente, enviamos um novo link. | passou
- ✓ a tela mostra o botão "Enviar para outro e-mail" | esperado visível, observado true
- ✓ a tela não mostra o campo de e-mail | esperado 0, observado 0
- ✓ a página não envia uma segunda requisição a /api/auth/verify-email | esperado nenhuma depois da primeira, observado 1 no total, 0 depois do reenvio
- ✓ `*` base visual mecânica (reenviado) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 8 elementos e 0 imagens conferidos, sem achados | passou

<details>
<summary>Evidência</summary>

```
requisições: GET http://localhost:3000/api/v1/session  -> 401, GET http://localhost:3000/api/auth/verify-email?token=eyJ<mascarado>  -> 401, POST http://localhost:3000/api/auth/send-verification-email {"email":"teo@example.com"} -> 200, GET http://localhost:3000/api/v1/session  -> 401
card: Link expirado | Este link expirou. Peça um novo link abaixo. | Se o e-mail tiver uma conta pendente, enviamos um novo link. | Enviar para outro e-mail
screenshot shots/UI-REENVIO-01-reenviado.png
```

</details>

#### UI-REENVIO-02 *
- Veredito: passou
- ✓ `*` base visual mecânica (aviso-enviado) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 8 elementos e 0 imagens conferidos, sem achados | passou
- ✓ a tela mostra o campo de e-mail com rótulo visível e o valor tina@example.com | esperado campo com rótulo visível, valor tina@example.com, observado campo=1 rótulo visível=true valor=tina@example.com
- ✓ a tela mostra o botão "Reenviar o link" | esperado visível, observado true
- ✓ a página não envia requisição a /api/auth/verify-email | esperado 0 no clique, observado 0
- ✓ `*` base visual mecânica (outro-email) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 9 elementos e 0 imagens conferidos, sem achados | passou

<details>
<summary>Evidência</summary>

```
pré-condição: aviso "Este link expirou. Peça um novo link abaixo. | Se o e-mail tiver uma conta pendente, enviamos um novo link." na tela
screenshot shots/UI-REENVIO-02-aviso-enviado.png
campo: count=1 valor=tina@example.com rótulo visível=true
requisições: GET http://localhost:3000/api/v1/session -> 401, GET http://localhost:3000/api/auth/verify-email?token=eyJ<mascarado> -> 401, POST http://localhost:3000/api/auth/send-verification-email -> 200, GET http://localhost:3000/api/v1/session -> 401
screenshot shots/UI-REENVIO-02-outro-email.png
```

</details>

#### UI-INVALIDO-01 *
- Veredito: passou
- ✓ `*` a tela diz que o link não vale | interpretado como: card com "Link inválido" e "Este link não vale mais" | observado Link inválido |  | passou
- ✓ a tela mostra o campo de e-mail e o botão "Reenviar o link" | esperado campo e botão, observado campo=1 botão=true
- ✓ a tela não diz que o e-mail foi confirmado | esperado ausente, observado ausente
- ✓ `*` base visual mecânica (invalido) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 9 elementos e 0 imagens conferidos, sem achados | passou

<details>
<summary>Evidência</summary>

```
card: Link inválido | Este link não vale mais. Peça um novo link abaixo. | E-mail | Reenviar o link; verify -> 401
screenshot shots/UI-INVALIDO-01-invalido.png
```

</details>

#### UI-INVALIDO-02 *
- Veredito: passou
- ✓ `*` a tela diz que o link não vale | interpretado como: card com "Link inválido" e "Este link não vale mais" | observado Link inválido |  | passou
- ✓ a página não envia requisição a /api/auth/verify-email | esperado 0, observado 0
- ✓ a tela mostra o botão "Reenviar o link" | esperado visível, observado true
- ✓ `*` base visual mecânica (sem-token) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 9 elementos e 0 imagens conferidos, sem achados | passou

<details>
<summary>Evidência</summary>

```
card: Link inválido | Este link não vale mais. Peça um novo link abaixo. | E-mail | Reenviar o link; requisições: GET http://localhost:3000/api/v1/session
screenshot shots/UI-INVALIDO-02-sem-token.png
```

</details>

#### UI-INVALIDO-03 *
- Veredito: passou
- ✓ `*` a tela diz que o link não vale | interpretado como: card com "Link inválido" e "Este link não vale mais" | observado Link inválido |  | passou
- ✓ a tela mostra o campo de e-mail e o botão "Reenviar o link" | esperado campo e botão, observado campo=1 botão=true
- ✓ a conta de ugo.r@example.com continua com e-mail não verificado no banco | esperado f, observado f
- ✓ `*` base visual mecânica (link-antigo) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 9 elementos e 0 imagens conferidos, sem achados | passou

<details>
<summary>Evidência</summary>

```
reenvio -> 200
card: Link inválido | Este link não vale mais. Peça um novo link abaixo. | E-mail | Reenviar o link; verify -> 401
screenshot shots/UI-INVALIDO-03-link-antigo.png
```

</details>

#### UI-FALHA-01 *
- Veredito: passou
- ✓ `*` a tela mostra o aviso de que o servidor não respondeu | interpretado como: aviso "O servidor não respondeu. Tente de novo." dentro do card da confirmação | observado Confirmação de e-mail | O servidor não respondeu. Tente de novo. | passou
- ✓ a tela não diz que o e-mail foi confirmado | esperado ausente, observado ausente
- ✓ `*` a página não mostra a página de erro | interpretado como: sem o link "Voltar ao início" e sem o main[role=alert] da página de erro da raiz | observado 0 e 0 | passou
- ✓ `*` base visual mecânica (api-fora) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 7 elementos e 0 imagens conferidos, sem achados | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api
página: App | Entrar | Criar conta | Confirmação de e-mail | O servidor não respondeu. Tente de novo.
screenshot shots/UI-FALHA-01-api-fora.png
api religada e saudável
```

</details>

#### UI-FALHA-02 *
- Veredito: passou
- ✓ a página mostra que o servidor não respondeu | esperado "O servidor não respondeu", observado O servidor não respondeu
- ✓ a página não mostra o texto "Nenhuma sessão aberta." | esperado ausente, observado ausente
- ✓ `*` base visual mecânica (raiz-api-fora) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 9 elementos e 0 imagens conferidos, sem achados | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api
página: App | Entrar | Criar conta | O servidor não respondeu | Não foi possível falar com a API. Tente de novo em alguns instantes. | Voltar ao início
screenshot shots/UI-FALHA-02-raiz-api-fora.png
api religada e saudável
```

</details>

#### UI-VISUAL-01 *
- Veredito: passou
- ✓ o "Entrar" tem fundo #000, texto #fff e raio de borda de 999px | esperado rgb(0, 0, 0), rgb(255, 255, 255), 999px, observado rgb(0, 0, 0), rgb(255, 255, 255), 999px
- ✓ o card da confirmação tem fundo #fff e raio de borda de 16px | esperado rgb(255, 255, 255), 16px, observado rgb(255, 255, 255), 16px
- ✓ a família de fonte computada do título começa por Inter Variable | esperado Inter Variable..., observado "Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif
- ✓ a página não tem rolagem horizontal | esperado scrollWidth <= clientWidth, observado 375 <= 375
- ✓ a barra de navegação está visível acima do card | esperado nav visível, base <= topo do card, observado visível=true, nav.bottom=76, card.top=108
- ✓ `*` base visual mecânica (375px) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 8 elementos e 0 imagens conferidos, sem achados | passou

<details>
<summary>Evidência</summary>

```
{"entBg":"rgb(0, 0, 0)","entColor":"rgb(255, 255, 255)","entRadius":"999px","cardBg":"rgb(255, 255, 255)","cardRadius":"16px","font":"\"Inter Variable\", system-ui, \"Helvetica Neue\", Arial, sans-serif","sw":375,"cw":375,"navVis":true,"navBottom":76,"cardTop":108}
screenshot shots/UI-VISUAL-01-375px.png
```

</details>

### E2E

#### E2E-CONFIRMACAO-01 *
- Veredito: passou
- ✓ `*` base visual mecânica (cadastro-enviado) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 7 elementos e 0 imagens conferidos, sem achados | passou
- ✓ `*` base visual mecânica (primeira) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 8 elementos e 0 imagens conferidos, sem achados | passou
- ✓ `*` base visual mecânica (segunda) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 8 elementos e 0 imagens conferidos, sem achados | passou
- ✓ `*` na primeira abertura a tela diz que o e-mail foi confirmado | interpretado como: título do card "E-mail confirmado" | observado E-mail confirmado | passou
- ✓ `*` na segunda abertura a tela diz que a conta já está confirmada | interpretado como: título do card "Conta já confirmada" | observado Conta já confirmada | passou
- ✓ o banco tem a conta de xenia.p@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco não tem sessão para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
contas xenia antes: 0
screenshot shots/E2E-CONFIRMACAO-01-cadastro-enviado.png
e-mail recebido: http://localhost:5173/confirmar-email?token=eyJ<mascarado>
screenshot shots/E2E-CONFIRMACAO-01-primeira.png
screenshot shots/E2E-CONFIRMACAO-01-segunda.png
primeira: E-mail confirmado | Sua conta está ativa. | Entrar; segunda: Conta já confirmada | Esta conta já está confirmada. | Entrar
```

</details>

#### E2E-INTEGRACAO-01 *
- Veredito: passou
- ✓ `*` a tela diz que o e-mail foi confirmado | interpretado como: título do card "E-mail confirmado" | observado E-mail confirmado | passou
- ✓ o banco tem a conta de yuri@example.com com e-mail verificado | esperado t, observado t
- ✓ o banco tem a conta de yasmin@example.com com e-mail não verificado | esperado f, observado f
- ✓ `*` base visual mecânica (yuri) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 8 elementos e 0 imagens conferidos, sem achados | passou

<details>
<summary>Evidência</summary>

```
card: E-mail confirmado | Sua conta está ativa. | Entrar
screenshot shots/E2E-INTEGRACAO-01-yuri.png
```

</details>

#### E2E-REENVIO-01 *
- Veredito: passou
- ✓ `*` base visual mecânica (expirado) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 9 elementos e 0 imagens conferidos, sem achados | passou
- ✓ `*` o primeiro link mostra que expirou e oferece o reenvio | interpretado como: card com "expirou", campo E-mail e botão "Reenviar o link" | observado Link expirado; reenvio oferecido=true | passou
- ✓ em até 2 minutos a caixa tem a mensagem nova para zeca@example.com com um token diferente do primeiro | esperado mensagem nova em até 120 s, token diferente, observado 2 mensagens, nova em 0.0 s, token diferente
- ✓ `*` base visual mecânica (novo-link) | interpretado como: imagens carregadas, elementos dentro da janela, sem corte por overflow, clique no centro chega ao elemento, e screenshot revisado sem achados | observado 8 elementos e 0 imagens conferidos, sem achados | passou
- ✓ `*` o link novo mostra que o e-mail foi confirmado | interpretado como: título do card "E-mail confirmado" | observado E-mail confirmado | passou
- ✓ o banco tem a conta de zeca@example.com com e-mail verificado | esperado t, observado t

<details>
<summary>Evidência</summary>

```
screenshot shots/E2E-REENVIO-01-expirado.png
screenshot shots/E2E-REENVIO-01-novo-link.png
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `compose.yaml`: o serviço api instala nos volumes ao subir; `scripts/db-setup.sh` garante as dependências |
| Ambiente e serviços | 1 e 2 | contrato (Docker Compose) e `compose.yaml`: o ambiente local já no ar, com a api recriada por um override do Compose na pasta temporária (`COMPOSE_FILE`) |
| Banco efêmero e migração | 5 | `scripts/db-setup.sh`: banco `eval_rf002_2026_11_01t12_53_30z` no postgres do Compose, `DATABASE_URL` da api trocada pelo override, `make db-setup` migra e cria o admin |
| Isolamento do Valkey | 4 e 6 | avaliações anteriores: `REDIS_URL=redis://valkey:6379/3` no override, banco lógico 3 vazio antes da avaliação |
| Estado persistido | 1 | contrato: janelas de rate limit livres; chaves `rate-limit:*` apagadas no Valkey |
| Limpeza entre itens | 4 e 6 | DELETE da tabela verification e das contas sem papel admin (account e session em cascata), `rate-limit:*` no Valkey e DELETE /api/v1/messages no Mailpit |
| Gates | 1 | contrato: `make check` e `make build` na raiz |
| Cliente HTTP | 6 | `urllib` do Python, com o X-Forwarded-For do contrato e o Origin da SPA |
| Logs da api | 1 e 3 | contrato e spec, Verificação por superfície: `docker compose logs api --since <início do item>` |
| Caixa de e-mail | 3 | spec, Verificação por superfície (ADR-0016): API REST do Mailpit |
| Banco | 1 | contrato, Configuração: registro em `verification` por identifier `email-verification:` e value igual ao id da conta |
| Serviço valkey parado | 1 e 3 | contrato e spec: `docker compose stop valkey` e religado com `docker compose up -d --wait valkey` |
| Navegador | 3 | spec, Verificação por superfície (ADR-0024): Chromium headless pelo `playwright-core` 1.64 do `@playwright/cli` no cache do npx, dirigido por script Node, um contexto sem cookie por item |
| Serviço api parado | 3 | spec: `docker compose stop api` e religada com `docker compose up -d --wait --no-deps api` |
| Base visual | 6 | `evaluate` no navegador (imagens, caixas na janela, corte por `overflow`, `elementFromPoint`) e screenshot por estado, revisado sem achados |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_rf002_*`, nenhuma pasta `evaluator-rf002-*` e nenhum PID de avaliação anterior no início.
- Derrubada: completa. Nenhum PID no `processos.lock` (o navegador fechou com o script); api recriada sem o override, de volta à `DATABASE_URL` do banco `app` e ao Valkey no banco 0, saudável; banco lógico 3 do Valkey esvaziado; caixa do Mailpit esvaziada; banco `eval_rf002_2026_11_01t12_53_30z` apagado; pasta `/tmp/evaluator-rf002-2026-11-01T12-53-30Z` apagada, com os screenshots.

## Avisos

- Avaliado com 1 arquivo fora de commit, só documentação: `docs/features/RF-002-confirmar-e-mail/orquestracao.md`. O código avaliado é o do commit 60486b4.
- Os gates rodaram antes de a api ser recriada apontando para o banco efêmero, porque o `make build` no host reescreve `apps/api/dist`, bind mount do `nest start --watch` do container.
- API-SIGILO-01: a rota `/api/auth/verify-email` não escreve linha de log na api (0 linhas capturadas na janela do item); os bullets de ausência passam sobre o que foi capturado, e uma busca ampla nos últimos 30 minutos de log (236 linhas) não achou e-mail, nome, `verify-email` nem token.
- A SPA mostra "Entrar" também na barra de navegação; os bullets de "Entrar" (UI-ATIVACAO-01, UI-ATIVACAO-02, UI-VISUAL-01) foram conferidos no "Entrar" do card da confirmação.
- Os itens usam o Valkey (banco lógico 3) e o Mailpit compartilhados do ambiente de desenvolvimento: a caixa do Mailpit foi esvaziada antes de cada item. API-REENVIO-05 e API-REENVIO-06 pararam o serviço valkey inteiro, compartilhado com o ambiente de desenvolvimento, e o religaram no fim do item.
- Itens que não dão nome às contas (API-ATIVACAO-02 a 08, API-VENCIDO, API-REENVIO, API-LIMPEZA-01 para Paulo e Pedro, WRK, UI e E2E-INTEGRACAO-01, E2E-REENVIO-01) usaram como nome o primeiro nome do e-mail.

## Motivo do aborto

Nenhum.
