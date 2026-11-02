# Avaliação: RF-005 Recuperar senha

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-11-02T02-43-47Z
- Branch: fix/email-token-na-fila
- Commit: 05d1238
- Status: limpo
- Itens: 47 passou, 0 falhou, 0 bloqueado, 0 manual, 0 pulado, de 47
- Critérios: 5 verificado, 0 reprovado, 0 indeterminado, de 5
- Filtros: nenhum

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| E-mail com conta e e-mail sem conta recebem a mesma resposta na tela. | ✓ verificado | API-PEDIDO-02, API-PEDIDO-03, API-PEDIDO-05, WRK-EMAIL-02, UI-PEDIDO-01, UI-PEDIDO-02, UI-PEDIDO-03, UI-FALHA-01 |
| Link aberto dentro de 1 hora troca a senha; a senha antiga deixa de entrar e a nova entra. | ✓ verificado | API-PEDIDO-01, API-PEDIDO-04, API-CHECAGEM-01, API-TROCA-01, API-TROCA-02, API-TROCA-03, API-TROCA-04, API-TROCA-05, API-REGRA-01, API-REGRA-02, API-REGRA-03, API-SIGILO-01, API-SIGILO-02, WRK-EMAIL-01, WRK-SIGILO-01, WRK-SIGILO-02, UI-REDEFINIR-01, UI-REDEFINIR-02, UI-REDEFINIR-03, UI-REDEFINIR-04, UI-FALHA-02, UI-VISUAL-01, E2E-RECUPERACAO-01 |
| Link usado uma vez ou aberto depois de 1 hora não troca a senha. | ✓ verificado | API-LIMPEZA-01, API-REPEDIDO-01, API-REPEDIDO-02, API-CHECAGEM-02, API-CHECAGEM-03, API-CHECAGEM-04, API-USO-01, API-USO-02, API-USO-03, UI-INVALIDO-01, UI-INVALIDO-02, UI-INVALIDO-03, UI-INVALIDO-04 |
| Depois da troca, sessões abertas antes dela deixam de ter acesso. | ✓ verificado | API-SESSAO-01, API-SESSAO-02, E2E-RECUPERACAO-01 |
| RF-001 → RF-005: o e-mail cadastrado recebe o link de recuperação e a nova senha passa a valer para aquela conta. | ✓ verificado | E2E-INTEGRACAO-01, WRK-EMAIL-01 |

## Gates de qualidade

- ✓ check: `make check`, código 0 (com `TURBO_FORCE=true`: 5 tarefas, 0 do cache; API 28 arquivos de unidade (182 testes) e 14 de integração (107 testes), SPA 11 arquivos (91 testes), Contratos 3 arquivos (34 testes); "ok: todas as verificações passaram")
- ✓ build: `make build`, código 0 (com `TURBO_FORCE=true`: 4 tarefas, 0 do cache)

## Pré-requisitos

### Serviços em execução
- ✓ api (com o worker do Módulo E-mail): http://localhost:3000, saúde /api/health respondeu 200 `{"status":"ok","checks":{"postgres":"up","valkey":"up"}}`, recriada apontando para o banco efêmero `eval_rf005_2026_11_02t02_43_47z` e para o Valkey no banco lógico 3; parada e religada em UI-FALHA-01 e UI-FALHA-02, de volta saudável
- ✓ web: http://localhost:5173/ respondeu 200, saudável no Compose
- ✓ postgres: saudável no Compose (PostgreSQL 18)
- ✓ valkey: saudável no Compose (Valkey 9); parado e religado em API-PEDIDO-03 e API-PEDIDO-04, de volta saudável (`/api/health` com valkey up)
- ✓ mailpit: saudável no Compose (axllent/mailpit:v1.32), API REST em http://localhost:8025; parado em WRK-SIGILO-02 e religado no fim do item, saudável

