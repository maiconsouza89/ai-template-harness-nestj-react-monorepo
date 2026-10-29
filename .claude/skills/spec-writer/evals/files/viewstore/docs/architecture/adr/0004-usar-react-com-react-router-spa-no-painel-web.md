---
status: accepted
date: 2026-10-23
title: "Usar React com React Router em modo SPA no painel web"
description: "Por que React com React Router em modo SPA em vez de Next.js ou Angular: o painel fica atrás de login, roda como estático na CDN sem servidor a mais, e o React tem o maior mercado para contratar."
supersedes:
superseded-by:
---

# 0004. Usar React com React Router em modo SPA no painel web

## Contexto e problema

O viewstore precisa de um painel no navegador, em desktop e celular, para exibidor, anunciante e operador, e de um mapa aberto de telas públicas que o visitante usa sem conta. O ADR-0002 fixou TypeScript no painel para compartilhar tipos com a API NestJS. Quase tudo fica atrás de login, o mapa não precisa de SEO no piloto, e o PRD pede resposta em até 1 segundo no p95 e 99,5 por cento de disponibilidade. Ninguém do time colocou framework de frontend em produção, então qualquer escolha tem curva de aprendizado. O player da TV (RF-012) tem outras restrições e fica para um ADR próprio.

## Opções consideradas

- **React com React Router em modo SPA**: framework recomendado pelo React, com build estático servido por CDN e pré-renderização por rota se o mapa precisar de SEO depois.
- **Next.js**: no modo estático, rota dinâmica sem `generateStaticParams` não funciona, o que inviabiliza páginas como `/campanhas/[id]`; com SSR, é mais um servidor Node para operar.
- **Angular**: módulos e injeção de dependência iguais aos do NestJS, o que encurta o aprendizado, mas tem cerca de 2,5 vezes menos uso que o React entre desenvolvedores, então contratar e achar biblioteca é mais difícil.
- **React com Vite, sem framework**: mesmo build estático, mas roteamento, carregamento de dados e divisão de código ficam para o time montar, e ninguém do time já fez isso.

## Decisão

Escolhido **React com React Router em modo SPA**, porque o painel roda como arquivo estático na CDN, sem um servidor a mais disputando os 99,5 por cento, e o React é o framework com mais gente para contratar num time que vai aprender de qualquer jeito. Se o mapa precisar de SEO, as rotas dele passam a ser pré-renderizadas no build, sem trocar de framework.

## Consequências

- Bom: o deploy do painel é copiar `build/client` para a CDN, então uma queda do painel só vem da CDN ou da API, nunca de um servidor de renderização.
- Bom: um contrato alterado na API quebra a compilação do painel, como prometido no ADR-0002.
- Ruim: a CDN precisa reescrever toda URL para `index.html`; sem essa regra, abrir um link direto do painel dá 404.
- Ruim: o primeiro acesso baixa e executa o JavaScript antes de mostrar dados, então o mapa aberto é o ponto mais sujeito a estourar o p95 de 1 segundo em celular.
- Ruim: rota com `loader` de servidor não existe em modo SPA, então todo dado vem de `clientLoader` chamando a API, e a autorização fica só no backend.

## Referências

Consultado em 2026-10-23.

- [React: Creating a React App](https://react.dev/learn/creating-a-react-app): recomenda começar por um framework, lista React Router e Next.js, diz que eles rodam como SPA sem servidor e compara montar do zero com Vite a construir o próprio framework.
- [React Router: Single Page App (SPA)](https://reactrouter.com/how-to/spa): `ssr: false` gera um `index.html` no build, `build/client` vai para qualquer host estático, a URL precisa ser reescrita para `index.html` e `loader` só vale em rota pré-renderizada.
- [Next.js: Static Exports](https://nextjs.org/docs/app/guides/static-exports): lista rota dinâmica sem `generateStaticParams`, cookies e Server Actions como recursos sem suporte no modo estático.
- [Angular: Server-side and hybrid rendering](https://angular.dev/guide/ssr): SSR e pré-renderização vêm de fábrica, então o Angular não perdeu por falta de recurso.
- [NestJS: Introduction](https://docs.nestjs.com/): "The architecture is heavily inspired by Angular", o que sustenta o aprendizado mais curto do Angular para este time.
- [Stack Overflow Developer Survey 2025: Technology](https://survey.stackoverflow.co/2025/technology/): entre desenvolvedores profissionais, React 46,9 por cento, Next.js 21,5 por cento e Angular 19,8 por cento de uso, o que sustenta o argumento de contratação.
