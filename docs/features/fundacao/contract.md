# Contrato: fundação

*Gerado pela skill spec-writer. Edições à mão são sobrescritas na regeneração.*

## Pré-requisitos

### Serviços em execução
- API NestJS, SPA Web, PostgreSQL, Redis (serviço Valkey) e Mailpit no Docker Compose, salvo onde o item para um deles.

### Estado persistido
- `admin-inicial`: conta com o e-mail de ADMIN_EMAIL, papel admin, e-mail verificado, sem banimento e credencial de senha igual a ADMIN_PASSWORD. Usado por: CLI-ADMIN-02, CLI-LOGS-03, API-ADMIN-01
- `sessao-admin`: sessão válida da conta `admin-inicial`, com o cookie de sessão correspondente. Usado por: API-BORDA-04, UI-INICIO-02
- `conta-comum-com-email-do-admin`: conta com o e-mail de ADMIN_EMAIL, sem papel admin, e-mail não verificado e credencial de senha diferente de ADMIN_PASSWORD. Usado por: CLI-ADMIN-04
- `admin-banido`: conta com o e-mail de ADMIN_EMAIL, papel admin, e-mail verificado, banida sem data de expiração e credencial de senha igual a ADMIN_PASSWORD. Usado por: CLI-ADMIN-05

### Configuração
- Arquivo `.env` copiado do `.env.example`, com ADMIN_EMAIL e ADMIN_PASSWORD preenchidos com uma senha de 8 ou mais caracteres com letra e número, NODE_ENV igual a development e OTEL_EXPORTER_OTLP_ENDPOINT ausente, salvo onde o item diz outra coisa.
- OTEL_EXPORTER_OTLP_PROTOCOL igual a http/json só nos itens que o dizem, para o receptor local conseguir ler os atributos dos spans.
- Docker com Compose v2, shellcheck, actionlint, gitleaks e python3 instalados na máquina.

### Dependências externas
- Coletor OTLP do destino, simulado por um receptor HTTP local que aceita qualquer requisição e registra método, caminho, horário e corpo.

## Gates de qualidade

Cada gate precisa passar para a feature ser considerada pronta.

- **check**: `make check`. Todas as verificações do repositório passam, as mesmas da CI, agora com lint e testes da stack.
- **build**: `make build`. Os artefatos de API, SPA e Contratos são gerados sem erro.

## Manifesto de cobertura