### Estado persistido
- ✓ `conta-ativa`: criada por POST /api/auth/sign-up/email (senha Antiga123, X-Forwarded-For do item), seguida de UPDATE `emailVerified` true e remoção das sessões e dos registros de `verification` da conta; conferido em cada item: role=user, emailVerified=t, banned=f, 0 sessões e 0 registros de recuperação
- ✓ `janela-de-recuperacao-livre`: chaves `rate-limit:*` apagadas no banco lógico 3 do Valkey antes de cada item; conferido: os cinco pedidos de API-PEDIDO-05 responderam 200 e só o sexto recebeu 429, e nenhum pedido pela tela recebeu 429
- ✓ `janela-de-cadastro-livre`: mesmo mecanismo; conferido: os cadastros de API-TROCA-05 e E2E-INTEGRACAO-01 responderam 200

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env` copiado do `.env.example` (idênticos): NODE_ENV=development e TRUSTED_PROXIES vazia em vigor no container da api (o contrato pede development e vazia); `make db-setup` aplicado ao banco efêmero (migração `20261029000000_init` aplicada, "seed: primeiro admin criado")
- ✓ X-Forwarded-For de cadastro e pedido de recuperação: cada item fora do navegador usou um IP 203.0.113.x exclusivo (de .1 a .30 nos itens de API e Worker, de .101 a .112 nos de UI e E2E)
- ✓ X-Forwarded-For de entrada: cada POST /api/auth/sign-in/email fora do navegador usou um IP 198.51.100.x distinto dentro do item (veja Avisos)
- ✓ Link de recuperação: lido da mensagem mais recente de assunto "Redefina sua senha" para o e-mail na caixa do Mailpit (busca `to:"<e-mail>" subject:"Redefina sua senha"`), token pelo parâmetro `token`
- ✓ Registro de recuperação: linha de `verification` com identifier `reset-password:<hash>` e value igual ao id da conta; vencimento movido com UPDATE do `expiresAt` (coluna sem fuso, em UTC)
- ✓ Job reset-password: hash `bull:email.send:<id>` com name `reset-password` e `userId` da conta no campo data, achado pelas zsets `completed`, `failed`, `delayed` e `prioritized` e listas `wait`, `active` e `paused`
- ✓ Sessão aberta antes: cookie de sessão (`better-auth.session_token`) da resposta de POST /api/auth/sign-in/email com o e-mail e a senha da conta

### Dependências externas
- ✓ DEP-1 serviço de envio de e-mail: Mailpit v1.32 do Compose, lido e esvaziado pela API REST (`/api/v1/search`, `/api/v1/message/<id>`, DELETE `/api/v1/messages`); as mensagens chegaram em menos de 1 segundo; parado com `docker compose stop mailpit` em WRK-SIGILO-02

## Itens

### API HTTP

#### API-PEDIDO-01
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
- ✓ o banco tem exatamente um registro de recuperação para a conta de rosa@example.com | esperado 1, observado 1
- ✓ o expiresAt desse registro fica entre 59 e 61 minutos depois da resposta | esperado entre 59 e 61 min, observado 60.00 min
- ✓ o identifier e o value desse registro não contêm o token do link que chegou para rosa@example.com | esperado token ausente de identifier e value, observado identifier=reset-password:ba6ef74706affa2..., value=id da conta: True; token presente: False

<details>
<summary>Evidência</summary>

```
conta-ativa rosa@example.com (Rosa Lima): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset rosa@example.com (XFF 203.0.113.1) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de rosa@example.com (mensagem 1, em 0.0s): token kW6X<mascarado>
registro: identifier reset-password:ba6ef74706affa2..., expiresAt epoch 1793591305.382000, resposta 2026-11-02T02:48:25.388963+00:00
```

</details>

#### API-PEDIDO-02
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo é igual a C | esperado {"status":true,"message":"If this email exists in our system, check your email for the reset link"}, observado {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
- ✓ o banco não tem conta com o e-mail sem.conta@example.com | esperado 0, observado 0
- ✓ o banco não ganhou registro de recuperação durante o item | esperado 1 (antes), observado 1

<details>
<summary>Evidência</summary>

```
conta-ativa rui@example.com (Rui): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset rui@example.com (XFF 203.0.113.2) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
POST request-password-reset sem.conta@example.com (XFF 203.0.113.2) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
```

</details>

#### API-PEDIDO-03
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ o corpo é igual a C | esperado {"status":true,"message":"If this email exists in our system, check your email for the reset link"}, observado {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
- ✓ o banco tem exatamente um registro de recuperação para a conta de sara@example.com | esperado 1, observado 1
- ✓ esse registro é o R1 | esperado nTVcn5MMU90GzVoc9Z20ME9DdxnZto69, observado ['nTVcn5MMU90GzVoc9Z20ME9DdxnZto69']

<details>
<summary>Evidência</summary>

```
conta-ativa sara@example.com (Sara): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset sara@example.com (XFF 203.0.113.3) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
R1 id nTVcn5MMU90GzVoc9Z20ME9DdxnZto69
docker compose stop valkey
POST request-password-reset sara@example.com (XFF 203.0.113.3) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
tempo da resposta: 0.0s
valkey religado; /api/health {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
```

</details>

#### API-PEDIDO-04
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true}
- ✓ o banco não tem registro de recuperação para a conta de saulo@example.com | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
conta-ativa saulo@example.com (Saulo): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset saulo@example.com (XFF 203.0.113.4) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de saulo@example.com (mensagem 1, em 0.3s): token dA4A<mascarado>
docker compose stop valkey
POST request-password-reset saulo@example.com (XFF 203.0.113.4) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
valkey religado; /api/health {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
POST reset-password token=dA4A<mascarado> newPassword=Nova12345 -> 200 {"status":true}
```

</details>

#### API-PEDIDO-05
- Veredito: passou
- ✓ a resposta é 429 | esperado 429, observado 429
- ✓ a resposta traz o cabeçalho X-Retry-After | esperado presente, observado 60

<details>
<summary>Evidência</summary>

```
conta-ativa tito@example.com (Tito): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
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
conta-ativa hugo@example.com (Hugo): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
conta-ativa iris@example.com (Iris): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset hugo@example.com (XFF 203.0.113.6) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
expiresAt movido para -1 min: [['2026-11-02 02:47:41.626', '2026-11-02 02:48:41.666126']]
POST request-password-reset iris@example.com (XFF 203.0.113.6) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
```

</details>

#### API-REPEDIDO-01
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código INVALID_TOKEN | esperado code INVALID_TOKEN, observado {"message":"Invalid token","code":"INVALID_TOKEN"}
- ✓ o hash da credencial da conta de tais@example.com é o mesmo de antes do item | esperado igual, observado igual
- ✓ o banco tem exatamente um registro de recuperação para essa conta | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
conta-ativa tais@example.com (Tais): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset tais@example.com (XFF 203.0.113.7) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de tais@example.com (mensagem 1, em 0.3s): token Y7p0<mascarado>
POST request-password-reset tais@example.com (XFF 203.0.113.7) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de tais@example.com (mensagem 2, em 0.3s): token lKjJ<mascarado>
POST reset-password token=Y7p0<mascarado> newPassword=Nova12345 -> 400 {"message":"Invalid token","code":"INVALID_TOKEN"}
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
conta-ativa teo@example.com (Teo): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset teo@example.com (XFF 203.0.113.8) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de teo@example.com (mensagem 1, em 0.3s): token KN4x<mascarado>
POST request-password-reset teo@example.com (XFF 203.0.113.8) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de teo@example.com (mensagem 2, em 0.3s): token ixxQ<mascarado>
POST reset-password token=ixxQ<mascarado> newPassword=Nova12345 -> 200 {"status":true}
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
conta-ativa ugo@example.com (Ugo): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset ugo@example.com (XFF 203.0.113.9) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de ugo@example.com (mensagem 1, em 0.3s): token lnnh<mascarado>
GET reset-password-status?token=lnnh<mascarado> -> 200 {"valid":true}
```

</details>

#### API-CHECAGEM-02
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código INVALID_TOKEN | esperado code INVALID_TOKEN, observado {"code":"INVALID_TOKEN","message":"Este link não vale mais. Peça outro link."}

<details>
<summary>Evidência</summary>

```
conta-ativa una@example.com (Una): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset una@example.com (XFF 203.0.113.10) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de una@example.com (mensagem 1, em 0.3s): token tZZY<mascarado>
expiresAt movido para -1 min: [['2026-11-02 02:47:45.292', '2026-11-02 02:48:45.321572']]
GET reset-password-status?token=tZZY<mascarado> -> 400 {"code":"INVALID_TOKEN","message":"Este link não vale mais. Peça outro link."}
```

</details>

#### API-CHECAGEM-03
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código INVALID_TOKEN | esperado code INVALID_TOKEN, observado {"code":"INVALID_TOKEN","message":"Este link não vale mais. Peça outro link."}

<details>
<summary>Evidência</summary>

```
conta-ativa uri@example.com (Uri): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset uri@example.com (XFF 203.0.113.11) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de uri@example.com (mensagem 1, em 0.3s): token cwvg<mascarado>
POST reset-password token=cwvg<mascarado> newPassword=Nova12345 -> 200 {"status":true}
GET reset-password-status?token=cwvg<mascarado> -> 400 {"code":"INVALID_TOKEN","message":"Este link não vale mais. Peça outro link."}
```

</details>

#### API-CHECAGEM-04
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código INVALID_TOKEN | esperado code INVALID_TOKEN, observado {"code":"INVALID_TOKEN","message":"Este link não vale mais. Peça outro link."}

<details>
<summary>Evidência</summary>

```
GET reset-password-status?token=abc -> 400 {"code":"INVALID_TOKEN","message":"Este link não vale mais. Peça outro link."}
```

</details>

#### API-TROCA-01
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true}
- ✓ a resposta não define cookie de sessão | esperado sem cookie de sessão, observado Set-Cookie ausente
- ✓ o hash da credencial da conta de vitor@example.com é diferente do de antes do item | esperado diferente, observado diferente
- ✓ o banco não tem registro de recuperação para essa conta | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
conta-ativa vitor@example.com (Vitor): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset vitor@example.com (XFF 203.0.113.12) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de vitor@example.com (mensagem 1, em 0.3s): token 8MJi<mascarado>
POST reset-password token=8MJi<mascarado> newPassword=Nova12345 -> 200 {"status":true}
Set-Cookie: []
```

</details>

#### API-TROCA-02
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo traz o código INVALID_EMAIL_OR_PASSWORD | esperado INVALID_EMAIL_OR_PASSWORD, observado {"message":"Invalid email or password","code":"INVALID_EMAIL_OR_PASSWORD"}
- ✓ a resposta não define cookie de sessão | esperado sem cookie de sessão, observado Set-Cookie ausente

<details>
<summary>Evidência</summary>

```
conta-ativa vera@example.com (Vera): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset vera@example.com (XFF 203.0.113.13) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de vera@example.com (mensagem 1, em 0.3s): token y82A<mascarado>
POST reset-password token=y82A<mascarado> newPassword=Nova12345 -> 200 {"status":true}
POST sign-in/email vera@example.com Antiga123 (XFF 198.51.100.1) -> 401 {"message":"Invalid email or password","code":"INVALID_EMAIL_OR_PASSWORD"}; cookie de sessão: False
```

</details>

#### API-TROCA-03
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- ✓ a resposta define o cookie de sessão | esperado cookie de sessão, observado better-auth.session_token=<mascarado>
- ✓ o banco tem uma sessão para a conta de vilma@example.com | esperado ao menos 1, observado 1

<details>
<summary>Evidência</summary>

```
conta-ativa vilma@example.com (Vilma): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset vilma@example.com (XFF 203.0.113.14) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de vilma@example.com (mensagem 1, em 0.3s): token TIdm<mascarado>
POST reset-password token=TIdm<mascarado> newPassword=Nova12345 -> 200 {"status":true}
POST sign-in/email vilma@example.com Nova12345 (XFF 198.51.100.2) -> 200 {"redirect":false,"token":"9O4M<mascarado>","user":{"name":"Vilma","email":"vilma@example.com","emailVerified":true,"image":null,"createdAt":"2; cookie de sessão: True
```

</details>

#### API-TROCA-04
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true}
- ✓ o hash da credencial da conta de valter@example.com é diferente do de antes do item | esperado diferente, observado diferente

