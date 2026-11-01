# Contrato: RF-002 Confirmar e-mail

*Gerado pela skill spec-writer. Edições à mão são sobrescritas na regeneração.*

## Pré-requisitos

### Serviços em execução
- API NestJS (com o worker do Módulo E-mail no mesmo processo), SPA Web, PostgreSQL, Redis (serviço Valkey) e Mailpit no Docker Compose, salvo onde o item para um deles.

### Estado persistido
- `janela-de-cadastro-livre`: nenhum contador de rate limit de cadastro no Valkey para o IP de onde o item envia o cadastro. Usado por: API-LIMPEZA-01, E2E-CONFIRMACAO-01, E2E-INTEGRACAO-01, E2E-REENVIO-01
- `janela-de-reenvio-livre`: nenhum contador de rate limit de reenvio de confirmação no Valkey para o IP de onde o item envia o reenvio. Usado por: API-REENVIO-01, API-REENVIO-02, API-REENVIO-03, API-REENVIO-04, WRK-REENVIO-01, WRK-REENVIO-02, UI-REENVIO-01, UI-REENVIO-02, UI-INVALIDO-03, E2E-REENVIO-01

### Configuração
- Arquivo `.env` copiado do `.env.example`, com NODE_ENV igual a development e TRUSTED_PROXIES vazia, e o `make db-setup` aplicado.
- Toda requisição de cadastro ou de reenvio feita fora do navegador leva um cabeçalho X-Forwarded-For com um IP de documentação (203.0.113.0/24) exclusivo do item, para o contador de rate limit de um item não afetar outro.
- O link de uma conta é o da mensagem mais recente para o e-mail dela na caixa do Mailpit; o token é o valor do parâmetro token desse link.
- O registro de confirmação de uma conta é a linha da tabela verification cujo identifier começa com email-verification: e cujo value é o id da conta; mover o vencimento do link é alterar o expiresAt desse registro.

### Dependências externas
- DEP-1 serviço de envio de e-mail, simulado pelo Mailpit do Compose: os e-mails são lidos pela API REST dele, em até 2 minutos depois do envio.

## Gates de qualidade

Cada gate precisa passar para a feature ser considerada pronta.

- **check**: `make check`. Todas as verificações do repositório passam, as mesmas da CI, com lint, regra de dependência e testes da stack.
- **build**: `make build`. Os artefatos de API, SPA e Contratos são gerados sem erro.

## Manifesto de cobertura

| Critério de aceitação | Coberto por |
| --- | --- |
| Link aberto dentro de 24 horas ativa a conta e não pode ser usado de novo. | API-ATIVACAO-01, API-ATIVACAO-02, API-ATIVACAO-03, API-ATIVACAO-04, API-ATIVACAO-05, API-ATIVACAO-06, API-ATIVACAO-07, API-ATIVACAO-08, API-SIGILO-01, UI-ATIVACAO-01, UI-ATIVACAO-02, UI-FALHA-01, UI-FALHA-02, UI-VISUAL-01, E2E-CONFIRMACAO-01 |
| Link aberto depois de 24 horas não ativa a conta e a tela oferece reenvio. | API-VENCIDO-01, API-VENCIDO-02, API-LIMPEZA-01, UI-VENCIDO-01, UI-REENVIO-01, UI-REENVIO-02, E2E-REENVIO-01 |
| Depois de um reenvio, o link anterior não ativa mais a conta. | API-REENVIO-01, API-REENVIO-02, API-REENVIO-03, API-REENVIO-04, API-REENVIO-05, API-REENVIO-06, API-INVALIDO-01, WRK-REENVIO-01, WRK-REENVIO-02, UI-INVALIDO-01, UI-INVALIDO-02, UI-INVALIDO-03, E2E-REENVIO-01 |
| RF-001 → RF-002: a conta criada no cadastro fica ativa ao abrir o link recebido no e-mail daquele cadastro, e só ela. | E2E-INTEGRACAO-01, E2E-CONFIRMACAO-01 |

