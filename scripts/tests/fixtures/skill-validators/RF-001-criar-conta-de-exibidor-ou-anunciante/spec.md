# Spec: RF-001 Criar conta de exibidor ou anunciante

PRD: docs/product/prd.md versão 0.1.2
HLD: docs/architecture/hld.md versão 0.2.0
Complexidade: trivial

---

## Escopo

Incluído
- Cadastro de conta com papel de exibidor, anunciante ou ambos, e do estabelecimento com ponto confirmado.

Entradas
- nenhuma

Saídas
- `POST /v1/contas`, consumido por RF-002 e RF-003.

Fora desta spec
- Cadastro de tela, que é do RF-002.

---

## Regras e fluxos

- Documento repetido não cria segunda conta.
- A API recebe o cadastro, Contas grava a conta e o estabelecimento.

---

## Componentes

| Componente do HLD | Caminho | O que muda nesta feature |
| --- | --- | --- |
| Contas | `src/contas/` | Novo módulo de conta e estabelecimento. |
| API | `src/api/contas.controller.ts` | Nova rota de cadastro. |

---

## Contratos de interface

`POST /v1/contas` recebe nome, documento, papéis e estabelecimento, e responde 201 com o id da conta.

---

## Modelo de dados

Tabelas `contas` e `estabelecimentos`, criadas por migração nova.

---

## Tratamento de erros

| Erro | Onde é detectado | Resposta do sistema | O que a pessoa vê |
| --- | --- | --- | --- |
| Documento já cadastrado | Contas | 409 | Oferta de entrar na conta existente |
| Endereço não localizado no mapa | Contas | 422 | Posicionar o ponto à mão |

---

## Estratégia de testes

Testes de unidade ao lado do código e de integração da API em `test/`.

Verificação por superfície

| Superfície | Mecanismo | Decisão |
| --- | --- | --- |
| API HTTP | requisições HTTP contra a API em execução | não precisa |

---

## Decisões e hipóteses

Decisões
- Rota única de cadastro, escolhida na entrevista.

Hipóteses
- nenhuma

Pendentes de ADR
- nenhuma

---

## Rastreabilidade

| Bloco do PRD ou do HLD | Onde está nesta spec |
| --- | --- |
| Fluxo principal | Regras e fluxos |
| Erros previstos | Tratamento de erros |
| RF-001 Criar conta | Componentes |
