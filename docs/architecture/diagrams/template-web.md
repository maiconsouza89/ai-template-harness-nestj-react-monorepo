# C4: Template de aplicação web com contas e tarefas

Fonte: docs/architecture/hld.md versão 0.2.5
ADRs: 0003, 0004, 0005, 0007, 0008, 0010, 0012, 0013, 0014, 0015, 0016, 0017, 0025
Data: 2026-10-30

---

## Diagramas

| Nível | Arquivo | Público | O que mostra |
| --- | --- | --- | --- |
| C1 System Context | `template-web-c1.puml` | Produto e negócio | Pessoa usuária e admin usando o sistema, que envia e-mails por um servidor SMTP externo |
| C2 Container | `template-web-c2.puml` | Arquitetura e liderança técnica | SPA Web, API NestJS, PostgreSQL e Redis (Valkey), com tecnologia e protocolo de cada ligação |
| C3 Component | `template-web-c3.puml` | Quem implementa o container | Os quatro módulos da API NestJS (Contas, Usuários, Tarefas, E-mail) e o pacote Contratos |
| C4 Code Level | pulado | Quem implementa | O HLD dá a organização de pastas da Clean Architecture por módulo (`domain/`, `application/<caso>/`, `infra/`, `presentation/<caso>/`, porta como classe abstrata) mas nenhuma assinatura, classe ou campo; o nível depende de uma spec por RF ou do código |

Para ver: `sh .claude/skills/c4-writer/scripts/render.sh docs/architecture/diagrams` gera SVG ao
lado de cada `.puml` (precisa de plantuml local ou docker).

---

## Origem dos elementos

| Elemento | Diagramas | Origem |
| --- | --- | --- |
| Pessoa usuária | C1, C2 | PRD, Contexto e problema (público-alvo); HLD, Rastreabilidade com o PRD |
| Admin | C1, C2 | PRD, Contexto e problema (público-alvo); HLD, Segurança (autorização) |
| Template de aplicação web com contas e tarefas | C1, C2 | HLD, título e Objetivo técnico |
| Servidor SMTP | C1, C2, C3 | HLD, Objetivo técnico (sistemas conectados) e Interfaces; ADR-0017, ADR-0016 |
| SPA Web | C2, C3 | HLD, Componentes e responsabilidades e Arquitetura geral; ADR-0004, ADR-0005 |
| API NestJS | C2, C3 | HLD, Arquitetura geral (subgrafo "API NestJS", monólito modular); ADR-0003, ADR-0013, ADR-0005 |
| PostgreSQL | C2, C3 | HLD, Componentes e responsabilidades; ADR-0007, ADR-0008 |
| Redis | C2, C3 | HLD, Componentes e responsabilidades; ADR-0014 (Valkey 9) |
| Contratos | C3 | HLD, Componentes e responsabilidades e Padrões adotados (tipos compartilhados); ADR-0012 |
| Módulo Contas | C3 | HLD, Componentes e responsabilidades; ADR-0010 |
| Módulo Usuários | C3 | HLD, Componentes e responsabilidades; ADR-0010 (plugin admin) |
| Módulo Tarefas | C3 | HLD, Componentes e responsabilidades; ADR-0008, ADR-0025 |
| Módulo E-mail | C3 | HLD, Componentes e responsabilidades e Interfaces (fila `email.send`); ADR-0015, ADR-0017 |

---

## Hipóteses

- Relação "Entrega os e-mails na caixa de entrada" (Servidor SMTP → Pessoa usuária, C1): o HLD descreve o fluxo só até o servidor SMTP ("mensagem MIME com destinatário"); a entrega à pessoa é inferida do PRD, que manda o link de confirmação e recuperação "para o endereço informado". Vale também para o Admin, omitido para não duplicar a linha.

---

## Fora do escopo

- Dev que inicia projeto (público principal do PRD): interage com o repositório e o ambiente local, não com o sistema em execução; o único ponto de contato em runtime, a interface web do Mailpit, aparece só na descrição do Servidor SMTP.
- Contratos no C1 e no C2: só existe em tempo de build (HLD), então não é container; aparece na nota do C2 e como elemento no C3, com relações marcadas como "dependência de build".
- Balanceador de carga, TLS, backup e cofre de segredos: fornecidos pelo destino, que o HLD declara agnóstico; não fazem parte do sistema entregue.
- Coletor OTLP do destino (ADR-0019): exportação desligada por padrão, sem endpoint configurado, e o coletor é do destino.
- Documento OpenAPI (`/api/docs`, ADR-0020): interface interna da própria API NestJS, publicada só fora de produção; não muda nenhuma relação.
- Ambiente local (Docker Compose, ADR-0006; `make db-setup`): forma de subir os mesmos containers, não um container a mais.

---

## Conflitos e lacunas

- O HLD chama o serviço de chave e valor de "Redis", e o ADR-0014 aceito decidiu Valkey 9. O rótulo segue o HLD ("Redis", para o leitor achar o componente) e a tecnologia segue o ADR (Valkey 9). O próprio HLD lista em Próximos passos a renomeação com `/hld-writer`; quando acontecer, atualize o rótulo nos três diagramas.
- O HLD não nomeia a API como componente da tabela, só como o subgrafo "API NestJS" do diagrama Mermaid; o rótulo do container vem dali.
- O HLD não diz o protocolo entre a API e o PostgreSQL; o `$techn` usa o ORM do ADR-0008 (Prisma 7).
