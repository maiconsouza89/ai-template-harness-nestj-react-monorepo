# Contrato: RF-001 Criar conta

*Gerado pela skill spec-writer. Edições à mão são sobrescritas na regeneração.*

## Pré-requisitos

### Serviços em execução
- API (Módulo Contas e Módulo E-mail), SPA Web, PostgreSQL e Redis (serviço Valkey) no Docker Compose, salvo onde o item para um deles.

### Estado persistido
- `conta-existente`: conta com o e-mail existente@example.com em minúsculas, papel user, e-mail não verificado, sem banimento e credencial de senha. Usado por: API-DUPLICADO-01, API-DUPLICADO-02, UI-DUPLICADO-01

### Configuração
- Arquivo `.env` copiado do `.env.example`, com NODE_ENV igual a development e TRUSTED_PROXIES ausente, salvo onde o item diz outra coisa.
- Docker com Compose v2, shellcheck, actionlint, gitleaks e python3 instalados na máquina.

### Dependências externas
- DEP-1 serviço de envio de e-mail, simulado pelo Mailpit do Compose, que recebe o SMTP da API e expõe as mensagens pela API REST dele, com a caixa vazia no início de cada item.

## Gates de qualidade

Cada gate precisa passar para a feature ser considerada pronta.

- **check**: `make check`. Todas as verificações do repositório passam, as mesmas da CI.
- **build**: `make build`. Os artefatos de API, SPA e Contratos são gerados sem erro.

## Manifesto de cobertura

| Critério de aceitação | Coberto por |
| --- | --- |
| Cadastro com dados válidos cria conta pendente com papel usuário e gera um e-mail de confirmação para o endereço informado. | API-CADASTRO-01, API-CADASTRO-02, WRK-CONFIRMACAO-01, UI-CADASTRO-01, E2E-CADASTRO-01 |
| Cadastro com e-mail já existente, mesmo com outra combinação de maiúsculas, é recusado e não cria segunda conta. | API-DUPLICADO-01, API-DUPLICADO-02, UI-DUPLICADO-01 |
| Senha sem número, sem letra ou com menos de 8 caracteres é recusada com a regra exibida. | API-SENHA-01, API-SENHA-02, API-SENHA-03, API-SENHA-04, UI-SENHA-01 |
| A senha nunca aparece em texto puro na tela, no e-mail ou em registros do sistema. | API-SIGILO-01, API-SIGILO-02, WRK-CONFIRMACAO-02, UI-SIGILO-01, E2E-CADASTRO-01 |

## API HTTP

Modo de verificação: requisições HTTP contra a API em execução no ambiente local, inspecionando status, cabeçalhos e corpo, o estado do banco e os logs do serviço api quando o item os cita.

### Cadastro

Dado comum: o ambiente no ar e nenhuma conta com o e-mail do item.

#### API-CADASTRO-01
- **Dado:** nenhuma conta com o e-mail ana@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Ana Souza, e-mail ana@example.com e senha senha1234.
- **Então:**
  - a resposta é 200
  - a resposta não define cookie de sessão
  - o banco tem exatamente uma conta com o e-mail ana@example.com, com papel user e e-mail não verificado
  - a conta tem uma credencial de senha cujo valor gravado é diferente de senha1234

#### API-CADASTRO-02
- **Dado:** nenhuma conta com o e-mail maria.silva@example.com em nenhuma combinação de maiúsculas.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Maria Silva, e-mail Maria.Silva@Example.COM e senha senha1234.
- **Então:**
  - a resposta é 200
  - o banco tem exatamente uma conta com o e-mail maria.silva@example.com, todo em minúsculas

### E-mail já cadastrado

#### API-DUPLICADO-01
- **Dado:** `conta-existente`.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Outra Pessoa, e-mail existente@example.com e senha outra1234.
- **Então:**
  - a resposta é 422
  - o corpo traz o código USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL
  - o banco continua com exatamente uma conta com o e-mail existente@example.com
  - a credencial dessa conta continua com o mesmo valor gravado de antes da requisição

