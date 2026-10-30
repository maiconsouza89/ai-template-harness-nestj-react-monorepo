# Contrato: RF-001 Criar conta

*Gerado pela skill spec-writer. Edições à mão são sobrescritas na regeneração.*

## Pré-requisitos

### Serviços em execução
- API NestJS (com o worker do Módulo E-mail no mesmo processo), SPA Web, PostgreSQL, Redis (serviço Valkey) e Mailpit no Docker Compose, salvo onde o item para um deles.

### Estado persistido
- `conta-pendente-ana`: conta com o e-mail ana@example.com, nome Ana Souza, papel usuário, e-mail não verificado, sem banimento e credencial de senha, criada pelo cadastro. Usado por: API-DUPLICADO-01, API-DUPLICADO-02, API-SIGILO-03, WRK-EMAIL-05, UI-DUPLICADO-01, UI-SIGILO-01
- `janela-de-cadastro-livre`: nenhum contador de rate limit de cadastro no Valkey para o IP de onde o item envia o cadastro. Usado por: API-LIMITE-01, UI-CADASTRO-01, UI-REENVIO-01, UI-DUPLICADO-01, UI-SIGILO-01, E2E-CADASTRO-01

### Configuração
- Arquivo `.env` copiado do `.env.example`, com NODE_ENV igual a development e TRUSTED_PROXIES vazia, e o `make db-setup` aplicado.
- Toda requisição de cadastro feita fora do navegador leva um cabeçalho X-Forwarded-For com um IP de documentação (203.0.113.0/24) exclusivo do item, para o contador de rate limit de um item não afetar outro.

### Dependências externas
- DEP-1 serviço de envio de e-mail, simulado pelo Mailpit do Compose: os e-mails são lidos e a caixa é esvaziada pela API REST dele, e o serviço é parado e religado pelo Compose nos itens que o pedem.

## Gates de qualidade

Cada gate precisa passar para a feature ser considerada pronta.

- **check**: `make check`. Todas as verificações do repositório passam, as mesmas da CI, com lint, regra de dependência e testes da stack.
- **build**: `make build`. Os artefatos de API, SPA e Contratos são gerados sem erro.

## Manifesto de cobertura

| Critério de aceitação | Coberto por |
| --- | --- |
| Cadastro com dados válidos cria conta pendente com papel usuário e gera um e-mail de confirmação para o endereço informado. | API-CADASTRO-01, API-CADASTRO-02, API-CADASTRO-03, API-SENHA-04, API-FALHA-01, WRK-EMAIL-01, WRK-EMAIL-02, WRK-RETRY-01, WRK-RETRY-02, UI-CADASTRO-01, UI-REENVIO-01, E2E-CADASTRO-01 |
| Cadastro com e-mail já existente, mesmo com outra combinação de maiúsculas, é recusado e não cria segunda conta. | API-DUPLICADO-01, API-DUPLICADO-02, API-DUPLICADO-03, WRK-EMAIL-05, UI-DUPLICADO-01 |
| Senha sem número, sem letra ou com menos de 8 caracteres é recusada com a regra exibida. | API-SENHA-01, API-SENHA-02, API-SENHA-03, UI-SENHA-01 |
| A senha nunca aparece em texto puro na tela, no e-mail ou em registros do sistema. | API-SIGILO-01, API-SIGILO-02, API-SIGILO-03, WRK-EMAIL-03, WRK-EMAIL-04, UI-SIGILO-01, E2E-CADASTRO-01 |

## API HTTP

Modo de verificação: requisições HTTP contra a API em execução no ambiente local, inspecionando status, cabeçalhos e corpo, o estado do PostgreSQL e as linhas de log do serviço api escritas durante o item.

### Cadastro de conta

#### API-CADASTRO-01
- **Dado:** nenhuma conta com o e-mail bia@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Bia Lima, e-mail bia@example.com e senha Segura123.
- **Então:**
  - a resposta é 200
  - o corpo traz o usuário com e-mail bia@example.com, emailVerified falso e role igual a user
  - o corpo traz token nulo
  - a resposta não define cookie de sessão

#### API-CADASTRO-02
- **Dado:** nenhuma conta com o e-mail caio@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Caio Rocha, e-mail caio@example.com e senha Segura123.
- **Então:**
  - o banco tem exatamente uma conta com o e-mail caio@example.com
  - essa conta tem papel user, e-mail não verificado e não está banida
  - essa conta tem uma credencial de senha com providerId credential
  - nenhuma sessão existe para essa conta

