# Contrato: RF-005 Recuperar senha

*Gerado pela skill spec-writer. Edições à mão são sobrescritas na regeneração.*

## Pré-requisitos

### Serviços em execução
- API NestJS (com o worker do Módulo E-mail no mesmo processo), SPA Web, PostgreSQL, Redis (serviço Valkey) e Mailpit no Docker Compose, salvo onde o item para um deles.

### Estado persistido
- `conta-ativa`: conta com o e-mail e o nome que o item indica, papel usuário, e-mail verificado, sem banimento, credencial de senha Antiga123, nenhuma sessão e nenhum registro de recuperação. Usado por: API-PEDIDO-01, API-PEDIDO-02, API-PEDIDO-03, API-PEDIDO-04, API-PEDIDO-05, API-LIMPEZA-01, API-REPEDIDO-01, API-REPEDIDO-02, API-CHECAGEM-01, API-CHECAGEM-02, API-CHECAGEM-03, API-TROCA-01, API-TROCA-02, API-TROCA-03, API-TROCA-04, API-USO-01, API-USO-02, API-USO-03, API-REGRA-01, API-REGRA-02, API-REGRA-03, API-SESSAO-01, API-SESSAO-02, API-SIGILO-01, API-SIGILO-02, WRK-EMAIL-01, WRK-SIGILO-01, WRK-SIGILO-02, UI-PEDIDO-01, UI-REDEFINIR-01, UI-REDEFINIR-02, UI-REDEFINIR-03, UI-REDEFINIR-04, UI-INVALIDO-01, UI-INVALIDO-02, UI-INVALIDO-04, UI-VISUAL-01, E2E-RECUPERACAO-01
- `janela-de-recuperacao-livre`: nenhum contador de rate limit de pedido de recuperação no Valkey para o IP de onde o item envia o pedido. Usado por: API-PEDIDO-05, UI-PEDIDO-01, UI-PEDIDO-02, E2E-RECUPERACAO-01, E2E-INTEGRACAO-01
- `janela-de-cadastro-livre`: nenhum contador de rate limit de cadastro no Valkey para o IP de onde o item envia o cadastro. Usado por: API-TROCA-05, E2E-INTEGRACAO-01

### Configuração
- Arquivo `.env` copiado do `.env.example`, com NODE_ENV igual a development e TRUSTED_PROXIES vazia, e o `make db-setup` aplicado.
- Toda requisição de cadastro ou de pedido de recuperação feita fora do navegador leva um cabeçalho X-Forwarded-For com um IP de documentação (203.0.113.0/24) exclusivo do item, para o contador de rate limit de um item não afetar outro.
- Toda requisição POST /api/auth/sign-in/email feita fora do navegador leva um cabeçalho X-Forwarded-For com um IP de documentação (198.51.100.0/24) exclusivo daquela requisição, para o limite de entradas da biblioteca não afetar o item.
- O link de recuperação de uma conta é o da mensagem mais recente de assunto "Redefina sua senha" para o e-mail dela na caixa do Mailpit; o token é o valor do parâmetro token desse link.
- O registro de recuperação de uma conta é a linha da tabela verification cujo identifier começa com reset-password: e cujo value é o id da conta; mover o vencimento do link é alterar o expiresAt desse registro.
- O job reset-password de uma conta é o job da fila email.send de nome reset-password cujos dados têm o userId igual ao id da conta.
- Uma sessão aberta antes é a que um POST /api/auth/sign-in/email com o e-mail e a senha da conta abriu, guardada pelo cookie de sessão da resposta.

### Dependências externas
- DEP-1 serviço de envio de e-mail, simulado pelo Mailpit do Compose: os e-mails são lidos pela API REST dele, em até 2 minutos depois do envio, e o serviço é parado pelo Compose no item que o pede.

## Gates de qualidade

Cada gate precisa passar para a feature ser considerada pronta.

- **check**: `make check`. Todas as verificações do repositório passam, as mesmas da CI, com lint, regra de dependência e testes da stack.
- **build**: `make build`. Os artefatos de API, SPA e Contratos são gerados sem erro.

## Manifesto de cobertura

