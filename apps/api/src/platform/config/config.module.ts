import { Global, Module } from '@nestjs/common';
import { loadEnv } from './env.js';

/** Token do objeto `Env` validado; injete com `@Inject(ENV) private readonly env: Env`. */
export const ENV = Symbol('ENV');

/**
 * Disponibiliza a configuração validada para toda a aplicação. O factory lança
 * `EnvValidationError` quando falta variável, e o `main.ts` já a valida antes de criar a app
 * para a mensagem sair limpa; aqui a validação é a garantia para quem sobe o módulo sem o main
 * (testes de integração).
 */
@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv() }],
  exports: [ENV],
})
export class ConfigModule {}
