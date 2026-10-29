# Avaliação: RF-001 Criar conta

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-10-29T21-28-47Z
- Branch: feat/rf-001-criar-conta
- Commit: 4fd77d4
- Status: limpo
- Itens: 31 passou, 0 falhou, 0 bloqueado, 0 manual, 0 pulado, de 31
- Critérios: 4 verificado, 0 reprovado, 0 indeterminado, de 4
- Filtros: nenhum

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| Cadastro com dados válidos cria conta pendente com papel usuário e gera um e-mail de confirmação para o endereço informado. | ✓ verificado | API-CADASTRO-01, API-CADASTRO-02, WRK-CONFIRMACAO-01, UI-CADASTRO-01, E2E-CADASTRO-01 |
| Cadastro com e-mail já existente, mesmo com outra combinação de maiúsculas, é recusado e não cria segunda conta. | ✓ verificado | API-DUPLICADO-01, API-DUPLICADO-02, UI-DUPLICADO-01 |
| Senha sem número, sem letra ou com menos de 8 caracteres é recusada com a regra exibida. | ✓ verificado | API-SENHA-01, API-SENHA-02, API-SENHA-03, API-SENHA-04, UI-SENHA-01 |
| A senha nunca aparece em texto puro na tela, no e-mail ou em registros do sistema. | ✓ verificado | API-SIGILO-01, API-SIGILO-02, WRK-CONFIRMACAO-02, UI-SIGILO-01, E2E-CADASTRO-01 |

## Gates de qualidade

- ✓ check: `CI=true make check`, código 0 ("ok: todas as verificações passaram")
- ✓ build: `make build`, código 0 (4 tarefas do Turborepo com sucesso)

## Pré-requisitos

### Serviços em execução
- ✓ API (Módulo Contas e Módulo E-mail): http://localhost:3000, saúde /api/health respondeu 200 com postgres up e valkey up
- ✓ SPA Web: http://localhost:5173, /cadastro respondeu 200
- ✓ PostgreSQL: serviço postgres do Compose healthy, banco efêmero `eval_rf001_2026_10_29t21_28_47z` migrado (`20261029000000_init`)
- ✓ Redis (serviço Valkey): serviço valkey do Compose healthy, banco lógico 5 isolado para a avaliação

### Estado persistido
- ✓ `conta-existente`: criado por SQL com hash de `better-auth/crypto`, espelhando `contaExistente` de `apps/api/test/factories/user.factory.ts`; conferido: existente@example.com, papel user, emailVerified falso, banned falso, credencial `credential` com hash

### Entradas estáticas
Nenhum.

### Configuração
- ✓ `.env` copiado do `.env.example`: NODE_ENV=development e TRUSTED_PROXIES ausente em vigor no container api (`printenv`); só DATABASE_URL e REDIS_URL trocados para o ambiente efêmero
- ✓ Docker com Compose v2 (v2.40.0), shellcheck, actionlint, gitleaks e python3 (3.13) instalados

### Dependências externas
- ✓ DEP-1 serviço de envio de e-mail: Mailpit v1.32.0 do Compose, API REST em http://localhost:8025, caixa esvaziada por `DELETE /api/v1/messages` antes de cada item

## Itens

### API HTTP

#### API-CADASTRO-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` a resposta não define cookie de sessão | interpretado como: nenhum cabeçalho `set-cookie` | observado nenhum | passou
- `*` o banco tem exatamente uma conta com o e-mail ana@example.com, com papel user e e-mail não verificado | interpretado como: count em `user` igual a 1, `role` user, `emailVerified` falso | observado 1, user, f | passou
- `*` a conta tem uma credencial de senha cujo valor gravado é diferente de senha1234 | interpretado como: linha em `account` com `providerId` credential e `password` diferente do texto puro | observado credential, hash diferente | passou

<details>
<summary>Evidência</summary>