## API HTTP

Modo de verificação: requisições HTTP contra a API em execução no ambiente local, inspecionando status, cabeçalhos e corpo, o estado do PostgreSQL (alterado só onde o item pede) e as linhas de log do serviço api escritas durante o item, com o serviço valkey parado e religado onde o item pede.

### Ativação pelo link

#### API-ATIVACAO-01
- **Dado:** a conta pendente de lia@example.com criada por POST /api/auth/sign-up/email com nome Lia Mendes e senha Segura123, e o token T1 do link dela.
- **Quando:** uma requisição sem cookie pede GET /api/auth/verify-email?token=T1.
- **Então:**
  - a resposta é 200
  - o corpo traz status verdadeiro e não traz o código ALREADY_VERIFIED
  - a resposta não define cookie de sessão
  - o banco tem a conta de lia@example.com com e-mail verificado
  - o banco não tem sessão para essa conta

#### API-ATIVACAO-02
- **Dado:** a conta de leo@example.com criada por POST /api/auth/sign-up/email e já ativada por GET /api/auth/verify-email com o token T1 do link dela.
- **Quando:** uma requisição sem cookie pede de novo GET /api/auth/verify-email?token=T1.
- **Então:**
  - a resposta é 200
  - o corpo traz o código ALREADY_VERIFIED
  - a conta de leo@example.com continua com e-mail verificado
  - o banco não tem registro de confirmação para essa conta

#### API-ATIVACAO-03
- **Dado:** a conta de luna@example.com criada por POST /api/auth/sign-up/email, ativada por GET /api/auth/verify-email com o token T1 do link dela e, depois, marcada de volta com e-mail não verificado no banco.
- **Quando:** uma requisição sem cookie pede GET /api/auth/verify-email?token=T1.
- **Então:**
  - a resposta é 401
  - o corpo traz o código INVALID_TOKEN
  - a conta de luna@example.com continua com e-mail não verificado

#### API-ATIVACAO-04
- **Dado:** a conta pendente de lara@example.com criada por POST /api/auth/sign-up/email, o token T1 do link dela e o vencimento do link movido para 1 minuto depois de agora.
- **Quando:** uma requisição sem cookie pede GET /api/auth/verify-email?token=T1.
- **Então:**
  - a resposta é 200
  - o banco tem a conta de lara@example.com com e-mail verificado

#### API-ATIVACAO-05
- **Dado:** nenhuma conta com o e-mail lucas@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Lucas Prado, e-mail lucas@example.com e senha Segura123.
- **Então:**
  - o banco tem exatamente um registro de confirmação para a conta de lucas@example.com
  - o expiresAt desse registro fica entre 23 horas e 59 minutos e 24 horas e 1 minuto depois da resposta
  - o identifier e o value desse registro não contêm o token do link que chegou para lucas@example.com
  - o expiresAt desse registro é igual, ao segundo, ao instante de expiração (campo exp do payload) do token do link que chegou para lucas@example.com

#### API-ATIVACAO-06
- **Dado:** a conta pendente de lis@example.com criada por POST /api/auth/sign-up/email e o token T1 do link dela.
- **Quando:** duas requisições sem cookie pedem ao mesmo tempo GET /api/auth/verify-email?token=T1.
- **Então:**
  - as duas respostas são 200
  - ao menos uma resposta não traz o código ALREADY_VERIFIED
  - o banco tem a conta de lis@example.com com e-mail verificado
  - o banco não tem registro de confirmação para essa conta

#### API-ATIVACAO-07
- **Dado:** a conta pendente de lina@example.com criada por POST /api/auth/sign-up/email, o token T1 do link dela e o e-mail da conta trocado no banco para lina.outra@example.com.
- **Quando:** uma requisição sem cookie pede GET /api/auth/verify-email?token=T1.
- **Então:**
  - a resposta é 401
  - a conta continua com e-mail não verificado
  - o banco continua com um registro de confirmação para essa conta

