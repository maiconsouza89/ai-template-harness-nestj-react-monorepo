/**
 * Instrumentação do OpenTelemetry (ADR-0019), carregada antes de qualquer módulo da aplicação por
 * `node --import ./dist/instrumentation.js dist/main.js` (`start:prod`, a imagem) ou pelo
 * `bin/node-with-otel.sh` que o `nest start --exec` usa em watch. Nunca importe este arquivo do
 * `main.ts`: em ESM o grafo inteiro é carregado antes de executar, e o hook de módulos tem de
 * estar registrado antes de `@nestjs/core` ser carregado.
 *
 * Sem `OTEL_EXPORTER_OTLP_ENDPOINT` este arquivo não faz nada: não carrega o SDK, não registra o
 * hook e não escreve log (spec da fundação, Regras). Com a variável, o `NodeSDK` sobe com a
 * auto-instrumentação de HTTP, Nest e as demais do pacote (ioredis, pg, pino) mais a do Prisma,
 * e exporta traces, métricas e logs por OTLP (`http/protobuf` por padrão) para o endpoint, com
 * `/v1/traces`, `/v1/metrics` e `/v1/logs` acrescentados pelo SDK. As demais variáveis
 * `OTEL_*` da especificação (`OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_PROTOCOL`,
 * `OTEL_TRACES_SAMPLER`, `OTEL_LOG_LEVEL`...) valem como o SDK as define.
 *
 * Coletor inacessível: a exportação é descartada e o SDK avisa por este logger, em JSON como o
 * resto da API (spec, Tratamento de erros); a aplicação segue respondendo.
 */
import { register } from 'node:module';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (endpoint) {
  const [
    { diag, DiagLogLevel },
    { getNodeAutoInstrumentations },
    { NodeSDK },
    { PrismaInstrumentation },
    { pino },
  ] = await Promise.all([
    import('@opentelemetry/api'),
    import('@opentelemetry/auto-instrumentations-node'),
    import('@opentelemetry/sdk-node'),
    import('@prisma/instrumentation'),
    import('pino'),
  ]);

  // Avisos e erros do SDK (exportação recusada, coletor fora) em JSON por linha, no nível da API.
  const log = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: { component: 'opentelemetry' },
  });
  const forward =
    (level: 'error' | 'warn' | 'info' | 'debug' | 'trace') =>
    (message: string, ...args: unknown[]) => {
      log[level](
        {
          details: args.map((arg) =>
            arg instanceof Error ? `${arg.name}: ${arg.message}` : arg,
          ),
        },
        message,
      );
    };
  diag.setLogger(
    {
      error: forward('error'),
      warn: forward('warn'),
      info: forward('info'),
      debug: forward('debug'),
      verbose: forward('trace'),
    },
    DiagLogLevel.WARN,
  );

  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'api',
    instrumentations: [
      getNodeAutoInstrumentations({
        // Um span por leitura de arquivo só faz ruído; o que interessa é HTTP, Nest e banco.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
      new PrismaInstrumentation(),
    ],
  });

  // A aplicação é ESM: `import-in-the-middle` intercepta os módulos carregados daqui em diante
  // (`@nestjs/core`, `pino`...) para a instrumentação os envolver; os CommonJS (`http`,
  // `express`) passam pelo `require-in-the-middle` que o SDK já liga. O Node 26 depreca
  // `module.register()` (DEP0205) a favor de `registerHooks()`, que o import-in-the-middle
  // 2.0 ainda não oferece; o aviso fica suprimido só nesta chamada para o log seguir em JSON.
  const noDeprecation = process.noDeprecation;
  process.noDeprecation = true;
  try {
    register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);
  } finally {
    process.noDeprecation = noDeprecation;
  }
  sdk.start();

  // Esvazia os lotes pendentes no desligamento. O `main.ts` liga os hooks de desligamento do
  // Nest, que fecham a aplicação e reenviam o sinal; sem eles este listener impediria o
  // processo de terminar no SIGTERM.
  const shutdown = () => {
    sdk.shutdown().catch((error: unknown) => {
      log.warn(
        { details: [error instanceof Error ? error.message : String(error)] },
        'Falha ao desligar o SDK do OpenTelemetry',
      );
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  process.once('beforeExit', shutdown);
}
