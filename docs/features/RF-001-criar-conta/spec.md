# Spec: RF-001 Criar conta

PRD: docs/product/prd.md versão 0.1.0
HLD: docs/architecture/hld.md versão 0.2.6
Complexidade: complexa

---

## Escopo

Incluído
- Tela de cadastro em `/cadastro` na SPA, com nome, e-mail e senha, validação no navegador pelo esquema de Contratos e mensagens em pt-BR por campo.
- Cadastro aberto em `POST /api/auth/sign-up/email`: o Better Auth deixa de ter `disableSignUp` e passa a exigir a confirmação do e-mail antes de abrir sessão.
- Validação no servidor por um hook antes do cadastro, com o mesmo esquema de Contratos: nome obrigatório, e-mail válido e regra de senha (mínimo de 8 caracteres, com letra e número); o Better Auth recebe só os campos validados.
- Recusa do e-mail de `ADMIN_EMAIL` no cadastro aberto, como se já tivesse conta, para ninguém pré-registrar o primeiro admin antes do seed.
- `TRUSTED_PROXIES` obrigatória com `NODE_ENV=production`: sem ela a API não sobe.
- Recusa de e-mail já cadastrado, sem diferença entre maiúsculas e minúsculas, com a sugestão de entrar ou recuperar a senha na tela.
- Conta criada com papel usuário e situação pendente (e-mail não verificado), com o e-mail gravado em minúsculas e a senha só como hash.
- Módulo E-mail novo: fila `email.send` no BullMQ, worker no mesmo processo da API, e-mail de confirmação em pt-BR renderizado no envio e entregue por SMTP (Nodemailer) ao Mailpit no ambiente local.
- Link de confirmação válido por 24 horas, apontando para a tela `/confirmar-email` da SPA.
- Tela de "link enviado" com o botão de reenvio sempre visível, pela rota nativa `POST /api/auth/send-verification-email`, o que cobre a falha no envio prevista no RF.
- Rate limit do Better Auth ligado, com contadores no Valkey: 100 requisições a cada 10 segundos por IP e caminho, e 5 cadastros a cada 60 segundos por IP.
- Logs do Better Auth encaminhados ao logger pino da API, para passarem pela mesma redação de dados pessoais.
- Base visual da SPA a partir do `DESIGN.md` da raiz: os tokens de cor, tipografia, raio e espaçamento num bloco `@theme` do Tailwind CSS 4, com a paleta padrão do Tailwind removida, e a fonte Inter auto-hospedada.
- Layout da rota raiz no `DESIGN.md`: barra de navegação (`nav-bar`) com o nome do app e, sem sessão, os links "Entrar" (`button-secondary`) e "Criar conta" (`button-primary`); a página de erro passa a usar os mesmos tokens.
- Tela `/cadastro` montada com os componentes do `DESIGN.md`: card de autenticação branco, campos `text-input`, botão primário em pílula, estado de erro de campo em preto e branco e avisos de servidor em `card-soft-tinted`.

Entradas
- nenhuma: o RF-001 não depende de outro RF. Da fundação, usa a instância do Better Auth em `apps/api/src/modules/accounts/auth.ts`, a conexão `REDIS` de `apps/api/src/platform/redis/`, o `PrismaService` e o pacote Contratos.
- DEP-1 (fluxo): servidor SMTP lido de `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER` e `SMTP_PASSWORD`, já validados na subida pela fundação.

Saídas
- Conta pendente na tabela `user` (com `emailVerified` falso e `role` igual a `user`) e a credencial na tabela `account`: RF-002 ativa, RF-003 autentica e RF-005 redefine a senha dessa conta.
- E-mail de confirmação com o link `<WEB_ORIGIN>/confirmar-email?token=<token>`, em que o token é o do Better Auth (`emailVerification.expiresIn` de 86400 segundos): RF-002 constrói a tela que abre esse link e chama `GET /api/auth/verify-email?token=`.
- O Módulo E-mail com o caso de uso de pedido de envio exportado por `email.module.ts` e a fila `email.send`: RF-002 (reenvio), RF-005 (recuperação) e RF-007 (aviso de troca) acrescentam um tipo de e-mail cada.
- `passwordSchema` e as mensagens da regra de senha em Contratos: RF-005 e RF-007 aplicam a mesma regra à senha nova.
- O rate limit ligado com armazenamento no Valkey, onde RF-003 e RF-005 acrescentam as regras de sign-in e recuperação.
- A tela `/cadastro`, com os links "Entrar" e "Recuperar a senha" para as rotas `/entrar` e `/recuperar-senha`, que RF-003 e RF-005 constroem.
- A base visual em `apps/web/src/styles/app.css` (tokens do `DESIGN.md` no `@theme`) e a barra de navegação da rota raiz: RF-002, RF-003, RF-005 e os demais RFs com tela usam as mesmas classes e penduram as telas abaixo da barra.

Fora desta spec
- Abrir o link, ativar a conta, as telas de link vencido ou inválido e a invalidação dos links anteriores no reenvio: RF-002.
- Entrar, bloqueio por tentativas e as regras de rate limit de sign-in: RF-003.
- Recuperação de senha e a regra de rate limit da recuperação: RF-005.
- Revisão do contrato da fundação: o item API-BORDA-05 dela exige o cadastro fechado, que este RF abre (ver Decisões).
- Componentes do `DESIGN.md` que o cadastro não usa (rodapé, faixas promocionais, cards ilustrados, chips de categoria): entram no RF que tiver a primeira tela que precise deles.

---

## Regras e fluxos