#### API-DUPLICADO-02
- **Dado:** `conta-existente`.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Outra Pessoa, e-mail EXISTENTE@Example.com e senha outra1234.
- **Então:**
  - a resposta é 422
  - o corpo traz o código USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL
  - o banco continua com exatamente uma conta cujo e-mail, em minúsculas, é existente@example.com

### Regra de senha

Dado comum: o ambiente no ar e nenhuma conta com o e-mail do item.

#### API-SENHA-01
- **Dado:** nenhuma conta com o e-mail sem.numero@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com esse e-mail, um nome e a senha abcdefgh.
- **Então:**
  - a resposta é 400
  - o corpo traz o código VALIDATION_ERROR e o campo password
  - a mensagem do campo password informa o mínimo de 8 caracteres com letra e número
  - nenhuma conta com esse e-mail passa a existir no banco

#### API-SENHA-02
- **Dado:** nenhuma conta com o e-mail sem.letra@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com esse e-mail, um nome e a senha 12345678.
- **Então:**
  - a resposta é 400
  - o corpo traz o código VALIDATION_ERROR e o campo password
  - nenhuma conta com esse e-mail passa a existir no banco

#### API-SENHA-03
- **Dado:** nenhuma conta com o e-mail curta@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com esse e-mail, um nome e a senha abc1234, de 7 caracteres.
- **Então:**
  - a resposta é 400
  - o corpo traz o código VALIDATION_ERROR e o campo password
  - nenhuma conta com esse e-mail passa a existir no banco

#### API-SENHA-04
- **Dado:** nenhuma conta com o e-mail limite@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com esse e-mail, um nome e a senha abcdefg1, de 8 caracteres com letra e número.
- **Então:**
  - a resposta é 200
  - o banco tem uma conta com esse e-mail

### Campos do cadastro

Dado comum: o ambiente no ar e nenhuma conta com o e-mail do item.

#### API-CAMPOS-01
- **Dado:** nenhuma conta com o e-mail sem.nome@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com esse e-mail, a senha senha1234 e o nome formado só por espaços.
- **Então:**
  - a resposta é 400
  - o corpo traz o código VALIDATION_ERROR e o campo name
  - nenhuma conta com esse e-mail passa a existir no banco

#### API-CAMPOS-02
- **Dado:** o ambiente no ar.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Ana, senha senha1234 e e-mail nao-e-um-email.
- **Então:**
  - a resposta é 400
  - o corpo traz o campo email entre os campos inválidos
  - o número de contas no banco não muda

#### API-CAMPOS-03
- **Dado:** nenhuma conta com o e-mail nome.longo@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com esse e-mail, a senha senha1234 e um nome de 101 caracteres.
- **Então:**
  - a resposta é 400
  - o corpo traz o código VALIDATION_ERROR e o campo name
  - nenhuma conta com esse e-mail passa a existir no banco

#### API-CAMPOS-04
- **Dado:** nenhuma conta com o e-mail nome.limite@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com esse e-mail, a senha senha1234 e um nome de 100 caracteres.
- **Então:**
  - a resposta é 200
  - o banco tem uma conta com esse e-mail e esse nome

### Falha no envio

#### API-ENVIO-01
- **Dado:** o ambiente no ar com o serviço valkey parado e nenhuma conta com o e-mail sem.fila@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com esse e-mail, um nome e a senha senha1234.
- **Então:**
  - a resposta é 200
  - o banco tem uma conta com esse e-mail, com papel user e e-mail não verificado

### Limite de tentativas

#### API-LIMITE-01
- **Dado:** o ambiente no ar e cinco requisições POST /api/auth/sign-up/email com o cabeçalho X-Forwarded-For igual a 203.0.113.50 nos últimos 60 segundos.
- **Quando:** uma sexta requisição POST /api/auth/sign-up/email com o mesmo X-Forwarded-For, um e-mail sem conta, um nome e a senha senha1234.
- **Então:**
  - a resposta é 429
  - a resposta tem o cabeçalho X-Retry-After com um número de segundos maior que zero
  - nenhuma conta com o e-mail da sexta requisição passa a existir no banco