| Critério de aceitação | Coberto por |
| --- | --- |
| Monorepo: workspaces do pnpm 12 orquestrados pelo Turborepo, com apps/api, apps/web e packages/contracts, Node 26 e TypeScript 6 (ADR-0002, ADR-0012, ADR-0013, ADR-0020). | CLI-MONOREPO-01 |
| Scripts do contrato da stack: scripts/lint.sh, scripts/format.sh, scripts/test.sh e scripts/build.sh delegando ao Turborepo (ADR-0002). | CLI-STACK-01, CLI-STACK-02, CLI-STACK-03, CLI-STACK-04, CLI-STACK-05 |
| Ambiente local: Docker Compose com api, web, postgres, valkey e mailpit, com o código montado e hot reload (ADR-0006, ADR-0014, ADR-0016). | CLI-AMBIENTE-01, CLI-AMBIENTE-02, CLI-AMBIENTE-03, UI-RECARGA-01 |
| Configuração e segredos: .env.example versionado e validação das variáveis na subida da API, que falha se faltar alguma (HLD, Gestão de segredos). | CLI-CONFIG-01, CLI-CONFIG-02, CLI-CONFIG-03 |
| Banco: PostgreSQL 18 com Prisma 7 e a migração inicial com as tabelas do Better Auth e os campos do plugin admin (ADR-0007, ADR-0008, ADR-0010). | CLI-BANCO-01, CLI-BANCO-02 |
| Preparo do banco: alvo make db-setup que aplica as migrações e cria o primeiro admin a partir do .env, de forma idempotente (PRD, Decisão primeiro admin criado na instalação). | CLI-ADMIN-01, CLI-ADMIN-02, CLI-ADMIN-03, CLI-ADMIN-04, CLI-ADMIN-05, CLI-ADMIN-06 |
| Autenticação na borda: Better Auth montado em /api/auth no Módulo Contas, com o guard global que recusa requisição sem sessão (ADR-0010). | API-BORDA-01, API-BORDA-02, API-BORDA-03, API-BORDA-04, API-BORDA-05, API-ADMIN-01, API-CORS-01, API-CORS-02 |
| Saúde: rota anônima de health check que informa o estado do PostgreSQL e do Valkey (HLD, Observabilidade). | API-SAUDE-01, API-SAUDE-02, API-SAUDE-03 |
| Logs: nestjs-pino com JSON por linha, requestId único e redação de dados pessoais (ADR-0018). | CLI-LOGS-01, CLI-LOGS-02, CLI-LOGS-03, CLI-LOGS-04 |
| Métricas e tracing: OpenTelemetry carregado antes da aplicação e exportando por OTLP só com endpoint configurado (ADR-0019). | CLI-OTEL-01, CLI-OTEL-02, CLI-OTEL-03 |
| Documento OpenAPI em /api/docs, publicado só fora de produção (ADR-0020). | API-DOCS-01, API-DOCS-02, API-DOCS-03 |
| SPA Web: Vite com React Router em modo data, rota inicial que lê a sessão pela API e consumo do pacote Contratos (ADR-0004, ADR-0012). | CLI-MONOREPO-02, UI-INICIO-01, UI-INICIO-02, UI-INICIO-03, UI-INICIO-04 |
| Imagens Docker multi-stage da API e da SPA com turbo prune (ADR-0005). | CLI-IMAGEM-01, CLI-IMAGEM-02, CLI-IMAGEM-03 |
| CI: o workflow instala o que o make check passa a exigir, com actions fixadas por SHA (HLD, Ambiente de implantação). | CLI-CI-01, CLI-CI-02 |
| Regra de dependência na API: Módulo Contas nas camadas da Clean Architecture e dependency-cruiser no lint de apps/api barrando import entre camadas, entre módulos e ciclos (ADR-0025, ADR-0026). | CLI-CAMADAS-01, CLI-CAMADAS-02, CLI-CAMADAS-03, CLI-CAMADAS-04, CLI-CAMADAS-05, CLI-CAMADAS-06, CLI-CAMADAS-07, CLI-CAMADAS-08 |

## API HTTP

Modo de verificação: requisições HTTP contra a API em execução no ambiente local, inspecionando status, cabeçalhos e corpo, e o estado do banco quando o item o cita.

### Saúde do sistema

#### API-SAUDE-01
- **Dado:** o ambiente no ar com todos os serviços.
- **Quando:** uma requisição sem cookie pede GET /api/health.
- **Então:**
  - a resposta é 200
  - o corpo informa status ok
  - o corpo informa postgres up e valkey up

#### API-SAUDE-02
- **Dado:** o ambiente no ar com o serviço valkey parado.
- **Quando:** uma requisição sem cookie pede GET /api/health.
- **Então:**
  - a resposta é 503
  - o corpo informa valkey down
  - o corpo informa postgres up

#### API-SAUDE-03
- **Dado:** o ambiente no ar com o serviço postgres parado.
- **Quando:** uma requisição sem cookie pede GET /api/health.
- **Então:**
  - a resposta é 503
  - o corpo informa postgres down

### Borda de autenticação

#### API-BORDA-01
- **Dado:** o ambiente no ar.
- **Quando:** uma requisição sem cookie pede GET /api/auth/ok.
- **Então:**
  - a resposta é 200
  - o corpo é um objeto com ok igual a true

#### API-BORDA-02
- **Dado:** o ambiente no ar.
- **Quando:** uma requisição sem cookie pede GET /api/v1/session.
- **Então:**
  - a resposta é 401
  - o corpo não traz id, papel nem e-mail de conta nenhuma