Regras
- Nome, e-mail e senha são obrigatórios; o nome tem de 1 a 100 caracteres depois de tirar os espaços das pontas (hipótese).
- O e-mail precisa ser válido e ter no máximo 254 caracteres; ele é comparado e gravado em minúsculas, e `Ana@Example.com` é o mesmo e-mail que `ana@example.com` (PRD, RF-001 Fluxos alternativos).
- A senha tem no mínimo 8 caracteres, ao menos uma letra e ao menos um número (PRD, Decisão regra de senha), e no máximo 128 caracteres, o teto padrão do Better Auth (hipótese).
- Senha fora da regra recusa o cadastro sem criar conta, e a resposta e a tela trazem a regra inteira: "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número.".
- E-mail já cadastrado recusa o cadastro com 422 e não cria segunda conta; a unicidade é garantida pela constraint única em `user.email`, mesmo com dois cadastros simultâneos.
- A conta nasce com `role` igual a `user` (padrão do plugin admin), `emailVerified` falso e `banned` falso, sem sessão: o cadastro não devolve cookie de sessão (PRD, Decisão confirmação de e-mail obrigatória antes de entrar).
- O link de confirmação vale 24 horas (`emailVerification.expiresIn` de 86400 segundos) e o e-mail diz isso em pt-BR (PRD, RF-001 Fluxo principal).
- Falha ao enfileirar ou ao enviar o e-mail não desfaz a conta; a tela de "link enviado" sempre oferece o reenvio (PRD, RF-001 Erros previstos; HLD, Padrões adotados).
- O job em `email.send` leva o tipo do e-mail, o id da conta e o link; o endereço e o nome são lidos da conta no envio, e a senha nunca entra no job (HLD, Fluxo de dados).
- O envio tenta até 5 vezes, com backoff exponencial a partir de 5 segundos; esgotadas as tentativas, o job fica como falho na fila para inspeção (ADR-0015; HLD, Interfaces públicas).
- Jobs concluídos ficam 24 horas e falhos ficam 7 dias na fila, a retenção que a fundação deixou para quem registrasse a primeira fila (spec da fundação, Hipóteses).
- A senha nunca aparece em texto puro: o campo da tela é do tipo senha, a resposta do cadastro não a devolve, o banco guarda só o hash scrypt em `account.password`, e nem o e-mail nem o job a contêm (PRD, Segurança e autorização).
- Nenhum log da API contém a senha, o nome ou o e-mail do cadastro, nem o token do link (PRD, Compliance; ADR-0018).
- Rate limit por IP: 5 cadastros a cada 60 segundos em `/sign-up/email` e 100 requisições a cada 10 segundos nas demais rotas de `/api/auth`, que passam a valer também em development e test; o pedido além do limite recebe 429 (HLD, Interfaces públicas).
- O IP do rate limit vem do `X-Forwarded-For`, resolvido com `TRUSTED_PROXIES` quando definida; sem ela, vale um `X-Forwarded-For` de um valor só e, sem cabeçalho, o endereço local em development e test (comportamento do `@better-auth/core` 1.7.14, `utils/ip.mjs`). Em production `TRUSTED_PROXIES` é obrigatória: sem ela o IP é forjável ou fica nulo, e todos os pedidos sem IP caem numa chave comum que um atacante esgota.
- Com o Valkey fora do ar, o rate limit libera a requisição (fail-open) e registra o erro, e o cadastro cria a conta mesmo sem enfileirar o e-mail (HLD, Técnicas aplicadas). Fora do ar quer dizer a conexão em `reconnecting`, `close` ou `end`, ou sem resposta em 500 ms; enquanto a conexão abre (`wait`, `connecting`, `connect`), o contador espera por ela e o limite continua valendo.
- O corpo do cadastro só leva nome, e-mail e senha ao Better Auth: campos fora do esquema (`image`, `callbackURL`, `rememberMe` e chaves extras) são descartados pelo hook.
- O e-mail de `ADMIN_EMAIL`, quando definido, é recusado no cadastro com o mesmo 422 `USER_ALREADY_EXISTS` de um e-mail já cadastrado, em qualquer combinação de maiúsculas, sem dizer que o endereço é do admin; o seed segue criando o admin.
- O envio descarta o job de confirmação de conta que já está com o e-mail verificado, para um job atrasado pelo backoff não entregar um link inútil.
- Quando o enfileiramento passa do limite de 3 segundos e o pedido entra na fila depois, o log registra o desfecho real (o id do job ou o erro), para o log não dizer só que o pedido falhou.
- Erro de driver (Valkey, BullMQ, SMTP) vai ao log só com nome e código, por `describeError`, nunca com a mensagem crua, que pode trazer endereço ou argumento de comando (ADR-0018).
- Com a API fora numa releitura da sessão, a rota raiz da SPA mantém a última sessão lida e a tela atual continua com o que foi digitado; a página de erro só aparece quando a API está fora já na primeira leitura.

