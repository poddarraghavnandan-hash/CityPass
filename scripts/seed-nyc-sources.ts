import 'dotenv/config';
import { prisma, SourceType, CrawlMethod } from '@citypass/db';

const NYC_EVENT_SOURCES = [
    // Major Event Aggregators
    { name: 'Eventbrite NYC', url: 'https://www.eventbrite.com/d/ny--new-york/events/', domain: 'eventbrite.com', type: SourceType.AGGREGATOR, method: CrawlMethod.FIRECRAWL },
    { name: 'Meetup NYC', url: 'https://www.meetup.com/find/?location=us--ny--new-york', domain: 'meetup.com', type: SourceType.AGGREGATOR, method: CrawlMethod.FIRECRAWL },
    { name: 'TimeOut New York', url: 'https://www.timeout.com/newyork/things-to-do/things-to-do-in-new-york-today', domain: 'timeout.com', type: SourceType.MEDIA, method: CrawlMethod.FIRECRAWL },
    { name: 'The Skint NYC', url: 'https://theskint.com/', domain: 'theskint.com', type: SourceType.BLOG, method: CrawlMethod.FIRECRAWL },
    { name: 'NYC.gov Events', url: 'https://www.nyc.gov/events', domain: 'nyc.gov', type: SourceType.AGGREGATOR, method: CrawlMethod.FIRECRAWL },

    // Music & Nightlife
    { name: 'Resident Advisor NYC', url: 'https://ra.co/events/us/newyork', domain: 'ra.co', type: SourceType.AGGREGATOR, method: CrawlMethod.FIRECRAWL },
    { name: 'Bandsintown NYC', url: 'https://www.bandsintown.com/c/new-york-ny', domain: 'bandsintown.com', type: SourceType.AGGREGATOR, method: CrawlMethod.FIRECRAWL },
    { name: 'Songkick NYC', url: 'https://www.songkick.com/metro-areas/7644-us-new-york', domain: 'songkick.com', type: SourceType.AGGREGATOR, method: CrawlMethod.FIRECRAWL },
    { name: 'Dice.fm NYC', url: 'https://dice.fm/city/new-york', domain: 'dice.fm', type: SourceType.TICKETING, method: CrawlMethod.FIRECRAWL },
    { name: 'EDM Train NYC', url: 'https://edmtrain.com/new-york-ny', domain: 'edmtrain.com', type: SourceType.AGGREGATOR, method: CrawlMethod.FIRECRAWL },

    // Ticketing Platforms
    { name: 'Ticketmaster NYC', url: 'https://www.ticketmaster.com/new-york-tickets-new-york/city/1884', domain: 'ticketmaster.com', type: SourceType.TICKETING, method: CrawlMethod.FIRECRAWL },
    { name: 'StubHub NYC', url: 'https://www.stubhub.com/new-york-tickets/grouping/715/', domain: 'stubhub.com', type: SourceType.TICKETING, method: CrawlMethod.FIRECRAWL },
    { name: 'SeatGeek NYC', url: 'https://seatgeek.com/cities/new-york', domain: 'seatgeek.com', type: SourceType.TICKETING, method: CrawlMethod.FIRECRAWL },

    // Major Venues - Music
    { name: 'Blue Note Jazz Club', url: 'https://www.bluenotejazz.com/newyork/', domain: 'bluenotejazz.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Birdland Jazz Club', url: 'https://www.birdlandjazz.com/', domain: 'birdlandjazz.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Village Vanguard', url: 'https://villagevanguard.com/', domain: 'villagevanguard.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Bowery Ballroom', url: 'https://www.boweryballroom.com/', domain: 'boweryballroom.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Brooklyn Steel', url: 'https://www.brooklynsteel.com/', domain: 'brooklynsteel.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Terminal 5', url: 'https://terminal5nyc.com/', domain: 'terminal5nyc.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Webster Hall', url: 'https://www.websterhall.com/', domain: 'websterhall.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Brooklyn Bowl', url: 'https://www.brooklynbowl.com/brooklyn/', domain: 'brooklynbowl.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Elsewhere', url: 'https://www.elsewherebrooklyn.com/', domain: 'elsewherebrooklyn.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Music Hall of Williamsburg', url: 'https://www.musichallofwilliamsburg.com/', domain: 'musichallofwilliamsburg.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },

    // Theater & Performing Arts
    { name: 'Playbill NYC', url: 'https://www.playbill.com/grosses', domain: 'playbill.com', type: SourceType.AGGREGATOR, method: CrawlMethod.FIRECRAWL },
    { name: 'Broadway.com', url: 'https://www.broadway.com/shows/', domain: 'broadway.com', type: SourceType.AGGREGATOR, method: CrawlMethod.FIRECRAWL },
    { name: 'Lincoln Center', url: 'https://www.lincolncenter.org/whats-on', domain: 'lincolncenter.org', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Carnegie Hall', url: 'https://www.carnegiehall.org/Calendar', domain: 'carnegiehall.org', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'BAM Brooklyn', url: 'https://www.bam.org/whats-on', domain: 'bam.org', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },

    // Comedy
    { name: 'Comedy Cellar', url: 'https://www.comedycellar.com/', domain: 'comedycellar.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Caroline\'s on Broadway', url: 'https://www.carolines.com/', domain: 'carolines.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Gotham Comedy Club', url: 'https://gothamcomedyclub.com/', domain: 'gothamcomedyclub.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Stand Up NY', url: 'https://standupny.com/', domain: 'standupny.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },

    // Sports
    { name: 'Madison Square Garden', url: 'https://www.msg.com/calendar', domain: 'msg.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Barclays Center', url: 'https://www.barclayscenter.com/events', domain: 'barclayscenter.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Yankee Stadium Events', url: 'https://www.mlb.com/yankees/tickets', domain: 'mlb.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Citi Field Events', url: 'https://www.mlb.com/mets/tickets', domain: 'mlb.com', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },

    // Art & Museums
    { name: 'MoMA Events', url: 'https://www.moma.org/calendar/', domain: 'moma.org', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Met Museum Events', url: 'https://www.metmuseum.org/events', domain: 'metmuseum.org', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Whitney Museum', url: 'https://whitney.org/events', domain: 'whitney.org', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },
    { name: 'Guggenheim Events', url: 'https://www.guggenheim.org/events', domain: 'guggenheim.org', type: SourceType.VENUE, method: CrawlMethod.FIRECRAWL },

    // Food & Drink
    { name: 'Eater NY Events', url: 'https://ny.eater.com/', domain: 'eater.com', type: SourceType.MEDIA, method: CrawlMethod.FIRECRAWL },
    { name: 'Grub Street Events', url: 'https://www.grubstreet.com/tags/events/', domain: 'grubstreet.com', type: SourceType.MEDIA, method: CrawlMethod.FIRECRAWL },
];

async function main() {
    console.log(`🌱 Seeding ${NYC_EVENT_SOURCES.length} NYC event sources...\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const source of NYC_EVENT_SOURCES) {
        try {
            const result = await prisma.source.upsert({
                where: { url: source.url },
                update: {
                    name: source.name,
                    domain: source.domain,
                    sourceType: source.type,
                    crawlMethod: source.method,
                    active: true,
                    lastSuccess: null, // Reset to trigger re-crawl
                },
                create: {
                    name: source.name,
                    url: source.url,
                    domain: source.domain,
                    city: 'New York',
                    sourceType: source.type,
                    crawlMethod: source.method,
                    active: true,
                },
            });

            if (result.createdAt.getTime() === result.updatedAt.getTime()) {
                created++;
                console.log(`✅ Created: ${source.name}`);
            } else {
                updated++;
                console.log(`🔄 Updated: ${source.name}`);
            }
        } catch (error: any) {
            skipped++;
            console.error(`❌ Failed: ${source.name} - ${error.message}`);
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total: ${NYC_EVENT_SOURCES.length}`);

    // Check total active sources
    const totalSources = await prisma.source.count({
        where: { city: 'New York', active: true }
    });

    console.log(`\n🎯 Total active NYC sources: ${totalSources}`);
}

main().catch(console.error).finally(() => process.exit(0));
