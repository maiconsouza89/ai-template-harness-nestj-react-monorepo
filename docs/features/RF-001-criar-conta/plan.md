# Plano: RF-001 Criar conta

Spec: spec.md. Contrato: contract.md.

---

## Pré-requisitos

- Fundação implementada (`docs/features/fundacao/`): Better Auth em `/api/auth`, conexão com o Valkey, `PrismaService`, pacote Contratos e o roteador da SPA.
- DEP-1 no ambiente local: o Mailpit do Compose recebendo SMTP e expondo a API REST.
- Nenhum RF no fecho de dependências.
- ADR-0027 (Tailwind CSS 4) e ADR-0028 (Inter auto-hospedada) aceitos, para a fase 4.
- `DESIGN.md` na raiz, sem a marca de terceiros e com as contradições resolvidas (spec, Decisões).

---

## Fase 1: regra de cadastro compartilhada

1. **Contratos:** criar `accounts.ts` com os esquemas de senha e de cadastro, as mensagens em pt-BR e os códigos de erro do cadastro, e exportá-lo pelo índice do pacote (spec, Regras e fluxos).
2. **Redis:** acrescentar `TRUSTED_PROXIES` ao esquema de configuração, obrigatória em produção e vazia no `.env.example` e no `.env.test`, e passar a ler `ADMIN_EMAIL` como opcional na API.

## Fase 2: Módulo E-mail com a fila

3. **Redis:** criar o módulo de fila em `platform/queue/` com conexões próprias do BullMQ a partir de `REDIS_URL`, uma para o produtor e outra para o worker (spec, Decisões), e registrá-lo no `AppModule`.
4. **Módulo E-mail:** criar o domínio com o tipo do pedido, as portas de fila, destinatários e transporte, e o template do e-mail de confirmação em pt-BR.
5. **Módulo E-mail:** criar os casos de uso de pedido de envio e de envio, este lendo o destinatário no momento da entrega e descartando conta inexistente ou já confirmada.
6. **Módulo E-mail:** implementar em `infra/` o produtor da fila `email.send` com tentativas, backoff, retenção e o registro do enfileiramento que passa do limite, o worker, o transporte Nodemailer e a leitura de destinatários pelo Prisma, com os erros de driver reduzidos no log.
7. **Módulo E-mail:** montar o `email.module.ts` ligando as portas por `useClass`, reexportando o caso de uso de pedido de envio e registrando o módulo no `AppModule`.

## Fase 3: cadastro aberto no Módulo Contas

8. **Módulo Contas:** criar o armazenamento do rate limit no Valkey, com consumo atômico por janela e liberação só quando a conexão caiu ou não responde (spec, Regras e fluxos).
9. **Módulo Contas:** criar o hook antes do cadastro que valida o corpo pelo esquema de Contratos, repassa só os campos validados e recusa o e-mail do admin e o e-mail já cadastrado em qualquer combinação de maiúsculas (spec, Contratos de interface).
10. **Módulo Contas:** criar o callback de envio de confirmação que monta o link da SPA em `/confirmar-email` e chama o pedido de envio do Módulo E-mail.
11. **Módulo Contas:** abrir o cadastro em `auth.ts`, com a confirmação de e-mail obrigatória, a validade do link, o rate limit com as regras do cadastro, os proxies confiáveis e os logs da biblioteca no pino, recebendo as dependências novas num parâmetro opcional que o seed não passa.
12. **Módulo Contas:** compor no `accounts.module.ts` as dependências de `auth.ts` a partir do Valkey, do Módulo E-mail e do logger.
13. **Módulo Contas:** substituir a integração da fundação que provava o cadastro fechado pela do cadastro aberto, acrescentar a factory de conta pendente, limpar os contadores de rate limit na subida da aplicação de integração e dar um IP próprio aos casos existentes que entram com o admin.

## Fase 4: base visual e tela de cadastro

14. **SPA Web:** acrescentar o Tailwind CSS 4 com o plugin do Vite (ADR-0027) e a fonte Inter auto-hospedada (ADR-0028).
15. **SPA Web:** criar a folha de estilo global com os tokens do `DESIGN.md`, sem a paleta padrão do Tailwind, e as classes dos componentes que a tela usa (spec, Regras visuais).
16. **SPA Web:** criar a barra de navegação com os links de entrar e criar conta e aplicá-la, com os tokens, à rota raiz e à página de erro, e fazer o loader da raiz manter a última sessão quando a API não responde numa releitura.
17. **SPA Web:** criar a rota `/cadastro` com o formulário de nome, e-mail e senha no card do `DESIGN.md`, a `action` que valida pelo esquema de Contratos e chama a API, e as mensagens por campo no estado de erro em preto e branco.
18. **SPA Web:** mostrar, depois do cadastro aceito, a mensagem de link enviado com o e-mail informado e o botão de reenvio, e tratar e-mail existente (com os links para entrar e recuperar a senha), limite excedido e servidor fora.
19. **SPA Web:** pendurar a rota `/cadastro` no roteador como filha da raiz e ligar a página inicial anônima a ela.

## Fase 5: privacidade e fechamento

20. **Módulo Contas:** conferir que o cadastro, o worker e o callback não escrevem senha, nome, e-mail nem token em log, cobrindo isso na integração de logs (spec, Estratégia de testes).
21. **Módulo E-mail:** ajustar o README na parte de e-mail e da caixa de teste local e o `.env.example` na de proxies, e rodar os gates do contrato.