Regras visuais (`DESIGN.md`)
- A paleta é só a do `DESIGN.md`: `--color-*: initial` no `@theme` remove as cores padrão do Tailwind, e as utilidades de cor existem só para `primary`, `on-primary`, `ink`, `body`, `mute`, `hairline-mid`, `canvas`, `canvas-soft`, `canvas-softer`, `surface-pressed`, `link`, `on-dark` e `black-elevated` (tailwindcss.com/docs/theme, Overriding the default theme).
- Toda a SPA usa a família `Inter Variable`, servida pela própria SPA a partir de `@fontsource-variable/inter`, com o fallback `system-ui, Helvetica Neue, Arial, sans-serif`; nenhuma fonte é pedida a outra origem.
- Títulos em peso 700 na escala `display-*`, sem `letter-spacing`; texto, rótulos e botões em 400 e 500 na escala `body-*` e `button-*`; o título da tela de cadastro usa `display-lg` (32px, linha de 40px).
- Todo botão e link de ação usa raio de pílula (999px): "Criar conta" do formulário e da barra é `button-primary` (fundo `#000`, texto `#fff`, rótulo de 16px em peso 500, padding de 12px), e "Entrar" e "Reenviar o link" são `button-secondary`.
- O card do formulário é `card-content`: fundo `#fff`, raio de 16px, padding de 24px, sem sombra, largura máxima de 490px no desktop e largura total no mobile, com margem lateral de 16px abaixo de 600px e de 32px a partir daí.
- Os campos são `text-input`: fundo `#efefef`, texto `#000`, raio de 8px, padding de 16px, `body-md`; o placeholder usa `mute` `#afafaf`, e o rótulo fica visível acima do campo, nunca só no placeholder.
- Campo com erro ganha borda de 2px `ink`, `aria-invalid` verdadeiro e `aria-describedby` apontando para a mensagem; a mensagem fica logo abaixo, em `body-sm` `ink`, precedida de um ícone de alerta, para o erro não depender só de cor (WCAG 1.4.1).
- Aviso que não é de um campo (e-mail já cadastrado, limite excedido, servidor fora) aparece acima do formulário num `card-soft-tinted` (fundo `#efefef`, raio de 16px) com `role="alert"`.
- Todo elemento focável mostra o foco com contorno de 2px `ink` afastado 2px (hipótese).
- A barra de navegação é `nav-bar`: fundo `canvas`, links em `body-md-strong`, padding de 16px por 32px, que cai para 16px nas laterais abaixo de 600px; os dois links continuam visíveis no mobile, sem menu recolhido (hipótese).
- Em 375px de largura nenhuma tela tem rolagem horizontal.

Fluxo técnico do caso principal
1. A SPA Web, em `/cadastro`, valida o formulário com `signUpSchema` de Contratos e envia `POST /api/auth/sign-up/email` com nome, e-mail e senha pelo `apiFetch`.
2. O Módulo Contas passa a requisição pelo rate limit do Better Auth, com o contador por IP e caminho no Redis (Valkey).
3. O hook antes do cadastro, no Módulo Contas, valida o corpo com `signUpSchema` e procura a conta pelo e-mail em minúsculas; inválido responde 400 `VALIDATION_ERROR`, existente responde 422 `USER_ALREADY_EXISTS`.
4. O Better Auth grava no PostgreSQL a conta em `user` (com `role` `user` e `emailVerified` falso) e a credencial com o hash em `account`, e gera o token de confirmação de 24 horas.
5. No callback `sendVerificationEmail`, o Módulo Contas monta o link `<WEB_ORIGIN>/confirmar-email?token=<token>` e pede ao Módulo E-mail o envio, que cria o job em `email.send`; a API responde 200 sem cookie de sessão.
6. A SPA Web troca o formulário pela mensagem de link enviado, com o e-mail informado e o botão de reenvio.
7. O worker do Módulo E-mail pega o job, lê nome e e-mail da conta no PostgreSQL, renderiza o e-mail em pt-BR e o entrega ao Servidor SMTP.

---

## Componentes

