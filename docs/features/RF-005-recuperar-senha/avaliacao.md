# Avaliação: RF-005 Recuperar senha

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-11-01T15-54-41Z
- Branch: feat/rf-005-recuperar-senha
- Commit: 01578f3
- Status: limpo
- Itens: 45 passou, 0 falhou, 0 bloqueado, 0 manual, 0 pulado, de 45
- Critérios: 5 verificado, 0 reprovado, 0 indeterminado, de 5
- Filtros: nenhum

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| E-mail com conta e e-mail sem conta recebem a mesma resposta na tela. | ✓ verificado | API-PEDIDO-02, API-PEDIDO-03, API-PEDIDO-05, WRK-EMAIL-02, UI-PEDIDO-01, UI-PEDIDO-02, UI-PEDIDO-03, UI-FALHA-01 |
| Link aberto dentro de 1 hora troca a senha; a senha antiga deixa de entrar e a nova entra. | ✓ verificado | API-PEDIDO-01, API-PEDIDO-04, API-CHECAGEM-01, API-TROCA-01, API-TROCA-02, API-TROCA-03, API-TROCA-04, API-TROCA-05, API-REGRA-01, API-REGRA-02, API-REGRA-03, API-SIGILO-01, API-SIGILO-02, WRK-EMAIL-01, UI-REDEFINIR-01, UI-REDEFINIR-02, UI-REDEFINIR-03, UI-REDEFINIR-04, UI-FALHA-02, UI-VISUAL-01, E2E-RECUPERACAO-01 |
| Link usado uma vez ou aberto depois de 1 hora não troca a senha. | ✓ verificado | API-LIMPEZA-01, API-REPEDIDO-01, API-REPEDIDO-02, API-CHECAGEM-02, API-CHECAGEM-03, API-CHECAGEM-04, API-USO-01, API-USO-02, API-USO-03, UI-INVALIDO-01, UI-INVALIDO-02, UI-INVALIDO-03, UI-INVALIDO-04 |
| Depois da troca, sessões abertas antes dela deixam de ter acesso. | ✓ verificado | API-SESSAO-01, API-SESSAO-02, E2E-RECUPERACAO-01 |
| RF-001 → RF-005: o e-mail cadastrado recebe o link de recuperação e a nova senha passa a valer para aquela conta. | ✓ verificado | E2E-INTEGRACAO-01, WRK-EMAIL-01 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (com `TURBO_FORCE=true`: 5 tarefas, 0 do cache; API 28 arquivos de unidade (168 testes) e 14 de integração (104 testes), SPA 11 arquivos (91 testes), Contratos 3 arquivos (34 testes); "ok: todas as verificações passaram")
- ✓ build: `make build`, código 0 (com `TURBO_FORCE=true`: 4 tarefas, 0 do cache)

## Pré-requisitos

### Serviços em execução
- ✓ api (com o worker do Módulo E-mail): http://localhost:3000, saúde /api/health respondeu 200 `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`, recriada apontando para o banco efêmero `eval_rf005_2026_11_01t15_54_41z` e para o Valkey no banco lógico 3; parada e religada em UI-FALHA-01 e UI-FALHA-02, de volta saudável
- ✓ web: http://localhost:5173/ respondeu 200, saudável no Compose
- ✓ postgres: saudável no Compose (PostgreSQL 18)
- ✓ valkey: saudável no Compose (Valkey 9), banco lógico 3 vazio no início (`dbsize` 0); parado e religado em API-PEDIDO-03 e API-PEDIDO-04, de volta saudável (`/api/health` com valkey up)
- ✓ mailpit: saudável no Compose (axllent/mailpit:v1.32), API REST em http://localhost:8025

### Estado persistido
- ✓ `conta-ativa`: criada por POST /api/auth/sign-up/email (senha Antiga123, X-Forwarded-For do item), seguida de UPDATE `emailVerified` true e remoção das sessões e dos registros de `verification` da conta; conferido em cada item: role=user, emailVerified=t, banned=f, 0 sessões e 0 registros de recuperação
- ✓ `janela-de-recuperacao-livre`: chaves `rate-limit:*` apagadas no banco lógico 3 do Valkey antes de cada item; conferido: os cinco pedidos de API-PEDIDO-05 responderam 200 e só o sexto recebeu 429, e nenhum pedido pela tela recebeu 429
- ✓ `janela-de-cadastro-livre`: mesmo mecanismo; conferido: os cadastros de API-TROCA-05 e E2E-INTEGRACAO-01 responderam 200

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env` copiado do `.env.example` (idênticos): NODE_ENV=development e TRUSTED_PROXIES vazia em vigor no container da api (o contrato pede development e vazia); `make db-setup` aplicado ao banco efêmero (migrações aplicadas, "seed: primeiro admin criado")
- ✓ X-Forwarded-For de cadastro e pedido de recuperação: cada item fora do navegador usou um IP 203.0.113.x exclusivo (de .1 a .29 nos itens de API e Worker, de .101 a .110 nos de UI)
- ✓ X-Forwarded-For de entrada: cada POST /api/auth/sign-in/email fora do navegador usou um IP 198.51.100.x exclusivo da requisição
- ✓ Link de recuperação: lido da mensagem mais recente de assunto "Redefina sua senha" para o e-mail na caixa do Mailpit (busca `to:"<e-mail>" subject:"Redefina sua senha"`), token pelo parâmetro `token`
- ✓ Registro de recuperação: linha de `verification` com identifier `reset-password:<hash>` e value igual ao id da conta; vencimento movido com UPDATE do `expiresAt`
- ✓ Sessão aberta antes: cookie de sessão da resposta de POST /api/auth/sign-in/email com o e-mail e a senha da conta

### Dependências externas
- ✓ DEP-1 serviço de envio de e-mail: Mailpit v1.32 do Compose, lido e esvaziado pela API REST (`/api/v1/search`, `/api/v1/message/<id>`, DELETE `/api/v1/messages`); as mensagens chegaram em menos de 2 segundos

## Itens

### API HTTP

#### API-PEDIDO-01
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
- ✓ o banco tem exatamente um registro de recuperação para a conta de rosa@example.com | esperado 1, observado 1
- ✓ o expiresAt desse registro fica entre 59 e 61 minutos depois da resposta | esperado entre 59 e 61 min, observado 60.00 min (expiresAt 2026-11-01 16:59:36.21, resposta 2026-11-01T15:59:36.216814 UTC)
- ✓ o identifier e o value desse registro não contêm o token do link que chegou para rosa@example.com | esperado token ausente de identifier e value, observado identifier=reset-password:acb1cc6408be7e3..., value=id da conta; token presente: False

<details>
<summary>Evidência</summary>

```
conta-ativa rosa@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset rosa@example.com (XFF 203.0.113.1) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
token do link tUDK<mascarado> (24 caracteres), identifier reset-password:acb1cc64...
```

</details>

#### API-PEDIDO-02
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo é igual a C | esperado {"status": true, "message": "If this email exists in our system, check your email for the reset link"}, observado {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
- ✓ o banco não tem conta com o e-mail sem.conta@example.com | esperado 0, observado 0
- ✓ o banco não ganhou registro de recuperação durante o item | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
conta-ativa rui@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset rui@example.com (XFF 203.0.113.2) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST request-password-reset sem.conta@example.com (XFF 203.0.113.2) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
```