#### API-BORDA-03
- **Dado:** o ambiente no ar.
- **Quando:** uma requisição pede GET /api/v1/session com o cookie better-auth.session_token igual a sessao-inventada.
- **Então:**
  - a resposta é 401

#### API-BORDA-04
- **Dado:** `sessao-admin`.
- **Quando:** uma requisição pede GET /api/v1/session com o cookie dessa sessão.
- **Então:**
  - a resposta é 200
  - o corpo traz o userId da conta `admin-inicial`
  - o corpo traz role igual a admin

#### API-BORDA-05
- **Dado:** o ambiente no ar e nenhuma conta com o e-mail novo@example.com.
- **Quando:** uma requisição sem cookie pede POST /api/auth/sign-up/email com esse e-mail, um nome e uma senha válida.
- **Então:**
  - a resposta é 400
  - o corpo traz o código EMAIL_PASSWORD_SIGN_UP_DISABLED
  - nenhuma conta com esse e-mail passa a existir no banco

### Primeiro admin

#### API-ADMIN-01
- **Dado:** `admin-inicial`.
- **Quando:** uma requisição pede POST /api/auth/sign-in/email com o e-mail de ADMIN_EMAIL e a senha de ADMIN_PASSWORD.
- **Então:**
  - a resposta é 200
  - a resposta define o cookie de sessão com o atributo HttpOnly
  - o corpo não contém a senha

### Origem da SPA

#### API-CORS-01
- **Dado:** o ambiente no ar.
- **Quando:** uma requisição de preflight OPTIONS pede /api/v1/session com Origin igual a WEB_ORIGIN.
- **Então:**
  - o cabeçalho Access-Control-Allow-Origin é igual a WEB_ORIGIN
  - o cabeçalho Access-Control-Allow-Credentials é true

#### API-CORS-02
- **Dado:** o ambiente no ar.
- **Quando:** uma requisição de preflight OPTIONS pede /api/v1/session com Origin igual a http://outra-origem.example.
- **Então:**
  - a resposta não tem o cabeçalho Access-Control-Allow-Origin com essa origem

### Documento da API

#### API-DOCS-01
- **Dado:** o ambiente no ar com NODE_ENV igual a development.
- **Quando:** uma requisição sem cookie pede GET /api/docs.
- **Então:**
  - a resposta é 200
  - o corpo é uma página HTML

#### API-DOCS-02
- **Dado:** o ambiente no ar com NODE_ENV igual a development.
- **Quando:** uma requisição sem cookie pede GET /api/docs-json.
- **Então:**
  - a resposta é 200
  - o campo openapi do corpo começa com 3.
  - os caminhos do documento incluem /api/v1/session
  - os caminhos do documento incluem /api/health

#### API-DOCS-03
- **Dado:** a API em execução com NODE_ENV igual a production.
- **Quando:** uma requisição sem cookie pede GET /api/docs-json.
- **Então:**
  - a resposta é 404

## CLI

Modo de verificação: comandos na raiz do repositório e no Docker Compose, inspecionando código de saída, saída, arquivos gerados, logs dos serviços e o estado do banco.

### Monorepo

#### CLI-MONOREPO-01
- **Dado:** um clone limpo com as dependências instaladas pelo pnpm.
- **Quando:** inspecionam-se os manifestos da raiz e dos pacotes do workspace.
- **Então:**
  - o packageManager da raiz fixa o pnpm na major 12
  - o engines.node da raiz exige a major 26
  - o workspace tem exatamente os pacotes @app/api, @app/web e @app/contracts
  - o TypeScript instalado está na major 6
  - o Turborepo instalado está na major 2

#### CLI-MONOREPO-02
- **Dado:** um clone limpo com as dependências instaladas pelo pnpm.
- **Quando:** inspecionam-se as dependências declaradas de @app/api e de @app/web.
- **Então:**
  - @app/api declara @app/contracts pelo protocolo workspace:
  - @app/web declara @app/contracts pelo protocolo workspace:

### Scripts da stack

Dado comum: um clone limpo com as dependências instaladas pelo pnpm e o Docker disponível.

#### CLI-STACK-01
- **Dado:** a árvore sem alteração.
- **Quando:** `make lint`.
- **Então:**
  - o código de saída é 0
  - a saída não contém o aviso de alvo não implementado
  - a saída mostra o lint rodando em @app/api, @app/web e @app/contracts

#### CLI-STACK-02
- **Dado:** a árvore sem alteração.
- **Quando:** `make format`.
- **Então:**
  - o código de saída é 0
  - nenhum arquivo versionado fica alterado

#### CLI-STACK-03
- **Dado:** a árvore sem alteração.
- **Quando:** `make test`.
- **Então:**
  - o código de saída é 0
  - a saída mostra testes de unidade de @app/api, @app/web e @app/contracts
  - a saída mostra os testes de integração de @app/api rodando contra o banco app_test

#### CLI-STACK-04
- **Dado:** a árvore sem alteração e sem artefatos de build.
- **Quando:** `make build`.
- **Então:**
  - o código de saída é 0
  - existe o arquivo main.js na pasta dist de apps/api
  - existe o arquivo index.html na pasta dist de apps/web

#### CLI-STACK-05
- **Dado:** um `make build` concluído e nenhuma alteração depois dele.
- **Quando:** `make build`.
- **Então:**
  - o código de saída é 0
  - a saída informa que todas as tarefas vieram do cache local

### Ambiente local

Dado comum: o `.env` copiado do `.env.example` sem alteração além de ADMIN_EMAIL e ADMIN_PASSWORD.

#### CLI-AMBIENTE-01
- **Dado:** nenhum container do projeto em execução.
- **Quando:** `docker compose up -d --wait`.
- **Então:**
  - o código de saída é 0
  - os serviços api, web, postgres, valkey e mailpit estão em execução e saudáveis
  - o postgres informa versão na major 18
  - o valkey informa versão na major 9

#### CLI-AMBIENTE-02
- **Dado:** o ambiente no ar.
- **Quando:** consulta-se a configuração em execução do valkey.
- **Então:**
  - appendonly é yes
  - appendfsync é everysec
  - maxmemory-policy é noeviction

#### CLI-AMBIENTE-03
- **Dado:** o ambiente no ar.
- **Quando:** altera-se, no host, um arquivo TypeScript de apps/api.
- **Então:**
  - o log da api mostra a recompilação e a nova subida
  - a imagem do serviço api não é reconstruída
  - GET /api/health volta a responder 200 depois da nova subida

### Configuração

#### CLI-CONFIG-01
- **Dado:** o `.env` sem a variável BETTER_AUTH_SECRET e os demais serviços no ar.
- **Quando:** sobe-se o serviço api.
- **Então:**
  - o processo da api termina com código diferente de 0
  - a saída nomeia BETTER_AUTH_SECRET
  - a saída não contém o valor de DATABASE_URL nem de nenhuma outra variável

#### CLI-CONFIG-02
- **Dado:** um clone limpo.
- **Quando:** inspecionam-se o `.env.example` e as regras de ignorar do git.
- **Então:**
  - o `.env.example` declara todas as variáveis obrigatórias da API e da SPA
  - o `.env` é ignorado pelo git
  - o `.env.example` não traz segredo real, só valores de desenvolvimento

#### CLI-CONFIG-03
- **Dado:** os demais serviços no ar.
- **Quando:** sobe-se o serviço api com a variável PORT igual a 70000 no ambiente do processo.
- **Então:**
  - o processo da api termina com código diferente de 0
  - a saída nomeia PORT

### Banco

#### CLI-BANCO-01
- **Dado:** o ambiente no ar com o banco vazio.
- **Quando:** `make db-setup`.
- **Então:**
  - o código de saída é 0
  - existem as tabelas user, session, account e verification
  - a tabela user tem as colunas role, banned, banReason e banExpires
  - o histórico de migrações do Prisma registra a migração inicial