| Componente do HLD | Caminho | O que muda nesta feature |
| --- | --- | --- |
| Contratos | `packages/contracts/src/accounts.ts`, `packages/contracts/src/index.ts` | Novo `accounts.ts` com `passwordSchema`, `signUpSchema`, as mensagens em pt-BR e os códigos de erro do cadastro (`VALIDATION_ERROR`, `USER_ALREADY_EXISTS`); reexportado pelo `index.ts`. |
| Módulo Contas | `apps/api/src/modules/accounts/auth.ts` | `createAuth` ganha um terceiro parâmetro opcional com as dependências que o seed não usa (callback de envio, hook antes do cadastro, armazenamento do rate limit, logger); liga `requireEmailVerification`, `emailVerification` (`sendOnSignUp`, `expiresIn` de 86400), o rate limit com as regras do cadastro, `advanced.ipAddress.trustedProxies` e tira o `disableSignUp`. |
| Módulo Contas | `apps/api/src/modules/accounts/accounts.module.ts` | Importa o `EmailModule` e monta as dependências de `createAuth` no `useFactory`, injetando `REDIS`, o caso de uso de pedido de envio e o logger. |
| Módulo Contas | `apps/api/src/modules/accounts/presentation/sign-up/sign-up.hook.ts` | Novo. Hook `before` do Better Auth que, só no caminho `/sign-up/email`, valida o corpo com `signUpSchema`, reescreve `ctx.body` só com os campos validados, recusa o e-mail de `ADMIN_EMAIL` e recusa e-mail existente pelo `internalAdapter.findUserByEmail` com o e-mail em minúsculas. |
| Módulo Contas | `apps/api/src/modules/accounts/infra/rate-limit/valkey-rate-limit.storage.ts` | Novo. `customStorage` do rate limit com `consume(key, rule)` atômico no Valkey (INCR com expiração da janela), prefixo `rate-limit:` e fail-open só com a conexão caída ou sem resposta em 500 ms, com o erro reduzido por `describeError`. |
| Módulo Contas | `apps/api/src/modules/accounts/infra/verification-email/send-verification-email.ts` | Novo. Callback `sendVerificationEmail`: monta o link da SPA a partir de `WEB_ORIGIN` e do token e chama o caso de uso de pedido de envio do Módulo E-mail, importado de `email.module.ts`. |
| Módulo E-mail | `apps/api/src/modules/email/email.module.ts` | Novo. Registra a fila `email.send`, o processor, as portas por `useClass` e reexporta o caso de uso de pedido de envio, a fronteira pública do módulo (ADR-0025). |
| Módulo E-mail | `apps/api/src/modules/email/domain/` | Novo. Tipo do pedido (`verify-email`, id da conta, link), portas `EmailQueue`, `EmailRecipients` e `EmailTransport` como classe abstrata, e o template do e-mail de confirmação em pt-BR (assunto, texto e HTML). |
| Módulo E-mail | `apps/api/src/modules/email/application/request-email/`, `apps/api/src/modules/email/application/send-email/` | Novo. `request-email.use-case.ts` enfileira o pedido; `send-email.use-case.ts` lê o destinatário, renderiza e entrega, e descarta o job de conta que não existe mais ou que já tem o e-mail verificado. |
| Módulo E-mail | `apps/api/src/modules/email/infra/queue/email-send.processor.ts`, `apps/api/src/modules/email/infra/queue/bullmq-email.queue.ts`, `apps/api/src/modules/email/infra/smtp/nodemailer-email.transport.ts`, `apps/api/src/modules/email/infra/prisma-email-recipients.repository.ts` | Novo. Worker de `email.send` (`WorkerHost` do `@nestjs/bullmq`) com conexão própria, produtor com 5 tentativas, backoff, retenção e o registro do desfecho do `add` que passa do limite, transporte Nodemailer pelas variáveis SMTP e leitura de nome, e-mail e `emailVerified` pelo Prisma. |
| Redis | `apps/api/src/platform/queue/queue.module.ts`, `apps/api/src/app.module.ts` | Novo `queue.module.ts` com o `BullModule.forRootAsync` a partir de `REDIS_URL`, em conexões próprias do BullMQ separadas da conexão `REDIS` compartilhada: a do produtor sem fila offline e a do worker com ela; registrado no `AppModule` junto com o `EmailModule`. |
| Redis | `apps/api/src/platform/config/env.ts`, `.env.example`, `apps/api/.env.test` | Variável `TRUSTED_PROXIES`, lista de CIDRs separada por vírgula, vazia no local e no teste e obrigatória com `NODE_ENV=production`; `ADMIN_EMAIL` passa a ser lida pela API, opcional, para o hook de cadastro. |
| SPA Web | `apps/web/src/routes/cadastro/route.tsx`, `apps/web/src/routes/cadastro/action.ts`, `apps/web/src/main.tsx` | Nova rota `/cadastro` filha da raiz: formulário, `action` que valida e chama a API, estado de link enviado com o botão de reenvio, mensagens de erro por campo e os links para `/entrar` e `/recuperar-senha`, com as classes do `DESIGN.md`. |
| SPA Web | `apps/web/package.json`, `apps/web/vite.config.ts` | Dependências `tailwindcss` e `@tailwindcss/vite` 4.3 (peer `vite` ^8) e `@fontsource-variable/inter` 5; o plugin `tailwindcss()` entra em `plugins` ao lado do `react()`. |
| SPA Web | `apps/web/src/styles/app.css`, `apps/web/src/main.tsx` | Novo `app.css` com `@import "tailwindcss"`, o `@theme` dos tokens do `DESIGN.md` (cores, `--font-sans`, escala tipográfica, raios `md`, `lg`, `xl` e `pill`, sombras dos níveis 1 a 3) e as classes de componente em `@layer components` (`btn-primary`, `btn-secondary`, `text-input`, `field-error`, `card-content`, `card-soft-tinted`, `nav-bar`); o `main.tsx` importa `@fontsource-variable/inter/wght.css` e o `app.css`. |
| SPA Web | `apps/web/src/components/nav-bar.tsx`, `apps/web/src/components/alert-icon.tsx`, `apps/web/src/routes/root/route.tsx`, `apps/web/src/routes/root/loader.ts`, `apps/web/src/routes/error-page.tsx` | Novos: barra de navegação e ícone de alerta em SVG inline, sem biblioteca de ícones. A rota raiz passa a renderizar a barra acima do conteúdo e o loader dela (`createRootLoader`) devolve a última sessão lida quando a releitura recebe `ApiUnavailableError`; a página de erro usa os tokens. |
| PostgreSQL | `apps/api/prisma/schema.prisma` | Sem mudança: as tabelas `user` e `account` da fundação já têm o que o cadastro grava, inclusive a constraint única em `email`. |

---

## Contratos de interface

`POST /api/auth/sign-up/email` (anônima, rota do Better Auth)
- Entrada:

```json
{ "name": "Ana Souza", "email": "Ana@Example.com", "password": "Segura123" }
```

- 200: conta criada, sem `Set-Cookie` de sessão e com `token` nulo (Better Auth 1.7.14, `routes/sign-up.mjs`, `shouldSkipAutoSignIn` com `requireEmailVerification`).

```json
{ "token": null, "user": { "id": "Yp3m2...", "name": "Ana Souza", "email": "ana@example.com", "emailVerified": false, "role": "user", "banned": false, "createdAt": "2026-10-30T12:00:00.000Z", "updatedAt": "2026-10-30T12:00:00.000Z" } }
```

- 400: corpo fora do esquema, com um item por campo recusado.

```json
{ "code": "VALIDATION_ERROR", "message": "Confira os campos destacados.", "fields": [ { "field": "password", "message": "A senha precisa ter no mínimo 8 caracteres, com pelo menos uma letra e um número." } ] }
```

- 422: e-mail já cadastrado, em qualquer combinação de maiúsculas.

```json
{ "code": "USER_ALREADY_EXISTS", "message": "Este e-mail já tem conta. Entre ou recupere a senha." }
```

- 422 `FAILED_TO_CREATE_USER`: corrida entre dois cadastros simultâneos com o mesmo e-mail, barrada pela constraint única (Better Auth 1.7.14, `routes/sign-up.mjs`); a SPA mostra a mesma mensagem do 422 de e-mail existente.
- 429: limite de 5 cadastros a cada 60 segundos por IP, com o cabeçalho `X-Retry-After` em segundos (Better Auth 1.7.14, `api/rate-limiter/index.mjs`).