| Critério de aceitação | Coberto por |
| --- | --- |
| E-mail com conta e e-mail sem conta recebem a mesma resposta na tela. | API-PEDIDO-02, API-PEDIDO-03, API-PEDIDO-05, WRK-EMAIL-02, UI-PEDIDO-01, UI-PEDIDO-02, UI-PEDIDO-03, UI-FALHA-01 |
| Link aberto dentro de 1 hora troca a senha; a senha antiga deixa de entrar e a nova entra. | API-PEDIDO-01, API-PEDIDO-04, API-CHECAGEM-01, API-TROCA-01, API-TROCA-02, API-TROCA-03, API-TROCA-04, API-TROCA-05, API-REGRA-01, API-REGRA-02, API-REGRA-03, API-SIGILO-01, API-SIGILO-02, WRK-EMAIL-01, WRK-SIGILO-01, WRK-SIGILO-02, UI-REDEFINIR-01, UI-REDEFINIR-02, UI-REDEFINIR-03, UI-REDEFINIR-04, UI-FALHA-02, UI-VISUAL-01, E2E-RECUPERACAO-01 |
| Link usado uma vez ou aberto depois de 1 hora não troca a senha. | API-LIMPEZA-01, API-REPEDIDO-01, API-REPEDIDO-02, API-CHECAGEM-02, API-CHECAGEM-03, API-CHECAGEM-04, API-USO-01, API-USO-02, API-USO-03, UI-INVALIDO-01, UI-INVALIDO-02, UI-INVALIDO-03, UI-INVALIDO-04 |
| Depois da troca, sessões abertas antes dela deixam de ter acesso. | API-SESSAO-01, API-SESSAO-02, E2E-RECUPERACAO-01 |
| RF-001 → RF-005: o e-mail cadastrado recebe o link de recuperação e a nova senha passa a valer para aquela conta. | E2E-INTEGRACAO-01, WRK-EMAIL-01 |

## API HTTP

Modo de verificação: requisições HTTP contra a API em execução no ambiente local, inspecionando status, cabeçalhos e corpo, o estado do PostgreSQL (alterado só onde o item pede) e as linhas de log do serviço api escritas durante o item, com o serviço valkey parado e religado onde o item pede.

### Pedido de recuperação

#### API-PEDIDO-01
- **Dado:** `conta-ativa` de rosa@example.com, nome Rosa Lima.
- **Quando:** uma requisição sem cookie pede POST /api/auth/request-password-reset com o e-mail rosa@example.com.
- **Então:**
  - a resposta é 200 com status verdadeiro
  - o banco tem exatamente um registro de recuperação para a conta de rosa@example.com
  - o expiresAt desse registro fica entre 59 e 61 minutos depois da resposta
  - o identifier e o value desse registro não contêm o token do link que chegou para rosa@example.com

#### API-PEDIDO-02
- **Dado:** `conta-ativa` de rui@example.com, um POST /api/auth/request-password-reset com o e-mail rui@example.com já respondido com 200 e o corpo C, e nenhuma conta com o e-mail sem.conta@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/request-password-reset com o e-mail sem.conta@example.com.
- **Então:**
  - a resposta é 200
  - o corpo é igual a C
  - o banco não tem conta com o e-mail sem.conta@example.com
  - o banco não ganhou registro de recuperação durante o item

#### API-PEDIDO-03
- **Dado:** `conta-ativa` de sara@example.com, um POST /api/auth/request-password-reset com o e-mail sara@example.com já respondido com 200 e o corpo C, o registro de recuperação R1 desse pedido e, depois, o serviço valkey parado.
- **Quando:** uma requisição sem cookie pede POST /api/auth/request-password-reset com o e-mail sara@example.com.
- **Então:**
  - a resposta é 200
  - o corpo é igual a C
  - o banco tem exatamente um registro de recuperação para a conta de sara@example.com
  - esse registro é o R1

#### API-PEDIDO-04
- **Dado:** `conta-ativa` de saulo@example.com, o token T1 do link de um pedido de recuperação já respondido com 200, um segundo pedido com o e-mail saulo@example.com já respondido com 200 com o serviço valkey parado e, depois, o serviço valkey religado.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T1 e a senha nova Nova12345.
- **Então:**
  - a resposta é 200 com status verdadeiro
  - o banco não tem registro de recuperação para a conta de saulo@example.com