#### API-ATIVACAO-08
- **Dado:** a conta pendente de lino@example.com criada por POST /api/auth/sign-up/email, o token T1 do link dela, o e-mail da conta trocado no banco para lino.outro@example.com, uma requisição GET /api/auth/verify-email?token=T1 já respondida com 401 e o e-mail da conta trocado de volta para lino@example.com.
- **Quando:** uma requisição sem cookie pede de novo GET /api/auth/verify-email?token=T1.
- **Então:**
  - a resposta é 200
  - o banco tem a conta de lino@example.com com e-mail verificado
  - o banco não tem registro de confirmação para essa conta

### Link vencido

#### API-VENCIDO-01
- **Dado:** a conta pendente de mia@example.com criada por POST /api/auth/sign-up/email, o token T1 do link dela e o vencimento do link movido para 1 minuto antes de agora.
- **Quando:** uma requisição sem cookie pede GET /api/auth/verify-email?token=T1.
- **Então:**
  - a resposta é 401
  - o corpo traz o código TOKEN_EXPIRED
  - a conta de mia@example.com continua com e-mail não verificado

#### API-VENCIDO-02
- **Dado:** a conta pendente de mel@example.com criada por POST /api/auth/sign-up/email, o token T1 do link dela, o vencimento movido para 1 minuto antes de agora e uma requisição GET /api/auth/verify-email?token=T1 já respondida com 401.
- **Quando:** uma requisição sem cookie pede de novo GET /api/auth/verify-email?token=T1.
- **Então:**
  - a resposta é 401
  - o corpo traz o código TOKEN_EXPIRED
  - a conta de mel@example.com continua com e-mail não verificado

### Reenvio do link

#### API-REENVIO-01
- **Dado:** `janela-de-reenvio-livre` e a conta pendente de nina@example.com criada por POST /api/auth/sign-up/email, com o registro de confirmação R1 do cadastro.
- **Quando:** uma requisição sem cookie pede POST /api/auth/send-verification-email com o e-mail nina@example.com.
- **Então:**
  - a resposta é 200 com status verdadeiro
  - o banco tem exatamente um registro de confirmação para a conta de nina@example.com
  - esse registro não é o R1
  - o expiresAt desse registro fica entre 23 horas e 59 minutos e 24 horas e 1 minuto depois da resposta

#### API-REENVIO-02
- **Dado:** `janela-de-reenvio-livre`, a conta pendente de noa@example.com criada por POST /api/auth/sign-up/email, o token T1 do link do cadastro e um POST /api/auth/send-verification-email com o e-mail noa@example.com já respondido com 200.
- **Quando:** uma requisição sem cookie pede GET /api/auth/verify-email?token=T1.
- **Então:**
  - a resposta é 401
  - o corpo traz o código INVALID_TOKEN
  - a conta de noa@example.com continua com e-mail não verificado

#### API-REENVIO-03
- **Dado:** `janela-de-reenvio-livre`, a conta pendente de nara@example.com criada por POST /api/auth/sign-up/email, o token T1 do cadastro, um reenvio com o e-mail nara@example.com já respondido com 200 e o token T2 do link que chegou depois do reenvio.
- **Quando:** uma requisição sem cookie pede GET /api/auth/verify-email?token=T2.
- **Então:**
  - a resposta é 200
  - o banco tem a conta de nara@example.com com e-mail verificado
  - T2 é diferente de T1

#### API-REENVIO-04
- **Dado:** `janela-de-reenvio-livre` e a conta pendente de nico@example.com criada por POST /api/auth/sign-up/email, com três POST /api/auth/send-verification-email com o e-mail nico@example.com já respondidos com 200 nos últimos 60 segundos, todos do mesmo IP.
- **Quando:** uma requisição sem cookie do mesmo IP pede POST /api/auth/send-verification-email com o e-mail nico@example.com.
- **Então:**
  - a resposta é 429
  - a resposta traz o cabeçalho X-Retry-After