</details>

#### API-PEDIDO-03
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo é igual a C | esperado {"status": true, "message": "If this email exists in our system, check your email for the reset link"}, observado {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
- ✓ o banco tem exatamente um registro de recuperação para a conta de sara@example.com | esperado 1, observado 1
- ✓ esse registro é o R1 | esperado 5NsS<mascarado>, observado ['5NsS<mascarado>']

<details>
<summary>Evidência</summary>

```
conta-ativa sara@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset sara@example.com (XFF 203.0.113.3) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
R1 = 5NsS<mascarado>
docker compose stop valkey
POST request-password-reset sara@example.com (XFF 203.0.113.3) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
tempo da resposta: 0.0s
valkey religado; /api/health {'status': 'ok', 'checks': {'postgres': 'up', 'valkey': 'up'}}
```

</details>

#### API-PEDIDO-04
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true}
- ✓ o banco não tem registro de recuperação para a conta de saulo@example.com | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
conta-ativa saulo@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset saulo@example.com (XFF 203.0.113.4) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
docker compose stop valkey
POST request-password-reset saulo@example.com (XFF 203.0.113.4) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
valkey religado; /api/health {'status': 'ok', 'checks': {'postgres': 'up', 'valkey': 'up'}}
POST reset-password T1=KLbu<mascarado> -> 200 {"status":true}
```

</details>

#### API-PEDIDO-05
- Veredito: passou
- ✓ a resposta é 429 | esperado 429, observado 429
- ✓ a resposta traz o cabeçalho X-Retry-After | esperado presente, observado 60

<details>
<summary>Evidência</summary>

```
conta-ativa tito@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
cinco pedidos do IP 203.0.113.5: [200, 200, 200, 200, 200] em 0.1s
sexto pedido -> 429 {"message":"Too many requests. Please try again later."}; X-Retry-After=60
```

</details>

#### API-LIMPEZA-01
- Veredito: passou
- ✓ o banco não tem registro de recuperação para a conta de hugo@example.com | esperado 0, observado 0
- ✓ o banco tem exatamente um registro de recuperação para a conta de iris@example.com | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
conta-ativa hugo@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
conta-ativa iris@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset hugo@example.com (XFF 203.0.113.6) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
expiresAt de hugo movido para 2026-11-01 15:58:54.768
POST request-password-reset iris@example.com (XFF 203.0.113.6) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
```

</details>

#### API-REPEDIDO-01
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código INVALID_TOKEN | esperado INVALID_TOKEN, observado INVALID_TOKEN
- ✓ o hash da credencial da conta de tais@example.com é o mesmo de antes do item | esperado igual, observado igual
- ✓ o banco tem exatamente um registro de recuperação para essa conta | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
conta-ativa tais@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset tais@example.com (XFF 203.0.113.7) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST request-password-reset tais@example.com (XFF 203.0.113.7) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
mensagens na caixa para tais: 2
POST reset-password T1=uF6P<mascarado> -> 400 {"message":"Invalid token","code":"INVALID_TOKEN"}
```

</details>

#### API-REPEDIDO-02
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true}
- ✓ T2 é diferente de T1 | esperado diferentes, observado diferentes
- ✓ o banco não tem registro de recuperação para a conta de teo@example.com | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
conta-ativa teo@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset teo@example.com (XFF 203.0.113.8) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST request-password-reset teo@example.com (XFF 203.0.113.8) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST reset-password T2=pCsw<mascarado> -> 200 {"status":true}
```

</details>

#### API-CHECAGEM-01
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo traz valid verdadeiro | esperado valid true, observado {"valid":true}
- ✓ o banco continua com um registro de recuperação para a conta de ugo@example.com | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
conta-ativa ugo@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset ugo@example.com (XFF 203.0.113.9) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
GET reset-password-status?token=c0cB<mascarado> -> 200 {"valid":true}
```

</details>

#### API-CHECAGEM-02
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código INVALID_TOKEN | esperado INVALID_TOKEN, observado INVALID_TOKEN

<details>
<summary>Evidência</summary>

```
conta-ativa una@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset una@example.com (XFF 203.0.113.10) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
GET reset-password-status (vencido) -> 400 {"code":"INVALID_TOKEN","message":"Este link não vale mais. Peça outro link."}
```

</details>

#### API-CHECAGEM-03
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código INVALID_TOKEN | esperado INVALID_TOKEN, observado INVALID_TOKEN

<details>
<summary>Evidência</summary>

```
conta-ativa uri@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset uri@example.com (XFF 203.0.113.11) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST reset-password T1 -> 200 {"status":true}
GET reset-password-status (usado) -> 400 {"code":"INVALID_TOKEN","message":"Este link não vale mais. Peça outro link."}
```

</details>

#### API-CHECAGEM-04
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código INVALID_TOKEN | esperado INVALID_TOKEN, observado INVALID_TOKEN

<details>
<summary>Evidência</summary>

```
GET reset-password-status?token=abc -> 400 {"code":"INVALID_TOKEN","message":"Este link não vale mais. Peça outro link."}
```

</details>

#### API-TROCA-01
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true}
- ✓ a resposta não define cookie de sessão | esperado nenhum cookie de sessão, observado nenhum Set-Cookie
- ✓ o hash da credencial da conta de vitor@example.com é diferente do de antes do item | esperado diferente, observado diferente
- ✓ o banco não tem registro de recuperação para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
conta-ativa vitor@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset vitor@example.com (XFF 203.0.113.12) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST reset-password -> 200 {"status":true}; set-cookie=[]
```

