/**
 * Leitura da caixa do Mailpit do Compose pela API REST dele (ADR-0016), em `MAILPIT_API_URL` do
 * `.env.test`. Os arquivos de integração rodam em paralelo contra a mesma caixa, então o helper
 * nunca esvazia a caixa: cada teste usa um destinatário único e filtra por ele.
 */

/** Resumo de uma mensagem na busca (`GET /api/v1/search`). */
export interface MailpitSummary {
  ID: string;
  To: { Address: string; Name: string }[];
  Subject: string;
}

/** Mensagem completa (`GET /api/v1/message/{ID}`), com os cabeçalhos em `Headers`. */
export interface MailpitMessage extends MailpitSummary {
  From: { Address: string; Name: string };
  Text: string;
  HTML: string;
  Headers: Record<string, string[]>;
}

function apiUrl(path: string): string {
  const base = process.env.MAILPIT_API_URL;
  if (!base) throw new Error('MAILPIT_API_URL precisa estar no .env.test');
  return new URL(path, base).toString();
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path));
  if (!response.ok) {
    throw new Error(`Mailpit respondeu ${response.status} em ${path}`);
  }
  return (await response.json()) as T;
}

/** Mensagens cujo destinatário é exatamente `to`, sem diferenciar maiúsculas. */
export async function messagesTo(to: string): Promise<MailpitSummary[]> {
  const query = encodeURIComponent(`to:"${to}"`);
  const { messages } = await getJson<{ messages: MailpitSummary[] }>(
    `/api/v1/search?query=${query}`,
  );
  const wanted = to.toLowerCase();
  return messages.filter((message) =>
    message.To.some((address) => address.Address.toLowerCase() === wanted),
  );
}

/** Mensagem completa, com texto, HTML e cabeçalhos. */
export async function getMessage(id: string): Promise<MailpitMessage> {
  const [message, headers] = await Promise.all([
    getJson<MailpitMessage>(`/api/v1/message/${id}`),
    getJson<Record<string, string[]>>(`/api/v1/message/${id}/headers`),
  ]);
  return { ...message, Headers: headers };
}

/**
 * Espera a caixa ter ao menos `count` mensagens para `to`, consultando a cada `intervalMs`, e
 * devolve as mensagens completas. Esgotado `timeoutMs`, lança dizendo quantas chegaram.
 */
export async function waitForMessages(
  to: string,
  { count = 1, timeoutMs = 15_000, intervalMs = 200 } = {},
): Promise<MailpitMessage[]> {
  const deadline = Date.now() + timeoutMs;
  let found: MailpitSummary[] = [];
  while (Date.now() < deadline) {
    found = await messagesTo(to);
    if (found.length >= count) {
      return Promise.all(found.map((message) => getMessage(message.ID)));
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(
    `Mailpit: esperava ${count} mensagem(ns) para o destinatário em ${timeoutMs} ms, chegaram ${found.length}`,
  );
}
