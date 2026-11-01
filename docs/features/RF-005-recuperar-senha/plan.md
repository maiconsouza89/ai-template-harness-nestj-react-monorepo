# Plano: RF-005 Recuperar senha

Spec: spec.md. Contrato: contract.md.

---

## Pré-requisitos

- Fundação e RF-001 feitos: cadastro com a regra de senha em Contratos, Módulo E-mail com a fila `email.send`, rate limit no Valkey, rota nativa de entrar e a base visual da SPA.
- Compose no ar com api, web, postgres, valkey e mailpit, e `make db-setup` aplicado.

---

## Fase 1: link de recuperação guardado e enviado

1. **Contratos:** acrescentar os esquemas do pedido, da troca e do formulário com confirmação, o código e os textos da recuperação (spec, Componentes e Contratos de interface).
2. **Módulo E-mail:** acrescentar o tipo de e-mail de recuperação com o template "Redefina sua senha" e renderizá-lo no envio.
3. **Módulo Contas, domínio:** criar a porta dos registros de recuperação e a função de hash do identificador com prefixo.
4. **Módulo Contas, infra:** implementar a porta sobre a tabela `verification`, com a remoção dos anteriores da conta e dos vencidos.
5. **Módulo Contas, callback de envio:** criar o callback que limpa os vencidos, pede o e-mail com o link da SPA e só então apaga os anteriores, mantendo a resposta neutra quando a fila falha.

## Fase 2: troca da senha na API

6. **Módulo Contas, plugin de recuperação:** criar o hook da regra de senha antes da troca e o endpoint de checagem do link sem consumo (spec, Regras e fluxos).
7. **Módulo Contas, composição:** ligar no `createAuth` o callback, o hash do identificador, a validade do link definida no PRD, a revogação de sessões e o limite de 5 pedidos por minuto, e no `accounts.module.ts` a porta, o callback e o plugin, mantendo o seed sem essas dependências.
8. **Módulo Contas, integração:** cobrir pedido neutro, hash no banco, novo pedido, fila fora, checagem, troca com revogação de sessões, uso único, vencimento, corrida, regra de senha, conta pendente, limite e ausência de dado pessoal nos logs, com as factories novas (spec, Estratégia de testes).

## Fase 3: tela de pedido

9. **SPA Web, pedido:** criar a rota `/recuperar-senha` com a `action` do pedido, o aviso neutro com "Enviar para outro e-mail" e os avisos de limite e de servidor fora, com as classes do `DESIGN.md`.

## Fase 4: tela de nova senha

10. **SPA Web, checagem do link:** criar o loader de `/redefinir-senha` que checa o link e devolve o estado, sem chamar a API quando falta o token.
11. **SPA Web, troca:** criar a `action` que confere a regra e a igualdade das senhas, envia a troca e trata link inválido, sem revalidar a checagem depois.
12. **SPA Web, tela:** montar o formulário com os dois campos, o estado de link inválido com "Pedir outro link" e o de senha alterada com "Entrar", e registrar as duas rotas como filhas da raiz.