</details>

#### API-TROCA-02
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo traz o código INVALID_EMAIL_OR_PASSWORD | esperado INVALID_EMAIL_OR_PASSWORD, observado INVALID_EMAIL_OR_PASSWORD
- ✓ a resposta não define cookie de sessão | esperado nenhum cookie de sessão, observado nenhum Set-Cookie

<details>
<summary>Evidência</summary>

```
conta-ativa vera@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset vera@example.com (XFF 203.0.113.13) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
senha trocada: POST reset-password -> 200 {"status":true}
POST sign-in/email Antiga123 -> 401 {"message":"Invalid email or password","code":"INVALID_EMAIL_OR_PASSWORD"} set-cookie=[]
```

</details>

#### API-TROCA-03
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ a resposta define o cookie de sessão | esperado cookie de sessão, observado ['better-auth.session_token']
- ✓ o banco tem uma sessão para a conta de vilma@example.com | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
conta-ativa vilma@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset vilma@example.com (XFF 203.0.113.14) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
senha trocada: POST reset-password -> 200 {"status":true}
POST sign-in/email Nova12345 -> 200 set-cookie=['better-auth.session_token']
```

</details>

#### API-TROCA-04
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true}
- ✓ o hash da credencial da conta de valter@example.com é diferente do de antes do item | esperado diferente, observado diferente

<details>
<summary>Evidência</summary>

```
conta-ativa valter@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset valter@example.com (XFF 203.0.113.15) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
expiresAt movido para 2026-11-01 16:01:11.573
POST reset-password -> 200 {"status":true}
```

</details>

#### API-TROCA-05
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true}
- ✓ o hash da credencial da conta de wanda@example.com é diferente do de antes do item | esperado diferente, observado diferente
- ✓ a conta continua com e-mail não verificado | esperado emailVerified false, observado f

<details>
<summary>Evidência</summary>

```
POST sign-up/email wanda -> 200; emailVerified=f
POST request-password-reset wanda@example.com (XFF 203.0.113.16) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST reset-password -> 200 {"status":true}
```

</details>

#### API-USO-01
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código INVALID_TOKEN | esperado INVALID_TOKEN, observado INVALID_TOKEN
- ✓ o hash da credencial da conta de xico@example.com é o mesmo de antes do item | esperado igual, observado igual

<details>
<summary>Evidência</summary>

```
conta-ativa xico@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset xico@example.com (XFF 203.0.113.17) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
primeiro POST reset-password -> 200 {"status":true}
segundo POST reset-password -> 400 {"message":"Invalid token","code":"INVALID_TOKEN"}
```

</details>

#### API-USO-02
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código INVALID_TOKEN | esperado INVALID_TOKEN, observado INVALID_TOKEN
- ✓ o hash da credencial da conta de xena@example.com é o mesmo de antes do item | esperado igual, observado igual

<details>
<summary>Evidência</summary>

```
conta-ativa xena@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset xena@example.com (XFF 203.0.113.18) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST reset-password (vencido) -> 400 {"message":"Invalid token","code":"INVALID_TOKEN"}
```

</details>

#### API-USO-03
- Veredito: passou
- ✓ uma resposta é 200 e a outra é 400 com o código INVALID_TOKEN | esperado 200 e 400 INVALID_TOKEN, observado 400 e 200 INVALID_TOKEN
- ✓ o banco não tem registro de recuperação para a conta de ximena@example.com | esperado 0, observado 0
- ✓ só a senha da requisição que recebeu 200 entra por POST /api/auth/sign-in/email | esperado Outra12345 200 e Nova12345 401, observado Outra12345 200 e Nova12345 401

<details>
<summary>Evidência</summary>

```
conta-ativa ximena@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset ximena@example.com (XFF 203.0.113.19) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
concorrentes: Nova12345 -> 400 {"message":"Invalid token","code":"INVALID_TOKEN"}; Outra12345 -> 200 {"status":true}
sign-in Outra12345 -> 200; sign-in Nova12345 -> 401
```

</details>

#### API-REGRA-01
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e o campo newPassword com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | esperado VALIDATION_ERROR, newPassword: A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número., observado VALIDATION_ERROR, {'newPassword': 'A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.'}
- ✓ o hash da credencial da conta de yago@example.com é o mesmo de antes do item | esperado igual, observado igual
- ✓ o banco continua com um registro de recuperação para essa conta | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
conta-ativa yago@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset yago@example.com (XFF 203.0.113.20) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST reset-password newPassword=semnumero -> 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"newPassword","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-REGRA-02
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e o campo newPassword | esperado VALIDATION_ERROR com newPassword, observado VALIDATION_ERROR, ['newPassword']
- ✓ o hash da credencial da conta de yan@example.com é o mesmo de antes do item | esperado igual, observado igual

<details>
<summary>Evidência</summary>

```
conta-ativa yan@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset yan@example.com (XFF 203.0.113.21) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST reset-password newPassword=12345678 -> 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"newPassword","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-REGRA-03
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e o campo newPassword | esperado VALIDATION_ERROR com newPassword, observado VALIDATION_ERROR, ['newPassword']
- ✓ o hash da credencial da conta de yvone@example.com é o mesmo de antes do item | esperado igual, observado igual

