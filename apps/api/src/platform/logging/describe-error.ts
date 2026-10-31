/**
 * Descreve um valor para o log sem dado pessoal: de um erro, só o nome e o `code` (o `P2002` do
 * Prisma, o `ECONNREFUSED` do Node); de qualquer outro valor, só o tipo. A mensagem do erro fica
 * de fora porque pode citar dado pessoal: a do Prisma traz o trecho do código que fez a chamada e,
 * na validação, os argumentos, e a de driver e SMTP pode citar o valor recusado ou o destinatário
 * (ADR-0018).
 */
export function describeError(value: unknown): string {
  if (value instanceof Error) {
    const code = (value as { code?: unknown }).code;
    return typeof code === 'string' || typeof code === 'number'
      ? `${value.name} (${code})`
      : value.name;
  }
  return typeof value;
}
