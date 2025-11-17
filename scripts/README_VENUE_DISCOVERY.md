# Venue Discovery System

Automated venue discovery using Google Places API to scale to 10,000+ venues.

## Quick Start

### 1. Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Places API** (New)
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key
6. Add to `.env`:
   ```bash
   GOOGLE_PLACES_API_KEY="your-api-key-here"
   ```

**Free Tier:** $200/month credit = ~6,000 place searches + 10,000 place details (enough for discovery!)

### 2. Run Venue Discovery

**Discover venues in NYC (10 results per category):**
```bash
pnpm exec tsx scripts/discover-venues.ts NYC 10
```

**Discover venues in Los Angeles (20 results per category):**
```bash
pnpm exec tsx scripts/discover-venues.ts LA 20
```

**Discover venues in San Francisco (15 results per category):**
```bash
pnpm exec tsx scripts/discover-venues.ts SF 15
```

### 3. Available Cities

- `NYC` - New York City (20km radius)
- `LA` - Los Angeles (25km radius)
- `SF` - San Francisco (15km radius)
- `CHICAGO` - Chicago (20km radius)
- `AUSTIN` - Austin (15km radius)

More cities can be added to `CITIES` in `discover-venues.ts`.

---

## How It Works

### Discovery Pipeline

1. **Search** - Query Google Places for venues in each category
2. **Filter** - Apply quality filters (rating, reviews, website)
3. **Validate** - Check if venue has an events page
4. **Deduplicate** - Skip venues already in database
5. **Save** - Add new venues to database

### Quality Filters

**Default filters:**
- Minimum rating: 3.5 stars
- Minimum reviews: 10
- Must have a website
- Website must be accessible

**Can be customized in script:**
```typescript
const result = await discoverVenues({
  city: CITIES.NYC,
  categories: VENUE_CATEGORIES,
  minRating: 4.0,      // Increase quality threshold
  minReviews: 50,      // More established venues
  maxResults: 30,      // More results per category
});
```

### Event URL Detection

The script tries to find an events page by testing common patterns:
- `/events`
- `/calendar`
- `/shows`
- `/whats-on`
- `/schedule`
- `/upcoming`

If no dedicated events page is found, uses the main website.

---

## Venue Categories

The script searches for 10 venue types:

| Category | Google Query | Place Types | EventCategory |
|----------|--------------|-------------|---------------|
| Music Venues | "live music venue" | night_club, bar | MUSIC |
| Concert Halls | "concert hall" | concert_hall | MUSIC |
| Comedy Clubs | "comedy club" | comedy_club | COMEDY |
| Theaters | "theater" | performing_arts_theater | THEATRE |
| Art Galleries | "art gallery" | art_gallery, museum | ARTS |
| Museums | "museum events" | museum | ARTS |
| Food Markets | "food market" | food | FOOD |
| Yoga/Fitness | "yoga studio" | gym, spa | FITNESS |
| Coworking | "coworking space events" | coworking_space | NETWORKING |
| Dance Studios | "dance studio" | dance_school | DANCE |

**Total searches per city:** 10 categories × 1 text search each = 10 API calls
**Total place details:** ~100 venues × 1 details call each = 100 API calls
**Total cost per city:** ~$0.032 × 10 + $0.017 × 100 = **$2.02**

---

## Example Output

```
🚀 Venue Discovery Tool

City: New York, NY
Max results per category: 10
Categories: 10
Estimated API calls: 20 (within free tier)

🔍 Discovering venues in New York...

📂 Category: MUSIC (live music venue)
  → Searching: "live music venue" in New York
  ✓ Found 20 places
  → Processing: Blue Note Jazz Club
    ⊘ Already exists
  → Processing: The Bowery Ballroom
    ⊘ Already exists
  → Processing: Rockwood Music Hall
    ✓ Found event page: /calendar
    ✓ Added to queue
  ...

💾 Saving 47 venues to database...

✓ Added: Rockwood Music Hall
  Category: MUSIC
  URL: https://rockwoodmusichall.com/calendar
  Rating: 4.5 (823 reviews)

✓ Added: Arlene's Grocery
  Category: MUSIC
  URL: https://arlenesgrocery.net/events
  Rating: 4.3 (456 reviews)

...

✅ Discovery complete!
   Discovered: 47 venues
   Added: 47 venues
   Skipped: 0 venues

📊 Summary:
   City: New York
   Discovered: 47
   Added: 47
   Skipped: 0

✨ Next: Run the worker to extract events from new venues!
```

---

## Scaling to 10,000 Venues

### Phase 1: NYC Expansion (Week 1)
**Target: 500 NYC venues**

