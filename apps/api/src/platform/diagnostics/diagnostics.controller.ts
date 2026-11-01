import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { Queue } from 'bullmq';
import { withTimeout } from '../async/with-timeout.js';
import { describeError } from '../logging/describe-error.js';
import {
  DiagnosticsJobRequestDto,
  DiagnosticsJobResponseDto,
} from './diagnostics-job.dto.js';
import {
  DIAGNOSTICS_ENQUEUE_TIMEOUT_MS,
  DIAGNOSTICS_JOB_NAME,
  DIAGNOSTICS_JOB_OPTIONS,
  DIAGNOSTICS_QUEUE,
  diagnosticsJobSchema,
  type DiagnosticsJob,
} from './diagnostics.queue.js';

/**
 * `POST /api/diagnostics/jobs`, anônima e fora do versionamento, só com o `DiagnosticsModule`
 * carregado: enfileira um job na fila `diagnostics` e responde 202 com o id. Corpo fora do
 * esquema responde 400 sem enfileirar; Valkey fora responde 503.
 */
@AllowAnonymous()
@Controller({ path: 'diagnostics', version: VERSION_NEUTRAL })
export class DiagnosticsController {
  private readonly logger = new Logger(DiagnosticsController.name);

  constructor(@InjectQueue(DIAGNOSTICS_QUEUE) private readonly queue: Queue) {}

  /** Enfileira um job de diagnóstico que conclui (`succeed`) ou falha em toda tentativa (`fail`). */
  @Post('jobs')
  @HttpCode(HttpStatus.ACCEPTED)
  async enqueue(
    @Body() body: DiagnosticsJobRequestDto,
  ): Promise<DiagnosticsJobResponseDto> {
    const parsed = diagnosticsJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        'O corpo deve ser { "outcome": "succeed" } ou { "outcome": "fail" }',
      );
    }
    const data: DiagnosticsJob = { outcome: parsed.data.outcome };
    try {
      const job = await withTimeout(
        this.queue.add(DIAGNOSTICS_JOB_NAME, data, DIAGNOSTICS_JOB_OPTIONS),
        DIAGNOSTICS_ENQUEUE_TIMEOUT_MS,
        `a fila ${DIAGNOSTICS_QUEUE} não respondeu em ${DIAGNOSTICS_ENQUEUE_TIMEOUT_MS} ms`,
      );
      return { jobId: String(job.id) };
    } catch (error) {
      this.logger.warn(
        `Job de diagnóstico não entrou na fila: ${describeError(error)}`,
      );
      throw new ServiceUnavailableException('Fila de diagnóstico indisponível');
    }
  }
}