<details>
<summary>Evidência</summary>

```
conta-ativa yvone@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset yvone@example.com (XFF 203.0.113.22) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST reset-password newPassword=Nova123 -> 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"newPassword","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SESSAO-01
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true}
- ✓ o banco não tem sessão para a conta de zeno@example.com | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
conta-ativa zeno@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
sessões abertas antes: sign-in -> 200, 200; sessões no banco: 2
POST request-password-reset zeno@example.com (XFF 203.0.113.23) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST reset-password -> 200 {"status":true}
```

</details>

#### API-SESSAO-02
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo não traz o id da conta de zuleica@example.com | esperado id ausente, observado ausente

<details>
<summary>Evidência</summary>

```
conta-ativa zuleica@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
sessão aberta antes: sign-in -> 200; GET /api/v1/session com C1 antes da troca -> 200
POST request-password-reset zuleica@example.com (XFF 203.0.113.24) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST reset-password -> 200 {"status":true}
GET /api/v1/session com C1 -> 401 {"message":"Unauthorized","statusCode":401}
```

</details>

#### API-SIGILO-01
- Veredito: passou
- ✓ nenhuma linha de log do serviço api escrita durante o item contém bia@example.com | esperado 0 linhas, observado 0 de 0 linhas
- ✓ nenhuma dessas linhas contém Bia Nunes | esperado 0 linhas, observado 0 de 0 linhas
- ✓ nenhuma dessas linhas contém o token do link que chegou para bia@example.com | esperado 0 linhas, observado 0 de 0 linhas

<details>
<summary>Evidência</summary>

```
conta-ativa bia@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset bia@example.com (XFF 203.0.113.25) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
linhas de log da api desde 2026-11-01T16:00:28.859420Z: 0
```

</details>

#### API-SIGILO-02
- Veredito: passou
- ✓ nenhuma linha de log do serviço api escrita durante o item contém T1 | esperado 0 linhas, observado 0 de 0 linhas
- ✓ nenhuma dessas linhas contém Sigilo12345 | esperado 0 linhas, observado 0 de 0 linhas
- ✓ nenhuma dessas linhas contém bruno@example.com | esperado 0 linhas, observado 0 de 0 linhas
- ✓ nenhuma dessas linhas contém Bruno Reis | esperado 0 linhas, observado 0 de 0 linhas

<details>
<summary>Evidência</summary>

```
conta-ativa bruno@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset bruno@example.com (XFF 203.0.113.26) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST reset-password -> 200 {"status":true}
linhas de log da api desde 2026-11-01T16:00:33.898347Z: 0
```

</details>

### Worker

#### WRK-EMAIL-01
- Veredito: passou
- ✓ em até 2 minutos a caixa tem uma mensagem para zilda@example.com com o assunto "Redefina sua senha" | esperado mensagem em até 120s, observado 1 mensagem(ns) em 0.5s
- ✓ essa mensagem tem um link que começa com o WEB_ORIGIN do .env seguido de /redefinir-senha?token= | esperado http://localhost:5173/redefinir-senha?token=..., observado http://localhost:5173/redefinir-senha?token=CzSw<mascarado>
- ✓ o corpo dela diz "Olá, Zilda Rocha!" | esperado no texto e no HTML, observado texto: True, HTML: True
- ✓ o corpo dela diz "O link vale por 1 hora e só pode ser usado uma vez." | esperado no texto e no HTML, observado texto: True, HTML: True

<details>
<summary>Evidência</summary>

```
conta-ativa zilda@example.com: role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset zilda@example.com (XFF 203.0.113.27) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
Subject=Redefina sua senha To=['zilda@example.com']
Text: Olá, Zilda Rocha!

Recebemos um pedido para trocar a senha da sua conta. Para definir uma nova senha, abra o link abaixo:

http://localhost:5173/redefinir-senha?token=CzSw<mascarado>

O link vale por 1 hora e só pode ser usado uma vez.

Se você não pediu a troca, ignore esta mensagem: sua senha continua a mesma.
```

</details>

#### WRK-EMAIL-02
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
- ✓ depois de 1 minuto a caixa não tem mensagem para ninguem@example.com | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
POST request-password-reset ninguem -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
depois de 60s: mensagens para ninguem: 0; total na caixa: 0
```

</details>

### UI

#### UI-PEDIDO-01 *
- Veredito: passou
- ✓ a página envia POST /api/auth/request-password-reset com o e-mail alice.r@example.com e recebe 200 | esperado 1 POST com email alice.r@example.com, 200, observado 1 POST, corpo {"email":"alice.r@example.com"}, status 200
- ✓ a tela mostra "Se o e-mail tiver conta, enviamos o link." | esperado visível, observado visível
- ✓ a tela mostra o botão "Enviar para outro e-mail" | esperado visível, observado visível
- ✓ a tela não mostra o campo de e-mail | esperado 0 campos, observado 0 campo(s)
- ✓ `*` base visual (depois de enviar) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/UI-PEDIDO-01-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa alice.r@example.com: role=user emailVerified=t banned=f
GET /api/v1/session -> 401
POST /api/auth/request-password-reset -> 200 {"email":"alice.r@example.com"}
GET /api/v1/session -> 401
main: Recuperar a senha | Se o e-mail tiver conta, enviamos o link. | Enviar para outro e-mail
screenshots: shots/UI-PEDIDO-01-1.png
```

</details>

#### UI-PEDIDO-02 *
- Veredito: passou
- ✓ a página envia POST /api/auth/request-password-reset com o e-mail beto.n@example.com e recebe 200 | esperado 1 POST com email beto.n@example.com, 200, observado 1 POST, corpo {"email":"beto.n@example.com"}, status 200
- ✓ a tela mostra "Se o e-mail tiver conta, enviamos o link." | esperado visível, observado visível
- ✓ a tela mostra o botão "Enviar para outro e-mail" | esperado visível, observado visível
- ✓ a tela não mostra o campo de e-mail | esperado 0 campos, observado 0 campo(s)
- ✓ `*` base visual (depois de enviar) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/UI-PEDIDO-02-1.png | passou