<details>
<summary>Evidência</summary>

```
conta-ativa valter@example.com (Valter): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset valter@example.com (XFF 203.0.113.15) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de valter@example.com (mensagem 1, em 0.3s): token fss8<mascarado>
expiresAt movido para +1 min: [['2026-11-02 02:49:49.481', '2026-11-02 02:48:49.511422']]
POST reset-password token=fss8<mascarado> newPassword=Nova12345 -> 200 {"status":true}
```

</details>

#### API-TROCA-05
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true}
- ✓ o hash da credencial da conta de wanda@example.com é diferente do de antes do item | esperado diferente, observado diferente
- ✓ a conta continua com e-mail não verificado | esperado emailVerified false, observado emailVerified f

<details>
<summary>Evidência</summary>

```
POST sign-up/email wanda@example.com (XFF 203.0.113.16) -> 200
conta pendente: emailVerified=f
POST request-password-reset wanda@example.com (XFF 203.0.113.16) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de wanda@example.com (mensagem 1, em 0.3s): token GjOb<mascarado>
POST reset-password token=GjOb<mascarado> newPassword=Nova12345 -> 200 {"status":true}
```

</details>

#### API-USO-01
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código INVALID_TOKEN | esperado code INVALID_TOKEN, observado {"message":"Invalid token","code":"INVALID_TOKEN"}
- ✓ o hash da credencial da conta de xico@example.com é o mesmo de antes do item | esperado igual, observado igual

<details>
<summary>Evidência</summary>

```
conta-ativa xico@example.com (Xico): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset xico@example.com (XFF 203.0.113.17) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de xico@example.com (mensagem 1, em 0.3s): token TESx<mascarado>
POST reset-password token=TESx<mascarado> newPassword=Nova12345 -> 200 {"status":true}
POST reset-password token=TESx<mascarado> newPassword=Outra12345 -> 400 {"message":"Invalid token","code":"INVALID_TOKEN"}
```

</details>

#### API-USO-02
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código INVALID_TOKEN | esperado code INVALID_TOKEN, observado {"message":"Invalid token","code":"INVALID_TOKEN"}
- ✓ o hash da credencial da conta de xena@example.com é o mesmo de antes do item | esperado igual, observado igual

<details>
<summary>Evidência</summary>

```
conta-ativa xena@example.com (Xena): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset xena@example.com (XFF 203.0.113.18) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de xena@example.com (mensagem 1, em 0.3s): token W29U<mascarado>
expiresAt movido para -1 min: [['2026-11-02 02:47:51.966', '2026-11-02 02:48:51.999534']]
POST reset-password token=W29U<mascarado> newPassword=Nova12345 -> 400 {"message":"Invalid token","code":"INVALID_TOKEN"}
```

</details>

#### API-USO-03
- Veredito: passou
- ✓ uma resposta é 200 e a outra é 400 com o código INVALID_TOKEN | esperado [200, 400 INVALID_TOKEN], observado [(200, None), (400, 'INVALID_TOKEN')]
- ✓ o banco não tem registro de recuperação para a conta de ximena@example.com | esperado 0, observado 0
- ✓ só a senha da requisição que recebeu 200 entra por POST /api/auth/sign-in/email | esperado vencedora 200, perdedora 401, observado vencedora ['Outra12345']: [200]; perdedora ['Nova12345']: [401]

<details>
<summary>Evidência</summary>

```
conta-ativa ximena@example.com (Ximena): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset ximena@example.com (XFF 203.0.113.19) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de ximena@example.com (mensagem 1, em 0.3s): token Cm9j<mascarado>
concorrente newPassword=Nova12345 -> 400 {"message":"Invalid token","code":"INVALID_TOKEN"}
concorrente newPassword=Outra12345 -> 200 {"status":true}
POST sign-in/email ximena@example.com Outra12345 (XFF 198.51.100.3) -> 200 {"redirect":false,"token":"uS6f<mascarado>","user":{"name":"Ximena","email":"ximena@example.com","emailVerified":true,"image":null,"createdAt":; cookie de sessão: True
POST sign-in/email ximena@example.com Nova12345 (XFF 198.51.100.4) -> 401 {"message":"Invalid email or password","code":"INVALID_EMAIL_OR_PASSWORD"}; cookie de sessão: False
```

</details>

