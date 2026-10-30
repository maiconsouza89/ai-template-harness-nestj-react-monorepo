/**
 * Regra de dependência da API (ADR-0025), fiscalizada pelo dependency-cruiser (ADR-0026) no
 * script `lint` deste pacote, que o `make lint` roda pelo Turborepo. Os caminhos são relativos a
 * `apps/api`. Cada módulo em `src/modules/<funcionalidade>/` tem as pastas de camada `domain/`,
 * `application/`, `infra/` e `presentation/`; `src/platform/` é infraestrutura transversal e
 * `src/generated/` é o cliente gerado do Prisma. Os `*.spec.ts` seguem as mesmas regras do arquivo
 * que testam. Pasta de camada nova ou exceção muda aqui junto com o ADR que a justifica.
 *
 * CommonJS porque o pacote é `"type": "module"` e este é o formato que o `depcruise --init` gera.
 */

/** Cliente gerado do Prisma, resolvido ou não (antes do `prisma generate` o import fica sem resolução). */
const PRISMA_GERADO = ['^src/generated/', '(^|/)generated/prisma/'];

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-so-importa-domain',
      comment:
        'domain/ não importa nada fora do domain/ do próprio módulo: nem framework, nem pacote, nem outra camada (ADR-0025).',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/domain/' },
      to: { pathNot: '^src/modules/$1/domain/' },
    },
    {
      name: 'application-so-importa-domain',
      comment:
        'application/ importa só o domain/ e o application/ do próprio módulo e, do framework, @nestjs/common para o @Injectable() (ADR-0025).',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/application/' },
      to: {
        pathNot: [
          '^src/modules/$1/(domain|application)/',
          '(^|/)node_modules/@nestjs/common/',
        ],
      },
    },
    {
      name: 'presentation-nao-importa-infra',
      comment:
        'presentation/ não importa infra/ de módulo nenhum; a implementação chega pela porta ligada no <funcionalidade>.module.ts (ADR-0025).',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/presentation/' },
      to: { path: '^src/modules/[^/]+/infra/' },
    },
    {
      name: 'modulo-nao-importa-camadas-de-outro',
      comment:
        'Nenhum arquivo de um módulo importa as pastas de camada de outro; a fronteira pública de um módulo é o <funcionalidade>.module.ts (ADR-0025, ADR-0026).',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/[^/]+/(domain|application|infra|presentation)/',
        pathNot: '^src/modules/$1/',
      },
    },
    {
      name: 'platform-nao-importa-modules',
      comment:
        'platform/ é infraestrutura transversal e nunca depende de um módulo de funcionalidade (ADR-0025).',
      severity: 'error',
      from: { path: '^src/platform/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'domain-e-application-nao-importam-platform',
      comment:
        'domain/ e application/ não importam platform/; a infraestrutura chega pela porta implementada em infra/ (ADR-0025).',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/(domain|application)/' },
      to: { path: '^src/platform/' },
    },
    {
      name: 'prisma-gerado-so-em-infra-e-platform',
      comment:
        'O cliente gerado do Prisma (src/generated/) só é importado por infra/ dos módulos e por platform/ (ADR-0025).',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: [
          '^src/platform/',
          '^src/modules/[^/]+/infra/',
          '^src/generated/',
        ],
      },
      to: { path: PRISMA_GERADO },
    },
    {
      name: 'sem-ciclo',
      comment: 'Nenhum ciclo de import em src/ (ADR-0026).',
      severity: 'error',
      from: { path: '^src/' },
      to: { circular: true },
    },
  ],
  options: {
    // Import só de tipo conta como import: um `import type` do Prisma em domain/ também falha.
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    // O cliente gerado e os pacotes entram no grafo como destino, sem serem percorridos.
    doNotFollow: { path: ['node_modules', '^src/generated/'] },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