```
POST /api/auth/sign-up/email {"name":"Ana Souza","email":"ana@example.com","password":"<senha do item>"}
200 sem set-cookie
{"token":null,"user":{"name":"Ana Souza","email":"ana@example.com","emailVerified":false,"role":"user",...}}
user: ana@example.com|user|f|1
account: credential|password<>'senha1234' = t
```

</details>

#### API-CADASTRO-02 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o banco tem exatamente uma conta com o e-mail maria.silva@example.com, todo em minúsculas | interpretado como: uma linha com lower(email) igual e email gravado igual ao minúsculo | observado 1 linha, maria.silva@example.com | passou

<details>
<summary>Evidência</summary>

```
POST com email Maria.Silva@Example.COM -> 200, corpo user.email "maria.silva@example.com"
select email from "user" where lower(email)='maria.silva@example.com' -> maria.silva@example.com
```

</details>

#### API-DUPLICADO-01 *
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- ✓ o corpo traz o código USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL | esperado o código, observado `code` USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL
- `*` o banco continua com exatamente uma conta com o e-mail existente@example.com | interpretado como: count igual a 1 depois | observado 1 | passou
- `*` a credencial dessa conta continua com o mesmo valor gravado de antes da requisição | interpretado como: md5 de `account.password` igual antes e depois | observado igual | passou

<details>
<summary>Evidência</summary>

```
422 {"message":"User already exists. Use another email.","code":"USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"}
count user existente@example.com = 1; credencial igual; count account = 1
```

</details>

#### API-DUPLICADO-02 *
- Veredito: passou
- ✓ a resposta é 422 | esperado 422, observado 422
- ✓ o corpo traz o código USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL | esperado o código, observado o código
- `*` o banco continua com exatamente uma conta cujo e-mail, em minúsculas, é existente@example.com | interpretado como: count com lower(email) igual a 1 | observado 1 | passou

<details>
<summary>Evidência</summary>

```
POST com email EXISTENTE@Example.com -> 422 code USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL
count lower(email)='existente@example.com' = 1
```

</details>

#### API-SENHA-01 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e o campo password | esperado code e campo, observado `code` VALIDATION_ERROR e `fields[0].field` password
- `*` a mensagem do campo password informa o mínimo de 8 caracteres com letra e número | interpretado como: a mensagem cita 8 caracteres, letra e número | observado "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." | passou
- `*` nenhuma conta com esse e-mail passa a existir no banco | interpretado como: count igual a 0 | observado 0 | passou

<details>
<summary>Evidência</summary>

```
400 {"code":"VALIDATION_ERROR","message":"Dados de cadastro inválidos.","fields":[{"field":"password","message":"A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."}]}
contas sem.numero@example.com = 0
```

</details>

#### API-SENHA-02 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e o campo password | observado VALIDATION_ERROR e password
- `*` nenhuma conta com esse e-mail passa a existir no banco | interpretado como: count igual a 0 | observado 0 | passou

<details>
<summary>Evidência</summary>

```
senha 12345678 -> 400 VALIDATION_ERROR fields[password]; contas sem.letra@example.com = 0
```

</details>

#### API-SENHA-03 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e o campo password | observado VALIDATION_ERROR e password
- `*` nenhuma conta com esse e-mail passa a existir no banco | interpretado como: count igual a 0 | observado 0 | passou

<details>
<summary>Evidência</summary>

```
senha abc1234 -> 400 VALIDATION_ERROR fields[password]; contas curta@example.com = 0
```

</details>

#### API-SENHA-04 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o banco tem uma conta com esse e-mail | interpretado como: count igual a 1 | observado 1 | passou

<details>
<summary>Evidência</summary>

```
senha abcdefg1 -> 200; contas limite@example.com = 1
```

</details>

#### API-CAMPOS-01 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e o campo name | observado VALIDATION_ERROR e `fields[0].field` name ("O nome é obrigatório.")
- `*` nenhuma conta com esse e-mail passa a existir no banco | interpretado como: count igual a 0 | observado 0 | passou

