# Venue Scaling Strategy: 10,000+ Venues

## Current State
- **44 active sources** (14 original + 30 newly added)
- **NYC only** (Manhattan, Brooklyn)
- **Categories covered**: Music (18), Comedy (5), Arts (5), Theatre (2), Food (4), Other (10)
- **Extraction**: Firecrawl + Ollama Cloud API working successfully

## Goal
Scale to **at least 10,000 venues** across all types of use cases and multiple cities.

---

## 1. Venue Discovery Approach

### Recommended: Google Places API

**Why Google Places?**
- Most comprehensive database (200M+ places worldwide)
- Excellent categorization and metadata
- High-quality URLs and contact info
- Reliable business verification
- Generous free tier: $200/month = ~40,000 requests

**API Details:**
```bash
# Text Search API
Price: $0.032 per request (Text Search)
Free tier: $200/month = 6,250 free searches/month

# Places API (detailed info)
Price: $0.017 per Place Details request
```

**Cost estimate for 10,000 venues:**
- Text searches: ~500 queries × $0.032 = $16
- Place details: 10,000 × $0.017 = $170
- **Total: ~$186** (within free tier!)

### Alternative Options

**Yelp Fusion API:**
- Good for restaurants, nightlife, entertainment
- 5,000 API calls/day free
- Limited to Yelp-listed businesses
- Great for reviews and ratings

**Foursquare Places API:**
- Strong for venue check-ins and popularity
- 100,000 API calls/day free tier
- Good categorization
- Less comprehensive than Google

**Recommendation:** Use Google Places as primary, supplement with Yelp for ratings/reviews.

---

## 2. Multi-City Expansion

### Phase 1: Major US Cities (Target: 5,000 venues)

**Top 10 Metro Areas:**
1. **New York City** (Manhattan, Brooklyn, Queens, Bronx, Staten Island)
   - Target: 1,500 venues
   - Current: 44 venues ✅

2. **Los Angeles** (LA, Santa Monica, West Hollywood, Pasadena)
   - Target: 800 venues
   - Music: Hollywood Bowl, Greek Theatre, Troubadour
   - Arts: Getty Center, LACMA, Broad Museum

3. **San Francisco Bay Area** (SF, Oakland, Berkeley, San Jose)
   - Target: 600 venues
   - Music: Fillmore, Great American Music Hall
   - Tech: Moscone Center, tech meetup spaces

4. **Chicago** (Loop, River North, Wicker Park, Lincoln Park)
   - Target: 500 venues
   - Music: House of Blues, Metro, Empty Bottle
   - Arts: Art Institute, MCA

5. **Austin** (Downtown, East Austin, South Congress)
   - Target: 400 venues
   - Music: ACL Live, Stubb's, Continental Club
   - Known for live music scene

6. **Boston** (Back Bay, Cambridge, Somerville)
   - Target: 350 venues
   - Music: House of Blues, Paradise Rock Club
   - Universities: MIT, Harvard events

7. **Seattle** (Downtown, Capitol Hill, Fremont)
   - Target: 300 venues
   - Music: Neumos, Showbox, Crocodile

8. **Nashville** (Downtown, East Nashville, Germantown)
   - Target: 300 venues
   - Music capital: honky-tonks, live music

9. **Miami** (South Beach, Wynwood, Brickell)
   - Target: 250 venues
   - Nightlife, beach events, art galleries

10. **Denver** (LoDo, RiNo, Capitol Hill)
    - Target: 200 venues
    - Music: Red Rocks (nearby), Ogden Theatre

### Phase 2: Secondary Cities (Target: 3,000 venues)
- Portland, Philadelphia, Atlanta, Washington DC, Phoenix
- Minneapolis, San Diego, Las Vegas, New Orleans, Detroit

### Phase 3: International Expansion (Target: 2,000 venues)
- London, Paris, Berlin, Tokyo, Toronto, Amsterdam

---

## 3. Venue Categories & Types

### By Event Type (based on EventCategory enum)

**MUSIC (Target: 4,000 venues)**
- Concert halls, music venues, jazz clubs
- Nightclubs, dance clubs, lounges
- Festivals, outdoor amphitheaters
- Google Places types: `night_club`, `bar`, `music_venue`, `concert_hall`

**COMEDY (Target: 500 venues)**
- Comedy clubs, improv theaters
- Google Places types: `comedy_club`, `entertainment`

**THEATRE (Target: 800 venues)**
- Theaters, playhouses, opera houses
- Google Places types: `theater`, `opera_house`, `performing_arts_theater`