#### CLI-BANCO-02
- **Dado:** um clone limpo com as dependências instaladas pelo pnpm.
- **Quando:** inspecionam-se as versões instaladas em @app/api.
- **Então:**
  - prisma está na major 7
  - @prisma/client está na major 7
  - @prisma/adapter-pg está instalado na major 7

### Primeiro admin

#### CLI-ADMIN-01
- **Dado:** o ambiente no ar com o banco vazio.
- **Quando:** `make db-setup`.
- **Então:**
  - existe exatamente uma conta com o e-mail de ADMIN_EMAIL
  - essa conta tem papel admin e e-mail verificado
  - essa conta não está banida
  - a senha gravada para essa conta é diferente do texto de ADMIN_PASSWORD

#### CLI-ADMIN-02
- **Dado:** `admin-inicial`.
- **Quando:** `make db-setup`.
- **Então:**
  - o código de saída é 0
  - continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL
  - a credencial de senha dessa conta não muda
  - nenhuma migração nova é aplicada

#### CLI-ADMIN-03
- **Dado:** o ambiente no ar com o banco vazio e ADMIN_EMAIL vazio no `.env`.
- **Quando:** `make db-setup`.
- **Então:**
  - o código de saída é diferente de 0
  - a saída nomeia ADMIN_EMAIL
  - nenhuma conta existe no banco

#### CLI-ADMIN-04
- **Dado:** `conta-comum-com-email-do-admin`.
- **Quando:** `make db-setup`.
- **Então:**
  - o código de saída é diferente de 0
  - a saída diz que já existe conta com o e-mail de ADMIN_EMAIL sem papel admin
  - essa conta continua sem papel admin e com o e-mail não verificado
  - a credencial de senha dessa conta não muda
  - continua existindo exatamente uma conta com o e-mail de ADMIN_EMAIL

#### CLI-ADMIN-05
- **Dado:** `admin-banido`.
- **Quando:** `make db-setup`.
- **Então:**
  - o código de saída é diferente de 0
  - a saída diz que a conta admin com o e-mail de ADMIN_EMAIL está banida
  - a saída não contém o texto de ADMIN_EMAIL
  - essa conta continua banida e com papel admin
  - a credencial de senha dessa conta não muda

#### CLI-ADMIN-06
- **Dado:** o ambiente no ar com o banco vazio e ADMIN_PASSWORD no `.env` com 8 ou mais caracteres e sem nenhum número.
- **Quando:** `make db-setup`.
- **Então:**
  - o código de saída é diferente de 0
  - a saída nomeia ADMIN_PASSWORD
  - a saída não contém o texto de ADMIN_PASSWORD
  - nenhuma conta existe no banco

### Logs estruturados

#### CLI-LOGS-01
- **Dado:** o ambiente no ar e uma requisição GET /api/health enviada com os cabeçalhos cookie e authorization preenchidos.
- **Quando:** lê-se a linha do log da api referente a essa requisição.
- **Então:**
  - a linha é um objeto JSON completo
  - a linha traz um identificador único da requisição, o status e o tempo de resposta
  - a linha não contém o valor do cabeçalho cookie
  - a linha não contém o valor do cabeçalho authorization

#### CLI-LOGS-02
- **Dado:** o ambiente no ar e duas requisições GET /api/health enviadas em sequência.
- **Quando:** leem-se as duas linhas do log da api referentes a elas.
- **Então:**
  - os dois identificadores de requisição são diferentes
  - nenhum dos dois é um número inteiro

#### CLI-LOGS-03
- **Dado:** `admin-inicial` e uma requisição POST /api/auth/sign-in/email enviada com o e-mail e a senha dessa conta.
- **Quando:** lê-se todo o log da api desde a subida.
- **Então:**
  - o e-mail da conta não aparece em nenhuma linha
  - a senha da conta não aparece em nenhuma linha