<details>
<summary>Evidência</summary>

```
name "   " -> 400 {"code":"VALIDATION_ERROR",...,"fields":[{"field":"name","message":"O nome é obrigatório."}]}; contas = 0
```

</details>

#### API-CAMPOS-02 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` o corpo traz o campo email entre os campos inválidos | interpretado como: `fields[].field` contém email | observado email ("Informe um e-mail válido.") | passou
- `*` o número de contas no banco não muda | interpretado como: count(*) de `user` igual antes e depois | observado 0 e 0 | passou

<details>
<summary>Evidência</summary>

```
email nao-e-um-email -> 400 {"code":"VALIDATION_ERROR",...,"fields":[{"field":"email","message":"Informe um e-mail válido."}]}
contas antes 0, depois 0
```

</details>

#### API-CAMPOS-03 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- ✓ o corpo traz o código VALIDATION_ERROR e o campo name | observado VALIDATION_ERROR e name ("O nome pode ter no máximo 100 caracteres.")
- `*` nenhuma conta com esse e-mail passa a existir no banco | interpretado como: count igual a 0 | observado 0 | passou

<details>
<summary>Evidência</summary>

```
nome de 101 caracteres -> 400 VALIDATION_ERROR fields[name]; contas nome.longo@example.com = 0
```

</details>

#### API-CAMPOS-04 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o banco tem uma conta com esse e-mail e esse nome | interpretado como: linha com o e-mail e `name` igual ao nome enviado | observado length 100, igual | passou

<details>
<summary>Evidência</summary>

```
nome de 100 caracteres -> 200; select length(name), name=<enviado> -> 100|t
```

</details>

#### API-ENVIO-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200 (com `docker compose stop valkey`)
- `*` o banco tem uma conta com esse e-mail, com papel user e e-mail não verificado | interpretado como: linha com role user e emailVerified falso | observado sem.fila@example.com|user|f | passou

<details>
<summary>Evidência</summary>

```
valkey parado; POST sem.fila@example.com -> 200
log api: {"level":50,"context":"SignUp","kind":"verify-email","err":"Error","msg":"Falha ao enfileirar o e-mail de confirmação; a conta foi criada e o reenvio fica com a pessoa"}
user: sem.fila@example.com|user|f
```

</details>

#### API-LIMITE-01 *
- Veredito: passou
- ✓ a resposta é 429 | esperado 429, observado 429 (cinco anteriores 200)
- `*` a resposta tem o cabeçalho X-Retry-After com um número de segundos maior que zero | interpretado como: cabeçalho presente, inteiro maior que 0 | observado `x-retry-after: 60` | passou
- `*` nenhuma conta com o e-mail da sexta requisição passa a existir no banco | interpretado como: count igual a 0 | observado 0 | passou

<details>
<summary>Evidência</summary>

```
X-Forwarded-For 203.0.113.50: 200 200 200 200 200, sexta 429
x-retry-after: 60
{"message":"Too many requests. Please try again later."}
contas lim6@example.com = 0
```

</details>

#### API-LIMITE-02
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200

<details>
<summary>Evidência</summary>

```
cinco requisições com 203.0.113.50 -> 200 x5; requisição com 203.0.113.51 -> 200
```

</details>

#### API-LIMITE-03
- Veredito: passou
- ✓ a resposta é 429 | esperado 429, observado 429

<details>
<summary>Evidência</summary>

```
100 x GET /api/auth/ok com X-Forwarded-For 203.0.113.60 -> 100 respostas 200
101a -> 429, x-retry-after: 10
```

</details>

#### API-LIMITE-04 *
- Veredito: passou
- `*` nenhuma das seis respostas é 429 | interpretado como: status de cada uma das seis diferente de 429 | observado 200 x6 | passou

<details>
<summary>Evidência</summary>

