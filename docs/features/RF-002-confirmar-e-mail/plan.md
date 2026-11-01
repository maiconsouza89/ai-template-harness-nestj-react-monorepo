# Plano: RF-002 Confirmar e-mail

Spec: spec.md. Contrato: contract.md.

---

## Pré-requisitos

- Fundação e RF-001 feitos: cadastro aberto, callback de envio do e-mail de confirmação, Módulo E-mail com a fila `email.send`, rate limit no Valkey e a base visual da SPA.
- Compose no ar com api, web, postgres, valkey e mailpit, e `make db-setup` aplicado.

---

## Fase 1: link de uso único

1. **Contratos:** acrescentar os códigos e as mensagens da confirmação e o esquema do corpo do reenvio (spec, Componentes e Contratos de interface).
2. **Módulo Contas, domínio:** criar a porta dos registros de confirmação e o cálculo do hash do token.
3. **Módulo Contas, infra:** implementar a porta sobre a tabela `verification`, com a troca do registro da conta numa transação.
4. **Módulo Contas, callback de envio:** gravar o registro do token antes de pedir o envio ao Módulo E-mail, apagando os anteriores da conta.

## Fase 2: confirmação na API

5. **Módulo Contas, plugin de confirmação:** criar o hook de `/verify-email` com as regras de uso único, prazo, conta já ativa e corrida (spec, Regras e fluxos).
6. **Módulo Contas, composição:** ligar a porta, o callback e o plugin no `accounts.module.ts` e no `createAuth`, mantendo o seed sem essas dependências.
7. **Módulo Contas, integração:** cobrir confirmação, vencimento, reenvio, corrida, limite do reenvio e ausência de dado pessoal nos logs, com as factories novas (spec, Estratégia de testes).

## Fase 3: tela de confirmação

8. **SPA Web, loader:** criar o loader de `/confirmar-email` que confirma o link e devolve o estado, sem chamar a API quando falta o token.
9. **SPA Web, reenvio:** criar a `action` do reenvio com o campo de e-mail, os avisos de sucesso, limite e servidor fora, sem revalidar a confirmação.
10. **SPA Web, tela:** montar os quatro estados e o botão "Entrar" com as classes do `DESIGN.md` e registrar a rota como filha da raiz.

## Fase 4: revisão do PR #16

11. **Módulo Contas, registros de confirmação:** separar na porta e na implementação a gravação do registro novo, a remoção dos anteriores da conta e a limpeza dos vencidos além do prazo de retenção (spec, Regras e Modelo de dados).
12. **Módulo Contas, callback de envio:** gravar o registro novo, limpar os vencidos, pedir o envio e só então apagar os anteriores, desfazendo o registro novo quando o pedido falha.
13. **Módulo Contas, plugin de confirmação:** deixar de apagar o registro antes da biblioteca e apagá-lo no hook `after` quando a resposta não é erro, cobrindo corrida, recusa da biblioteca, reenvio com a fila fora e limpeza na integração.
14. **SPA Web, tela de confirmação:** acrescentar o botão "Enviar para outro e-mail" depois do aviso do reenvio, que volta ao campo com o e-mail digitado.
15. **SPA Web, página inicial:** mover a página inicial para uma rota índice da raiz, que mostra a página de erro com a API fora, e tirar da raiz a dedução pela ausência de tela filha.
