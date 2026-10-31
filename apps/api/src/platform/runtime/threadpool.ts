/**
 * Tamanho do threadpool do libuv quando o ambiente não define `UV_THREADPOOL_SIZE`. O padrão do
 * Node é 4, e o `dns.lookup` (o `getaddrinfo` que o `net.connect` usa) ocupa uma thread enquanto
 * espera o resolvedor. Com o Valkey fora, cada conexão do `ioredis` (a compartilhada, a do
 * produtor e as do worker do BullMQ) volta a tentar e prende uma thread por vários segundos num
 * nome que não resolve; quatro threads presas atrasam a resolução de `postgres` numa conexão nova
 * do pool, e o health check declara o PostgreSQL `down` sem ele estar. Cada cliente tem no máximo
 * uma tentativa de conexão em curso, então 16 deixa folga sobre o número de conexões da API.
 */
export const DEFAULT_THREADPOOL_SIZE = 16;

/**
 * Define `UV_THREADPOOL_SIZE` em `env` se ele não vier definido; um valor do ambiente prevalece.
 * O libuv lê a variável ao criar o threadpool, no primeiro trabalho assíncrono que o usa: só tem
 * efeito chamada antes disso, como faz o `instrumentation.ts`, carregado por `--import`.
 */
export function ensureThreadpoolSize(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!env.UV_THREADPOOL_SIZE) {
    env.UV_THREADPOOL_SIZE = String(DEFAULT_THREADPOOL_SIZE);
  }
}