#### API-REENVIO-05
- **Dado:** a conta pendente de omar@example.com criada por POST /api/auth/sign-up/email, com o registro de confirmação R1 do cadastro, e depois o serviço valkey parado.
- **Quando:** uma requisição sem cookie pede POST /api/auth/send-verification-email com o e-mail omar@example.com.
- **Então:**
  - a resposta é 500
  - o banco tem exatamente um registro de confirmação para a conta de omar@example.com
  - esse registro é o R1

#### API-REENVIO-06
- **Dado:** a conta pendente de otto@example.com criada por POST /api/auth/sign-up/email, o token T1 do link do cadastro, um POST /api/auth/send-verification-email com o e-mail otto@example.com já respondido com 500 com o serviço valkey parado e, depois, o serviço valkey religado.
- **Quando:** uma requisição sem cookie pede GET /api/auth/verify-email?token=T1.
- **Então:**
  - a resposta é 200
  - o banco tem a conta de otto@example.com com e-mail verificado

### Limpeza dos registros vencidos

#### API-LIMPEZA-01
- **Dado:** `janela-de-cadastro-livre`, a conta pendente de paulo@example.com com o vencimento do link movido para 8 dias antes de agora, a conta pendente de pedro@example.com com o vencimento do link movido para 1 dia antes de agora, ambas criadas por POST /api/auth/sign-up/email, e nenhuma conta com o e-mail priscila@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com nome Priscila Lima, e-mail priscila@example.com e senha Segura123.
- **Então:**
  - o banco não tem registro de confirmação para a conta de paulo@example.com
  - o banco continua com um registro de confirmação para a conta de pedro@example.com
  - o banco tem exatamente um registro de confirmação para a conta de priscila@example.com

### Link inválido

#### API-INVALIDO-01
- **Dado:** a conta pendente de olga@example.com criada por POST /api/auth/sign-up/email e o token T1 do link dela, com o último caractere trocado por outro.
- **Quando:** uma requisição sem cookie pede GET /api/auth/verify-email com o token alterado.
- **Então:**
  - a resposta é 401
  - o corpo traz o código INVALID_TOKEN
  - a conta de olga@example.com continua com e-mail não verificado
  - o banco continua com um registro de confirmação para essa conta

### Sigilo do link

#### API-SIGILO-01
- **Dado:** a conta pendente de pia@example.com, de nome Pia Torres, criada por POST /api/auth/sign-up/email, e o token T1 do link dela.
- **Quando:** uma requisição sem cookie pede GET /api/auth/verify-email?token=T1.
- **Então:**
  - nenhuma linha de log do serviço api escrita durante o item contém T1
  - nenhuma dessas linhas contém pia@example.com
  - nenhuma dessas linhas contém Pia Torres

## UI

Modo de verificação: navegador dirigido contra a SPA em execução no ambiente local, observando o conteúdo da página, os atributos dos campos, o estilo computado dos elementos, a URL e as requisições de rede, com o estado do PostgreSQL alterado onde o item pede e o serviço api parado no item de falha.

### Ativação pelo link

#### UI-ATIVACAO-01
- **Dado:** a conta pendente de sara.m@example.com criada por POST /api/auth/sign-up/email e o link dela.
- **Quando:** a pessoa abre o link no navegador.
- **Então:**
  - a página envia GET /api/auth/verify-email com o token do link e recebe 200
  - a tela diz que o e-mail foi confirmado
  - a tela tem um link ou botão "Entrar" para /entrar
  - a tela não mostra campo de e-mail nem o botão "Reenviar o link"

#### UI-ATIVACAO-02
- **Dado:** a conta de saulo@example.com criada por POST /api/auth/sign-up/email e já ativada pelo link dela.
- **Quando:** a pessoa abre o mesmo link no navegador.
- **Então:**
  - a tela diz que a conta já está confirmada
  - a tela tem um link ou botão "Entrar" para /entrar
  - a tela não mostra o botão "Reenviar o link"

### Link vencido