#### API-PEDIDO-05
- **Dado:** `janela-de-recuperacao-livre`, `conta-ativa` de tito@example.com e cinco POST /api/auth/request-password-reset com o e-mail tito@example.com já respondidos com 200 nos últimos 60 segundos, todos do mesmo IP.
- **Quando:** uma requisição sem cookie do mesmo IP pede POST /api/auth/request-password-reset com o e-mail tito@example.com.
- **Então:**
  - a resposta é 429
  - a resposta traz o cabeçalho X-Retry-After

### Limpeza dos registros vencidos

#### API-LIMPEZA-01
- **Dado:** `conta-ativa` de hugo@example.com com um pedido de recuperação já respondido com 200 e o vencimento do link dele movido para 1 minuto antes de agora, e `conta-ativa` de iris@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/request-password-reset com o e-mail iris@example.com.
- **Então:**
  - o banco não tem registro de recuperação para a conta de hugo@example.com
  - o banco tem exatamente um registro de recuperação para a conta de iris@example.com

### Novo pedido invalida os anteriores

#### API-REPEDIDO-01
- **Dado:** `conta-ativa` de tais@example.com, o token T1 do link de um pedido de recuperação já respondido com 200 e um segundo pedido com o e-mail tais@example.com já respondido com 200, com a segunda mensagem já na caixa.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T1 e a senha nova Nova12345.
- **Então:**
  - a resposta é 400
  - o corpo traz o código INVALID_TOKEN
  - o hash da credencial da conta de tais@example.com é o mesmo de antes do item
  - o banco tem exatamente um registro de recuperação para essa conta

#### API-REPEDIDO-02
- **Dado:** `conta-ativa` de teo@example.com, o token T1 do link de um pedido de recuperação já respondido com 200, um segundo pedido com o e-mail teo@example.com já respondido com 200 e o token T2 do link que chegou depois dele.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T2 e a senha nova Nova12345.
- **Então:**
  - a resposta é 200 com status verdadeiro
  - T2 é diferente de T1
  - o banco não tem registro de recuperação para a conta de teo@example.com

### Checagem do link

#### API-CHECAGEM-01
- **Dado:** `conta-ativa` de ugo@example.com e o token T1 do link de um pedido de recuperação já respondido com 200.
- **Quando:** uma requisição sem cookie pede GET /api/auth/reset-password-status?token=T1.
- **Então:**
  - a resposta é 200
  - o corpo traz valid verdadeiro
  - o banco continua com um registro de recuperação para a conta de ugo@example.com

#### API-CHECAGEM-02
- **Dado:** `conta-ativa` de una@example.com, o token T1 do link de um pedido de recuperação já respondido com 200 e o vencimento do link movido para 1 minuto antes de agora.
- **Quando:** uma requisição sem cookie pede GET /api/auth/reset-password-status?token=T1.
- **Então:**
  - a resposta é 400
  - o corpo traz o código INVALID_TOKEN

#### API-CHECAGEM-03
- **Dado:** `conta-ativa` de uri@example.com, o token T1 do link de um pedido de recuperação e um POST /api/auth/reset-password com T1 e a senha nova Nova12345 já respondido com 200.
- **Quando:** uma requisição sem cookie pede GET /api/auth/reset-password-status?token=T1.
- **Então:**
  - a resposta é 400
  - o corpo traz o código INVALID_TOKEN

#### API-CHECAGEM-04
- **Dado:** a API no ar.
- **Quando:** uma requisição sem cookie pede GET /api/auth/reset-password-status?token=abc.
- **Então:**
  - a resposta é 400
  - o corpo traz o código INVALID_TOKEN

### Troca da senha

#### API-TROCA-01
- **Dado:** `conta-ativa` de vitor@example.com e o token T1 do link de um pedido de recuperação já respondido com 200.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T1 e a senha nova Nova12345.
- **Então:**
  - a resposta é 200 com status verdadeiro
  - a resposta não define cookie de sessão
  - o hash da credencial da conta de vitor@example.com é diferente do de antes do item
  - o banco não tem registro de recuperação para essa conta

#### API-TROCA-02
- **Dado:** `conta-ativa` de vera@example.com com a senha trocada para Nova12345 por POST /api/auth/reset-password com o token do link de um pedido de recuperação.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-in/email com o e-mail vera@example.com e a senha Antiga123.
- **Então:**
  - a resposta é 401
  - o corpo traz o código INVALID_EMAIL_OR_PASSWORD
  - a resposta não define cookie de sessão