<details>
<summary>Evidência</summary>

```
GET /api/v1/session -> 401
POST /api/auth/request-password-reset -> 200 {"email":"beto.n@example.com"}
GET /api/v1/session -> 401
main: Recuperar a senha | Se o e-mail tiver conta, enviamos o link. | Enviar para outro e-mail
screenshots: shots/UI-PEDIDO-02-1.png
```

</details>

#### UI-PEDIDO-03 *
- Veredito: passou
- ✓ a página não envia requisição a /api/auth/request-password-reset | esperado 0, observado 0
- ✓ `*` a tela mostra "Informe um e-mail válido." abaixo do campo de e-mail | interpretado como: mensagem visível com o topo abaixo da borda inferior do campo e ligada a ele por aria-describedby | observado mensagem em y=292, campo termina em y=284; aria-describedby do campo aponta para "Informe um e-mail válido." | passou
- ✓ o campo de e-mail tem aria-invalid verdadeiro | esperado true, observado true
- ✓ `*` base visual (erro de campo) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 9 elementos conferidos, 0 achado(s); shots/UI-PEDIDO-03-1.png | passou

<details>
<summary>Evidência</summary>

```
GET /api/v1/session -> 401
GET /api/v1/session -> 401
screenshots: shots/UI-PEDIDO-03-1.png
```

</details>

#### UI-REDEFINIR-01 *
- Veredito: passou
- ✓ a página envia GET /api/auth/reset-password-status com o token do link e recebe 200 | esperado 1 GET com o token do link, 200, observado 1 GET, token igual ao do link: true, status 200
- ✓ a tela mostra os campos "Nova senha" e "Confirme a nova senha" com rótulos visíveis e tipo password | esperado dois campos password com rótulo visível, observado Nova senha: campo=1, type=password, rótulo visível=true; Confirme a nova senha: campo=1, type=password, rótulo visível=true
- ✓ a tela mostra o botão "Salvar a nova senha" | esperado visível, observado visível
- ✓ `*` base visual (formulário aberto pelo link) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 10 elementos conferidos, 0 achado(s); shots/UI-REDEFINIR-01-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa carla@example.com: role=user emailVerified=t banned=f
POST request-password-reset carla@example.com (XFF 203.0.113.103) -> 200
link aberto: http://localhost:5173/redefinir-senha?token=GxFc<mascarado>
GET /api/v1/session -> 401
GET /api/auth/reset-password-status?token=GxFc<mascarado> -> 200
screenshots: shots/UI-REDEFINIR-01-1.png
```

</details>

#### UI-REDEFINIR-02 *
- Veredito: passou
- ✓ `*` base visual (formulário) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 10 elementos conferidos, 0 achado(s); shots/UI-REDEFINIR-02-1.png | passou
- ✓ a página envia POST /api/auth/reset-password e recebe 200 | esperado 1 POST, 200, observado 1 POST, status 200
- ✓ `*` a tela diz "Senha alterada" | interpretado como: texto visível no card, no título h1 da rota | observado h1: ["Senha alterada"] | passou
- ✓ a tela tem um link ou botão "Entrar" para /entrar | esperado link ou botão visível para /entrar, observado a visível=true href=/entrar (no card, dentro de main)
- ✓ a tela não mostra os campos de senha | esperado 0, observado 0
- ✓ a página não envia uma segunda requisição a /api/auth/reset-password-status | esperado 1, observado 1 (antes do clique 1)
- ✓ `*` base visual (senha alterada) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 8 elementos conferidos, 0 achado(s); shots/UI-REDEFINIR-02-2.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa davi@example.com: role=user emailVerified=t banned=f
POST request-password-reset davi@example.com (XFF 203.0.113.104) -> 200
link aberto: http://localhost:5173/redefinir-senha?token=z6V3<mascarado>
GET /api/v1/session -> 401
GET /api/auth/reset-password-status?token=z6V3<mascarado> -> 200
POST /api/auth/reset-password -> 200 {"token":"z6V3<mascarado>","newPassword":"Nova12345"}
GET /api/v1/session -> 401
screenshots: shots/UI-REDEFINIR-02-1.png, shots/UI-REDEFINIR-02-2.png
```

</details>

#### UI-REDEFINIR-03 *
- Veredito: passou
- ✓ a página não envia requisição a /api/auth/reset-password | esperado 0, observado 0
- ✓ `*` a tela mostra "As senhas não conferem." abaixo do campo "Confirme a nova senha" | interpretado como: mensagem visível com o topo abaixo da borda inferior do campo e ligada a ele por aria-describedby | observado mensagem em y=396, campo termina em y=388; aria-describedby do campo aponta para "As senhas não conferem." | passou
- ✓ o campo "Confirme a nova senha" tem aria-invalid verdadeiro | esperado true, observado true
- ✓ `*` base visual (senhas diferentes) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 11 elementos conferidos, 0 achado(s); shots/UI-REDEFINIR-03-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa dora@example.com: role=user emailVerified=t banned=f
POST request-password-reset dora@example.com (XFF 203.0.113.105) -> 200
link aberto: http://localhost:5173/redefinir-senha?token=UR8w<mascarado>
GET /api/v1/session -> 401
GET /api/auth/reset-password-status?token=UR8w<mascarado> -> 200
GET /api/v1/session -> 401
screenshots: shots/UI-REDEFINIR-03-1.png
```

</details>

#### UI-REDEFINIR-04 *
- Veredito: passou
- ✓ a página não envia requisição a /api/auth/reset-password | esperado 0, observado 0
- ✓ `*` a tela mostra "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." abaixo do campo "Nova senha" | interpretado como: mensagem visível com o topo abaixo da borda inferior do campo e ligada a ele por aria-describedby | observado mensagem em y=292, campo termina em y=284; aria-describedby do campo aponta para "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | passou
- ✓ a tela continua com os dois campos | esperado 2, observado 2
- ✓ `*` base visual (senha fora da regra) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 11 elementos conferidos, 0 achado(s); shots/UI-REDEFINIR-04-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa duda@example.com: role=user emailVerified=t banned=f
POST request-password-reset duda@example.com (XFF 203.0.113.106) -> 200
link aberto: http://localhost:5173/redefinir-senha?token=XmC4<mascarado>
GET /api/v1/session -> 401
GET /api/auth/reset-password-status?token=XmC4<mascarado> -> 200
GET /api/v1/session -> 401
screenshots: shots/UI-REDEFINIR-04-1.png
```

