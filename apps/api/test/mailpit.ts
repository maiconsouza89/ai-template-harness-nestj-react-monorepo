/**
 * Leitura da caixa do Mailpit do Compose pela API REST dele (ADR-0016), vista do host. Os testes
 * usam endereços únicos por execução e apagam só as mensagens que criaram: a caixa é a mesma do
 * ambiente local.
 */
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

export interface MailpitMessage {
  ID: string;
  From: { Address: string };
  To: { Address: string }[];
  Subject: string;
  Text: string;
  HTML: string;
}

/** Mensagens cujo destinatário é `address`, com o corpo completo. */
export async function messagesTo(address: string): Promise<MailpitMessage[]> {
  const query = encodeURIComponent(`to:"${address}"`);
  const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
  if (!search.ok) throw new Error(`Mailpit respondeu ${search.status}`);
  const { messages } = (await search.json()) as { messages: { ID: string }[] };
  return Promise.all(
    messages.map(async ({ ID }) => {
      const response = await fetch(`${MAILPIT_URL}/api/v1/message/${ID}`);
      return (await response.json()) as MailpitMessage;
    }),
  );
}

/** Espera até `timeoutMs` alguma mensagem para `address` chegar. */
export async function waitForMessagesTo(
  address: string,
  timeoutMs = 15_000,
): Promise<MailpitMessage[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const messages = await messagesTo(address);
    if (messages.length > 0 || Date.now() > deadline) return messages;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

/** Apaga da caixa as mensagens para `address`. */
export async function deleteMessagesTo(address: string): Promise<void> {
  const messages = await messagesTo(address);
  if (messages.length === 0) return;
  await fetch(`${MAILPIT_URL}/api/v1/messages`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ IDs: messages.map(({ ID }) => ID) }),
  });
}