**ARTS (Target: 1,500 venues)**
- Museums, galleries, art centers
- Google Places types: `art_gallery`, `museum`, `cultural_center`

**FOOD (Target: 1,500 venues)**
- Farmers markets, food halls, cooking classes
- Restaurant event spaces, supper clubs
- Google Places types: `food_market`, `event_space`, `cooking_school`

**FITNESS (Target: 800 venues)**
- Gyms, yoga studios, dance studios
- Running clubs, climbing gyms, sports facilities
- Google Places types: `gym`, `spa`, `fitness_center`, `yoga_studio`

**NETWORKING (Target: 400 venues)**
- Coworking spaces, conference centers
- Professional clubs, meetup spaces
- Google Places types: `coworking_space`, `convention_center`, `meeting_room`

**FAMILY (Target: 300 venues)**
- Children's museums, aquariums, zoos
- Family entertainment centers
- Google Places types: `aquarium`, `zoo`, `amusement_park`, `childrens_museum`

**DANCE (Target: 200 venues)**
- Dance clubs, ballrooms, dance studios
- Google Places types: `dance_hall`, `dance_studio`, `night_club`

**OTHER (Target: 1,000 venues)**
- Sports venues, parks, community centers
- Libraries, bookstores with events
- Google Places types: `stadium`, `park`, `community_center`, `library`, `bookstore`

---

## 4. Automated Venue Discovery Script

### Script: `scripts/discover-venues.ts`

**Features:**
1. **City-based search**: Search by city, category, and radius
2. **Smart pagination**: Handle Google Places pagination
3. **URL validation**: Only add venues with valid event URLs
4. **Deduplication**: Check against existing sources
5. **Quality filtering**:
   - Minimum rating threshold (e.g., 3.5+)
   - Minimum reviews (e.g., 10+)
   - Active business status
6. **Batch processing**: Add venues in batches with rate limiting

**Pseudo-code:**
```typescript
interface VenueSearchParams {
  city: string;
  state: string;
  categories: string[];  // Google Places types
  radius: number;        // meters
  minRating?: number;
  minReviews?: number;
}

async function discoverVenues(params: VenueSearchParams) {
  // 1. Search Google Places
  const places = await searchGooglePlaces({
    query: `${category} events in ${city}`,
    type: params.categories,
    location: getCityCoordinates(params.city),
    radius: params.radius
  });

  // 2. Filter and validate
  const validVenues = [];
  for (const place of places) {
    // Get detailed info
    const details = await getPlaceDetails(place.place_id);

    // Quality checks
    if (details.rating < params.minRating) continue;
    if (details.user_ratings_total < params.minReviews) continue;
    if (!details.website) continue;

    // Check if venue has events page
    const eventUrl = await findEventUrl(details.website);
    if (!eventUrl) continue;

    validVenues.push({
      name: details.name,
      url: eventUrl,
      domain: extractDomain(eventUrl),
      city: params.city,
      sourceType: 'VENUE',
      category: mapToEventCategory(details.types),
      rating: details.rating,
      reviewCount: details.user_ratings_total
    });
  }

  // 3. Deduplicate against existing sources
  const newVenues = await filterExisting(validVenues);

  // 4. Batch insert to database
  return await bulkInsertVenues(newVenues);
}
```

### URL Discovery Strategy

**Common event URL patterns:**
- `/events`
- `/calendar`
- `/shows`
- `/whats-on`
- `/schedule`
- `/upcoming`

**URL validation:**
1. Check if website exists
2. Try common event URL patterns
3. Scrape homepage for "events" links
4. Validate that page has event-like content (dates, times)

---

## 5. Implementation Phases

### Phase 1: Infrastructure (Week 1)
- [ ] Set up Google Places API key
- [ ] Create `scripts/discover-venues.ts` script
- [ ] Implement URL validation and event page detection
- [ ] Build quality filtering logic
- [ ] Add rate limiting and batch processing

### Phase 2: NYC Expansion (Week 2)
- [ ] Run discovery for NYC outer boroughs (Queens, Bronx, Staten Island)
- [ ] Target: 500 total NYC venues
- [ ] Test extraction on new venues
- [ ] Measure success rate and adjust filters

### Phase 3: Top 5 Cities (Week 3-4)
- [ ] LA: 800 venues
- [ ] SF Bay Area: 600 venues
- [ ] Chicago: 500 venues
- [ ] Austin: 400 venues
- [ ] Run extraction tests on each city

### Phase 4: Scale to 5,000 (Month 2)
- [ ] Add remaining top 10 cities
- [ ] Optimize extraction for high-volume
- [ ] Monitor Firecrawl and Ollama API costs
- [ ] Implement quality scoring for venues