#### API-LIMITE-02
- **Dado:** o ambiente no ar e cinco requisições POST /api/auth/sign-up/email com o cabeçalho X-Forwarded-For igual a 203.0.113.50 nos últimos 60 segundos.
- **Quando:** uma requisição POST /api/auth/sign-up/email com X-Forwarded-For igual a 203.0.113.51, um e-mail sem conta, um nome e a senha senha1234.
- **Então:**
  - a resposta é 200

#### API-LIMITE-03
- **Dado:** o ambiente no ar e 100 requisições GET /api/auth/ok com o cabeçalho X-Forwarded-For igual a 203.0.113.60 nos últimos 10 segundos.
- **Quando:** uma requisição GET /api/auth/ok com o mesmo X-Forwarded-For.
- **Então:**
  - a resposta é 429

#### API-LIMITE-04
- **Dado:** o ambiente no ar com o serviço valkey parado.
- **Quando:** seis requisições POST /api/auth/sign-up/email seguidas, com X-Forwarded-For igual a 203.0.113.70, e-mails sem conta, um nome e a senha senha1234.
- **Então:**
  - nenhuma das seis respostas é 429

### Sigilo da senha

#### API-SIGILO-01
- **Dado:** nenhuma conta com o e-mail sigilo@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com esse e-mail, um nome e a senha Sigilo9876.
- **Então:**
  - a resposta é 200
  - o corpo da resposta não contém Sigilo9876
  - nenhuma linha escrita pelo serviço api desde a requisição contém Sigilo9876
  - nenhuma linha escrita pelo serviço api desde a requisição contém sigilo@example.com

#### API-SIGILO-02
- **Dado:** o ambiente no ar.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com e-mail recusa@example.com, um nome e a senha semnumeroxyz.
- **Então:**
  - a resposta é 400
  - o corpo da resposta não contém semnumeroxyz
  - nenhuma linha escrita pelo serviço api desde a requisição contém semnumeroxyz

## UI

Modo de verificação: navegador dirigido contra a SPA em execução no ambiente local, observando o conteúdo da página, a URL e as requisições de rede.

### Tela de cadastro

#### UI-CADASTRO-01
- **Dado:** o ambiente no ar, o navegador sem cookie e nenhuma conta com o e-mail tela@example.com.
- **Quando:** abre-se /cadastro, preenche-se nome Pessoa da Tela, e-mail tela@example.com e senha senha1234, e envia-se o formulário.
- **Então:**
  - a página informa, em português do Brasil, que o link de confirmação foi enviado para tela@example.com
  - a página informa que é preciso confirmar o e-mail antes de entrar
  - a página mostra o botão Reenviar link

#### UI-CAMPOS-01
- **Dado:** o ambiente no ar e o navegador sem cookie.
- **Quando:** abre-se /cadastro, deixa-se o nome vazio, preenche-se o e-mail com nao-e-um-email e a senha com senha1234, e envia-se o formulário.
- **Então:**
  - a página continua no formulário de cadastro
  - a página mostra, junto ao campo nome, que ele é obrigatório
  - a página mostra, junto ao campo e-mail, que o e-mail é inválido

#### UI-REENVIO-01
- **Dado:** o ambiente no ar e a tela de sucesso de um cadastro do e-mail reenvio@example.com aberta no navegador.
- **Quando:** clica-se no botão Reenviar link.
- **Então:**
  - a página informa, em português do Brasil, que o link foi reenviado

### E-mail já cadastrado

#### UI-DUPLICADO-01
- **Dado:** `conta-existente` e o navegador sem cookie.
- **Quando:** abre-se /cadastro, preenche-se um nome, o e-mail Existente@Example.com e a senha senha1234, e envia-se o formulário.
- **Então:**
  - a página informa, em português do Brasil, que o e-mail já tem conta
  - a página tem um link para /entrar
  - a página tem um link para /recuperar-senha

### Regra de senha

#### UI-SENHA-01
- **Dado:** o ambiente no ar e o navegador sem cookie.
- **Quando:** abre-se /cadastro, preenche-se um nome, o e-mail regra@example.com e a senha abcdefgh, e envia-se o formulário.
- **Então:**
  - a página continua no formulário de cadastro
  - a página mostra, junto ao campo senha, a regra de no mínimo 8 caracteres com letra e número

### Sigilo da senha