#### UI-VENCIDO-01
- **Dado:** a conta pendente de tais@example.com criada por POST /api/auth/sign-up/email, o link dela e o vencimento do link movido para 1 minuto antes de agora.
- **Quando:** a pessoa abre o link no navegador.
- **Então:**
  - a tela diz que o link expirou
  - a tela mostra o campo de e-mail com rótulo visível e o botão "Reenviar o link"
  - a tela não diz que o e-mail foi confirmado
  - a conta de tais@example.com continua com e-mail não verificado no banco

#### UI-REENVIO-01
- **Dado:** `janela-de-reenvio-livre`, a conta pendente de teo@example.com criada por POST /api/auth/sign-up/email, o vencimento do link dela movido para 1 minuto antes de agora e a tela de link expirado aberta por esse link.
- **Quando:** a pessoa preenche o e-mail teo@example.com e clica em "Reenviar o link".
- **Então:**
  - a página envia POST /api/auth/send-verification-email com o e-mail teo@example.com e recebe 200
  - a tela informa que um novo link foi enviado se o e-mail tiver conta pendente
  - a tela mostra o botão "Enviar para outro e-mail"
  - a tela não mostra o campo de e-mail
  - a página não envia uma segunda requisição a /api/auth/verify-email

#### UI-REENVIO-02
- **Dado:** `janela-de-reenvio-livre`, a conta pendente de tina@example.com criada por POST /api/auth/sign-up/email, o vencimento do link dela movido para 1 minuto antes de agora e a tela de link expirado aberta por esse link, já com o reenvio para tina@example.com feito pela tela e o aviso de link enviado na tela.
- **Quando:** a pessoa clica em "Enviar para outro e-mail".
- **Então:**
  - a tela mostra o campo de e-mail com rótulo visível e o valor tina@example.com
  - a tela mostra o botão "Reenviar o link"
  - a página não envia requisição a /api/auth/verify-email

### Link inválido

#### UI-INVALIDO-01
- **Dado:** a SPA e a API no ar.
- **Quando:** a pessoa abre /confirmar-email?token=abc no navegador.
- **Então:**
  - a tela diz que o link não vale
  - a tela mostra o campo de e-mail e o botão "Reenviar o link"
  - a tela não diz que o e-mail foi confirmado

#### UI-INVALIDO-02
- **Dado:** a SPA no ar.
- **Quando:** a pessoa abre /confirmar-email, sem o parâmetro token.
- **Então:**
  - a tela diz que o link não vale
  - a página não envia requisição a /api/auth/verify-email
  - a tela mostra o botão "Reenviar o link"

#### UI-INVALIDO-03
- **Dado:** `janela-de-reenvio-livre`, a conta pendente de ugo.r@example.com criada por POST /api/auth/sign-up/email, o link L1 do cadastro e um POST /api/auth/send-verification-email com o e-mail ugo.r@example.com já respondido com 200.
- **Quando:** a pessoa abre L1 no navegador.
- **Então:**
  - a tela diz que o link não vale
  - a tela mostra o campo de e-mail e o botão "Reenviar o link"
  - a conta de ugo.r@example.com continua com e-mail não verificado no banco

### Falha do servidor

#### UI-FALHA-01
- **Dado:** a conta pendente de vera.c@example.com criada por POST /api/auth/sign-up/email, o link dela e o serviço api parado.
- **Quando:** a pessoa abre o link no navegador.
- **Então:**
  - a tela mostra o aviso de que o servidor não respondeu
  - a tela não diz que o e-mail foi confirmado
  - a página não mostra a página de erro

#### UI-FALHA-02
- **Dado:** o serviço api parado.
- **Quando:** a pessoa abre a raiz da SPA no navegador.
- **Então:**
  - a página mostra que o servidor não respondeu
  - a página não mostra o texto "Nenhuma sessão aberta."

### Aparência

