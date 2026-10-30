---
status: accepted
date: 2026-10-30
title: "Usar Clean Architecture com casos de uso por pasta na API"
description: "Por que camadas domain, application, infra e presentation por módulo, com uma pasta por caso de uso, em vez do vertical slice do ADR-0011: a regra de dependência fica verificável pelo caminho do arquivo e o caso de uso deixa de conhecer HTTP."
supersedes: "0011"
superseded-by:
---

# 0025. Usar Clean Architecture com casos de uso por pasta na API

## Contexto e problema

O ADR-0011 pôs controller e handler na mesma pasta de slice, e nada separa aplicação de
apresentação: o handler pode lançar `HttpException` ou ler a requisição sem que nenhuma
verificação acuse. Desde então o time decidiu tornar explícita a regra de dependência da Clean
Architecture e os princípios SOLID, com a camada identificável pelo caminho do arquivo para uma
ferramenta conseguir barrar o import errado (ADR-0026). O custo que o ADR-0011 apontou, o caso de
uso repartido entre pastas, passa a ser aceito. A organização se repete em toda entidade e é cara
de trocar depois que elas existem.

## Opções consideradas

- **Clean em camadas por módulo, com pasta por caso de uso**: `domain/`, `application/<caso>/`, `infra/` e `presentation/<caso>/` dentro de cada módulo Nest.
- **Manter o ADR-0011**: slice com controller e handler juntos; perdeu porque a fronteira aplicação/apresentação não existe e não há como checá-la.
- **Slice primeiro, camada por sufixo** (`create-task/create-task.use-case.ts` ao lado do controller): perdeu porque a camada só aparece no nome do arquivo, e regra por sufixo é frágil de manter na ferramenta.
- **Um pacote do workspace por camada**, como os projetos do híbrido descrito por Jovanović: perdeu porque multiplica `package.json` e tarefas do Turborepo (ADR-0002) para a mesma garantia que pasta e ADR-0026 já dão.

## Decisão

Escolhida a **Clean em camadas por módulo, com pasta por caso de uso**: `domain/` (entidades,
value objects, erros de domínio e portas como classe abstrata) não importa nada fora de si;
`application/<caso>/` tem uma classe de caso de uso com `execute()` que depende só do domínio e,
do framework, só de `@Injectable()`; `infra/` implementa as portas com Prisma e fila, e
`presentation/<caso>/` traz controller e DTO, sem importar `infra/`. O `<funcionalidade>.module.ts`
é a raiz de composição, que liga cada porta por `{ provide: Porta, useClass: Implementacao }`.

## Consequências

- Bom: import proibido entre camadas ou para dentro de outro módulo quebra `make lint` (ADR-0026), em vez de depender de revisão.
- Bom: o caso de uso é testado com dublê da porta via `overrideProvider()`, sem HTTP, sem banco e sem mock do cliente Prisma; erro de domínio não carrega status HTTP, quem traduz é um filtro em `presentation/`.
- Ruim: caso de uso novo cria duas pastas (`application/<caso>/` e `presentation/<caso>/`) e uma linha no módulo, contra uma pasta no ADR-0011.
- Ruim: `@Injectable()` é a única dependência de framework fora de `infra/` e `presentation/`; trocar o NestJS exige tirar o decorator de todo caso de uso.
- Ruim: o `nest g resource` (ADR-0009) continua sem servir; o módulo nasce com `nest g module` e as camadas à mão ou por gerador do template.

## Referências

Consultado em 2026-10-30.

- [Robert C. Martin: The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html): a regra de dependência ("source code dependencies can only point inwards"), inversão de dependência na fronteira e só estruturas simples cruzando camadas, base das quatro pastas e do DTO na apresentação.
- [Jimmy Bogard: Vertical Slice Architecture](https://www.jimmybogard.com/vertical-slice-architecture/): acoplar no eixo da mudança e minimizar o compartilhamento entre slices, o que mantém uma pasta por caso de uso dentro de cada camada.
- [Milan Jovanović: Vertical Slice Architecture vs Clean Architecture](https://www.milanjovanovic.tech/blog/vertical-slice-vs-clean-architecture): o híbrido de features dentro da camada de aplicação de uma solução Clean, que esta decisão segue com pastas em vez de projetos.
- [NestJS: Custom providers](https://docs.nestjs.com/fundamentals/custom-providers): classe abstrata como contrato e token de injeção ao mesmo tempo, ligada por `useClass`; interface sozinha não serve de token.
