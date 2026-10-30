---
status: accepted
date: 2026-10-30
title: "Usar Inter auto-hospedada como fonte da SPA"
description: "Por que a Inter auto-hospedada por @fontsource-variable/inter em vez do Google Fonts ou da pilha de fontes do sistema: a fonte sai da origem da SPA, sem enviar o IP de quem usa a terceiros, e a tela é igual em todo sistema operacional."
supersedes:
superseded-by:
---

# 0028. Usar Inter auto-hospedada como fonte da SPA

## Contexto e problema

O `DESIGN.md` da raiz pede uma sans geométrica em pesos 400, 500 e 700 para toda a SPA. A face
que ele descrevia na origem é proprietária, e o próprio `DESIGN.md` aponta a Inter como substituta.
O PRD tem meta de Compliance sobre dados pessoais e telas usáveis em navegadores dos últimos 2
anos, em desktop e celular. Falta decidir de onde a fonte vem.

## Opções consideradas

- **Inter auto-hospedada por `@fontsource-variable/inter`**: pacote npm com a Inter variável, importado no `main.tsx` e empacotado pelo Vite junto com a SPA.
- **Inter pelo Google Fonts**: `<link>` para `fonts.googleapis.com` no `index.html`, sem dependência; perdeu porque cada visita envia o IP de quem usa a um terceiro e a tela depende de outra origem para renderizar.
- **Só a pilha do sistema** (`system-ui, Helvetica Neue, Arial, sans-serif`): sem dependência nem download; perdeu porque a aparência muda entre sistemas operacionais e o peso 500 não existe em todas as fontes de sistema.

## Decisão

Escolhida a **Inter auto-hospedada por `@fontsource-variable/inter`**, importada como `wght.css`
no `main.tsx` e usada como `Inter Variable`, com a pilha do sistema de fallback. A escolha foi da
pessoa responsável, na entrevista da spec do RF-001. Assim a fonte é a mesma em toda plataforma e
nenhuma requisição de fonte sai da origem da SPA.

## Consequências

- Bom: os arquivos de fonte saem do mesmo servidor estático da imagem da SPA (ADR-0005), então a CSP pode deixar `font-src` em `'self'`.
- Bom: um arquivo variável por subconjunto cobre os pesos 400, 500 e 700, em vez de um arquivo por peso.
- Ruim: a fonte entra no bundle e no primeiro carregamento da SPA; até ela chegar, o texto aparece na fonte de fallback e muda depois.
- Ruim: a versão da Inter só muda quando alguém atualiza o pacote, sem a atualização automática de uma CDN.

## Referências

Consultado em 2026-10-30.

- [Vite, Fontsource](https://fontsource.org/docs/guides/vite): import de `@fontsource-variable/<fonte>/wght.css` no ponto de entrada, cobrindo todos os pesos com um arquivo por subconjunto.
- [@fontsource-variable/inter no npm](https://www.npmjs.com/package/@fontsource-variable/inter): 5.3.0, licença OFL-1.1, sem dependências.
