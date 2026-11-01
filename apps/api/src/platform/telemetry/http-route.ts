import { context } from '@opentelemetry/api';
import { getRPCMetadata, RPCType } from '@opentelemetry/core';

/**
 * Middleware que grava `route` como rota da requisição no metadado RPC do contexto ativo (spec da
 * fundação, Contratos de interface, Métricas exportadas). A `@opentelemetry/instrumentation-http`
 * cria esse metadado ao receber a requisição e, quando ela termina, copia `route` para o atributo
 * `http.route` do span de servidor e da métrica `http.server.request.duration`, e renomeia o span
 * para `<método> <rota>`. A `instrumentation-express` faz o mesmo para as rotas do Nest, mas não
 * vê rota num handler montado sem caminho, como o do Better Auth: este middleware cobre esse caso.
 * Sem a exportação ligada não há metadado no contexto, e o middleware só segue adiante.
 */
export function createHttpRouteMiddleware(route: string) {
  return (_req: unknown, _res: unknown, next: () => void): void => {
    const rpcMetadata = getRPCMetadata(context.active());
    if (rpcMetadata?.type === RPCType.HTTP) rpcMetadata.route = route;
    next();
  };
}
