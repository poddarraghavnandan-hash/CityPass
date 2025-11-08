# Redis Caching Layer

Comprehensive caching system for CityPass LLM/ML operations to reduce costs and improve performance.

## Features

- **Embedding Cache**: Cache embedding vectors (7-day TTL)
- **Extraction Cache**: Cache event extraction results (12-hour TTL)
- **Web Scrape Cache**: Cache scraped HTML/markdown (6-hour TTL)
- **Search Cache**: Cache search results (5-minute TTL)
- **Ranking Cache**: Cache personalized rankings (2-minute TTL)
- **User Persona Cache**: Cache user profiles (24-hour TTL)

## Performance Impact

- **Embedding Cache Hit**: Reduces compute by 80%, ~200ms → ~5ms
- **Extraction Cache Hit**: Saves API costs, ~$0.01 → $0.00 per event
- **Overall Cost Reduction**: Estimated 70-90% reduction in LLM costs

## Architecture

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────┐      Cache Hit    ┌─────────────┐
│ Cache Layer │ ─────────────────►│   Return    │
└──────┬──────┘                   └─────────────┘
       │ Cache Miss
       ▼
┌─────────────┐
│  Compute    │
│ (Ollama/API)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Store in   │
│   Cache     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Return    │
└─────────────┘
```

## Setup

### 1. Start Redis via Docker Compose

```bash
cd infra
docker-compose up -d redis
```

Redis will be available at `localhost:6379`.

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Cache Control
USE_EMBEDDING_CACHE=true
USE_EXTRACTION_CACHE=true
```

### 3. Verify Redis Connection

```bash
docker exec -it citypass_redis redis-cli ping
# Should return: PONG
```

## Usage

### Automatic Caching (Recommended)

Caching is automatically enabled for all embedding and extraction operations:

```typescript
import { generateEmbedding, extractEvent } from '@citypass/llm';

// Automatically cached (7-day TTL)
const embedding = await generateEmbedding('jazz concert in Brooklyn');

// Automatically cached (12-hour TTL)
const event = await extractEvent(html, url);
```

### Manual Cache Control

Skip cache for specific operations:

```typescript
// Skip cache for this operation
const embedding = await generateEmbedding('test', { skipCache: true });

// Disable cache via environment variable
process.env.USE_EMBEDDING_CACHE = 'false';
```

### Cache Utilities

```typescript
import {
  getCacheStats,
  clearAllCache,
  invalidateCache,
  warmupCache
} from '@citypass/llm';

// Get cache statistics
const stats = await getCacheStats();
console.log(stats);
// {
//   connected: true,
//   keyCount: 1250,
//   memoryUsed: '42.3M',
//   hitRate: 78.5
// }

// Clear all cache
await clearAllCache();

// Invalidate specific patterns
await invalidateCache('embedding'); // Clear all embeddings
await invalidateCache('extraction'); // Clear all extractions

// Warmup cache with common queries
await warmupCache(['jazz', 'concerts', 'Brooklyn'], generateEmbedding);
```

### API Endpoints

#### Get Cache Stats
```bash
curl http://localhost:3004/api/cache/stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "connected": true,
    "totalKeys": 1250,
    "memoryUsed": "42.3M",
    "hitRate": "78.50%"
  }
}
```

#### Clear All Cache
```bash
curl -X DELETE "http://localhost:3004/api/cache/stats?action=clear"
```

#### Invalidate by Pattern
```bash
curl -X DELETE "http://localhost:3004/api/cache/stats?action=invalidate&pattern=embedding"
```

## Cache TTL Configuration

| Cache Type | Default TTL | Configurable? | Notes |
|------------|-------------|---------------|-------|
| Embeddings | 7 days | Yes | Long-lived, rarely change |
| Extractions | 12 hours | Yes | Events may update |
| Web Scrapes | 6 hours | Yes | Content may change |
| Search Results | 5 minutes | Yes | Real-time freshness |
| Rankings | 2 minutes | Yes | Personalized, short-lived |
| User Personas | 24 hours | Yes | Session-based |

Customize TTLs:
```typescript
import { CACHE_TTL, withCache } from '@citypass/llm';

// Use custom TTL
await withCache('my-namespace', params, computeFn, {
  ttl: 60 * 60, // 1 hour
});

// Access default TTLs
console.log(CACHE_TTL.EMBEDDING); // 604800 (7 days)
```

## Cache Key Generation

Cache keys are generated using SHA-256 hashing of parameters:

```typescript
// Input: { text: 'jazz concert', model: 'bge-m3' }
// Key: citypass:embedding:a1b2c3d4e5f6g7h8

// Format: citypass:<namespace>:<hash>
```