#### API-TROCA-03
- **Dado:** `conta-ativa` de vilma@example.com com a senha trocada para Nova12345 por POST /api/auth/reset-password com o token do link de um pedido de recuperação.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-in/email com o e-mail vilma@example.com e a senha Nova12345.
- **Então:**
  - a resposta é 200
  - a resposta define o cookie de sessão
  - o banco tem uma sessão para a conta de vilma@example.com

#### API-TROCA-04
- **Dado:** `conta-ativa` de valter@example.com, o token T1 do link de um pedido de recuperação já respondido com 200 e o vencimento do link movido para 1 minuto depois de agora.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T1 e a senha nova Nova12345.
- **Então:**
  - a resposta é 200 com status verdadeiro
  - o hash da credencial da conta de valter@example.com é diferente do de antes do item

#### API-TROCA-05
- **Dado:** `janela-de-cadastro-livre`, a conta pendente de wanda@example.com criada por POST /api/auth/sign-up/email com nome Wanda Reis e senha Segura123, e o token T1 do link de um pedido de recuperação com o e-mail wanda@example.com já respondido com 200.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T1 e a senha nova Nova12345.
- **Então:**
  - a resposta é 200 com status verdadeiro
  - o hash da credencial da conta de wanda@example.com é diferente do de antes do item
  - a conta continua com e-mail não verificado

### Uso único e vencimento

#### API-USO-01
- **Dado:** `conta-ativa` de xico@example.com, o token T1 do link de um pedido de recuperação e um POST /api/auth/reset-password com T1 e a senha nova Nova12345 já respondido com 200.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T1 e a senha nova Outra12345.
- **Então:**
  - a resposta é 400
  - o corpo traz o código INVALID_TOKEN
  - o hash da credencial da conta de xico@example.com é o mesmo de antes do item

#### API-USO-02
- **Dado:** `conta-ativa` de xena@example.com, o token T1 do link de um pedido de recuperação já respondido com 200 e o vencimento do link movido para 1 minuto antes de agora.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T1 e a senha nova Nova12345.
- **Então:**
  - a resposta é 400
  - o corpo traz o código INVALID_TOKEN
  - o hash da credencial da conta de xena@example.com é o mesmo de antes do item

#### API-USO-03
- **Dado:** `conta-ativa` de ximena@example.com e o token T1 do link de um pedido de recuperação já respondido com 200.
- **Quando:** duas requisições sem cookie pedem ao mesmo tempo POST /api/auth/reset-password com o token T1, uma com a senha nova Nova12345 e a outra com Outra12345.
- **Então:**
  - uma resposta é 200 e a outra é 400 com o código INVALID_TOKEN
  - o banco não tem registro de recuperação para a conta de ximena@example.com
  - só a senha da requisição que recebeu 200 entra por POST /api/auth/sign-in/email

### Regra da nova senha

#### API-REGRA-01
- **Dado:** `conta-ativa` de yago@example.com e o token T1 do link de um pedido de recuperação já respondido com 200.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T1 e a senha nova semnumero.
- **Então:**
  - a resposta é 400
  - o corpo traz o código VALIDATION_ERROR e o campo newPassword com a mensagem "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número."
  - o hash da credencial da conta de yago@example.com é o mesmo de antes do item
  - o banco continua com um registro de recuperação para essa conta

#### API-REGRA-02
- **Dado:** `conta-ativa` de yan@example.com e o token T1 do link de um pedido de recuperação já respondido com 200.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T1 e a senha nova 12345678.
- **Então:**
  - a resposta é 400
  - o corpo traz o código VALIDATION_ERROR e o campo newPassword
  - o hash da credencial da conta de yan@example.com é o mesmo de antes do item

#### API-REGRA-03
- **Dado:** `conta-ativa` de yvone@example.com e o token T1 do link de um pedido de recuperação já respondido com 200.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T1 e a senha nova Nova123, de 7 caracteres.
- **Então:**
  - a resposta é 400
  - o corpo traz o código VALIDATION_ERROR e o campo newPassword
  - o hash da credencial da conta de yvone@example.com é o mesmo de antes do item

### Sessões depois da troca

#### API-SESSAO-01
- **Dado:** `conta-ativa` de zeno@example.com com duas sessões abertas antes, de cookies C1 e C2, e o token T1 do link de um pedido de recuperação já respondido com 200.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T1 e a senha nova Nova12345.
- **Então:**
  - a resposta é 200 com status verdadeiro
  - o banco não tem sessão para a conta de zeno@example.com