`POST /api/auth/send-verification-email` (anônima, rota do Better Auth, usada pelo botão de reenvio)
- Entrada `{ "email": "ana@example.com" }`; responde 200 `{ "status": true }` para e-mail com e sem conta pendente, sem revelar qual (Better Auth 1.7.14, `routes/email-verification.mjs`); limite padrão da biblioteca de 3 pedidos a cada 60 segundos por IP.

Fila `email.send` (interna, BullMQ)
- Job com o nome `verify-email`:

```json
{ "type": "verify-email", "userId": "Yp3m2...", "url": "http://localhost:5173/confirmar-email?token=eyJ..." }
```

- Opções: `attempts` 5, `backoff` exponencial com `delay` de 5000 ms, `removeOnComplete` com `age` de 86400 s e `removeOnFail` com `age` de 604800 s.

E-mail de confirmação (Módulo E-mail para o Servidor SMTP)
- Remetente `SMTP_FROM`, destinatário o e-mail da conta, assunto "Confirme seu e-mail", corpo em texto e HTML em pt-BR com a saudação pelo nome, o link e a frase "O link vale por 24 horas.".

Rotas da SPA Web
- `/` (rota raiz): `nav-bar` com o nome do app como link para `/` e, sem sessão, os links "Entrar" para `/entrar` e "Criar conta" para `/cadastro`; com sessão, a barra mostra só o nome do app (hipótese). O conteúdo da fundação (estado da sessão) e o `Outlet` ficam abaixo da barra.
- `/cadastro`: filha da raiz, sob a barra. Título "Crie sua conta", card com nome, e-mail e senha e o botão "Criar conta"; depois do 200, o card troca o formulário pela mensagem "Enviamos um link de confirmação para <e-mail>. Confirme o e-mail antes de entrar." com o botão "Reenviar o link".

---

## Modelo de dados

Sem migração: o cadastro grava nas tabelas da fundação.
- `user`: `email` em minúsculas na constraint única existente, `emailVerified` falso, `role` `user`, `banned` falso.
- `account`: uma linha com `providerId` `credential`, `accountId` igual ao id da conta e `password` com o hash scrypt do Better Auth.
- `verification`: não recebe linha no cadastro, porque o token de confirmação do Better Auth 1.7.14 é um JWT assinado com o segredo (`createEmailVerificationToken` em `routes/email-verification.mjs`); o HLD diz o contrário em Modelo de dados, e o uso único fica com o RF-002, como a lacuna do HLD já registra.

Valkey (efêmero)
- `rate-limit:<chave do Better Auth>`: contador inteiro com expiração igual à janela da regra (60 s no cadastro, 10 s no geral).
- Chaves do BullMQ da fila `email.send`, com a retenção de Regras e fluxos.

---

## Tratamento de erros

| Erro | Onde é detectado | Resposta do sistema | O que a pessoa vê |
| --- | --- | --- | --- |
| E-mail já cadastrado | Módulo Contas, hook antes do cadastro; constraint única de `user.email` na corrida | 422 `USER_ALREADY_EXISTS` (ou `FAILED_TO_CREATE_USER` na corrida), sem criar conta | "Este e-mail já tem conta." com os links "Entrar" e "Recuperar a senha" |
| E-mail de `ADMIN_EMAIL` no cadastro aberto | Módulo Contas, hook antes do cadastro | 422 `USER_ALREADY_EXISTS`, sem criar conta e sem log com o e-mail | A mesma mensagem de e-mail já cadastrado |
| `TRUSTED_PROXIES` ausente com `NODE_ENV=production` | API, `loadEnv` na subida | O processo termina com o erro de configuração que nomeia a variável, sem imprimir valor | nada; a API não sobe |
| Senha fora da regra | SPA Web, `signUpSchema`; Módulo Contas, hook antes do cadastro | 400 `VALIDATION_ERROR` com o campo `password`, sem criar conta | A regra inteira abaixo do campo de senha |
| Campo obrigatório vazio ou e-mail inválido | SPA Web, `signUpSchema`; Módulo Contas, hook antes do cadastro | 400 `VALIDATION_ERROR` com cada campo recusado, sem criar conta | Mensagem abaixo do campo, com o foco no primeiro campo recusado |
| Falha no envio do e-mail (Valkey fora ao enfileirar) | Módulo E-mail, produtor da fila | Erro capturado pelo `runInBackgroundOrAwait` do Better Auth e registrado no log, sem dado pessoal; o cadastro responde 200 com a conta criada | A mensagem de link enviado com o botão "Reenviar o link" |
| Falha no envio do e-mail (SMTP fora ou recusando) | Módulo E-mail, worker | Nova tentativa até 5, com backoff exponencial a partir de 5 s; depois o job fica como falho | A mesma tela; o botão "Reenviar o link" gera um novo job |
| Conta do job não existe mais | Módulo E-mail, caso de uso de envio | Job concluído sem envio, com log pelo id da conta | nada |
| Conta do job já tem o e-mail verificado | Módulo E-mail, caso de uso de envio | Job concluído sem envio, com log pelo id do job e da conta | nada |
| Enfileiramento além de 3 segundos (Valkey lento) | Módulo E-mail, produtor da fila | O pedido é tratado como falho para o Better Auth; se o `add` termina depois, o log registra o id do job, e se falha, o erro por `describeError` | A tela de link enviado com o botão "Reenviar o link" |
| Limite de cadastros por IP excedido | Módulo Contas, rate limit do Better Auth | 429 com `X-Retry-After` | "Muitas tentativas. Tente de novo em alguns instantes." |
| Valkey fora do ar no rate limit | Módulo Contas, `valkey-rate-limit.storage.ts` | Libera a requisição (fail-open) só com a conexão caída ou sem resposta em 500 ms, e registra o erro por `describeError` | nada; o cadastro segue |
| Valkey reiniciando sob o worker | Módulo E-mail, worker | A conexão do worker guarda os comandos até reconectar e o consumo de `email.send` volta sem reiniciar a API | nada |
| API inacessível ao enviar o formulário | SPA Web, `apiFetch`; rota raiz na releitura da sessão | `ApiUnavailableError` tratado na `action`; o loader da raiz devolve a última sessão lida | "O servidor não respondeu. Tente de novo." sem perder o que foi digitado, exceto a senha, em qualquer forma do caminho `/cadastro` |