</details>

#### UI-INVALIDO-01 *
- Veredito: passou
- ✓ `*` a tela diz "Link inválido" | interpretado como: texto visível no card, no título h1 da rota | observado h1: ["Link inválido"] | passou
- ✓ a tela tem um link ou botão "Pedir outro link" para /recuperar-senha | esperado link ou botão visível para /recuperar-senha, observado a visível=true href=/recuperar-senha
- ✓ a tela não mostra os campos de senha | esperado 0, observado 0
- ✓ `*` base visual (link vencido) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 8 elementos conferidos, 0 achado(s); shots/UI-INVALIDO-01-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa enzo@example.com: role=user emailVerified=t banned=f
POST request-password-reset enzo@example.com (XFF 203.0.113.107) -> 200
vencimento movido para 1 minuto antes de agora
link aberto: http://localhost:5173/redefinir-senha?token=Etya<mascarado>
GET /api/v1/session -> 401
GET /api/auth/reset-password-status?token=Etya<mascarado> -> 400
screenshots: shots/UI-INVALIDO-01-1.png
```

</details>

#### UI-INVALIDO-02 *
- Veredito: passou
- ✓ `*` a tela diz "Link inválido" | interpretado como: texto visível no card, no título h1 da rota | observado h1: ["Link inválido"] | passou
- ✓ a tela tem um link ou botão "Pedir outro link" para /recuperar-senha | esperado link ou botão visível para /recuperar-senha, observado a visível=true href=/recuperar-senha
- ✓ a tela não mostra os campos de senha | esperado 0, observado 0
- ✓ `*` base visual (link usado) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 8 elementos conferidos, 0 achado(s); shots/UI-INVALIDO-02-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa eva@example.com: role=user emailVerified=t banned=f
POST request-password-reset eva@example.com (XFF 203.0.113.108) -> 200
POST reset-password com o token de L1 -> 200 {"status":true}
link aberto: http://localhost:5173/redefinir-senha?token=5DC8<mascarado>
GET /api/v1/session -> 401
GET /api/auth/reset-password-status?token=5DC8<mascarado> -> 400
screenshots: shots/UI-INVALIDO-02-1.png
```

</details>

#### UI-INVALIDO-03 *
- Veredito: passou
- ✓ `*` a tela diz "Link inválido" | interpretado como: texto visível no card, no título h1 da rota | observado h1: ["Link inválido"] | passou
- ✓ a página não envia requisição a /api/auth/reset-password-status | esperado 0, observado 0
- ✓ a tela tem um link ou botão "Pedir outro link" para /recuperar-senha | esperado link ou botão visível para /recuperar-senha, observado a visível=true href=/recuperar-senha
- ✓ `*` base visual (sem token) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 8 elementos conferidos, 0 achado(s); shots/UI-INVALIDO-03-1.png | passou

<details>
<summary>Evidência</summary>

```
GET /api/v1/session -> 401
screenshots: shots/UI-INVALIDO-03-1.png
```

</details>

#### UI-INVALIDO-04 *
- Veredito: passou
- ✓ a página envia POST /api/auth/reset-password e recebe 400 | esperado 1 POST, 400, observado 1 POST, status 400
- ✓ `*` a tela diz "Link inválido" | interpretado como: texto visível no card, no título h1 da rota | observado h1: ["Link inválido"] | passou
- ✓ a tela tem um link ou botão "Pedir outro link" para /recuperar-senha | esperado link ou botão visível para /recuperar-senha, observado a visível=true href=/recuperar-senha
- ✓ a tela não diz "Senha alterada" | esperado ausente, observado ausente
- ✓ `*` base visual (link recusado ao salvar) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 8 elementos conferidos, 0 achado(s); shots/UI-INVALIDO-04-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa ema@example.com: role=user emailVerified=t banned=f
POST request-password-reset ema@example.com (XFF 203.0.113.109) -> 200
link aberto: http://localhost:5173/redefinir-senha?token=sHDr<mascarado>
campos de senha à vista antes do segundo pedido: 2
POST request-password-reset ema@example.com (XFF 203.0.113.109) -> 200
GET /api/v1/session -> 401
GET /api/auth/reset-password-status?token=sHDr<mascarado> -> 200
POST /api/auth/reset-password -> 400 {"token":"sHDr<mascarado>","newPassword":"Nova12345"}
GET /api/v1/session -> 401
screenshots: shots/UI-INVALIDO-04-1.png
```

</details>

#### UI-FALHA-01 *
- Veredito: passou
- ✓ a tela mostra "O servidor não respondeu. Tente de novo." | esperado visível, observado visível
- ✓ a tela não mostra "Se o e-mail tiver conta, enviamos o link." | esperado ausente, observado ausente
- ✓ `*` a página não mostra a página de erro | interpretado como: ausência dos títulos da página de erro da SPA (errorElement da rota raiz) | observado nenhum; h1: ["Recuperar a senha"] | passou
- ✓ `*` base visual (api fora no envio) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 10 elementos conferidos, 0 achado(s); shots/UI-FALHA-01-1.png | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api
GET /api/v1/session -> 401
POST /api/auth/request-password-reset -> falhou: net::ERR_CONNECTION_REFUSED {"email":"fabia@example.com"}
GET /api/v1/session -> falhou: net::ERR_CONNECTION_REFUSED
main: Recuperar a senha | O servidor não respondeu. Tente de novo. | E-mail | Enviar o link
api religada: /api/health {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
screenshots: shots/UI-FALHA-01-1.png
```