#### API-SESSAO-02
- **Dado:** `conta-ativa` de zuleica@example.com com uma sessão aberta antes, de cookie C1, e a senha trocada para Nova12345 por POST /api/auth/reset-password com o token do link de um pedido de recuperação feito depois dessa sessão.
- **Quando:** uma requisição com o cookie C1 pede GET /api/v1/session.
- **Então:**
  - a resposta é 401
  - o corpo não traz o id da conta de zuleica@example.com

### Sigilo

#### API-SIGILO-01
- **Dado:** `conta-ativa` de bia@example.com, nome Bia Nunes.
- **Quando:** uma requisição sem cookie pede POST /api/auth/request-password-reset com o e-mail bia@example.com.
- **Então:**
  - nenhuma linha de log do serviço api escrita durante o item contém bia@example.com
  - nenhuma dessas linhas contém Bia Nunes
  - nenhuma dessas linhas contém o token do link que chegou para bia@example.com

#### API-SIGILO-02
- **Dado:** `conta-ativa` de bruno@example.com, nome Bruno Reis, e o token T1 do link de um pedido de recuperação já respondido com 200.
- **Quando:** uma requisição sem cookie pede POST /api/auth/reset-password com o token T1 e a senha nova Sigilo12345.
- **Então:**
  - nenhuma linha de log do serviço api escrita durante o item contém T1
  - nenhuma dessas linhas contém Sigilo12345
  - nenhuma dessas linhas contém bruno@example.com
  - nenhuma dessas linhas contém Bruno Reis

## UI

Modo de verificação: navegador dirigido contra a SPA em execução no ambiente local, observando o conteúdo da página, os atributos dos campos, o estilo computado dos elementos, a URL e as requisições de rede, com o estado do PostgreSQL alterado onde o item pede e o serviço api parado nos itens de falha.

### Pedido de recuperação

#### UI-PEDIDO-01
- **Dado:** `janela-de-recuperacao-livre` e `conta-ativa` de alice.r@example.com.
- **Quando:** a pessoa abre /recuperar-senha, preenche o e-mail alice.r@example.com e clica em "Enviar o link".
- **Então:**
  - a página envia POST /api/auth/request-password-reset com o e-mail alice.r@example.com e recebe 200
  - a tela mostra "Se o e-mail tiver conta, enviamos o link."
  - a tela mostra o botão "Enviar para outro e-mail"
  - a tela não mostra o campo de e-mail

#### UI-PEDIDO-02
- **Dado:** `janela-de-recuperacao-livre` e nenhuma conta com o e-mail beto.n@example.com.
- **Quando:** a pessoa abre /recuperar-senha, preenche o e-mail beto.n@example.com e clica em "Enviar o link".
- **Então:**
  - a página envia POST /api/auth/request-password-reset com o e-mail beto.n@example.com e recebe 200
  - a tela mostra "Se o e-mail tiver conta, enviamos o link."
  - a tela mostra o botão "Enviar para outro e-mail"
  - a tela não mostra o campo de e-mail

#### UI-PEDIDO-03
- **Dado:** a SPA no ar.
- **Quando:** a pessoa abre /recuperar-senha, preenche o e-mail abc e clica em "Enviar o link".
- **Então:**
  - a página não envia requisição a /api/auth/request-password-reset
  - a tela mostra "Informe um e-mail válido." abaixo do campo de e-mail
  - o campo de e-mail tem aria-invalid verdadeiro

### Nova senha

#### UI-REDEFINIR-01
- **Dado:** `conta-ativa` de carla@example.com e o link de um pedido de recuperação já respondido com 200.
- **Quando:** a pessoa abre o link no navegador.
- **Então:**
  - a página envia GET /api/auth/reset-password-status com o token do link e recebe 200
  - a tela mostra os campos "Nova senha" e "Confirme a nova senha" com rótulos visíveis e tipo password
  - a tela mostra o botão "Salvar a nova senha"

#### UI-REDEFINIR-02
- **Dado:** `conta-ativa` de davi@example.com e a tela aberta pelo link de um pedido de recuperação já respondido com 200.
- **Quando:** a pessoa preenche Nova12345 nos dois campos e clica em "Salvar a nova senha".
- **Então:**
  - a página envia POST /api/auth/reset-password e recebe 200
  - a tela diz "Senha alterada"
  - a tela tem um link ou botão "Entrar" para /entrar
  - a tela não mostra os campos de senha
  - a página não envia uma segunda requisição a /api/auth/reset-password-status