```
valkey parado; X-Forwarded-For 203.0.113.70: 200 200 200 200 200 200
log api: {"level":40,"context":"RateLimit","msg":"Rate limit liberado: Valkey indisponível (conexão connecting)"}
```

</details>

#### API-SIGILO-01 *
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200
- `*` o corpo da resposta não contém Sigilo9876 | interpretado como: busca literal no corpo | observado 0 ocorrências | passou
- `*` nenhuma linha escrita pelo serviço api desde a requisição contém Sigilo9876 | interpretado como: `docker compose logs --since <antes da requisição> api` sem a senha | observado 0 de 1 linha | passou
- `*` nenhuma linha escrita pelo serviço api desde a requisição contém sigilo@example.com | interpretado como: a mesma captura sem o e-mail | observado 0 de 1 linha | passou

<details>
<summary>Evidência</summary>

```
POST sigilo@example.com -> 200; corpo sem a senha
log api desde a requisição (1 linha):
{"level":30,"context":"EmailSendProcessor","jobId":"1","kind":"verify-email","attempt":1,"msg":"E-mail enviado"}
```

</details>

#### API-SIGILO-02 *
- Veredito: passou
- ✓ a resposta é 400 | esperado 400, observado 400
- `*` o corpo da resposta não contém semnumeroxyz | interpretado como: busca literal no corpo | observado 0 | passou
- `*` nenhuma linha escrita pelo serviço api desde a requisição contém semnumeroxyz | interpretado como: captura do log desde a requisição | observado 0 de 1 linha | passou

<details>
<summary>Evidência</summary>

```
POST recusa@example.com, senha semnumeroxyz -> 400 VALIDATION_ERROR; corpo e log sem a senha
```

</details>

### Worker

#### WRK-CONFIRMACAO-01 *
- Veredito: passou
- `*` em até 2 minutos a caixa tem exatamente uma mensagem para nova.pessoa@example.com | interpretado como: consulta repetida a `/api/v1/messages` até 2 min, mensagens_count 1 com To nova.pessoa@example.com | observado 1 mensagem em menos de 2 s | passou
- `*` o assunto da mensagem, em português do Brasil, pede a confirmação do e-mail | observado "Confirme seu e-mail" | passou
- `*` o corpo traz um link para BETTER_AUTH_URL seguido de /api/auth/verify-email com o parâmetro token | interpretado como: texto e HTML com http://localhost:3000/api/auth/verify-email?token= | observado nos dois | passou
- `*` o corpo informa, em português do Brasil, que o link vale por 24 horas | observado "O link vale por 24 horas." | passou
- `*` o token do link, lido como JWT, expira 24 horas depois de emitido, com tolerância de 1 minuto | interpretado como: exp menos iat do payload | observado 86400 s | passou

<details>
<summary>Evidência</summary>

```
To: nova.pessoa@example.com  Subject: Confirme seu e-mail
Olá, Nova Pessoa!
Recebemos o seu cadastro. Para ativar a conta, confirme o seu e-mail abrindo o link abaixo:
http://localhost:3000/api/auth/verify-email?token=eyJ<mascarado>&callbackURL=%2F
O link vale por 24 horas. Se você não fez este cadastro, ignore esta mensagem.
payload JWT: {"email":"nova.pessoa@example.com","iat":1793309543,"exp":1793395943} -> exp-iat = 86400
```

</details>

#### WRK-CONFIRMACAO-02 *
- Veredito: passou
- `*` em até 2 minutos a caixa tem uma mensagem para segredo@example.com | observado 1 mensagem para segredo@example.com em menos de 2 s | passou
- `*` nem o texto, nem o HTML, nem os cabeçalhos da mensagem contêm Segredo4321 | interpretado como: busca em Text, HTML, `/headers` e na mensagem crua `/raw` | observado 0 em todos | passou
- `*` nenhum valor nas chaves bull:email.send do Valkey contém Segredo4321 | interpretado como: SCAN de `bull:email.send*` e leitura de cada valor pelo tipo (string, hash, zset, stream) | observado 0 em 5 chaves | passou