### Phase 5: Scale to 10,000+ (Month 3)
- [ ] Expand to secondary cities
- [ ] Add international cities
- [ ] Implement venue recommendation engine
- [ ] Build admin dashboard for venue management

---

## 6. Quality Control

### Venue Scoring System

**Score Components:**
1. **Event URL Reachability** (30 points)
   - Valid, accessible event page

2. **Extraction Success Rate** (25 points)
   - % of successful event extractions from venue

3. **Google Rating** (20 points)
   - 5.0 = 20 pts, 4.0 = 16 pts, 3.0 = 12 pts

4. **Review Count** (15 points)
   - 1000+ reviews = 15 pts
   - 100-999 = 10 pts
   - 10-99 = 5 pts

5. **Event Freshness** (10 points)
   - Events extracted in last 7 days = 10 pts
   - Last 30 days = 5 pts

**Minimum score to remain active: 60/100**

### Automated Cleanup
- Disable sources with score < 60
- Remove sources with 0 events extracted after 3 attempts
- Flag sources with consistent extraction failures

---

## 7. Cost Estimates

### API Costs (Monthly)

**Google Places API:**
- Text searches: ~2,000/month × $0.032 = $64
- Place details: ~1,000/month × $0.017 = $17
- **Total: $81/month** (within $200 free tier)

**Firecrawl API:**
- 10,000 venues × 1 scrape/hour = 240,000 scrapes/month
- Firecrawl pricing: ~$0.001 per scrape
- **Total: $240/month**

**Ollama Cloud API:**
- 240,000 extractions × $0.0005 per extraction
- **Total: $120/month**

**Total Monthly Cost: ~$441**
- Most cost is Firecrawl scraping (scalable to higher frequencies)
- Can reduce frequency to daily instead of hourly to cut costs 24x

**Optimized (Daily scraping):**
- Firecrawl: $10/month
- Ollama: $5/month
- **Total: ~$96/month**

---

## 8. Success Metrics

### Target KPIs
1. **10,000+ active venues** across 20+ cities
2. **50,000+ events/month** extracted
3. **70%+ extraction success rate** across all sources
4. **Average venue score: 75+**
5. **<5% inactive/failed sources**

### Monitoring Dashboard
- Venues by city and category
- Extraction success rate trends
- API cost tracking
- Event volume by source
- Venue quality score distribution

---

## 9. Next Steps

### Immediate Actions (This Week)
1. ✅ **Add 30 NYC venues** - COMPLETED
2. **Create Google Places API key**
3. **Build `discover-venues.ts` script**
4. **Test with 100 venue pilot** (NYC expansion)
5. **Validate extraction success rate**

### Short Term (Next 2 Weeks)
1. **Scale to 500 NYC venues**
2. **Expand to LA (800 venues)**
3. **Expand to SF (600 venues)**
4. **Build quality scoring system**

### Medium Term (Month 2-3)
1. **Reach 5,000 venues** (top 10 cities)
2. **Reach 10,000 venues** (top 20 cities)
3. **Launch admin dashboard**
4. **Optimize extraction pipeline**

---

## 10. Risk Mitigation

### Potential Issues

**1. Low Extraction Success Rate**
- **Risk**: Many venue websites may not have scrapable event pages
- **Mitigation**:
  - Pre-validate event URLs before adding venues
  - Build custom scrapers for common event platforms (Eventbrite embeds, etc.)
  - Use screenshots + vision models for JavaScript-heavy sites

**2. High API Costs**
- **Risk**: Scraping 10,000 venues hourly is expensive
- **Mitigation**:
  - Dynamic scheduling (popular venues hourly, others daily/weekly)
  - Caching and smart invalidation
  - Batch processing during off-peak hours

**3. Rate Limiting**
- **Risk**: APIs may throttle or block high-volume requests
- **Mitigation**:
  - Implement exponential backoff
  - Distribute across multiple API keys
  - Use proxy rotation for Firecrawl

**4. Data Quality**
- **Risk**: Bad venues pollute the database
- **Mitigation**:
  - Strict quality scoring
  - Manual review of top venues per city
  - User feedback mechanisms

---

## Conclusion

Scaling to 10,000+ venues is achievable within 2-3 months with:
1. **Google Places API** for automated venue discovery
2. **Multi-city expansion** (prioritize top 10 metros)
3. **Quality filtering** to maintain high extraction success rates
4. **Cost optimization** through smart scheduling
5. **Monitoring and cleanup** to maintain data quality

**Next step:** Build the `discover-venues.ts` script and run a 100-venue pilot in NYC to validate the approach.