This ensures:
- Unique keys for different parameters
- Consistent keys for same inputs
- Short, efficient keys (~50 chars)

## Memory Management

Redis is configured with:
- **Max Memory**: 512MB
- **Eviction Policy**: `allkeys-lru` (Least Recently Used)
- **Persistence**: AOF (Append-Only File)

When memory is full, Redis automatically evicts least-recently-used keys.

## Batch Caching

Batch operations intelligently cache individual items:

```typescript
const texts = ['jazz', 'rock', 'classical', 'jazz']; // 'jazz' appears twice

// Automatically checks cache for each item
const embeddings = await generateEmbeddingsBatch(texts);

// Result:
// - 'jazz': Cache HIT (returned from cache)
// - 'rock': Cache MISS (computed and cached)
// - 'classical': Cache MISS (computed and cached)
// - 'jazz' (2nd): Cache HIT (returned from cache)

// Output: Cache HIT: 2/4 embeddings (50% hit rate)
```

## Monitoring

### Redis CLI

```bash
# Connect to Redis
docker exec -it citypass_redis redis-cli

# View all keys
KEYS citypass:*

# Get key TTL
TTL citypass:embedding:a1b2c3d4

# Get memory usage
INFO memory

# Get hit rate
INFO stats
```

### Logs

Cache operations are logged to console:

```
Cache HIT: embedding
Cache MISS: extraction
Cache HIT: 15/20 embeddings (75% hit rate)
Updated cached persona: session-abc123
Invalidated 42 cache entries matching: embedding
```

## Cost Savings Example

### Without Cache
- 1000 queries/day
- Average 3 embeddings per query = 3000 embeddings/day
- BGE-M3 compute: ~200ms per embedding
- **Total compute time**: 600 seconds (10 minutes/day)
- **No cost** (local Ollama)

### With Cache (70% hit rate)
- Cache hits: 2100 embeddings (instant, ~5ms)
- Cache misses: 900 embeddings (200ms)
- **Total compute time**: 180 seconds (3 minutes/day)
- **Time saved**: 420 seconds (7 minutes/day)
- **Compute reduction**: 70%

### Extraction Cost Savings
- 100 events/day
- Without cache: $0.01/event × 100 = **$1.00/day** = **$365/year**
- With cache (80% hit rate): $0.01 × 20 = **$0.20/day** = **$73/year**
- **Cost savings**: **$292/year** (80% reduction)

## Troubleshooting

### Cache Not Working

1. **Check Redis Connection**
   ```bash
   docker exec -it citypass_redis redis-cli ping
   ```

2. **Check Environment Variables**
   ```bash
   echo $REDIS_URL
   echo $USE_EMBEDDING_CACHE
   ```

3. **View Logs**
   ```bash
   docker logs citypass_redis
   ```

### Cache Misses on Same Query

- Verify cache key consistency (check parameter order)
- Check TTL hasn't expired
- Ensure Redis isn't evicting due to memory pressure

### Memory Issues

```bash
# Check memory usage
docker exec -it citypass_redis redis-cli INFO memory

# Increase max memory (if needed)
# Edit docker-compose.yaml: --maxmemory 1gb
```

## Best Practices

1. **Use Appropriate TTLs**: Balance freshness vs. cache hit rate
2. **Monitor Hit Rates**: Aim for >70% hit rate for static data
3. **Warmup on Startup**: Pre-cache common queries
4. **Invalidate on Updates**: Clear cache when source data changes
5. **Set Memory Limits**: Prevent Redis from consuming too much memory

## Advanced Usage

### Custom Cache Wrapper

```typescript
import { withCache } from '@citypass/llm';

const result = await withCache(
  'my-custom-namespace',
  { userId, query, filters },
  async () => {
    // Your expensive computation
    return await complexOperation();
  },
  {
    ttl: 60 * 60, // 1 hour
    skipCache: false,
    refreshCache: false, // Set true to force refresh
  }
);
```

### Conditional Caching

```typescript
// Only cache for production
const USE_CACHE = process.env.NODE_ENV === 'production';

const embedding = await generateEmbedding(text, {
  skipCache: !USE_CACHE
});
```

## Production Checklist

- [ ] Redis running in Docker Compose
- [ ] Environment variables configured
- [ ] Memory limits set appropriately
- [ ] AOF persistence enabled
- [ ] Monitoring/alerting setup
- [ ] Cache warmup strategy defined
- [ ] Invalidation strategy documented
- [ ] Backup strategy for Redis data

## References

- [Redis Documentation](https://redis.io/docs/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Cache Eviction Policies](https://redis.io/docs/manual/eviction/)