<details>
<summary>Evidência</summary>

```
chaves: bull:email.send:id (string), :meta (hash), :1 (hash), :events (stream), :completed (zset)
data do job: {"kind":"verify-email","userId":"<id>","url":"http://localhost:3000/api/auth/verify-email?token=eyJ<mascarado>&callbackURL=%2F"}
ocorrências da senha: mensagem 0, cabeçalhos 0, raw 0, Valkey 0
```

</details>

#### WRK-RETRY-01 *
- Veredito: passou
- `*` em até 2 minutos após a volta do mailpit a caixa tem uma mensagem para retry@example.com | interpretado como: mailpit parado, cadastro, 20 s, `docker compose start mailpit`, consulta repetida até 2 min | observado 1 mensagem para retry@example.com 2 s depois da volta | passou

<details>
<summary>Evidência</summary>

```
job bull:email.send:1: atm 2, failedReason da 1a tentativa "Falha no envio SMTP (ETIMEDOUT)", finishedOn preenchido
opts: {"backoff":{"type":"exponential","delay":5000},"attempts":5,...}
```

</details>

#### WRK-RETRY-02 *
- Veredito: passou
- `*` em até 3 minutos o job dessa conta está no conjunto de falhos da fila email.send no Valkey | interpretado como: ZSET `bull:email.send:failed` contém o job cujo `data.userId` é o id da conta | observado job 1 no conjunto aos 105 s, userId igual | passou
- `*` o job registra 5 tentativas feitas | interpretado como: campo `atm` do hash do job | observado 5 | passou
- `*` a conta com esse e-mail continua no banco, com e-mail não verificado | observado esgotado@example.com|f | passou

<details>
<summary>Evidência</summary>

```
mailpit parado o item todo; POST esgotado@example.com -> 200
bull:email.send:failed = [1] aos 105 s; atm 5, ats 5, failedReason "Falha no envio SMTP (ESOCKET)"
data.userId = id da conta criada; user esgotado@example.com|f
```

</details>

### UI

#### UI-CADASTRO-01 *
- Veredito: passou
- `*` a página informa, em português do Brasil, que o link de confirmação foi enviado para tela@example.com | observado "Enviamos o link de confirmação para tela@example.com." | passou
- `*` a página informa que é preciso confirmar o e-mail antes de entrar | observado "Você precisa confirmar o e-mail antes de entrar." | passou
- ✓ a página mostra o botão Reenviar link | esperado botão pelo nome acessível, observado 1
- ✓ base visual mecânica: sem imagem quebrada, nada fora da janela, cortado ou coberto, no formulário e na tela de sucesso
- `*` base visual por screenshot | observado título, mensagens e botão legíveis, sem corte nem sobreposição | passou

<details>
<summary>Evidência</summary>

```
/cadastro -> texto: Confirme seu e-mail | Enviamos o link de confirmação para tela@example.com. | Você precisa confirmar o e-mail antes de entrar. O link vale por 24 horas. | Reenviar link
visual: {"brokenImgs":[],"offscreen":[],"clipped":[],"notTop":[]}
screenshot: <tmp>/UI-CADASTRO-01-depois.png (pasta apagada na derrubada)
```

</details>

#### UI-CAMPOS-01 *
- Veredito: passou
- `*` a página continua no formulário de cadastro | interpretado como: URL /cadastro e formulário Criar conta visível | observado ambos | passou
- `*` a página mostra, junto ao campo nome, que ele é obrigatório | interpretado como: mensagem ligada ao input por aria-describedby | observado `name-error` "O nome é obrigatório." | passou
- `*` a página mostra, junto ao campo e-mail, que o e-mail é inválido | interpretado como: mensagem ligada ao input por aria-describedby | observado `email-error` "Informe um e-mail válido." | passou
- ✓ base visual mecânica: sem achado
- `*` base visual por screenshot | observado mensagens sob cada campo, sem corte | passou