---

## Estratégia de testes

Unidade (Vitest, `*.spec.ts` ao lado do código)
- `packages/contracts/src/accounts.spec.ts`: `passwordSchema` aceita `Segura123` e recusa `segurança` (sem número), `12345678` (sem letra) e `Seg123` (curta), sempre com a mensagem da regra; `signUpSchema` recusa nome em branco e e-mail inválido.
- `apps/api/src/platform/config/env.spec.ts`: com `NODE_ENV=production`, `TRUSTED_PROXIES` vazia ou ausente derruba `loadEnv` nomeando a variável; em development e test segue opcional; `ADMIN_EMAIL` é opcional.
- `apps/api/src/modules/accounts/presentation/sign-up/sign-up.hook.spec.ts`: o hook ignora outros caminhos, devolve 400 com a lista de campos, 422 quando o `internalAdapter` dublê acha o e-mail em minúsculas e 422 para o e-mail de `ADMIN_EMAIL` em qualquer caixa.
- `apps/api/src/modules/accounts/infra/rate-limit/valkey-rate-limit.storage.spec.ts`: `consume` libera até o máximo, recusa o seguinte com `retryAfter` e libera com o Valkey dublê lançando erro; com a conexão em `connecting` ou `connect`, o comando segue e o limite vale; o log leva o erro por `describeError`, sem a mensagem do driver.
- `apps/api/src/modules/email/infra/queue/bullmq-email.queue.spec.ts`: o `add` que passa do limite e termina depois registra o id do job; o que falha depois registra o erro por `describeError`; o `error` da fila não leva a mensagem crua.
- `apps/api/src/modules/email/infra/queue/email-send.processor.spec.ts`: o `onError` do worker registra o erro por `describeError`.
- `apps/api/src/modules/accounts/infra/verification-email/send-verification-email.spec.ts`: o link usa `WEB_ORIGIN` e o token, e o pedido não leva senha.
- `apps/api/src/modules/email/domain/verify-email.template.spec.ts`: assunto, nome, link e a frase das 24 horas no texto e no HTML.
- `apps/api/src/modules/email/application/send-email/send-email.use-case.spec.ts`: lê o destinatário, entrega pelo transporte dublê, descarta conta inexistente e descarta conta já verificada (`already-verified`) sem chamar o transporte.
- `apps/web/src/routes/cadastro/action.spec.ts`: a `action` devolve erros por campo sem chamar a API, o estado de link enviado no 200, a mensagem de e-mail existente no 422 e a de servidor fora com `fetch` dublê.
- `apps/web/src/routes/root.spec.ts`: `createRootLoader` devolve a sessão lida, devolve a anterior quando a releitura recebe `ApiUnavailableError` e propaga o erro quando a API está fora já na primeira leitura.
- O estilo não ganha teste unitário: o Vitest da SPA roda em `environment: 'node'`, sem CSS computado. O `make build` prova que o Tailwind compila o `@theme`, e a aparência é conferida pela superfície UI.

Integração (Vitest, `apps/api/test/integration/**/*.int-spec.ts`, banco `app_test` e Valkey e Mailpit do Compose)
- `sign-up.int-spec.ts` (substitui o da fundação, que provava o cadastro fechado): cadastro válido cria a conta pendente sem cookie; e-mail com maiúsculas é gravado em minúsculas; duplicado em outra caixa é recusado com 422; o e-mail de `ADMIN_EMAIL` é recusado com 422 antes do seed (o caso "não deixa registrar o e-mail de ADMIN_EMAIL antes do seed" volta); campos fora do contrato (`image`) são descartados; senha e campos fora da regra respondem 400 sem criar conta; o sexto cadastro do mesmo IP em 60 s responde 429. Cada caso manda um `X-Forwarded-For` próprio, e o `createTestApp` apaga as chaves `rate-limit:*` na subida.
- `verification-email.int-spec.ts`: depois do cadastro, o e-mail chega ao Mailpit pela API REST dele, com o link da SPA e sem a senha; com o transporte trocado por um dublê que falha via `overrideProvider()`, o job tenta de novo; a conexão do worker tem a fila offline ligada e a do produtor não.
- `sign-up-logs.int-spec.ts`: com o logger capturado, um cadastro completo não escreve senha, nome, e-mail nem token em nenhuma linha.

Factories
- `apps/api/test/factories/user.factory.ts` ganha `pendingAccount`, que cria pelo próprio `POST /api/auth/sign-up/email` a conta usada pelos casos de duplicado.

Verificação por superfície

| Superfície | Mecanismo | Decisão |
| --- | --- | --- |
| API HTTP | requisições HTTP contra a API em execução no Compose, consulta ao PostgreSQL e às chaves do Valkey, leitura dos logs do serviço api, e o serviço api religado com outro `.env` nos itens de produção | fundação |
| Worker | leitura da caixa do Mailpit pela API REST dele, das chaves da fila `email.send` no Valkey e dos logs do serviço api, com serviços do Compose parados, pausados (`docker compose pause`) e religados | ADR-0016 |
| UI | navegador dirigido pelo `@playwright/cli` contra a SPA em execução, lendo o estilo computado, `document.fonts` e as requisições de rede, com a janela redimensionada nos itens de largura e o serviço api parado pelo Compose nos itens de falha | ADR-0024 |
| E2E | navegador dirigido pelo `@playwright/cli` na SPA, mais a caixa do Mailpit e os logs da API | ADR-0024 |