#### API-CADASTRO-03
- **Dado:** nenhuma conta com o e-mail dani.melo@example.com em qualquer combinação de maiúsculas.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Dani Melo, e-mail Dani.Melo@Example.COM e senha Segura123.
- **Então:**
  - a resposta é 200
  - o corpo traz o e-mail dani.melo@example.com
  - o banco grava a conta com o e-mail dani.melo@example.com, em minúsculas

### E-mail já cadastrado

#### API-DUPLICADO-01
- **Dado:** `conta-pendente-ana`.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Outra Ana, e-mail ana@example.com e senha Segura123.
- **Então:**
  - a resposta é 422
  - o corpo traz o código USER_ALREADY_EXISTS
  - o banco continua com exatamente uma conta com o e-mail ana@example.com, de nome Ana Souza

#### API-DUPLICADO-02
- **Dado:** `conta-pendente-ana`.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Outra Ana, e-mail ANA@Example.Com e senha Segura123.
- **Então:**
  - a resposta é 422
  - o corpo traz o código USER_ALREADY_EXISTS
  - o banco continua com exatamente uma conta cujo e-mail em minúsculas é ana@example.com

#### API-DUPLICADO-03
- **Dado:** nenhuma conta com o e-mail davi@example.com.
- **Quando:** duas requisições sem cookie pedem ao mesmo tempo POST /api/auth/sign-up/email com o e-mail davi@example.com, uma com o nome Davi Um e outra com Davi Dois, as duas com a senha Segura123.
- **Então:**
  - uma resposta é 200
  - a outra resposta é 422
  - o banco tem exatamente uma conta com o e-mail davi@example.com

### Regra de senha

#### API-SENHA-01
- **Dado:** nenhuma conta com o e-mail elis@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Elis Prado, e-mail elis@example.com e a senha SenhaSegura, sem número.
- **Então:**
  - a resposta é 400
  - o corpo traz o código VALIDATION_ERROR
  - o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."
  - o banco não tem conta com o e-mail elis@example.com

#### API-SENHA-02
- **Dado:** nenhuma conta com o e-mail fabio@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Fabio Reis, e-mail fabio@example.com e a senha 12345678, sem letra.
- **Então:**
  - a resposta é 400
  - o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."
  - o banco não tem conta com o e-mail fabio@example.com

#### API-SENHA-03
- **Dado:** nenhuma conta com o e-mail gil@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Gil Souto, e-mail gil@example.com e a senha Seg1234, com 7 caracteres.
- **Então:**
  - a resposta é 400
  - o corpo aponta o campo password com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."
  - o banco não tem conta com o e-mail gil@example.com

#### API-SENHA-04
- **Dado:** nenhuma conta com o e-mail heitor@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Heitor Paz, e-mail heitor@example.com e a senha abcdefg1, com exatamente 8 caracteres, uma letra e um número.
- **Então:**
  - a resposta é 200
  - o banco tem uma conta com o e-mail heitor@example.com

### Campos obrigatórios

#### API-CAMPOS-01
- **Dado:** nenhuma conta com o e-mail iris@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com o nome só com espaços, e-mail iris@example.com e senha Segura123.
- **Então:**
  - a resposta é 400
  - o corpo traz o código VALIDATION_ERROR e aponta o campo name
  - o banco não tem conta com o e-mail iris@example.com

#### API-CAMPOS-02
- **Dado:** o ambiente no ar.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Joana Luz, e-mail joana@ e senha Segura123.
- **Então:**
  - a resposta é 400
  - o corpo traz o código VALIDATION_ERROR e aponta o campo email
  - o banco não tem conta com o e-mail joana@

#### API-CAMPOS-03
- **Dado:** nenhuma conta com o e-mail kai@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Kai Lopes e e-mail kai@example.com, sem senha.
- **Então:**
  - a resposta é 400
  - o corpo traz o código VALIDATION_ERROR e aponta o campo password
  - o banco não tem conta com o e-mail kai@example.com

### Sigilo da senha

#### API-SIGILO-01
- **Dado:** nenhuma conta com o e-mail lia@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Lia Matos, e-mail lia@example.com e senha Sigilo123x.
- **Então:**
  - o corpo da resposta não contém Sigilo123x
  - a credencial de senha da conta no banco não contém Sigilo123x
  - nenhuma coluna da conta em user contém Sigilo123x

#### API-SIGILO-02
- **Dado:** nenhuma conta com o e-mail mauro@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Mauro Teles, e-mail mauro@example.com e senha Sigilo456y.
- **Então:**
  - nenhuma linha de log do serviço api escrita durante o item contém Sigilo456y
  - nenhuma dessas linhas contém Mauro Teles
  - nenhuma dessas linhas contém mauro@example.com
  - nenhuma dessas linhas contém o trecho token=