<details>
<summary>Evidência</summary>

```
form novalidate; nenhuma requisição ao /api/auth (só GET /api/v1/session)
<input id="name" aria-invalid="true" aria-describedby="name-error"> <small id="name-error" role="alert">O nome é obrigatório.</small>
<input id="email" aria-invalid="true" aria-describedby="email-error" value="nao-e-um-email"> <small id="email-error" role="alert">Informe um e-mail válido.</small>
```

</details>

#### UI-REENVIO-01 *
- Veredito: passou
- `*` a página informa, em português do Brasil, que o link foi reenviado | observado "Link reenviado para reenvio@example.com." | passou
- ✓ base visual mecânica: sem achado, antes e depois do clique
- `*` base visual por screenshot | observado mensagem abaixo do botão, sem corte | passou

<details>
<summary>Evidência</summary>

```
rede: POST /api/auth/sign-up/email, POST /api/auth/send-verification-email
caixa: 2 mensagens para reenvio@example.com
```

</details>

#### UI-DUPLICADO-01 *
- Veredito: passou
- `*` a página informa, em português do Brasil, que o e-mail já tem conta | observado "Este e-mail já tem conta." | passou
- ✓ a página tem um link para /entrar | observado `<a href="/entrar">Entrar</a>`
- ✓ a página tem um link para /recuperar-senha | observado `<a href="/recuperar-senha">Recuperar senha</a>`
- ✓ base visual mecânica: sem achado
- `*` base visual por screenshot | observado aviso e links acima do formulário, sem corte | passou

<details>
<summary>Evidência</summary>

```
e-mail Existente@Example.com -> texto: Criar conta | Este e-mail já tem conta. | Entrar ou Recuperar senha | ...
links: ["/entrar Entrar","/recuperar-senha Recuperar senha"]; contas no banco = 1
```

</details>

#### UI-SENHA-01 *
- Veredito: passou
- `*` a página continua no formulário de cadastro | observado URL /cadastro e formulário visível | passou
- `*` a página mostra, junto ao campo senha, a regra de no mínimo 8 caracteres com letra e número | interpretado como: texto ligado ao input por aria-describedby, com o campo marcado inválido | observado `password-hint` "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." e aria-invalid true | passou
- ✓ base visual mecânica: sem achado

<details>
<summary>Evidência</summary>

```
senha abcdefgh -> {"describedby":["A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."],"invalid":"true"}
contas no banco = 0
```

</details>

#### UI-SIGILO-01 *
- Veredito: passou
- ✓ o campo senha do formulário é do tipo password | observado type="password"
- `*` o texto visível da página depois do envio não contém Visivel5555 | interpretado como: innerText do body | observado false | passou
- `*` a URL da página depois do envio não contém Visivel5555 | observado http://localhost:5173/cadastro | passou
- ✓ base visual mecânica: sem achado

<details>
<summary>Evidência</summary>

```
depois do envio: Confirme seu e-mail | Enviamos o link de confirmação para tela.sigilo@example.com. | ...
textHas false, urlHas false
```

</details>

### E2E

#### E2E-CADASTRO-01 *
- Veredito: passou
- `*` a página informa que o link de confirmação foi enviado | observado "Enviamos o link de confirmação para jornada@example.com." | passou
- `*` em até 2 minutos a caixa tem uma mensagem para jornada@example.com com o link de confirmação | interpretado como: To igual e texto com http://localhost:3000/api/auth/verify-email?token= | observado 1 mensagem com o link em menos de 2 s | passou
- `*` a mensagem não contém Jornada2468 | interpretado como: busca na mensagem crua | observado 0 | passou
- ✓ base visual mecânica: sem achado

<details>
<summary>Evidência</summary>

```
to=jornada@example.com link=1 senha=0
```

</details>