#### UI-SIGILO-01
- **Dado:** o ambiente no ar e o navegador sem cookie.
- **Quando:** abre-se /cadastro, preenche-se um nome, o e-mail tela.sigilo@example.com e a senha Visivel5555, e envia-se o formulário.
- **Então:**
  - o campo senha do formulário é do tipo password
  - o texto visível da página depois do envio não contém Visivel5555
  - a URL da página depois do envio não contém Visivel5555

## Worker

Modo de verificação: cadastro feito por requisição HTTP à API e observação do resultado do processamento assíncrono na caixa de e-mail local e nas chaves da fila no Valkey.

### E-mail de confirmação

#### WRK-CONFIRMACAO-01
- **Dado:** o ambiente no ar, a caixa de e-mail vazia e nenhuma conta com o e-mail nova.pessoa@example.com.
- **Quando:** uma requisição pede POST /api/auth/sign-up/email com nome Nova Pessoa, e-mail Nova.Pessoa@Example.com e senha senha1234.
- **Então:**
  - em até 2 minutos a caixa tem exatamente uma mensagem para nova.pessoa@example.com
  - o assunto da mensagem, em português do Brasil, pede a confirmação do e-mail
  - o corpo traz um link para BETTER_AUTH_URL seguido de /api/auth/verify-email com o parâmetro token
  - o corpo informa, em português do Brasil, que o link vale por 24 horas
  - o token do link, lido como JWT, expira 24 horas depois de emitido, com tolerância de 1 minuto

#### WRK-CONFIRMACAO-02
- **Dado:** o ambiente no ar, a caixa de e-mail vazia e nenhuma conta com o e-mail segredo@example.com.
- **Quando:** uma requisição pede POST /api/auth/sign-up/email com esse e-mail, um nome e a senha Segredo4321.
- **Então:**
  - em até 2 minutos a caixa tem uma mensagem para segredo@example.com
  - nem o texto, nem o HTML, nem os cabeçalhos da mensagem contêm Segredo4321
  - nenhum valor nas chaves bull:email.send do Valkey contém Segredo4321

### Novas tentativas

#### WRK-RETRY-01
- **Dado:** o ambiente no ar com o serviço mailpit parado e nenhuma conta com o e-mail retry@example.com.
- **Quando:** uma requisição pede POST /api/auth/sign-up/email com esse e-mail, um nome e a senha senha1234, e o serviço mailpit volta 20 segundos depois.
- **Então:**
  - em até 2 minutos após a volta do mailpit a caixa tem uma mensagem para retry@example.com

#### WRK-RETRY-02
- **Dado:** o ambiente no ar com o serviço mailpit parado durante todo o item e nenhuma conta com o e-mail esgotado@example.com.
- **Quando:** uma requisição pede POST /api/auth/sign-up/email com esse e-mail, um nome e a senha senha1234.
- **Então:**
  - em até 3 minutos o job dessa conta está no conjunto de falhos da fila email.send no Valkey
  - o job registra 5 tentativas feitas
  - a conta com esse e-mail continua no banco, com e-mail não verificado

## E2E

Modo de verificação: navegador dirigido na SPA em execução no ambiente local e leitura da caixa de e-mail local pela API REST dela.

### Cadastro até a caixa de entrada

#### E2E-CADASTRO-01
- **Dado:** o ambiente no ar, a caixa de e-mail vazia e nenhuma conta com o e-mail jornada@example.com.
- **Quando:** a pessoa faz o cadastro em /cadastro com nome Pessoa da Jornada, e-mail jornada@example.com e senha Jornada2468.
- **Então:**
  - a página informa que o link de confirmação foi enviado
  - em até 2 minutos a caixa tem uma mensagem para jornada@example.com com o link de confirmação
  - a mensagem não contém Jornada2468

#### E2E-REENVIO-01
- **Dado:** o ambiente no ar, a caixa de e-mail vazia e nenhuma conta com o e-mail jornada.reenvio@example.com.
- **Quando:** a pessoa faz o cadastro em /cadastro com esse e-mail e clica em Reenviar link na tela de sucesso.
- **Então:**
  - em até 2 minutos a caixa tem duas mensagens para jornada.reenvio@example.com, cada uma com um link de confirmação
