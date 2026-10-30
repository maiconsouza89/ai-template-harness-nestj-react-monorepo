---
status: accepted
date: 2026-10-30
title: "Usar Tailwind CSS 4 para o estilo da SPA"
description: "Por que Tailwind CSS 4 com @tailwindcss/vite e os tokens do DESIGN.md no @theme em vez de CSS Modules com variáveis CSS: a paleta fica restrita ao DESIGN.md no próprio framework e as telas se montam sem folha por componente."
supersedes:
superseded-by:
---

# 0027. Usar Tailwind CSS 4 para o estilo da SPA

## Contexto e problema

O ADR-0004 deixou o estilo da SPA fora da decisão, e a fundação entregou a SPA sem CSS. O RF-001
traz a primeira tela com aparência definida, e o `DESIGN.md` da raiz fixa os tokens de cor,
tipografia, raio e espaçamento que todas as telas seguintes vão usar. Sem um mecanismo escolhido,
cada RF com tela escolheria o seu, e os tokens se espalhariam em formatos diferentes.

## Opções consideradas

- **Tailwind CSS 4 com `@tailwindcss/vite`**: utilitários gerados de um bloco `@theme` em CSS, com o plugin oficial do Vite.
- **CSS Modules com variáveis CSS**: suporte nativo do Vite para `*.module.css`, sem dependência; perdeu porque cada tela teria a própria folha de estilo e nada impede uma cor fora do `DESIGN.md`.
- **CSS global só com variáveis**: classes globais com os nomes dos componentes do `DESIGN.md`, sem dependência; perdeu porque não tem escopo e os nomes colidem quando os RFs com tela se somarem.

## Decisão

Escolhido o **Tailwind CSS 4 com `@tailwindcss/vite`**, com os tokens do `DESIGN.md` no `@theme`
de `apps/web/src/styles/app.css` e `--color-*: initial` para remover a paleta padrão. A escolha
foi da pessoa responsável, na entrevista da spec do RF-001. Com isso, uma cor fora do
`DESIGN.md` não gera utilitário, e montar uma tela não exige escrever CSS novo.

## Consequências

- Bom: `bg-red-500` e qualquer cor fora do `DESIGN.md` deixam de existir como classe, então o desvio de paleta falha no build em vez de passar em revisão.
- Bom: a escala de espaçamento padrão (`--spacing` de 0,25rem) já é a base de 4px do `DESIGN.md` e não precisa ser redefinida.
- Bom: o motor nativo `@tailwindcss/oxide` chega por dependências opcionais por plataforma, inclusive `linux-x64-musl`, sem script de instalação, então não entra em `allowBuilds` e roda na imagem Alpine do ADR-0005.
- Ruim: o Tailwind 4 exige Safari 16.4, Chrome 111 e Firefox 128 ou mais novos; a meta de navegadores dos últimos 2 anos do PRD cabe nisso hoje, mas uma meta mais larga obrigaria a voltar ao 3.4.
- Ruim: o JSX das telas carrega listas longas de classes utilitárias; os componentes repetidos do `DESIGN.md` vão para `@layer components` no `app.css`, e esquecer isso espalha a mesma combinação por várias telas.

## Referências

Consultado em 2026-10-30.

- [Theme variables, Tailwind CSS](https://tailwindcss.com/docs/theme): tokens no `@theme` e `--color-*: initial` removendo os utilitários padrão do namespace.
- [Installing with Vite, Tailwind CSS](https://tailwindcss.com/docs/installation/using-vite): plugin `@tailwindcss/vite` indicado para projetos Vite no lugar do PostCSS.
- [Compatibility, Tailwind CSS](https://tailwindcss.com/docs/compatibility): a v4 depende de Chrome 111, Safari 16.4 e Firefox 128.
- [@tailwindcss/vite no npm](https://www.npmjs.com/package/@tailwindcss/vite): 4.3.3, peer `vite` `^5.2.0 || ^6 || ^7 || ^8`, compatível com o Vite 8 do catálogo.
- [@tailwindcss/oxide no npm](https://www.npmjs.com/package/@tailwindcss/oxide): 4.3.3, binários por plataforma em `optionalDependencies` e nenhum script de instalação.
- [CSS Modules, Vite](https://vite.dev/guide/features#css-modules): arquivos `.module.css` tratados sem plugin, a alternativa sem dependência.
