import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { createPinoHttpOptions } from './logger.js';

/**
 * Logs estruturados com nestjs-pino (ADR-0018), registrado uma vez aqui e importado pelo módulo
 * raiz. O `LoggerModule` é global: `Logger` do nestjs-pino se injeta em qualquer módulo e o
 * `main.ts` o liga ao Nest com `app.useLogger`, com `bufferLogs` nas opções de criação para as
 * linhas da subida saírem já em JSON.
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({ pinoHttp: createPinoHttpOptions(env) }),
    }),
  ],
})
export class LoggingModule {}