#### UI-REDEFINIR-03
- **Dado:** `conta-ativa` de dora@example.com e a tela aberta pelo link de um pedido de recuperação já respondido com 200.
- **Quando:** a pessoa preenche Nova12345 em "Nova senha", Nova54321 em "Confirme a nova senha" e clica em "Salvar a nova senha".
- **Então:**
  - a página não envia requisição a /api/auth/reset-password
  - a tela mostra "As senhas não conferem." abaixo do campo "Confirme a nova senha"
  - o campo "Confirme a nova senha" tem aria-invalid verdadeiro

#### UI-REDEFINIR-04
- **Dado:** `conta-ativa` de duda@example.com e a tela aberta pelo link de um pedido de recuperação já respondido com 200.
- **Quando:** a pessoa preenche semnumero nos dois campos e clica em "Salvar a nova senha".
- **Então:**
  - a página não envia requisição a /api/auth/reset-password
  - a tela mostra "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." abaixo do campo "Nova senha"
  - a tela continua com os dois campos

### Link que não vale

#### UI-INVALIDO-01
- **Dado:** `conta-ativa` de enzo@example.com, o link de um pedido de recuperação já respondido com 200 e o vencimento do link movido para 1 minuto antes de agora.
- **Quando:** a pessoa abre o link no navegador.
- **Então:**
  - a tela diz "Link inválido"
  - a tela tem um link ou botão "Pedir outro link" para /recuperar-senha
  - a tela não mostra os campos de senha

#### UI-INVALIDO-02
- **Dado:** `conta-ativa` de eva@example.com, o link L1 de um pedido de recuperação e a senha já trocada por POST /api/auth/reset-password com o token de L1.
- **Quando:** a pessoa abre L1 no navegador.
- **Então:**
  - a tela diz "Link inválido"
  - a tela tem um link ou botão "Pedir outro link" para /recuperar-senha
  - a tela não mostra os campos de senha

#### UI-INVALIDO-03
- **Dado:** a SPA no ar.
- **Quando:** a pessoa abre /redefinir-senha, sem o parâmetro token.
- **Então:**
  - a tela diz "Link inválido"
  - a página não envia requisição a /api/auth/reset-password-status
  - a tela tem um link ou botão "Pedir outro link" para /recuperar-senha

#### UI-INVALIDO-04
- **Dado:** `conta-ativa` de ema@example.com, a tela aberta pelo link L1 de um pedido de recuperação, com os campos de senha à vista, e depois um segundo pedido com o e-mail ema@example.com já respondido com 200.
- **Quando:** a pessoa preenche Nova12345 nos dois campos e clica em "Salvar a nova senha".
- **Então:**
  - a página envia POST /api/auth/reset-password e recebe 400
  - a tela diz "Link inválido"
  - a tela tem um link ou botão "Pedir outro link" para /recuperar-senha
  - a tela não diz "Senha alterada"

### Falha do servidor

#### UI-FALHA-01
- **Dado:** a tela /recuperar-senha aberta e, depois, o serviço api parado.
- **Quando:** a pessoa preenche o e-mail fabia@example.com e clica em "Enviar o link".
- **Então:**
  - a tela mostra "O servidor não respondeu. Tente de novo."
  - a tela não mostra "Se o e-mail tiver conta, enviamos o link."
  - a página não mostra a página de erro

#### UI-FALHA-02
- **Dado:** o serviço api parado.
- **Quando:** a pessoa abre /redefinir-senha?token=abc no navegador.
- **Então:**
  - a tela mostra "O servidor não respondeu. Tente de novo."
  - a tela não mostra os campos de senha
  - a página não mostra a página de erro

### Aparência

#### UI-VISUAL-01
- **Dado:** `conta-ativa` de gil@example.com e o link de um pedido de recuperação já respondido com 200, com a janela do navegador em 375px de largura.
- **Quando:** a pessoa abre o link no navegador.
- **Então:**
  - o "Salvar a nova senha" tem fundo #000, texto #fff e raio de borda de 999px
  - o card da redefinição tem fundo #fff e raio de borda de 16px
  - a família de fonte computada do título começa por Inter Variable
  - a página não tem rolagem horizontal
  - a barra de navegação está visível acima do card