#### E2E-REENVIO-01 *
- Veredito: passou
- `*` em até 2 minutos a caixa tem duas mensagens para jornada.reenvio@example.com, cada uma com um link de confirmação | observado 2 mensagens, cada uma com 1 link verify-email | passou
- ✓ base visual mecânica: sem achado, antes e depois do clique em Reenviar link

<details>
<summary>Evidência</summary>

```
to=jornada.reenvio@example.com link=1
to=jornada.reenvio@example.com link=1
página: ... | Reenviar link | Link reenviado para jornada.reenvio@example.com.
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `package.json` (`pnpm install --frozen-lockfile`), Node 26 e pnpm 12 pelo mise |
| Ambiente e serviços | 2 | `CLAUDE.md` e `compose.yaml`: `docker compose up -d --wait api web`, com `.env` do `.env.example` |
| Banco efêmero e migração | 5 | `scripts/test.sh`: banco `eval_rf001_...` no postgres do Compose e `prisma migrate deploy` do host |
| Valkey isolado | 5 | `apps/api/.env.test` (banco lógico por URL): REDIS_URL com `/5` para a avaliação |
| Estado persistido | 3 | spec da fundação, Convenções: `conta-existente` por SQL com hash de `better-auth/crypto`, espelhando `apps/api/test/factories/user.factory.ts` |
| Limpeza entre itens | 5 | TRUNCATE das tabelas do Better Auth, FLUSHDB do banco lógico 5 e `DELETE /api/v1/messages` do Mailpit |
| Gates | 1 | contrato: `make check` (com CI=true) e `make build` na raiz |
| Cliente HTTP | 6 | `curl` do host contra as portas publicadas, com `origin: http://localhost:5173` |
| Logs da api | 5 | `docker compose logs --no-log-prefix --since <instante> api` |
| Caixa de e-mail | 3 | spec do RF-001, Verificação por superfície: API REST do Mailpit (ADR-0016) |
| Fila | 3 | spec do RF-001: chaves `bull:email.send*` lidas com `valkey-cli` |
| Navegador | 3 | spec, Verificação por superfície: motor do `@playwright/cli` 0.1.22 (ADR-0024), `playwright-core` do cache do `pnpm dlx`, com o Chromium 1247 |
| Parar serviço | 5 | `docker compose stop` e `start` de valkey e mailpit |

## Limpeza e ambiente

- Sobras removidas: Nenhuma. Nenhum banco `eval_rf001_*`, pasta `evaluator-rf001-*` ou `processos.lock` encontrado.
- Derrubada: completa (navegador fechado a cada item; banco lógico 5 do Valkey esvaziado; `.env` restaurado da cópia anterior e api recriada com DATABASE_URL e REDIS_URL originais, saúde 200; web parada e removida, como estava antes; banco `eval_rf001_2026_10_29t21_28_47z` apagado; pasta `/tmp/evaluator-rf001-2026-10-29T21-28-47Z` apagada)

## Avisos

- Avaliado com 3 caminhos fora de commit além deste arquivo: `skills-lock.json` modificado, `.agents/` e `docs/features/RF-001-criar-conta/orquestracao.md` novos, nenhum deles código avaliado.
- Os gates `make check` e `make build` vieram do cache local do Turborepo (FULL TURBO).
- A caixa do Mailpit do Compose é compartilhada: a limpeza entre itens apagou as 55 mensagens que estavam nela antes da avaliação.
- `make check` avisa que os diagramas C4 de `template-web.md` vieram da versão 0.2.2 e a fonte está na 0.2.3, e que `spec.md` da fundação cita o componente 'API NestJS', ausente do HLD.
- Não há linha de acesso no log para `/api/auth/*`: os itens de sigilo passam porque nenhuma linha traz senha ou e-mail, mas o cadastro só deixa a linha do worker.
- A regra da senha em `password-hint` fica visível também antes do envio; UI-SENHA-01 passa porque o contrato pede a regra junto ao campo, e o campo fica com aria-invalid depois do envio.

## Motivo do aborto

Nenhum.
