import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import {
  EnvValidationError,
  loadEnv,
  type Env,
} from './platform/config/env.js';
import {
  configureApp,
  configureAppOptionsFromEnv,
  NEST_APPLICATION_OPTIONS,
} from './platform/http/configure-app.js';

/**
 * Valida a configuração antes de criar a aplicação: falta ou valor inválido termina o processo
 * com código 1 e uma linha que nomeia as variáveis, sem imprimir valor nenhum nem abrir a porta.
 * Sai pelo console, não pelo pino: o logger ainda não existe e a linha precisa ser legível.
 */
function validateEnvOrExit(): Env {
  try {
    return loadEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

/**
 * A instrumentação do OpenTelemetry não entra por aqui: `node --import ./dist/instrumentation.js`
 * a carrega antes deste arquivo (ADR-0019). Ordem da subida: logger pino (ADR-0018), prefixo,
 * versionamento, CORS e, por último, o documento OpenAPI. Os hooks de desligamento fecham a
 * aplicação (Prisma, Valkey) no SIGTERM antes de o processo terminar.
 */
async function bootstrap() {
  const env = validateEnvOrExit();
  const app = await NestFactory.create(AppModule, NEST_APPLICATION_OPTIONS);
  app.useLogger(app.get(PinoLogger));
  configureApp(app, configureAppOptionsFromEnv(env));
  app.enableShutdownHooks();
  await app.listen(env.PORT);
}
await bootstrap();
