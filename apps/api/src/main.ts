import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import {
  EnvValidationError,
  loadEnv,
  type Env,
} from './platform/config/env.js';
import {
  configureApp,
  NEST_APPLICATION_OPTIONS,
} from './platform/http/configure-app.js';

/**
 * Valida a configuração antes de criar a aplicação: falta ou valor inválido termina o processo
 * com código 1 e uma linha que nomeia as variáveis, sem imprimir valor nenhum nem abrir a porta.
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

async function bootstrap() {
  const env = validateEnvOrExit();
  const app = await NestFactory.create(AppModule, NEST_APPLICATION_OPTIONS);
  configureApp(app, { webOrigin: env.WEB_ORIGIN });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