#### UI-VISUAL-01
- **Dado:** a conta pendente de wil@example.com criada por POST /api/auth/sign-up/email e o link dela, com a janela do navegador em 375px de largura.
- **Quando:** a pessoa abre o link no navegador.
- **Então:**
  - o "Entrar" tem fundo #000, texto #fff e raio de borda de 999px
  - o card da confirmação tem fundo #fff e raio de borda de 16px
  - a família de fonte computada do título começa por Inter Variable
  - a página não tem rolagem horizontal
  - a barra de navegação está visível acima do card

## Worker

Modo de verificação: reenvios feitos pela API em execução no ambiente local, seguidos da leitura da caixa de teste pela API REST do Mailpit e do estado do PostgreSQL.

### E-mail do reenvio

#### WRK-REENVIO-01
- **Dado:** `janela-de-reenvio-livre` e a conta pendente de rita@example.com criada por POST /api/auth/sign-up/email, com a mensagem do cadastro já na caixa.
- **Quando:** uma requisição sem cookie pede POST /api/auth/send-verification-email com o e-mail rita@example.com.
- **Então:**
  - em até 2 minutos a caixa tem exatamente duas mensagens para rita@example.com
  - a mais recente tem um link que começa com o WEB_ORIGIN do .env seguido de /confirmar-email?token=
  - o token desse link é diferente do token da mensagem do cadastro
  - o corpo da mais recente diz "O link vale por 24 horas."

#### WRK-REENVIO-02
- **Dado:** `janela-de-reenvio-livre` e a conta de raul@example.com criada por POST /api/auth/sign-up/email e já ativada pelo link dela, com a mensagem do cadastro na caixa.
- **Quando:** uma requisição sem cookie pede POST /api/auth/send-verification-email com o e-mail raul@example.com.
- **Então:**
  - a resposta é 200 com status verdadeiro
  - depois de 1 minuto a caixa continua com uma só mensagem para raul@example.com
  - o banco não tem registro de confirmação para essa conta

## E2E

Modo de verificação: navegador dirigido contra a SPA no ambiente local, seguido da leitura da caixa de teste pela API REST do Mailpit e do estado do PostgreSQL.

### Confirmação de ponta a ponta

#### E2E-CONFIRMACAO-01
- **Dado:** `janela-de-cadastro-livre` e nenhuma conta com o e-mail xenia.p@example.com.
- **Quando:** a pessoa cria a conta em /cadastro com nome Xênia Paz, e-mail xenia.p@example.com e senha Jornada123, espera o e-mail chegar, abre o link dele e depois abre o mesmo link de novo.
- **Então:**
  - na primeira abertura a tela diz que o e-mail foi confirmado
  - na segunda abertura a tela diz que a conta já está confirmada
  - o banco tem a conta de xenia.p@example.com com e-mail verificado
  - o banco não tem sessão para essa conta

#### E2E-INTEGRACAO-01
- **Dado:** `janela-de-cadastro-livre` e nenhuma conta com os e-mails yuri@example.com e yasmin@example.com.
- **Quando:** a pessoa cria em /cadastro a conta de yuri@example.com e a de yasmin@example.com, as duas com senha Jornada123, e abre só o link da mensagem que chegou para yuri@example.com.
- **Então:**
  - a tela diz que o e-mail foi confirmado
  - o banco tem a conta de yuri@example.com com e-mail verificado
  - o banco tem a conta de yasmin@example.com com e-mail não verificado

#### E2E-REENVIO-01
- **Dado:** `janela-de-cadastro-livre`, `janela-de-reenvio-livre` e nenhuma conta com o e-mail zeca@example.com.
- **Quando:** a pessoa cria a conta em /cadastro com o e-mail zeca@example.com, o vencimento do link do cadastro é movido para 1 minuto antes de agora, ela abre esse link, pede o reenvio pela tela com o e-mail zeca@example.com e abre o link da mensagem nova.
- **Então:**
  - o primeiro link mostra que expirou e oferece o reenvio
  - em até 2 minutos a caixa tem a mensagem nova para zeca@example.com com um token diferente do primeiro
  - o link novo mostra que o e-mail foi confirmado
  - o banco tem a conta de zeca@example.com com e-mail verificado