#### CLI-LOGS-04
- **Dado:** o ambiente no ar e uma requisição GET /api/health?token=segredo-da-query enviada.
- **Quando:** lê-se a linha do log da api referente a essa requisição.
- **Então:**
  - a linha registra o caminho /api/health
  - o texto segredo-da-query não aparece na linha

### Telemetria

#### CLI-OTEL-01
- **Dado:** a api no ar sem OTEL_EXPORTER_OTLP_ENDPOINT e dez requisições GET /api/health respondidas.
- **Quando:** lê-se todo o log da api desde a subida.
- **Então:**
  - nenhuma linha registra erro ou aviso de exportação de telemetria

#### CLI-OTEL-02
- **Dado:** a api no ar com OTEL_EXPORTER_OTLP_ENDPOINT apontando para o receptor HTTP local.
- **Quando:** a api responde a uma requisição GET /api/health.
- **Então:**
  - em até 30 segundos o receptor registra ao menos uma requisição de exportação de traces
  - a api continua respondendo 200 em GET /api/health

#### CLI-OTEL-03
- **Dado:** a api no ar com OTEL_EXPORTER_OTLP_ENDPOINT apontando para o receptor HTTP local e OTEL_EXPORTER_OTLP_PROTOCOL igual a http/json.
- **Quando:** a api responde a uma requisição GET /api/health?token=segredo-da-query.
- **Então:**
  - em até 30 segundos o receptor registra uma exportação de traces com um span dessa requisição
  - o texto segredo-da-query não aparece em nenhum atributo dos spans recebidos

### Imagens

#### CLI-IMAGEM-01
- **Dado:** um clone limpo.
- **Quando:** constrói-se a imagem da API pelo Dockerfile de apps/api.
- **Então:**
  - o código de saída é 0
  - a imagem final roda Node na major 26
  - a imagem final não contém os arquivos TypeScript do código-fonte da API
  - a imagem final não contém o @nestjs/cli

#### CLI-IMAGEM-02
- **Dado:** a imagem da API construída e os serviços postgres e valkey do Compose no ar.
- **Quando:** sobe-se um container dessa imagem com as variáveis do `.env` e NODE_ENV igual a production, e pede-se GET /api/auth/ok nele.
- **Então:**
  - o container segue em execução
  - o log do container tem a linha JSON de subida da API sem erro
  - todas as linhas do log do container são objetos JSON
  - GET /api/health nesse container responde 200

#### CLI-IMAGEM-03
- **Dado:** um clone limpo.
- **Quando:** constrói-se e sobe-se a imagem da SPA pelo Dockerfile de apps/web.
- **Então:**
  - o código de saída da construção é 0
  - a imagem final não contém o executável node
  - uma requisição a /uma-rota-qualquer no container devolve o index.html da SPA

### Verificação contínua

#### CLI-CI-01
- **Dado:** um clone limpo com as dependências instaladas pelo pnpm.
- **Quando:** `CI=true make check`.
- **Então:**
  - o código de saída é 0
  - a saída termina com a linha de que todas as verificações passaram
  - a saída não contém o aviso de alvo não implementado

#### CLI-CI-02
- **Dado:** um clone limpo.
- **Quando:** inspeciona-se o arquivo ci.yml da pasta de workflows do GitHub.
- **Então:**
  - o arquivo instala Node na major 26 antes do passo make check
  - o arquivo instala o pnpm na versão do packageManager antes do passo make check
  - toda action do arquivo está fixada por SHA completo com comentário da versão

### Regra de dependência na API

Dado comum: um clone limpo com as dependências instaladas pelo pnpm; cada arquivo de violação citado no `Dado` existe só durante o item.

#### CLI-CAMADAS-01
- **Dado:** a árvore sem alteração.
- **Quando:** inspeciona-se a pasta do Módulo Contas em apps/api/src/modules/accounts.
- **Então:**
  - o controller de GET /api/v1/session fica em presentation/get-session
  - a raiz do módulo tem só o accounts.module.ts, o auth.ts e pastas de camada
  - não há pasta além de domain, application, infra e presentation no módulo