```bash
# Run multiple times with different max results
pnpm exec tsx scripts/discover-venues.ts NYC 20
pnpm exec tsx scripts/discover-venues.ts NYC 30
pnpm exec tsx scripts/discover-venues.ts NYC 50
```

**Estimated cost:** ~$20 (well within free tier)

### Phase 2: Top 5 Cities (Week 2-3)
**Target: 2,500 venues**

```bash
# Los Angeles (800 venues)
pnpm exec tsx scripts/discover-venues.ts LA 30

# San Francisco (600 venues)
pnpm exec tsx scripts/discover-venues.ts SF 25

# Chicago (500 venues)
pnpm exec tsx scripts/discover-venues.ts CHICAGO 20

# Austin (400 venues)
pnpm exec tsx scripts/discover-venues.ts AUSTIN 20
```

**Estimated cost:** ~$100 (within free tier)

### Phase 3: Scale to 10,000 (Month 2-3)
**Target: 10,000 venues across 20+ cities**

1. **Add more cities** to `CITIES` in script:
   - Boston, Seattle, Nashville, Miami, Denver
   - Portland, Philadelphia, Atlanta, DC, Phoenix

2. **Expand categories** with more specific searches:
   - "jazz club", "rock venue", "electronic music"
   - "improv theater", "stand-up comedy"
   - "contemporary art", "photography gallery"

3. **Run systematically:**
   ```bash
   # Run for all cities
   for city in NYC LA SF CHICAGO AUSTIN BOSTON SEATTLE; do
     pnpm exec tsx scripts/discover-venues.ts $city 30
   done
   ```

**Total estimated cost:** ~$400-500 (still reasonable)

---

## Integration with Event Extraction

Once venues are discovered, the worker will automatically:
1. Scrape venue websites hourly (Firecrawl)
2. Extract events using LLM fallback chain (Ollama Cloud)
3. Save events to database
4. Deduplicate events

**Worker cron job** in `apps/worker/src/cron.ts`:
```typescript
{
  name: 'extract-venue-events',
  intervalMs: 60 * 60 * 1000, // Every hour
  handler: processAllSources,
}
```

**To start worker:**
```bash
cd apps/worker
pnpm dev
```

---

## Monitoring & Quality Control

### Check Venue Count
```bash
# Count venues by city
pnpm exec tsx -e "
import { prisma } from './packages/db/src/index';
const counts = await prisma.source.groupBy({
  by: ['city'],
  _count: true
});
console.table(counts);
await prisma.\$disconnect();
"
```

### Check Extraction Success Rate
```bash
# Get sources with event counts
pnpm exec tsx -e "
import { prisma } from './packages/db/src/index';
const sources = await prisma.source.findMany({
  include: { _count: { select: { events: true } } }
});
const stats = sources.map(s => ({
  name: s.name,
  city: s.city,
  events: s._count.events
}));
console.table(stats);
await prisma.\$disconnect();
"
```

---

## Cost Estimates

### Google Places API
- Text Search: $0.032 per request
- Place Details: $0.017 per request
- Free tier: $200/month

**For 10,000 venues:**
- Discovery: ~500 text searches × $0.032 = $16
- Details: ~10,000 × $0.017 = $170
- **Total: $186** (within free tier!)

### Ongoing Costs
- **Firecrawl:** $240/month (10,000 venues × hourly scraping)
- **Ollama Cloud:** $120/month (240,000 extractions)
- **Total: ~$360/month** for hourly extraction

**Optimization: Daily scraping instead of hourly**
- Firecrawl: $10/month
- Ollama: $5/month
- **Total: ~$15/month**

---

## Troubleshooting

### "Google Places API error: REQUEST_DENIED"
- Check API key is correct in `.env`
- Enable Places API (New) in Google Cloud Console
- Check billing is enabled (even for free tier)

### "No event page found" for many venues
- Some venues don't have dedicated event pages
- Script uses main website as fallback
- Can manually update URLs in database later

### "Already exists" for all venues
- Venues were already added
- Try different city or increase `maxResults`
- Check database for existing sources

### Rate limiting
- Script includes 100ms delay between requests
- Google free tier: 6,250 text searches/month
- Should not hit limits during normal usage

---

## Next Steps

1. ✅ **Created automated discovery script**
2. **Get Google Places API key** → [Get key](https://console.cloud.google.com/)
3. **Run pilot test** (100 NYC venues)
4. **Validate extraction success rate**
5. **Scale to 500 NYC venues**
6. **Expand to LA, SF, Chicago**
7. **Reach 10,000 venues** across 20+ cities

---

## References

- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Venue Scaling Strategy](../VENUE_SCALING_STRATEGY.md)
- [Worker Integration](../WORKER_INTEGRATION.md)