#### API-SIGILO-03
- **Dado:** `conta-pendente-ana`.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Outra Ana, e-mail ana@example.com e senha Sigilo789z.
- **Então:**
  - a resposta é 422
  - nenhuma linha de log do serviço api escrita durante o item contém Sigilo789z
  - nenhuma dessas linhas contém ana@example.com

### Limite de cadastros

#### API-LIMITE-01
- **Dado:** `janela-de-cadastro-livre` para o IP 203.0.113.50 e nenhuma conta com os e-mails limite1@example.com a limite6@example.com.
- **Quando:** seis requisições sem cookie, em sequência e em menos de 60 segundos, todas com X-Forwarded-For 203.0.113.50, pedem POST /api/auth/sign-up/email com nome Teste Limite, senha Segura123 e os e-mails limite1@example.com a limite6@example.com.
- **Então:**
  - as cinco primeiras respostas são 200
  - a sexta resposta é 429
  - a sexta resposta traz o cabeçalho X-Retry-After
  - o banco não tem conta com o e-mail limite6@example.com

#### API-LIMITE-02
- **Dado:** o IP 203.0.113.50 com o limite de cadastros atingido nos últimos 60 segundos e nenhuma conta com o e-mail limite7@example.com.
- **Quando:** uma requisição sem cookie com X-Forwarded-For 203.0.113.51 pede POST /api/auth/sign-up/email com nome Teste Limite, e-mail limite7@example.com e senha Segura123.
- **Então:**
  - a resposta é 200
  - o banco tem uma conta com o e-mail limite7@example.com

### Falha no envio do e-mail

#### API-FALHA-01
- **Dado:** o serviço valkey parado e nenhuma conta com o e-mail nina@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Nina Alves, e-mail nina@example.com e senha Segura123.
- **Então:**
  - a resposta é 200 e chega em até 5 segundos
  - o banco tem uma conta com o e-mail nina@example.com, papel user e e-mail não verificado
  - o serviço api continua respondendo GET /api/health

## UI

Modo de verificação: navegador dirigido contra a SPA em execução no ambiente local, observando o conteúdo da página, os atributos dos campos, a URL e as requisições de rede.

### Tela de cadastro

#### UI-CADASTRO-01
- **Dado:** `janela-de-cadastro-livre` e nenhuma conta com o e-mail ugo@example.com.
- **Quando:** a pessoa abre /cadastro, preenche nome Ugo Faria, e-mail ugo@example.com e senha Segura123 e envia.
- **Então:**
  - a tela mostra que o link de confirmação foi enviado para ugo@example.com
  - a tela diz que é preciso confirmar o e-mail antes de entrar
  - o botão "Reenviar o link" está visível
  - o formulário de cadastro não está mais visível

#### UI-REENVIO-01
- **Dado:** `janela-de-cadastro-livre` e a tela de link enviado aberta logo depois do cadastro de vera@example.com feito em /cadastro.
- **Quando:** a pessoa clica em "Reenviar o link".
- **Então:**
  - a página envia POST /api/auth/send-verification-email com o e-mail vera@example.com
  - essa requisição recebe 200
  - a tela informa que um novo link foi enviado

#### UI-DUPLICADO-01
- **Dado:** `conta-pendente-ana` e `janela-de-cadastro-livre`.
- **Quando:** a pessoa abre /cadastro, preenche nome Outra Ana, e-mail ANA@example.com e senha Segura123 e envia.
- **Então:**
  - a tela diz que o e-mail já tem conta
  - a tela tem um link para /entrar
  - a tela tem um link para /recuperar-senha
  - o formulário continua visível com o nome e o e-mail preenchidos

#### UI-SENHA-01
- **Dado:** a SPA no ar.
- **Quando:** a pessoa abre /cadastro, preenche nome Wagner Lins, e-mail wagner@example.com e a senha abcdefgh, sem número, e envia.
- **Então:**
  - abaixo do campo de senha aparece "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."
  - a página não envia requisição a /api/auth/sign-up/email
  - o formulário continua visível

#### UI-CAMPOS-01
- **Dado:** a SPA no ar.
- **Quando:** a pessoa abre /cadastro, deixa o nome vazio, preenche e-mail xenia@example.com e senha Segura123 e envia.
- **Então:**
  - abaixo do campo de nome aparece a mensagem de campo obrigatório
  - o foco fica no campo de nome
  - a página não envia requisição a /api/auth/sign-up/email

#### UI-CAMPOS-02
- **Dado:** a SPA no ar.
- **Quando:** a pessoa abre /cadastro, preenche nome Yara Leal, e-mail yara@ e senha Segura123 e envia.
- **Então:**
  - abaixo do campo de e-mail aparece a mensagem de e-mail inválido
  - a página não envia requisição a /api/auth/sign-up/email