## Worker

Modo de verificação: pedidos feitos pela API em execução no ambiente local, seguidos da leitura da caixa de teste pela API REST do Mailpit e das chaves da fila email.send no Valkey, com o serviço mailpit parado onde o item pede.

### E-mail de recuperação

#### WRK-EMAIL-01
- **Dado:** `conta-ativa` de zilda@example.com, nome Zilda Rocha.
- **Quando:** uma requisição sem cookie pede POST /api/auth/request-password-reset com o e-mail zilda@example.com.
- **Então:**
  - em até 2 minutos a caixa tem uma mensagem para zilda@example.com com o assunto "Redefina sua senha"
  - essa mensagem tem um link que começa com o WEB_ORIGIN do .env seguido de /redefinir-senha?token=
  - o corpo dela diz "Olá, Zilda Rocha!"
  - o corpo dela diz "O link vale por 1 hora e só pode ser usado uma vez."

#### WRK-EMAIL-02
- **Dado:** nenhuma conta com o e-mail ninguem@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/request-password-reset com o e-mail ninguem@example.com.
- **Então:**
  - a resposta é 200 com status verdadeiro
  - depois de 1 minuto a caixa não tem mensagem para ninguem@example.com

### Sigilo do link na fila

#### WRK-SIGILO-01
- **Dado:** `conta-ativa` de wilson@example.com, nome Wilson Baptista.
- **Quando:** uma requisição sem cookie pede POST /api/auth/request-password-reset com o e-mail wilson@example.com.
- **Então:**
  - em até 2 minutos a caixa tem uma mensagem para wilson@example.com com o assunto "Redefina sua senha"
  - o job reset-password dessa conta fica concluído na fila email.send
  - os dados desse job concluído têm só os campos type e userId
  - nenhum campo desse job no Valkey contém o token do link da mensagem

#### WRK-SIGILO-02
- **Dado:** `conta-ativa` de yuri@example.com, nome Yuri Matos, e o serviço mailpit parado durante todo o item.
- **Quando:** uma requisição sem cookie pede POST /api/auth/request-password-reset com o e-mail yuri@example.com.
- **Então:**
  - em até 3 minutos o job reset-password dessa conta fica no estado falho na fila email.send
  - o job registra 5 tentativas
  - os dados desse job falho têm só os campos type e userId
  - nenhum campo desse job no Valkey contém o trecho token=

## E2E

Modo de verificação: navegador dirigido contra a SPA no ambiente local, seguido da leitura da caixa de teste pela API REST do Mailpit, de requisições HTTP à API e do estado do PostgreSQL.

### Recuperação de ponta a ponta

#### E2E-RECUPERACAO-01
- **Dado:** `janela-de-recuperacao-livre` e `conta-ativa` de elisa.m@example.com, com uma sessão aberta antes, de cookie C1.
- **Quando:** a pessoa abre /recuperar-senha, pede o link para elisa.m@example.com, espera o e-mail chegar, abre o link dele e salva a nova senha Jornada456 nos dois campos.
- **Então:**
  - a tela diz "Senha alterada"
  - POST /api/auth/sign-in/email com elisa.m@example.com e Jornada456 responde 200
  - POST /api/auth/sign-in/email com elisa.m@example.com e Antiga123 responde 401
  - GET /api/v1/session com o cookie C1 responde 401

#### E2E-INTEGRACAO-01
- **Dado:** `janela-de-cadastro-livre`, `janela-de-recuperacao-livre` e nenhuma conta com os e-mails fabio@example.com e gabi@example.com.
- **Quando:** a pessoa cria em /cadastro a conta de fabio@example.com e a de gabi@example.com, as duas com senha Jornada123, as duas são marcadas com e-mail verificado no banco, e ela pede em /recuperar-senha o link para fabio@example.com, abre o link do e-mail que chegou para ele e salva a nova senha Jornada789.
- **Então:**
  - a caixa tem uma mensagem "Redefina sua senha" para fabio@example.com e nenhuma para gabi@example.com
  - POST /api/auth/sign-in/email com fabio@example.com e Jornada789 responde 200
  - POST /api/auth/sign-in/email com fabio@example.com e Jornada123 responde 401
  - POST /api/auth/sign-in/email com gabi@example.com e Jornada123 responde 200
