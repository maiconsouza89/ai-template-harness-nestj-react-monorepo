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

/** Ids das mensagens cujo destinatário é `address`, numa só busca. */
async function messageIdsTo(address: string): Promise<string[]> {
  const query = encodeURIComponent(`to:"${address}"`);
  const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
  if (!search.ok) throw new Error(`Mailpit respondeu ${search.status}`);
  const { messages } = (await search.json()) as { messages: { ID: string }[] };
  return messages.map(({ ID }) => ID);
}

async function readMessages(ids: string[]): Promise<MailpitMessage[]> {
  return Promise.all(
    ids.map(async (ID) => {
      const response = await fetch(`${MAILPIT_URL}/api/v1/message/${ID}`);
      return (await response.json()) as MailpitMessage;
    }),
  );
}

/** Mensagens cujo destinatário é `address`, com o corpo completo. */
export async function messagesTo(address: string): Promise<MailpitMessage[]> {
  return readMessages(await messageIdsTo(address));
}

/** Espera até `timeoutMs` alguma mensagem para `address` chegar; só lê os corpos no fim. */
export async function waitForMessagesTo(
  address: string,
  timeoutMs = 15_000,
): Promise<MailpitMessage[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const ids = await messageIdsTo(address);
    if (ids.length > 0 || Date.now() > deadline) return readMessages(ids);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

/** Apaga da caixa as mensagens para `address`. */
export async function deleteMessagesTo(address: string): Promise<void> {
  const IDs = await messageIdsTo(address);
  if (IDs.length === 0) return;
  await fetch(`${MAILPIT_URL}/api/v1/messages`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ IDs }),
  });
}