#### CLI-CAMADAS-02
- **Dado:** a árvore sem alteração.
- **Quando:** `make lint`.
- **Então:**
  - o código de saída é 0
  - a saída mostra a análise de dependências de @app/api sem violação

#### CLI-CAMADAS-03
- **Dado:** a árvore com um arquivo novo em domain/ do Módulo Contas que importa, só como tipo, o cliente gerado do Prisma.
- **Quando:** `make lint`.
- **Então:**
  - o código de saída é diferente de 0
  - a saída nomeia a regra violada
  - a saída cita o arquivo novo de domain/

#### CLI-CAMADAS-04
- **Dado:** a árvore com um arquivo novo em application/ do Módulo Contas que importa o PrismaService de platform/.
- **Quando:** `make lint`.
- **Então:**
  - o código de saída é diferente de 0
  - a saída nomeia a regra violada
  - a saída cita o arquivo novo de application/

#### CLI-CAMADAS-05
- **Dado:** a árvore com um arquivo novo em infra/ do Módulo Contas e o controller de GET /api/v1/session importando esse arquivo.
- **Quando:** `make lint`.
- **Então:**
  - o código de saída é diferente de 0
  - a saída nomeia a regra violada
  - a saída cita o controller de presentation/get-session

#### CLI-CAMADAS-06
- **Dado:** a árvore com um segundo módulo em apps/api/src/modules cujo arquivo em presentation/ importa o controller de presentation/get-session do Módulo Contas.
- **Quando:** `make lint`.
- **Então:**
  - o código de saída é diferente de 0
  - a saída nomeia a regra violada
  - a saída cita o arquivo do segundo módulo

#### CLI-CAMADAS-07
- **Dado:** a árvore com um arquivo novo em platform/ que importa o accounts.module.ts.
- **Quando:** `make lint`.
- **Então:**
  - o código de saída é diferente de 0
  - a saída nomeia a regra violada
  - a saída cita o arquivo novo de platform/

#### CLI-CAMADAS-08
- **Dado:** a árvore com dois arquivos novos em platform/ que importam um ao outro.
- **Quando:** `make lint`.
- **Então:**
  - o código de saída é diferente de 0
  - a saída nomeia a regra de ciclo
  - a saída cita os dois arquivos novos

## UI

Modo de verificação: navegador dirigido contra a SPA em execução no ambiente local, observando o conteúdo da página, o console e as requisições de rede.

### Página inicial

#### UI-INICIO-01
- **Dado:** o ambiente no ar e o navegador sem cookie.
- **Quando:** abre-se a raiz da SPA.
- **Então:**
  - a página mostra, em português do Brasil, que não há sessão aberta
  - o elemento html tem lang igual a pt-BR
  - o console não registra erro além da mensagem de rede do navegador para o 401 esperado de GET /api/v1/session

#### UI-INICIO-02
- **Dado:** o navegador com o cookie de `sessao-admin`.
- **Quando:** abre-se a raiz da SPA.
- **Então:**
  - a página mostra que há sessão aberta com o papel admin
  - nenhuma requisição à API é bloqueada por CORS

#### UI-INICIO-03
- **Dado:** o ambiente no ar.
- **Quando:** abre-se o endereço /nao-existe na SPA.
- **Então:**
  - a página mostra, em português do Brasil, que a página não foi encontrada

#### UI-INICIO-04
- **Dado:** o ambiente no ar com o serviço api parado.
- **Quando:** abre-se a raiz da SPA.
- **Então:**
  - a página mostra, em português do Brasil, que o servidor não respondeu
  - a página não fica em branco

### Recarga no desenvolvimento

#### UI-RECARGA-01
- **Dado:** o ambiente no ar e a raiz da SPA aberta no navegador.
- **Quando:** altera-se, no host, um texto do componente da rota raiz em apps/web.
- **Então:**
  - a página mostra o texto novo sem recarga manual