#### UI-SIGILO-01
- **Dado:** `conta-pendente-ana` e `janela-de-cadastro-livre`.
- **Quando:** a pessoa abre /cadastro, preenche nome Outra Ana, e-mail ana@example.com e senha Oculta123 e envia.
- **Então:**
  - o campo de senha é do tipo senha, com o valor mascarado
  - o texto visível da página não contém Oculta123
  - a URL não contém Oculta123
  - a requisição de cadastro leva a senha no corpo, nunca na URL

## Worker

Modo de verificação: cadastros feitos pela API em execução no ambiente local, seguidos da leitura da caixa de teste pela API REST do Mailpit e das chaves da fila email.send no Valkey, com os serviços do Compose parados e religados quando o item pede.

### E-mail de confirmação

Dado comum: a caixa do Mailpit vazia no início do item.

#### WRK-EMAIL-01
- **Dado:** nenhuma conta com o e-mail otto@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Otto Brandão, e-mail otto@example.com e senha Segura123.
- **Então:**
  - em até 2 minutos a caixa tem exatamente uma mensagem para otto@example.com
  - o remetente da mensagem é o SMTP_FROM do .env
  - o assunto é "Confirme seu e-mail"

#### WRK-EMAIL-02
- **Dado:** nenhuma conta com o e-mail paula@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Paula Dias, e-mail paula@example.com e senha Segura123.
- **Então:**
  - a mensagem para paula@example.com tem um link que começa com o WEB_ORIGIN do .env seguido de /confirmar-email?token= e um token não vazio
  - o corpo diz "O link vale por 24 horas."
  - o corpo cumprimenta pelo nome Paula Dias
  - o corpo está em português do Brasil, no texto e no HTML

#### WRK-EMAIL-03
- **Dado:** nenhuma conta com o e-mail quim@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Quim Moura, e-mail quim@example.com e senha Sigilo321w.
- **Então:**
  - o corpo em texto da mensagem para quim@example.com não contém Sigilo321w
  - o corpo em HTML não contém Sigilo321w
  - nenhum cabeçalho da mensagem contém Sigilo321w

#### WRK-EMAIL-04
- **Dado:** nenhuma conta com o e-mail rui@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Rui Campos, e-mail rui@example.com e senha Sigilo654v.
- **Então:**
  - a fila email.send tem um job verify-email com o id da conta de rui@example.com
  - os dados desse job não contêm Sigilo654v
  - os dados desse job não contêm rui@example.com nem Rui Campos

#### WRK-EMAIL-05
- **Dado:** `conta-pendente-ana`.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Outra Ana, e-mail ANA@example.com e senha Segura123.
- **Então:**
  - depois de 1 minuto a caixa não tem mensagem para ana@example.com

### Nova tentativa de envio

#### WRK-RETRY-01
- **Dado:** o serviço mailpit parado, para ser religado 20 segundos depois do cadastro, e nenhuma conta com o e-mail sara@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Sara Pinto, e-mail sara@example.com e senha Segura123.
- **Então:**
  - em até 2 minutos depois de o mailpit voltar, a caixa tem uma mensagem para sara@example.com
  - o job verify-email dessa conta fica concluído com mais de uma tentativa registrada

#### WRK-RETRY-02
- **Dado:** o serviço mailpit parado durante todo o item e nenhuma conta com o e-mail tais@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Tais Rangel, e-mail tais@example.com e senha Segura123.
- **Então:**
  - em até 3 minutos o job verify-email dessa conta fica no estado falho
  - o job registra 5 tentativas
  - a conta de tais@example.com continua no banco, pendente

## E2E

Modo de verificação: navegador dirigido contra a SPA no ambiente local, seguido da leitura da caixa de teste pela API REST do Mailpit, do estado do PostgreSQL e das linhas de log do serviço api escritas durante a jornada.

### Cadastro de ponta a ponta

#### E2E-CADASTRO-01
- **Dado:** `janela-de-cadastro-livre`, a caixa do Mailpit vazia e nenhuma conta com o e-mail zelia@example.com.
- **Quando:** a pessoa abre /cadastro, cria a conta com nome Zélia Dias, e-mail zelia@example.com e senha Jornada123 e espera o e-mail chegar.
- **Então:**
  - a tela mostra que o link de confirmação foi enviado para zelia@example.com
  - em até 2 minutos a caixa tem uma mensagem para zelia@example.com com um link para /confirmar-email?token=
  - o banco tem a conta de zelia@example.com com papel user e e-mail não verificado
  - nem a mensagem nem as linhas de log do serviço api escritas durante a jornada contêm Jornada123
  - nenhuma dessas linhas de log contém Zélia Dias ou zelia@example.com