#### API-REGRA-01
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e o campo newPassword com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | esperado code VALIDATION_ERROR, campo newPassword com a mensagem, observado {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"newPassword","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
- ✓ o hash da credencial da conta de yago@example.com é o mesmo de antes do item | esperado igual, observado igual
- ✓ o banco continua com um registro de recuperação para essa conta | esperado 1, observado 1

<details>
<summary>Evidência</summary>

```
conta-ativa yago@example.com (Yago): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset yago@example.com (XFF 203.0.113.20) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de yago@example.com (mensagem 1, em 0.3s): token 3uCn<mascarado>
POST reset-password token=3uCn<mascarado> newPassword=semnumero -> 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"newPassword","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-REGRA-02
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e o campo newPassword | esperado code VALIDATION_ERROR e campo newPassword, observado {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"newPassword","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
- ✓ o hash da credencial da conta de yan@example.com é o mesmo de antes do item | esperado igual, observado igual

<details>
<summary>Evidência</summary>

```
conta-ativa yan@example.com (Yan): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset yan@example.com (XFF 203.0.113.21) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de yan@example.com (mensagem 1, em 0.3s): token w8Yu<mascarado>
POST reset-password token=w8Yu<mascarado> newPassword=12345678 -> 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"newPassword","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-REGRA-03
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e o campo newPassword | esperado code VALIDATION_ERROR e campo newPassword, observado {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"newPassword","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
- ✓ o hash da credencial da conta de yvone@example.com é o mesmo de antes do item | esperado igual, observado igual

<details>
<summary>Evidência</summary>

```
conta-ativa yvone@example.com (Yvone): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset yvone@example.com (XFF 203.0.113.22) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de yvone@example.com (mensagem 1, em 0.3s): token 2qUN<mascarado>
POST reset-password token=2qUN<mascarado> newPassword=Nova123 -> 400 {"code":"VALIDATION_ERROR","message":"Confira os campos destacados.","fields":[{"field":"newPassword","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
```

</details>

#### API-SESSAO-01
- Veredito: passou
- ✓ a resposta é 200 com status verdadeiro | esperado 200 com status true, observado 200 {"status":true}
- ✓ o banco não tem sessão para a conta de zeno@example.com | esperado 0, observado 0

<details>
<summary>Evidência</summary>

```
conta-ativa zeno@example.com (Zeno): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST sign-in/email zeno@example.com Antiga123 (XFF 198.51.100.5) -> 200 {"redirect":false,"token":"Tjgw<mascarado>","user":{"name":"Zeno","email":"zeno@example.com","emailVerified":true,"image":null,"createdAt":"202; cookie de sessão: True
POST sign-in/email zeno@example.com Antiga123 (XFF 198.51.100.6) -> 200 {"redirect":false,"token":"kJJm<mascarado>","user":{"name":"Zeno","email":"zeno@example.com","emailVerified":true,"image":null,"createdAt":"202; cookie de sessão: True
sessões antes: 2
POST request-password-reset zeno@example.com (XFF 203.0.113.23) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de zeno@example.com (mensagem 1, em 0.3s): token qTaW<mascarado>
POST reset-password token=qTaW<mascarado> newPassword=Nova12345 -> 200 {"status":true}
```

</details>

#### API-SESSAO-02
- Veredito: passou
- ✓ a resposta é 401 | esperado 401, observado 401
- ✓ o corpo não traz o id da conta de zuleica@example.com | esperado id ausente, observado id presente: False

<details>
<summary>Evidência</summary>

```
conta-ativa zuleica@example.com (Zuleica): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST sign-in/email zuleica@example.com Antiga123 (XFF 198.51.100.7) -> 200 {"redirect":false,"token":"biUX<mascarado>","user":{"name":"Zuleica","email":"zuleica@example.com","emailVerified":true,"image":null,"createdAt; cookie de sessão: True
POST request-password-reset zuleica@example.com (XFF 203.0.113.24) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de zuleica@example.com (mensagem 1, em 0.3s): token 75vz<mascarado>
POST reset-password token=75vz<mascarado> newPassword=Nova12345 -> 200 {"status":true}
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
conta-ativa bia@example.com (Bia Nunes): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset bia@example.com (XFF 203.0.113.25) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de bia@example.com (mensagem 1, em 0.3s): token Dqvh<mascarado>
linhas de log da api desde 2026-11-02T02:48:57.345962Z: 0
```

</details>

#### API-SIGILO-02
- Veredito: passou
- ✓ nenhuma linha de log do serviço api escrita durante o item contém T1 | esperado 0 linhas, observado 0 de 1 linhas
- ✓ nenhuma dessas linhas contém Sigilo12345 | esperado 0 linhas, observado 0 de 1 linhas
- ✓ nenhuma dessas linhas contém bruno@example.com | esperado 0 linhas, observado 0 de 1 linhas
- ✓ nenhuma dessas linhas contém Bruno Reis | esperado 0 linhas, observado 0 de 1 linhas

<details>
<summary>Evidência</summary>

```
conta-ativa bruno@example.com (Bruno Reis): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset bruno@example.com (XFF 203.0.113.26) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de bruno@example.com (mensagem 1, em 0.3s): token t3X3<mascarado>
POST reset-password token=t3X3<mascarado> newPassword=Sigilo12345 -> 200 {"status":true}
linhas de log da api desde 2026-11-02T02:49:01.936128Z: 1
  {"level":30,"time":1793587743878,"pid":187,"hostname":"3a2274102840","req":{"id":"675180e2-ec9f-4977-9f5a-683981dfbb6f","method":"GET","url":"/api/health","headers":{"host":"localhost:3000","connection":"keep-alive","acc
```

</details>

### Worker

#### WRK-EMAIL-01
- Veredito: passou
- ✓ em até 2 minutos a caixa tem uma mensagem para zilda@example.com com o assunto "Redefina sua senha" | esperado mensagem em até 120s, observado 1 mensagem(ns) em 0.3s
- ✓ essa mensagem tem um link que começa com o WEB_ORIGIN do .env seguido de /redefinir-senha?token= | esperado http://localhost:5173/redefinir-senha?token=..., observado http://localhost:5173/redefinir-senha?token=<mascarado>
- ✓ o corpo dela diz "Olá, Zilda Rocha!" | esperado no texto, observado texto: True, HTML: True
- ✓ o corpo dela diz "O link vale por 1 hora e só pode ser usado uma vez." | esperado no texto, observado texto: True, HTML: True

<details>
<summary>Evidência</summary>

```
conta-ativa zilda@example.com (Zilda Rocha): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset zilda@example.com (XFF 203.0.113.27) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
Subject=Redefina sua senha To=['zilda@example.com']
Text: Olá, Zilda Rocha!

Recebemos um pedido para trocar a senha da sua conta. Para definir uma nova senha, abra o link abaixo:

http://localhost:5173/redefinir-senha?token=<mascarado>

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
POST request-password-reset ninguem@example.com (XFF 203.0.113.28) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
depois de 60s: mensagens para ninguem: 0; total na caixa: 0
```

</details>

#### WRK-SIGILO-01 *
- Veredito: passou
- ✓ em até 2 minutos a caixa tem uma mensagem para wilson@example.com com o assunto "Redefina sua senha" | esperado mensagem em até 120s, observado 1 mensagem(ns) em 0.3s
- ✓ `*` o job reset-password dessa conta fica concluído na fila email.send | interpretado como: hash bull:email.send:<id> com name reset-password e userId da conta, na zset completed | observado [('66', 'completed')] | passou
- ✓ `*` os dados desse job concluído têm só os campos type e userId | interpretado como: chaves do JSON do campo data do hash, na primeira leitura e 2 s depois | observado ['type', 'userId'], ['type', 'userId'] | passou
- ✓ `*` nenhum campo desse job no Valkey contém o token do link da mensagem | interpretado como: busca literal do token da mensagem em todos os campos do hash do job e nas chaves auxiliares bull:email.send:<id>:* | observado token ausente nos campos ['atm', 'ats', 'data', 'delay', 'finishedOn', 'name', 'opts', 'priority', 'processedOn', 'returnvalue', 'timestamp'] | passou

<details>
<summary>Evidência</summary>

```
conta-ativa wilson@example.com (Wilson Baptista): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset wilson@example.com (XFF 203.0.113.29) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
token da mensagem oQx3<mascarado> (24 caracteres)
jobs reset-password da conta: [('66', 'completed')] (0.2s depois da mensagem)
chaves de data na primeira leitura como concluído: ['type', 'userId']; 2 s depois: ['type', 'userId']
hash: {"name": "reset-password", "data": "{\"type\":\"reset-password\",\"userId\":\"jWp18va5snAgiTXPHkuZmK6AYCOd9bvK\"}", "opts": "{\"removeOnFail\":{\"age\":604800},\"attempts\":5,\"removeOnComplete\":{\"age\":86400},\"tm\":\"{}\",\"backoff\":{\"type\":\"exponential\",\"delay\":5000}}", "timestamp": "1793587807270", "delay": "0", "ats": "1", "priority": "0", "processedOn": "1793587807270", "atm": "1", "returnvalue": "\"sent\"", "finishedOn": "1793587807278"}
chaves auxiliares: []
```

</details>

#### WRK-SIGILO-02 *
- Veredito: passou
- ✓ em até 3 minutos o job reset-password dessa conta fica no estado falho na fila email.send | esperado failed em até 180s, observado ['failed'] em 112.9s
- ✓ `*` o job registra 5 tentativas | interpretado como: campo atm do hash | observado "5" | passou
- ✓ `*` os dados desse job falho têm só os campos type e userId | interpretado como: chaves do JSON do campo data do hash | observado ['type', 'userId'] | passou
- ✓ `*` nenhum campo desse job no Valkey contém o trecho token= | interpretado como: busca literal em todos os campos do hash do job e nas chaves auxiliares bull:email.send:<id>:* | observado ausente nos campos ['atm', 'ats', 'data', 'delay', 'failedReason', 'finishedOn', 'name', 'opts', 'priority', 'processedOn', 'stacktrace', 'timestamp', 'tm'] | passou

<details>
<summary>Evidência</summary>

```
conta-ativa yuri@example.com (Yuri Matos): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
docker compose stop mailpit: exited 2026-11-02T02:50:11.127979252Z
POST request-password-reset yuri@example.com (XFF 203.0.113.30) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
job: [('68', 'failed')] em 112.9s; estados do mailpit durante a espera: ['exited']
hash: {"name": "reset-password", "data": "{\"type\":\"reset-password\",\"userId\":\"AsYvmNTXs4vgeHNLDA1WJm0wZeErBVNs\"}", "opts": "{\"removeOnFail\":{\"age\":604800},\"attempts\":5,\"removeOnComplete\":{\"age\":86400},\"tm\":\"{}\",\"backoff\":{\"type\":\"exponential\",\"delay\":5000}}", "timestamp": "1793587811391", "delay": "0", "tm": "{}", "ats": "5", "priority": "0", "processedOn": "1793587920569", "failedReason": "connect EHOSTUNREACH 172.18.0.4:1025", "stacktrace": "[\"Error: Connection timeout\\n    at timeoutError (file:///app/node_modules/.pnpm/nodemailer@10.3.1/node_modules/nodemailer/dist/esm/smtp-connection/index.js:31:17)\\n    at SMTPConnection._setupConnectionHandlers (file:///app/node_modules/.pnpm/nodemailer@10.3.1/node_modules/nodemailer/dist/esm/smtp-connection/index.js:380:94)\\n    at SMTPConnection._connectToHost (file:///app/node_modules/.pnpm/nodemailer@10.3.1/node_modules/nodemailer/dist/esm/smtp-connection/index.js:368:18)\\n    at file:///app/node_modules/.pnpm/nod
chaves auxiliares: []
mailpit religado: running healthy
```

</details>

### UI

#### UI-PEDIDO-01 *
- Veredito: passou
- ✓ a página envia POST /api/auth/request-password-reset com o e-mail alice.r@example.com e recebe 200 | esperado 1 POST com email alice.r@example.com, 200, observado 1 POST, corpo {"email":"alice.r@example.com"}, status 200
- ✓ a tela mostra "Se o e-mail tiver conta, enviamos o link." | esperado visível, observado visível
- ✓ a tela mostra o botão "Enviar para outro e-mail" | esperado visível, observado visível
- ✓ a tela não mostra o campo de e-mail | esperado 0 campos, observado 0 campo(s)
- ✓ `*` base visual (depois de enviar) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 6 elementos conferidos, 0 achado(s); shots/UI-PEDIDO-01-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa alice.r@example.com (Alice): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
base visual (depois de enviar): 0 imagem(ns), 0 quebrada(s); 6 elementos; achados []; shots/UI-PEDIDO-01-1.png
GET /api/v1/session -> 401 
POST /api/auth/request-password-reset -> 200 {"email":"alice.r@example.com"}
GET /api/v1/session -> 401 
```

</details>

#### UI-PEDIDO-02 *
- Veredito: passou
- ✓ a página envia POST /api/auth/request-password-reset com o e-mail beto.n@example.com e recebe 200 | esperado 1 POST com email beto.n@example.com, 200, observado 1 POST, corpo {"email":"beto.n@example.com"}, status 200
- ✓ a tela mostra "Se o e-mail tiver conta, enviamos o link." | esperado visível, observado visível
- ✓ a tela mostra o botão "Enviar para outro e-mail" | esperado visível, observado visível
- ✓ a tela não mostra o campo de e-mail | esperado 0 campos, observado 0 campo(s)
- ✓ `*` base visual (depois de enviar) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 6 elementos conferidos, 0 achado(s); shots/UI-PEDIDO-02-1.png | passou

<details>
<summary>Evidência</summary>

```
base visual (depois de enviar): 0 imagem(ns), 0 quebrada(s); 6 elementos; achados []; shots/UI-PEDIDO-02-1.png
GET /api/v1/session -> 401 
POST /api/auth/request-password-reset -> 200 {"email":"beto.n@example.com"}
GET /api/v1/session -> 401 
```

</details>

#### UI-PEDIDO-03 *
- Veredito: passou
- ✓ a página não envia requisição a /api/auth/request-password-reset | esperado 0, observado 0
- ✓ `*` a tela mostra "Informe um e-mail válido." abaixo do campo de e-mail | interpretado como: mensagem visível com o topo abaixo da borda inferior do campo e ligada a ele por aria-describedby | observado mensagem em y=292, campo termina em y=284; aria-describedby do campo aponta para "Informe um e-mail válido." | passou
- ✓ o campo de e-mail tem aria-invalid verdadeiro | esperado true, observado true
- ✓ `*` base visual (erro de campo) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 8 elementos conferidos, 0 achado(s); shots/UI-PEDIDO-03-1.png | passou

<details>
<summary>Evidência</summary>

```
base visual (erro de campo): 0 imagem(ns), 0 quebrada(s); 8 elementos; achados []; shots/UI-PEDIDO-03-1.png
GET /api/v1/session -> 401 
GET /api/v1/session -> 401 
```

</details>

#### UI-REDEFINIR-01 *
- Veredito: passou
- ✓ a página envia GET /api/auth/reset-password-status com o token do link e recebe 200 | esperado 1 GET com o token do link, 200, observado 1 GET, token igual ao do link: true, status 200
- ✓ a tela mostra os campos "Nova senha" e "Confirme a nova senha" com rótulos visíveis e tipo password | esperado dois campos password com rótulo visível, observado Nova senha: campo=1, type=password, rótulo visível=true; Confirme a nova senha: campo=1, type=password, rótulo visível=true
- ✓ a tela mostra o botão "Salvar a nova senha" | esperado visível, observado visível
- ✓ `*` base visual (formulário aberto pelo link) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 9 elementos conferidos, 0 achado(s); shots/UI-REDEFINIR-01-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa carla@example.com (Carla): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset carla@example.com (XFF 203.0.113.104) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de carla@example.com (mensagem 1, em 0.3s): token Fpft<mascarado>
link: http://localhost:5173/redefinir-senha?token=Fpft<mascarado>
base visual (formulário aberto pelo link): 0 imagem(ns), 0 quebrada(s); 9 elementos; achados []; shots/UI-REDEFINIR-01-1.png
GET /api/v1/session -> 401 
GET /api/auth/reset-password-status?token=Fpft<mascarado> -> 200 
```

</details>

#### UI-REDEFINIR-02 *
- Veredito: passou
- ✓ `*` base visual (formulário) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 9 elementos conferidos, 0 achado(s); shots/UI-REDEFINIR-02-1.png | passou
- ✓ a página envia POST /api/auth/reset-password e recebe 200 | esperado 1 POST, 200, observado 1 POST, status 200
- ✓ `*` a tela diz "Senha alterada" | interpretado como: texto visível no card, no título h1 da rota | observado h1: ["Senha alterada"] | passou
- ✓ a tela tem um link ou botão "Entrar" para /entrar | esperado link ou botão visível para /entrar, observado a visível=true href=/entrar (dentro de main)
- ✓ a tela não mostra os campos de senha | esperado 0, observado 0
- ✓ a página não envia uma segunda requisição a /api/auth/reset-password-status | esperado 1, observado 1 (antes do clique 1)
- ✓ `*` base visual (senha alterada) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/UI-REDEFINIR-02-2.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa davi@example.com (Davi): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset davi@example.com (XFF 203.0.113.105) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de davi@example.com (mensagem 1, em 0.3s): token yBs5<mascarado>
link: http://localhost:5173/redefinir-senha?token=yBs5<mascarado>
base visual (formulário): 0 imagem(ns), 0 quebrada(s); 9 elementos; achados []; shots/UI-REDEFINIR-02-1.png
base visual (senha alterada): 0 imagem(ns), 0 quebrada(s); 7 elementos; achados []; shots/UI-REDEFINIR-02-2.png
GET /api/v1/session -> 401 
GET /api/auth/reset-password-status?token=yBs5<mascarado> -> 200 
POST /api/auth/reset-password -> 200 {"token":"yBs5<mascarado>","newPassword":"Nova12345"}
GET /api/v1/session -> 401 
```

</details>

#### UI-REDEFINIR-03 *
- Veredito: passou
- ✓ `*` base visual (formulário) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 9 elementos conferidos, 0 achado(s); shots/UI-REDEFINIR-03-1.png | passou
- ✓ a página não envia requisição a /api/auth/reset-password | esperado 0, observado 0
- ✓ `*` a tela mostra "As senhas não conferem." abaixo do campo "Confirme a nova senha" | interpretado como: mensagem visível com o topo abaixo da borda inferior do campo e ligada a ele por aria-describedby | observado mensagem em y=396, campo termina em y=388; aria-describedby do campo aponta para "As senhas não conferem." | passou
- ✓ o campo "Confirme a nova senha" tem aria-invalid verdadeiro | esperado true, observado true
- ✓ `*` base visual (senhas diferentes) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 10 elementos conferidos, 0 achado(s); shots/UI-REDEFINIR-03-2.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa dora@example.com (Dora): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset dora@example.com (XFF 203.0.113.106) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de dora@example.com (mensagem 1, em 0.3s): token hTC9<mascarado>
link: http://localhost:5173/redefinir-senha?token=hTC9<mascarado>
base visual (formulário): 0 imagem(ns), 0 quebrada(s); 9 elementos; achados []; shots/UI-REDEFINIR-03-1.png
base visual (senhas diferentes): 0 imagem(ns), 0 quebrada(s); 10 elementos; achados []; shots/UI-REDEFINIR-03-2.png
GET /api/v1/session -> 401 
GET /api/auth/reset-password-status?token=hTC9<mascarado> -> 200 
GET /api/v1/session -> 401 
```

</details>

#### UI-REDEFINIR-04 *
- Veredito: passou
- ✓ `*` base visual (formulário) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 9 elementos conferidos, 0 achado(s); shots/UI-REDEFINIR-04-1.png | passou
- ✓ a página não envia requisição a /api/auth/reset-password | esperado 0, observado 0
- ✓ `*` a tela mostra "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." abaixo do campo "Nova senha" | interpretado como: mensagem visível com o topo abaixo da borda inferior do campo e ligada a ele por aria-describedby | observado mensagem em y=292, campo termina em y=284; aria-describedby do campo aponta para "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | passou
- ✓ a tela continua com os dois campos | esperado 2, observado 2
- ✓ `*` base visual (senha fora da regra) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 10 elementos conferidos, 0 achado(s); shots/UI-REDEFINIR-04-2.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa duda@example.com (Duda): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset duda@example.com (XFF 203.0.113.107) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de duda@example.com (mensagem 1, em 0.3s): token M6FH<mascarado>
link: http://localhost:5173/redefinir-senha?token=M6FH<mascarado>
base visual (formulário): 0 imagem(ns), 0 quebrada(s); 9 elementos; achados []; shots/UI-REDEFINIR-04-1.png
base visual (senha fora da regra): 0 imagem(ns), 0 quebrada(s); 10 elementos; achados []; shots/UI-REDEFINIR-04-2.png
GET /api/v1/session -> 401 
GET /api/auth/reset-password-status?token=M6FH<mascarado> -> 200 
GET /api/v1/session -> 401 
```

</details>

#### UI-INVALIDO-01 *
- Veredito: passou
- ✓ `*` a tela diz "Link inválido" | interpretado como: texto visível no card, no título h1 da rota | observado h1: ["Link inválido"] | passou
- ✓ a tela tem um link ou botão "Pedir outro link" para /recuperar-senha | esperado link ou botão visível para /recuperar-senha, observado a visível=true href=/recuperar-senha
- ✓ a tela não mostra os campos de senha | esperado 0, observado 0
- ✓ `*` base visual (link que não vale) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/UI-INVALIDO-01-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa enzo@example.com (Enzo): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset enzo@example.com (XFF 203.0.113.108) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de enzo@example.com (mensagem 1, em 0.3s): token AcQp<mascarado>
link: http://localhost:5173/redefinir-senha?token=AcQp<mascarado>
expiresAt movido para -1 min: [['2026-11-02 02:51:38.448', '2026-11-02 02:52:38.478654']]
base visual (link que não vale): 0 imagem(ns), 0 quebrada(s); 7 elementos; achados []; shots/UI-INVALIDO-01-1.png
GET /api/v1/session -> 401 
GET /api/auth/reset-password-status?token=AcQp<mascarado> -> 400 
```

</details>

#### UI-INVALIDO-02 *
- Veredito: passou
- ✓ `*` a tela diz "Link inválido" | interpretado como: texto visível no card, no título h1 da rota | observado h1: ["Link inválido"] | passou
- ✓ a tela tem um link ou botão "Pedir outro link" para /recuperar-senha | esperado link ou botão visível para /recuperar-senha, observado a visível=true href=/recuperar-senha
- ✓ a tela não mostra os campos de senha | esperado 0, observado 0
- ✓ `*` base visual (link que não vale) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/UI-INVALIDO-02-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa eva@example.com (Eva): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset eva@example.com (XFF 203.0.113.109) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de eva@example.com (mensagem 1, em 0.3s): token n9lY<mascarado>
link: http://localhost:5173/redefinir-senha?token=n9lY<mascarado>
POST reset-password token=n9lY<mascarado> newPassword=Nova12345 -> 200 {"status":true}
base visual (link que não vale): 0 imagem(ns), 0 quebrada(s); 7 elementos; achados []; shots/UI-INVALIDO-02-1.png
GET /api/v1/session -> 401 
GET /api/auth/reset-password-status?token=n9lY<mascarado> -> 400 
```

</details>

#### UI-INVALIDO-03 *
- Veredito: passou
- ✓ `*` a tela diz "Link inválido" | interpretado como: texto visível no card, no título h1 da rota | observado h1: ["Link inválido"] | passou
- ✓ a página não envia requisição a /api/auth/reset-password-status | esperado 0, observado 0
- ✓ a tela tem um link ou botão "Pedir outro link" para /recuperar-senha | esperado link ou botão visível para /recuperar-senha, observado a visível=true href=/recuperar-senha
- ✓ `*` base visual (sem token) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/UI-INVALIDO-03-1.png | passou

<details>
<summary>Evidência</summary>

```
base visual (sem token): 0 imagem(ns), 0 quebrada(s); 7 elementos; achados []; shots/UI-INVALIDO-03-1.png
GET /api/v1/session -> 401 
```

</details>

#### UI-INVALIDO-04 *
- Veredito: passou
- ✓ `*` base visual (formulário) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 9 elementos conferidos, 0 achado(s); shots/UI-INVALIDO-04-1.png | passou
- ✓ a página envia POST /api/auth/reset-password e recebe 400 | esperado 1 POST, 400, observado 1 POST, status 400
- ✓ `*` a tela diz "Link inválido" | interpretado como: texto visível no card, no título h1 da rota | observado h1: ["Link inválido"] | passou
- ✓ a tela tem um link ou botão "Pedir outro link" para /recuperar-senha | esperado link ou botão visível para /recuperar-senha, observado a visível=true href=/recuperar-senha
- ✓ a tela não diz "Senha alterada" | esperado ausente, observado ausente
- ✓ `*` base visual (link substituído ao salvar) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/UI-INVALIDO-04-2.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa ema@example.com (Ema): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset ema@example.com (XFF 203.0.113.110) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de ema@example.com (mensagem 1, em 0.3s): token lMQQ<mascarado>
link: http://localhost:5173/redefinir-senha?token=lMQQ<mascarado>
base visual (formulário): 0 imagem(ns), 0 quebrada(s); 9 elementos; achados []; shots/UI-INVALIDO-04-1.png
segundo pedido fora do navegador ema@example.com (XFF 203.0.113.110) -> 200
mensagem para ema@example.com em 0.0s, link http://localhost:5173/redefinir-senha?token=7Ksf<mascarado>
base visual (link substituído ao salvar): 0 imagem(ns), 0 quebrada(s); 7 elementos; achados []; shots/UI-INVALIDO-04-2.png
GET /api/v1/session -> 401 
GET /api/auth/reset-password-status?token=lMQQ<mascarado> -> 200 
POST /api/auth/reset-password -> 400 {"token":"lMQQ<mascarado>","newPassword":"Nova12345"}
GET /api/v1/session -> 401 
```

</details>

#### UI-FALHA-01 *
- Veredito: passou
- ✓ a tela mostra "O servidor não respondeu. Tente de novo." | esperado visível, observado visível
- ✓ a tela não mostra "Se o e-mail tiver conta, enviamos o link." | esperado ausente, observado ausente
- ✓ `*` a página não mostra a página de erro | interpretado como: sem main[role=alert] da ErrorPage nem o botão "Voltar ao início" | observado ausente; main: Recuperar a senha O servidor não respondeu. Tente de novo. E-mail Enviar o link | passou
- ✓ `*` base visual (servidor fora no pedido) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 9 elementos conferidos, 0 achado(s); shots/UI-FALHA-01-1.png | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api: exited
base visual (servidor fora no pedido): 0 imagem(ns), 0 quebrada(s); 9 elementos; achados []; shots/UI-FALHA-01-1.png
GET /api/v1/session -> 401 
POST /api/auth/request-password-reset -> falhou: net::ERR_CONNECTION_REFUSED {"email":"fabia@example.com"}
GET /api/v1/session -> falhou: net::ERR_CONNECTION_REFUSED 
api religada com o override; /api/health {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
```

</details>

#### UI-FALHA-02 *
- Veredito: passou
- ✓ a tela mostra "O servidor não respondeu. Tente de novo." | esperado visível, observado visível
- ✓ a tela não mostra os campos de senha | esperado 0, observado 0
- ✓ `*` a página não mostra a página de erro | interpretado como: sem main[role=alert] da ErrorPage nem o botão "Voltar ao início" | observado ausente; main: Definir nova senha O servidor não respondeu. Tente de novo. | passou
- ✓ `*` base visual (servidor fora ao abrir) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 6 elementos conferidos, 0 achado(s); shots/UI-FALHA-02-1.png | passou

<details>
<summary>Evidência</summary>

```
docker compose stop api: exited
base visual (servidor fora ao abrir): 0 imagem(ns), 0 quebrada(s); 6 elementos; achados []; shots/UI-FALHA-02-1.png
GET /api/v1/session -> falhou: net::ERR_CONNECTION_REFUSED 
GET /api/auth/reset-password-status?token=abc -> falhou: net::ERR_CONNECTION_REFUSED 
api religada com o override; /api/health {"status":"ok","checks":{"postgres":"up","valkey":"up"}}
```

</details>

#### UI-VISUAL-01 *
- Veredito: passou
- ✓ o "Salvar a nova senha" tem fundo #000, texto #fff e raio de borda de 999px | esperado rgb(0, 0, 0), rgb(255, 255, 255), 999px, observado rgb(0, 0, 0), rgb(255, 255, 255), 999px 999px 999px 999px
- ✓ o card da redefinição tem fundo #fff e raio de borda de 16px | esperado rgb(255, 255, 255), 16px, observado rgb(255, 255, 255), 16px 16px 16px 16px
- ✓ a família de fonte computada do título começa por Inter Variable | esperado começa por Inter Variable, observado "Inter Variable", system-ui, "Helvetica Neue", Arial, sans-serif
- ✓ a página não tem rolagem horizontal | esperado scrollWidth <= clientWidth, observado scrollWidth 375, clientWidth 375, innerWidth 375
- ✓ `*` a barra de navegação está visível acima do card | interpretado como: header nav visível, com a borda inferior acima do topo do card .card-content | observado nav visível=true, nav 0..76, card começa em 108 | passou
- ✓ `*` base visual (formulário em 375px) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 9 elementos conferidos, 0 achado(s); shots/UI-VISUAL-01-1.png | passou

<details>
<summary>Evidência</summary>

```
conta-ativa gil@example.com (Gil): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST request-password-reset gil@example.com (XFF 203.0.113.111) -> 200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}
link de gil@example.com (mensagem 1, em 0.3s): token i5o5<mascarado>
link: http://localhost:5173/redefinir-senha?token=i5o5<mascarado>
base visual (formulário em 375px): 0 imagem(ns), 0 quebrada(s); 9 elementos; achados []; shots/UI-VISUAL-01-1.png
GET /api/v1/session -> 401 
GET /api/auth/reset-password-status?token=i5o5<mascarado> -> 200 
```

</details>

### E2E

#### E2E-RECUPERACAO-01 *
- Veredito: passou
- ✓ `*` base visual (pedido enviado) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 6 elementos conferidos, 0 achado(s); shots/E2E-RECUPERACAO-01-1.png | passou
- ✓ `*` base visual (formulário) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 9 elementos conferidos, 0 achado(s); shots/E2E-RECUPERACAO-01-2.png | passou
- ✓ `*` a tela diz "Senha alterada" | interpretado como: texto visível no card, no título h1 da rota | observado h1: ["Senha alterada"] | passou
- ✓ `*` base visual (senha alterada) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/E2E-RECUPERACAO-01-3.png | passou
- ✓ POST /api/auth/sign-in/email com elisa.m@example.com e Jornada456 responde 200 | esperado 200, observado 200
- ✓ POST /api/auth/sign-in/email com elisa.m@example.com e Antiga123 responde 401 | esperado 401, observado 401
- ✓ GET /api/v1/session com o cookie C1 responde 401 | esperado 401, observado 401

<details>
<summary>Evidência</summary>

```
conta-ativa elisa.m@example.com (Elisa): role=user emailVerified=t banned=f sessões=0 registros de recuperação=0
POST sign-in/email elisa.m@example.com Antiga123 (XFF 198.51.100.1) -> 200 {"redirect":false,"token":"uLpj<mascarado>","user":{"name":"Elisa","email":"elisa.m@example.com","emailVerified":true,"image":null,"createdAt":; cookie de sessão: True
sessão aberta antes: C1 better-auth.session_token=<mascarado>
base visual (pedido enviado): 0 imagem(ns), 0 quebrada(s); 6 elementos; achados []; shots/E2E-RECUPERACAO-01-1.png
mensagem para elisa.m@example.com em 0.0s, link http://localhost:5173/redefinir-senha?token=VjrE<mascarado>
base visual (formulário): 0 imagem(ns), 0 quebrada(s); 9 elementos; achados []; shots/E2E-RECUPERACAO-01-2.png
base visual (senha alterada): 0 imagem(ns), 0 quebrada(s); 7 elementos; achados []; shots/E2E-RECUPERACAO-01-3.png
POST sign-in/email elisa.m@example.com Jornada456 (XFF 198.51.100.200) -> 200
POST sign-in/email elisa.m@example.com Antiga123 (XFF 198.51.100.201) -> 401
GET /api/v1/session com C1 -> 401 {"message":"Unauthorized","statusCode":401}
GET /api/v1/session -> 401 
POST /api/auth/request-password-reset -> 200 {"email":"elisa.m@example.com"}
GET /api/v1/session -> 401 
GET /api/v1/session -> 401 
GET /api/auth/reset-password-status?token=VjrE<mascarado> -> 200 
POST /api/auth/reset-password -> 200 {"token":"VjrE<mascarado>","newPassword":"Jornada456"}
GET /api/v1/session -> 401 
```

</details>

#### E2E-INTEGRACAO-01 *
- Veredito: passou
- ✓ `*` base visual (depois do cadastro de fabio@example.com) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 6 elementos conferidos, 0 achado(s); shots/E2E-INTEGRACAO-01-1.png | passou
- ✓ `*` base visual (depois do cadastro de gabi@example.com) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 6 elementos conferidos, 0 achado(s); shots/E2E-INTEGRACAO-01-2.png | passou
- ✓ `*` base visual (pedido enviado) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 6 elementos conferidos, 0 achado(s); shots/E2E-INTEGRACAO-01-3.png | passou
- ✓ `*` base visual (senha alterada) | interpretado como: imagens carregadas, elementos visíveis dentro da janela, sem corte por overflow de ancestral e com o centro recebendo o clique (elementFromPoint), e screenshot revisado sem corte, sobreposição ou layout desmontado | observado 0 imagem(ns), 0 quebrada(s); 7 elementos conferidos, 0 achado(s); shots/E2E-INTEGRACAO-01-4.png | passou
- ✓ a caixa tem uma mensagem "Redefina sua senha" para fabio@example.com e nenhuma para gabi@example.com | esperado fabio 1, gabi 0, observado fabio 1, gabi 0
- ✓ POST /api/auth/sign-in/email com fabio@example.com e Jornada789 responde 200 | esperado 200, observado 200
- ✓ POST /api/auth/sign-in/email com fabio@example.com e Jornada123 responde 401 | esperado 401, observado 401
- ✓ POST /api/auth/sign-in/email com gabi@example.com e Jornada123 responde 200 | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
cadastro fabio@example.com pela tela: URL /cadastro; main: Confirme seu e-mail Enviamos um link de confirmação para fabio@example.com. Confirme o e-mail antes de entrar. Reenviar 
base visual (depois do cadastro de fabio@example.com): 0 imagem(ns), 0 quebrada(s); 6 elementos; achados []; shots/E2E-INTEGRACAO-01-1.png
cadastro gabi@example.com pela tela: URL /cadastro; main: Confirme seu e-mail Enviamos um link de confirmação para gabi@example.com. Confirme o e-mail antes de entrar. Reenviar o
base visual (depois do cadastro de gabi@example.com): 0 imagem(ns), 0 quebrada(s); 6 elementos; achados []; shots/E2E-INTEGRACAO-01-2.png
marcadas com e-mail verificado no banco: fabio@example.com,gabi@example.com,UPDATE 2
base visual (pedido enviado): 0 imagem(ns), 0 quebrada(s); 6 elementos; achados []; shots/E2E-INTEGRACAO-01-3.png
mensagem para fabio@example.com em 0.0s, link http://localhost:5173/redefinir-senha?token=lNhw<mascarado>
h1 depois de salvar: ["Senha alterada"]
base visual (senha alterada): 0 imagem(ns), 0 quebrada(s); 7 elementos; achados []; shots/E2E-INTEGRACAO-01-4.png
POST sign-in/email fabio@example.com Jornada789 (XFF 198.51.100.200) -> 200
POST sign-in/email fabio@example.com Jornada123 (XFF 198.51.100.201) -> 401
POST sign-in/email gabi@example.com Jornada123 (XFF 198.51.100.202) -> 200
GET /api/v1/session -> 401 
POST /api/auth/sign-up/email -> 200 {"name":"Fabio Nunes","email":"fabio@example.com","password":"Jornada123"}
GET /api/v1/session -> 401 
GET /api/v1/session -> 401 
POST /api/auth/sign-up/email -> 200 {"name":"Gabi Lopes","email":"gabi@example.com","password":"Jornada123"}
GET /api/v1/session -> 401 
GET /api/v1/session -> 401 
POST /api/auth/request-password-reset -> 200 {"email":"fabio@example.com"}
GET /api/v1/session -> 401 
GET /api/v1/session -> 401 
GET /api/auth/reset-password-status?token=lNhw<mascarado> -> 200 
POST /api/auth/reset-password -> 200 {"token":"lNhw<mascarado>","newPassword":"Jornada789"}
GET /api/v1/session -> 401 
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `compose.yaml`: o serviço api instala nos volumes ao subir; `scripts/db-setup.sh` garante as dependências |
| Ambiente e serviços | 1 e 2 | contrato (Docker Compose) e `compose.yaml`: o ambiente local já no ar, com a api recriada por um arquivo de override do Compose na pasta temporária (`COMPOSE_FILE`) |
| Banco efêmero e migração | 5 | `scripts/db-setup.sh`: banco `eval_rf005_2026_11_02t02_43_47z` no postgres do Compose, `DATABASE_URL` da api trocada pelo override, `make db-setup` migra e cria o admin |
| Isolamento do Valkey | 4 e 6 | avaliações anteriores: `REDIS_URL=redis://valkey:6379/3` no override; rate limit e fila `email.send` no banco lógico 3 |
| Estado persistido | 1, 3 e 6 | contrato (atributos da `conta-ativa` e janelas livres) e spec: a conta criada pela rota de cadastro e ajustada no banco, porque a factory roda dentro da aplicação de teste |
| Limpeza entre itens | 4 e 6 | DELETE da tabela verification e das contas sem papel admin (account e session em cascata), `rate-limit:*` no Valkey e DELETE /api/v1/messages no Mailpit |
| Gates | 1 | contrato: `make check` e `make build` na raiz |
| Cliente HTTP | 6 | `urllib` do Python e `fetch` do Node 26, com o X-Forwarded-For do contrato e o Origin da SPA |
| Logs da api | 1 e 3 | contrato e spec, Verificação por superfície: `docker compose logs api --since <início do item>` |
| Fila | 3 e 4 | spec, Verificação por superfície, e avaliação do RF-001: hash `bull:email.send:<id>` (todos os campos, e as chaves auxiliares `bull:email.send:<id>:*`), estado pelas zsets e listas da fila, lidos com `valkey-cli` no container (script Lua para achar o job pelo name e pelo userId) |
| Caixa de e-mail | 3 | spec, Verificação por superfície (ADR-0016): API REST do Mailpit |
| Banco | 1 | contrato, Configuração: registro em `verification` por identifier `reset-password:` e value igual ao id da conta; `psql` no host |
| Serviço valkey e mailpit parados | 1 e 3 | contrato e spec: `docker compose stop <serviço>` e religado com `docker compose up -d --wait <serviço>` |
| Serviço api parado | 3 | spec: `docker compose stop api` e religada com `docker compose up -d --wait --no-deps api`, com o override |
| Navegador | 3 | spec, Verificação por superfície (ADR-0024): Chromium headless pelo `playwright-core` 1.64 do `@playwright/cli` no cache do npx, dirigido por script Node, um contexto sem cookie por item |
| Base visual | 6 | `evaluate` no navegador (imagens, caixas na janela, corte por `overflow`, `elementFromPoint`) e screenshot por estado, revisado em folhas de contato sem achados |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_rf005_*`, nenhuma pasta `evaluator-rf005-*` e nenhum PID de avaliação anterior no início.
- Derrubada: completa. Os PIDs do `processos.lock` (scripts do navegador) já tinham terminado; api recriada sem o override, de volta à `DATABASE_URL` do banco `app` e ao Valkey no banco 0, saudável; banco lógico 3 do Valkey esvaziado (`dbsize` 0); caixa do Mailpit esvaziada; valkey e mailpit no ar e saudáveis; banco `eval_rf005_2026_11_02t02_43_47z` apagado; pasta `/tmp/evaluator-rf005-2026-11-02T02-43-47Z` apagada, com os screenshots.

## Avisos

- Avaliado com 2 arquivos fora de commit, só documentação de outras avaliações: `docs/features/RF-001-criar-conta/avaliacao.md` e `docs/features/RF-002-confirmar-e-mail/avaliacao.md`. O código avaliado é o do commit 05d1238.
- Os gates rodaram antes de a api ser recriada apontando para o banco efêmero, porque o `make build` no host reescreve `apps/api/dist`, bind mount do `nest start --watch` do container; a recriação depois dos gates evitou a api parada que a avaliação do RF-001 registrou.
- API-SIGILO-01 e API-SIGILO-02: as rotas `/api/auth/request-password-reset` e `/api/auth/reset-password` não escrevem linha de log na api no caminho feliz (0 linhas na janela de API-SIGILO-01 e só 1 linha de health check na de API-SIGILO-02); os bullets de ausência passam sobre o que foi capturado. Uma busca ampla no log da api desde o início dos itens até o fim (192 linhas) não achou e-mail `@example.com`, nome (Bia Nunes, Bruno Reis, Zilda Rocha, Wilson Baptista, Yuri Matos), senha (Antiga123, Nova12345, Sigilo12345) nem `token=`.
- WRK-SIGILO-01: o job concluiu e foi visto com `data` só com type e userId já na primeira leitura como concluído e 2 s depois; nenhuma chave auxiliar `bull:email.send:<id>:*` existia. WRK-SIGILO-02: com o mailpit parado, o job ficou falho em 112,9 s, com `atm` 5 e `failedReason` "Connection timeout"; o `stacktrace` traz só a pilha do nodemailer.
- X-Forwarded-For de entrada: os IPs 198.51.100.x são distintos dentro de cada item, mas a numeração recomeçou em cada processo de script (itens de API, a sessão C1 de E2E-RECUPERACAO-01, e cada item de E2E no navegador), então o mesmo IP aparece em itens diferentes; os contadores `rate-limit:*` foram apagados antes de cada item, e nenhuma entrada recebeu 429.
- A SPA mostra "Entrar" também na barra de navegação; o bullet de "Entrar" de UI-REDEFINIR-02 foi conferido no "Entrar" do card, dentro de `main`.
- Os itens usam o Valkey (banco lógico 3) e o Mailpit compartilhados do ambiente de desenvolvimento: a caixa do Mailpit foi esvaziada antes de cada item. API-PEDIDO-03 e API-PEDIDO-04 pararam o serviço valkey inteiro e WRK-SIGILO-02 o serviço mailpit inteiro, compartilhados com o ambiente de desenvolvimento, e os religaram no fim do item.
- Itens que não dão nome às contas usaram como nome o primeiro nome do e-mail (Rui, Sara, Alice ...); em E2E-INTEGRACAO-01, os cadastros pela tela usaram Fabio Nunes e Gabi Lopes.
- Nos itens de UI, o pedido de recuperação feito pelo navegador não leva X-Forwarded-For (o contrato só o exige fora do navegador): o contador de rate limit é o do endereço local, zerado antes de cada item.

## Motivo do aborto

Nenhum.