</details>

#### UI-FALHA-02 *
- Veredito: passou
- ✓ a tela mostra "O servidor não respondeu. Tente de novo." | esperado visível, observado visível
- ✓ a tela não mostra os campos de senha | esperado 0, observado 0
- ✓ `*` a página não mostra a página de erro | interpretado como: ausência dos títulos da página de erro da SPA (errorElement da rota raiz) | observado nenhum; h1: ["Definir nova senha"] | passou
- ✓ `*` base visual (api fora ao abrir) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/UI-FALHA-02-1.png | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api
GET /api/v1/session -> falhou: net::ERR_CONNECTION_REFUSED
GET /api/auth/reset-password-status?token=abc -> falhou: net::ERR_CONNECTION_REFUSED
main: Definir nova senha | O servidor não respondeu. Tente de novo.
api religada: /api/health {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
screenshots: shots/UI-FALHA-02-1.png
```

</details>

#### UI-VISUAL-01 *
- Veredito: passou
- ✓ o "Salvar a nova senha" tem fundo #000, texto #fff e raio de borda de 999px | esperado rgb(0, 0, 0), rgb(255, 255, 255), 999px, observado rgb(0, 0, 0), rgb(255, 255, 255), 999px
- ✓ `*` o card da redefinição tem fundo #fff e raio de borda de 16px | interpretado como: o card é o contêiner que envolve o título e o formulário | observado rgb(255, 255, 255), 16px (elemento pai do título, classe card-content mx-auto w-full max-w-[490px]) | passou
- ✓ a família de fonte computada do título começa por Inter Variable | esperado começa por Inter Variable, observado "Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif
- ✓ a página não tem rolagem horizontal | esperado scrollWidth <= clientWidth, observado 375 e 375
- ✓ a barra de navegação está visível acima do card | esperado nav visível e terminando acima do topo do card, observado nav visível=true, nav termina em y=76, card começa em y=108
- ✓ `*` base visual (375px) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 10 elementos conferidos, 0 achado(s); shots/UI-VISUAL-01-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa gil@example.com: role=user emailVerified=t banned=f
POST request-password-reset gil@example.com (XFF 203.0.113.110) -> 200
link aberto: http://localhost:5173/redefinir-senha?token=rNN7<mascarado>
GET /api/v1/session -> 401
GET /api/auth/reset-password-status?token=rNN7<mascarado> -> 200
screenshots: shots/UI-VISUAL-01-1.png
```

</details>

### E2E

#### E2E-RECUPERACAO-01 *
- Veredito: passou
- ✓ `*` base visual (pedido enviado) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/E2E-RECUPERACAO-01-1.png | passou
- ✓ `*` base visual (formulário pelo link) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 10 elementos conferidos, 0 achado(s); shots/E2E-RECUPERACAO-01-2.png | passou
- ✓ `*` a tela diz "Senha alterada" | interpretado como: texto visível no card, no título h1 da rota | observado h1: ["Senha alterada"] | passou
- ✓ `*` base visual (senha alterada) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 8 elementos conferidos, 0 achado(s); shots/E2E-RECUPERACAO-01-3.png | passou
- ✓ POST /api/auth/sign-in/email com elisa.m@example.com e Jornada456 responde 200 | esperado 200, observado 200
- ✓ POST /api/auth/sign-in/email com elisa.m@example.com e Antiga123 responde 401 | esperado 401, observado 401
- ✓ GET /api/v1/session com o cookie C1 responde 401 | esperado 401, observado 401

<details>
<summary>Evidência</summary>

```
conta-ativa elisa.m@example.com: role=user emailVerified=t banned=f
sessão aberta antes: sign-in -> 200; GET /api/v1/session com C1 -> 200
e-mail chegou em 0.0s; link http://localhost:5173/redefinir-senha?token=4rRX<mascarado>
GET /api/v1/session -> 401
POST /api/auth/request-password-reset -> 200 {"email":"elisa.m@example.com"}
GET /api/v1/session -> 401
GET /api/v1/session -> 401
GET /api/auth/reset-password-status?token=4rRX<mascarado> -> 200
POST /api/auth/reset-password -> 200 {"token":"4rRX<mascarado>","newPassword":"Jornada456"}
GET /api/v1/session -> 401
screenshots: shots/E2E-RECUPERACAO-01-1.png, shots/E2E-RECUPERACAO-01-2.png, shots/E2E-RECUPERACAO-01-3.png
```

</details>

#### E2E-INTEGRACAO-01 *
- Veredito: passou
- ✓ `*` base visual (cadastro de fabio@example.com) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/E2E-INTEGRACAO-01-1.png | passou
- ✓ `*` base visual (cadastro de gabi@example.com) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/E2E-INTEGRACAO-01-2.png | passou
- ✓ `*` base visual (senha alterada) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 8 elementos conferidos, 0 achado(s); shots/E2E-INTEGRACAO-01-3.png | passou
- ✓ a caixa tem uma mensagem "Redefina sua senha" para fabio@example.com e nenhuma para gabi@example.com | esperado fabio 1, gabi 0, observado fabio 1, gabi 0
- ✓ POST /api/auth/sign-in/email com fabio@example.com e Jornada789 responde 200 | esperado 200, observado 200
- ✓ POST /api/auth/sign-in/email com fabio@example.com e Jornada123 responde 401 | esperado 401, observado 401
- ✓ POST /api/auth/sign-in/email com gabi@example.com e Jornada123 responde 200 | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
cadastros pela tela: 200, 200
e-mails marcados como verificados: [["fabio@example.com","t"],["gabi@example.com","t"]]
e-mail chegou em 0.0s
GET /api/v1/session -> 401
POST /api/auth/sign-up/email -> 200 {"name":"Fabio","email":"fabio@example.com","password":"Jornada123"}
GET /api/v1/session -> 401
GET /api/v1/session -> 401
POST /api/auth/sign-up/email -> 200 {"name":"Gabi","email":"gabi@example.com","password":"Jornada123"}
GET /api/v1/session -> 401
GET /api/v1/session -> 401
POST /api/auth/request-password-reset -> 200 {"email":"fabio@example.com"}
GET /api/v1/session -> 401
GET /api/v1/session -> 401
GET /api/auth/reset-password-status?token=AzH2<mascarado> -> 200
POST /api/auth/reset-password -> 200 {"token":"AzH2<mascarado>","newPassword":"Jornada789"}
GET /api/v1/session -> 401
h1 depois de salvar: ["Senha alterada"]
screenshots: shots/E2E-INTEGRACAO-01-1.png, shots/E2E-INTEGRACAO-01-2.png, shots/E2E-INTEGRACAO-01-3.png
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `compose.yaml`: o serviço api instala nos volumes ao subir; `scripts/db-setup.sh` garante as dependências |
| Ambiente e serviços | 1 e 2 | contrato (Docker Compose) e `compose.yaml`: o ambiente local já no ar, com a api recriada por um override do Compose na pasta temporária (`COMPOSE_FILE`) |
| Banco efêmero e migração | 5 | `scripts/db-setup.sh`: banco `eval_rf005_2026_11_01t15_54_41z` no postgres do Compose, `DATABASE_URL` da api trocada pelo override, `make db-setup` migra e cria o admin |
| Isolamento do Valkey | 4 e 6 | avaliação do RF-002: `REDIS_URL=redis://valkey:6379/3` no override, banco lógico 3 vazio antes da avaliação |
| Estado persistido | 1, 3 e 6 | contrato (atributos da `conta-ativa` e janelas livres) e spec (factory da conta ativa nos testes): a conta criada pela rota de cadastro e ajustada no banco, porque a factory roda dentro da aplicação de teste |
| Limpeza entre itens | 4 e 6 | DELETE da tabela verification e das contas sem papel admin (account e session em cascata), `rate-limit:*` no Valkey e DELETE /api/v1/messages no Mailpit |
| Gates | 1 | contrato: `make check` e `make build` na raiz |
| Cliente HTTP | 6 | `urllib` do Python, com o X-Forwarded-For do contrato e o Origin da SPA |
| Logs da api | 1 e 3 | contrato e spec, Verificação por superfície: `docker compose logs api --since <início do item>` |
| Caixa de e-mail | 3 | spec, Verificação por superfície (ADR-0016): API REST do Mailpit |
| Banco | 1 | contrato, Configuração: registro em `verification` por identifier `reset-password:` e value igual ao id da conta; `psql` no host |
| Serviço valkey parado | 1 e 3 | contrato e spec: `docker compose stop valkey` e religado com `docker compose up -d --wait valkey` |
| Serviço api parado | 3 | spec: `docker compose stop api` e religada com `docker compose up -d --wait --no-deps api`, com o override |
| Navegador | 3 | spec, Verificação por superfície (ADR-0024): Chromium headless pelo `playwright-core` 1.64 do `@playwright/cli` no cache do npx, dirigido por script Node, um contexto sem cookie por item |
| Base visual | 6 | `evaluate` no navegador (imagens, caixas na janela, corte por `overflow`, `elementFromPoint`) e screenshot por estado, revisado em folhas de contato sem achados |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_rf005_*`, nenhuma pasta `evaluator-rf005-*` e nenhum PID de avaliação anterior no início.
- Derrubada: completa. Nenhum PID no `processos.lock` (o navegador fechou com o script); api recriada sem o override, de volta à `DATABASE_URL` do banco `app` e ao Valkey no banco 0, saudável; banco lógico 3 do Valkey esvaziado; caixa do Mailpit esvaziada; banco `eval_rf005_2026_11_01t15_54_41z` apagado; pasta `/tmp/evaluator-rf005-2026-11-01T15-54-41Z` apagada, com os screenshots.

## Avisos

- Avaliado com 1 arquivo fora de commit, só documentação: `docs/features/RF-005-recuperar-senha/orquestracao.md`. O código avaliado é o do commit 01578f3.
- Os gates rodaram antes de a api ser recriada apontando para o banco efêmero, porque o `make build` no host reescreve `apps/api/dist`, bind mount do `nest start --watch` do container.
- API-SIGILO-01 e API-SIGILO-02: as rotas `/api/auth/request-password-reset` e `/api/auth/reset-password` não escrevem linha de log na api no caminho feliz (0 linhas capturadas na janela de cada item); os bullets de ausência passam sobre o que foi capturado, e uma busca ampla em todo o log da api durante a avaliação (238 linhas) não achou e-mail `@example.com`, nome (Rosa Lima, Bia Nunes, Bruno Reis, Zilda Rocha), senha (Antiga123, Nova12345, Sigilo12345, Jornada), `token=` nem o caminho das rotas de recuperação.
- A SPA mostra "Entrar" também na barra de navegação; o bullet de "Entrar" de UI-REDEFINIR-02 foi conferido no "Entrar" do card, dentro de `main`.
- Os itens usam o Valkey (banco lógico 3) e o Mailpit compartilhados do ambiente de desenvolvimento: a caixa do Mailpit (que tinha 5 mensagens do desenvolvimento no início) foi esvaziada antes de cada item. API-PEDIDO-03 e API-PEDIDO-04 pararam o serviço valkey inteiro, compartilhado com o ambiente de desenvolvimento, e o religaram no fim do item.
- Itens que não dão nome às contas usaram como nome o primeiro nome do e-mail (Rui, Sara, Alice ...).
- Nos itens de UI, o pedido de recuperação feito pelo navegador não leva X-Forwarded-For (o contrato só o exige fora do navegador): o contador de rate limit é o do endereço local, zerado antes de cada item.

## Motivo do aborto

Nenhum.
