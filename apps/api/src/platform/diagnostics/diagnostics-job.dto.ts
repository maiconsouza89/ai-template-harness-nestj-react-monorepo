/**
 * Corpo de `POST /api/diagnostics/jobs`. Classe para o plugin CLI do `@nestjs/swagger` (ADR-0020)
 * gerar o esquema; a validação é a do `diagnosticsJobSchema` (Zod, ADR-0023).
 */
export class DiagnosticsJobRequestDto {
  /** `succeed` conclui o job; `fail` lança erro em toda tentativa. */
  outcome: 'succeed' | 'fail';
}

/** Resposta 202 de `POST /api/diagnostics/jobs`. */
export class DiagnosticsJobResponseDto {
  /** Id do job na fila `diagnostics`. */
  jobId: string;
}
