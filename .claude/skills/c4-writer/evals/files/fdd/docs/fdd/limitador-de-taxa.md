# FDD: Limitador de taxa do gateway de pedidos

Versão: 1.1.0
Data: 2026-10-10
Responsável: Time de Plataforma

## Contexto

O gateway de pedidos (`order-gateway`, Go 1.23) recebe pedidos de lojistas parceiros pela API pública
e repassa ao serviço de pedidos. Picos de tráfego de alguns lojistas derrubam o serviço de pedidos para
todos. Esta feature adiciona um limitador de taxa por lojista e por rota.

O limitador é uma **biblioteca Go embarcada** no processo do `order-gateway` (pacote `ratelimit`), não
um serviço separado. O estado compartilhado entre as réplicas do gateway fica num Redis 7.2 já usado
pela plataforma (ElastiCache). Sem Redis disponível, cai para estado em memória por réplica.

## Atores e sistemas

- Lojista parceiro: chama a API pública do gateway com uma chave de API.
- Time de plataforma: ajusta limites por lojista em arquivo YAML versionado, recarregado a cada 60 s.
- Serviço de pedidos: sistema interno que recebe os pedidos aceitos pelo gateway (HTTP/JSON).
- Redis 7.2: armazenamento do contador compartilhado.
- Prometheus: coleta as métricas do gateway, inclusive as do limitador.

## Desenho

Fluxo: o middleware HTTP do gateway extrai a chave do lojista e a rota, chama `Limiter.Allow`, e
responde 429 com cabeçalho `Retry-After` quando negado. Aceito, o pedido segue ao serviço de pedidos.

Estratégias suportadas:
- `token_bucket` (padrão): recarga contínua de tokens até `Burst`.
- `fixed_window`: contador por janela de `Window`.

Atomicidade: no Redis, verificação e decremento num script Lua (`EVALSHA`); em memória, `sync.Mutex`
por chave.

## Interfaces e estruturas

```go
package ratelimit

type Limiter interface {
    Allow(ctx context.Context, key Key) (Decision, error)
}

type Key struct {
    MerchantID string
    Route      string
}

type Decision struct {
    Allowed    bool
    Remaining  int
    RetryAfter time.Duration
}

type Policy struct {
    Strategy Strategy      // token_bucket | fixed_window
    Rate     int           // requisições por segundo
    Burst    int           // só token_bucket
    Window   time.Duration // só fixed_window
}

type Strategy string

type Store interface {
    Take(ctx context.Context, key Key, p Policy) (Decision, error)
}

// RedisStore implementa Store com script Lua.
type RedisStore struct {
    client *redis.Client
    sha    string
}

// MemoryStore implementa Store com mutex por chave.
type MemoryStore struct {
    mu      sync.Mutex
    buckets map[Key]*bucket
}

// New monta o Limiter com fallback: usa RedisStore e cai para MemoryStore se o Redis falhar.
func New(primary Store, fallback Store, policies PolicySource) Limiter

type PolicySource interface {
    PolicyFor(key Key) Policy
}

// FilePolicySource lê o YAML e recarrega a cada 60 s.
type FilePolicySource struct {
    path     string
    interval time.Duration
}
```

Validações:
- `Rate` maior que zero; `Burst` maior ou igual a `Rate` em `token_bucket`; `Window` entre 1 s e 1 h.
- Política inválida no YAML: mantém a anterior e registra erro.

## Observabilidade

Métricas Prometheus `ratelimit_decisions_total{result,strategy}` e `ratelimit_store_fallback_total`.

## Fora do escopo

- Painel web para o lojista ver o consumo do limite (fica para a v2).
- Limite global por IP (o WAF já faz).
- Estratégia `sliding_log`, descartada por custo de memória no Redis.