---

## Decisões e hipóteses

Decisões
- E-mail duplicado é recusado com 422 `USER_ALREADY_EXISTS` por um hook `before` em `/sign-up/email`, escolhido na entrevista. Com `requireEmailVerification`, o Better Auth 1.7.14 responde 200 com um usuário sintético ao e-mail existente (`routes/sign-up.mjs`, `shouldReturnGenericDuplicateResponse`), o que contraria o erro previsto e o critério do RF; o hook também evita o log da biblioteca que interpola o e-mail. Alternativa descartada: manter a resposta genérica e revisar o PRD.
- O link do e-mail leva à SPA em `/confirmar-email?token=`, e não à rota `GET /api/auth/verify-email` com `callbackURL`, escolhido na entrevista: scanner de e-mail que faz GET no link não roda JavaScript e não consome a confirmação, e as mensagens de erro ficam em pt-BR na tela do RF-002. Consequência: até o RF-002, o link cai na página de erro da SPA.
- O botão de reenvio fica sempre visível na tela de link enviado, escolhido na entrevista: o Better Auth chama o `sendVerificationEmail` por `runInBackgroundOrAwait`, que captura o erro e só registra (`context/create-context.mjs`), então a resposta do cadastro não tem como avisar a falha. Alternativa descartada: sinalizar a falha por hook `after`, que não cobre a falha no SMTP.
- O rate limit guarda os contadores no Valkey por `rateLimit.customStorage`, escolhido na entrevista. Na entrevista o custo apresentado foi o de leitura e escrita sem atomicidade, e isso estava errado: no 1.7.14 o `customStorage` precisa implementar `consume(key, rule)` atômico (`@better-auth/core`, `types/init-options.d.mts`, `BetterAuthRateLimitStorage`), feito com INCR e expiração no Valkey. Alternativa descartada: `secondaryStorage`, que leva sessões e verificações para o Valkey se `session.storeSessionInDatabase` e `verification.storeInDatabase` não forem ligados (`db/internal-adapter.mjs`), contra o HLD.
- `TRUSTED_PROXIES`, lista de CIDRs para `advanced.ipAddress.trustedProxies`, obrigatória com `NODE_ENV=production` e opcional em development e test, escolhido na revisão do PR #9 (achado de severidade alta). Sem ela o Better Auth confia num `X-Forwarded-For` de um valor só, que o cliente forja, e devolve IP nulo com mais de um valor ou sem cabeçalho em production, o que põe todos numa chave comum do rate limit (`@better-auth/core` 1.7.14, `utils/ip.mjs`, `getIPFromHeader` e `getIP`). Substitui a decisão da primeira versão, que a deixava opcional em todo ambiente. Alternativas descartadas: manter opcional com o aviso só no `.env.example`, e subir em produção com um aviso no log.
- O e-mail de `ADMIN_EMAIL` é recusado pelo hook de cadastro com o mesmo 422 `USER_ALREADY_EXISTS`, escolhido na revisão do PR #9 (achado de severidade média): com o cadastro aberto, alguém que se cadastra com esse e-mail antes do `make db-setup` faz o seed recusar a conta e nenhum admin nascer. A API passa a ler `ADMIN_EMAIL`, opcional, que antes só o seed lia. Alternativas descartadas: o seed assumir a conta pré-registrada (troca a senha, verifica e promove), que muda o CLI-ADMIN-04 da fundação, e manter a proteção só no seed.
- O hook de cadastro reescreve `ctx.body` no próprio objeto, só com os campos validados, e não devolve um `context.body` novo: o Better Auth 1.7.14 mescla o contexto devolvido pelo hook sobre o corpo original com `defu`, que não remove chaves.
- Rota `/cadastro` na SPA, escolhida na entrevista.
- Erro de validação em 400 `VALIDATION_ERROR` com a lista `fields`, no formato de `APIError` do Better Auth, escolhido na entrevista. Alternativa descartada: os códigos nativos `INVALID_EMAIL` e `PASSWORD_TOO_SHORT`, um por vez, que aceitam nome vazio (`name: z.string()` em `routes/sign-up.mjs`).
- Superfícies API HTTP, Worker, UI e E2E, com os gates `make check` e `make build`, escolhidas na entrevista.
- O BullMQ usa conexão própria a partir de `REDIS_URL`, e não a conexão `REDIS` da plataforma, porque o worker exige `maxRetriesPerRequest` nulo (BullMQ 6.5.1, `classes/redis-connection.js`) e a conexão compartilhada usa 1. O produtor usa `enableOfflineQueue` falso para falhar rápido com o Valkey fora, como recomenda o guia de produção do BullMQ (docs.bullmq.io, Going to production), em vez de segurar a resposta do cadastro; o worker usa outra conexão, com a fila offline ligada, como o mesmo guia recomenda, para esperar a reconexão em vez de entrar num ciclo de erro. O `@nestjs/bullmq` cria o worker com as opções da fila e as estáticas do `@Processor` por cima, então a conexão do worker é lida de `REDIS_URL` quando ele é criado.
- O `add` que passa do limite de 3 segundos não ganha `jobId` determinístico, e o desfecho real dele vai ao log: o reenvio gera um token novo, então o id não deduplicaria o caso e ainda arriscaria bloquear o reenvio legítimo do RF-002.
- A rota raiz da SPA resolve a API fora no próprio loader, guardando a última sessão lida, e não por `shouldRevalidate` com uma lista de ações neutras, que cada RF novo teria de lembrar de estender e que `/cadastro/` ou `/cadastro?x` já escapavam.
- `createAuth` recebe as dependências novas num parâmetro opcional, e não por import em `auth.ts`, porque o seed carrega `auth.ts` direto no Node sem compilar (comentário de `auth.ts`), e o seed segue chamando `createAuth(env, prisma)` sem fila nem rate limit.
- Ligar o rate limit no RF-001 faz valer o padrão do Better Auth de 3 sign-ins a cada 10 segundos até o RF-003 definir os 5 a cada 60 segundos do HLD (`api/rate-limiter/index.mjs`, `getDefaultSpecialRules`); os testes de integração existentes que entram com o admin passam a mandar `X-Forwarded-For` próprio.
- A SPA segue o `DESIGN.md` da raiz, sem a marca de terceiros que ele trazia, escolhido na entrevista; as três contradições dele se resolveram assim: o campo tem raio de 8px (prosa e tabela de Shapes contra o YAML, corrigido), o card de autenticação é branco com campos `#efefef` (o `ex-auth-form-card` cinza escondia os campos de mesmo fundo, corrigido) e o erro de campo fica em preto e branco com borda, ícone e ARIA (convenção nova no `DESIGN.md`). Alternativas descartadas: card cinza com campos brancos e um token vermelho de erro, que o próprio `DESIGN.md` proíbe.
- Tokens no `@theme` do Tailwind CSS 4 (ADR-0027), escolhido na entrevista, com `--color-*: initial` para só existirem as cores do `DESIGN.md` (tailwindcss.com/docs/theme) e o plugin `@tailwindcss/vite`, que a doc indica no lugar do PostCSS para Vite (tailwindcss.com/docs/installation/using-vite). A escala de espaçamento padrão do Tailwind (`--spacing` de 0,25rem) já é a base de 4px do `DESIGN.md` e fica como está. Alternativas descartadas: CSS Modules com variáveis, que não traria dependência, e CSS global sem escopo.
- Inter auto-hospedada por `@fontsource-variable/inter` (ADR-0028), escolhido na entrevista, importada como `wght.css` no `main.tsx` e usada como `Inter Variable` (fontsource.org/docs/guides/vite): a fonte sai da origem da SPA e nenhum IP de quem usa vai a terceiros. A UberMove do `DESIGN.md` é proprietária. Alternativas descartadas: só a pilha do sistema e o Google Fonts.
- O RF-001 aplica o `DESIGN.md` também à rota raiz e à página de erro, escolhido na entrevista, porque é a primeira tela com estilo e a barra é por onde se chega ao `/cadastro`.
- O restante da feature segue coberto por ADR aceito: Better Auth (ADR-0010), BullMQ (ADR-0015), Mailpit (ADR-0016), Nodemailer (ADR-0017), Zod (ADR-0023), `@playwright/cli` (ADR-0024), Tailwind CSS 4 (ADR-0027) e Inter (ADR-0028).
- O contrato verifica o estilo só pelo que se mede no navegador (estilo computado, fontes carregadas, ARIA, largura), escolhido na entrevista; alternativa descartada: um item subjetivo de revisão manual.
- O contrato da fundação precisa de revisão com `/spec-writer` depois deste RF: API-BORDA-05 dela exige 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`, e a spec da fundação já dizia que o RF-001 reabre o cadastro. O seed continua recusando conta existente sem papel admin (CLI-ADMIN-04 da fundação); o cadastro aberto passa a recusar o e-mail de `ADMIN_EMAIL` antes disso.

Hipóteses
- Nome com 1 a 100 caracteres depois de tirar os espaços das pontas, e e-mail com no máximo 254 caracteres (hipótese)
- Senha com no máximo 128 caracteres, o `maxPasswordLength` padrão do Better Auth (hipótese)
- Os logs do Better Auth vão para o logger pino da API por `logger.log`, no nível `warn` padrão da biblioteca, para sair em JSON e passar pela redação (hipótese)
- Mensagens da tela e do e-mail com o texto de Contratos de interface (hipótese)
- Os textos e códigos de erro vivem em `packages/contracts/src/accounts.ts`, para a SPA e a API usarem as mesmas mensagens (hipótese)
- Foco visível com contorno de 2px `ink` afastado 2px, que o `DESIGN.md` não define (hipótese)
- Barra de navegação sem menu recolhido no mobile, porque só tem dois links; com sessão ela mostra só o nome do app até existir o RF de sair (hipótese)
- Título da tela "Crie sua conta" em `display-lg` e avisos de servidor em `card-soft-tinted` com `role="alert"` (hipótese)
- Classes de componente em `@layer components` no `app.css`, com os nomes do `DESIGN.md`, em vez de utilidades repetidas em cada tela (hipótese)

Pendentes de ADR
- nenhuma: o estilo e a fonte da SPA, pendentes na primeira versão desta revisão, estão registrados no ADR-0027 (Tailwind CSS 4) e no ADR-0028 (Inter auto-hospedada).

---

## Rastreabilidade

| Bloco do PRD ou do HLD | Onde está nesta spec |
| --- | --- |
| Fluxo principal | Regras e fluxos, Contratos de interface |
| Fluxos alternativos e exceções | Regras e fluxos (e-mail em minúsculas) |
| Erros previstos | Tratamento de erros |
| Depende de | Escopo, Entradas |
| PRD, Decisão regra de senha e Decisão confirmação de e-mail obrigatória | Regras e fluxos |
| PRD, Segurança e autorização e Compliance | Regras e fluxos, Estratégia de testes |
| HLD, Fluxo Cadastro e confirmação | Regras e fluxos (fluxo técnico) |
| HLD, Interfaces públicas (API de autenticação, Fila de e-mail) | Contratos de interface |
| RF-001 Criar conta: SPA Web, Módulo Contas, Módulo E-mail, PostgreSQL, Redis; API de autenticação, Fila de e-mail | Componentes |
| `DESIGN.md` (tokens, componentes, Do's and Don'ts) | Regras e fluxos (Regras visuais), Componentes, Contratos de interface (Rotas da SPA Web) |
