---
status: accepted
date: 2026-10-28
title: "Usar Vite e React Router em SPA para o frontend"
description: "Por que uma SPA React com Vite e React Router em modo data em vez de Next.js ou do modo framework do React Router: as telas ficam todas atrás de login e o NestJS já é o único servidor."
supersedes:
superseded-by:
---

# 0004. Usar Vite e React Router em SPA para o frontend

## Contexto e problema

O template entrega um frontend React (ADR-0002) que consome a API NestJS (ADR-0003). Todas as
telas do PRD, exceto cadastro, confirmação, entrar e recuperação de senha, exigem sessão, e nenhum
requisito pede SEO ou primeira pintura renderizada no servidor; o PRD só exige navegadores dos
últimos 2 anos, em desktop e celular. Faltava escolher como o React é empacotado, roteado e servido,
o que define a estrutura de pastas da tela de tarefas que o dev copia para cada entidade nova.

## Opções consideradas

- **Vite + React Router em modo data (SPA)**: build do Vite, rotas com `createBrowserRouter`, `loader` e `action`, saída estática servida por qualquer CDN.
- **React Router em modo framework**: o mesmo roteador com plugin Vite, rotas por módulo e SSR opcional; perdeu por trazer convenção de servidor e tipos gerados que uma SPA logada não usa.
- **Next.js (App Router)**: framework full-stack com Server Components; perdeu porque põe um segundo servidor Node ao lado do NestJS e divide a regra entre dois backends.
- **Vite + TanStack Router**: roteador com tipagem forte de rotas e parâmetros; perdeu por ser menos difundido, o que pesa na meta de um dev copiar o padrão em até 2 horas.

## Decisão

Escolhido **Vite com React Router em modo data, como SPA**, porque o NestJS continua o único
servidor e o front vira arquivo estático, enquanto `loader` e `action` dão à tela de tarefas um
lugar padrão para buscar e gravar dados sem uma biblioteca de roteamento própria do template.

## Consequências

- Bom: `vite build` gera só arquivos estáticos; o deploy do front não precisa de runtime Node, e a API é o único processo a escalar.
- Bom: passar do modo data para o modo framework é trocar a configuração de rotas, sem trocar de biblioteca, se um dia surgir tela pública que precise de SSR.
- Ruim: sem SSR, a primeira tela só aparece depois de baixar e executar o bundle; tela pública que precise de SEO exige rever este ADR.
- Ruim: o React Router 8 exige Node 22.22 ou superior e React 19.2.7 ou superior, um piso acima do que o NestJS pede; a versão do Node continua decisão separada, mas tem de respeitar esse piso.
- Ruim: cache de dados, estado de servidor e estilo ficam fora desta decisão; se o `loader` não bastar, uma biblioteca como TanStack Query entra por ADR próprio.

## Referências

Consultado em 2026-10-28.

- [React: Creating a React App](https://react.dev/learn/creating-a-react-app): recomenda Next.js e React Router como frameworks e diz que todos suportam SPA servida de CDN.
- [React: Build a React app from Scratch](https://react.dev/learn/build-a-react-app-from-scratch): Vite começa como SPA só de cliente e exige escolher roteador e busca de dados; cita React Router e TanStack Router.
- [React Router: Picking a Mode](https://reactrouter.com/start/modes): modo data com `createBrowserRouter`, `loader` e `action`; modo framework soma plugin Vite, rotas por módulo e SSR.
- [react-router no npm](https://www.npmjs.com/package/react-router): versão 8.5.1 na data da consulta, `engines.node >= 22.22.0` e peer dependency de `react >= 19.2.7`.
- [vite no npm](https://www.npmjs.com/package/vite): versão 8.3.5 na data da consulta, `engines.node ^20.19.0 || >=22.12.0`.
