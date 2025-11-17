/**
 * Add more NYC venue sources to the database
 */

import { prisma, EventCategory, SourceType } from '../packages/db/src/index';

const newVenues = [
  // Music Venues
  {
    name: 'Terminal 5',
    url: 'https://www.terminal5nyc.com/events',
    domain: 'terminal5nyc.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
  {
    name: 'Webster Hall',
    url: 'https://www.websterhall.com/events',
    domain: 'websterhall.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
  {
    name: 'Irving Plaza',
    url: 'https://www.irvingplaza.com/events',
    domain: 'irvingplaza.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
  {
    name: 'SOBs',
    url: 'https://www.sobs.com/events',
    domain: 'sobs.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
  {
    name: 'Beacon Theatre',
    url: 'https://www.msg.com/beacon-theatre',
    domain: 'msg.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
  {
    name: 'Mercury Lounge',
    url: 'https://www.mercuryloungenyc.com/events',
    domain: 'mercuryloungenyc.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
  {
    name: 'Elsewhere Brooklyn',
    url: 'https://www.elsewherebrooklyn.com/events',
    domain: 'elsewherebrooklyn.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
  {
    name: 'House of Yes',
    url: 'https://www.houseofyes.org/events',
    domain: 'houseofyes.org',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },

  // Comedy Venues
  {
    name: 'Caroline\'s on Broadway',
    url: 'https://www.carolines.com/events',
    domain: 'carolines.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.COMEDY,
    active: true,
  },
  {
    name: 'The Stand NYC',
    url: 'https://thestandnyc.com/events',
    domain: 'thestandnyc.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.COMEDY,
    active: true,
  },
  {
    name: 'New York Comedy Club',
    url: 'https://www.newyorkcomedyclub.com/events',
    domain: 'newyorkcomedyclub.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.COMEDY,
    active: true,
  },

  // Arts & Culture
  {
    name: 'Whitney Museum',
    url: 'https://whitney.org/events',
    domain: 'whitney.org',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.ARTS,
    active: true,
  },
  {
    name: 'Guggenheim Museum',
    url: 'https://www.guggenheim.org/events',
    domain: 'guggenheim.org',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.ARTS,
    active: true,
  },
  {
    name: 'New Museum',
    url: 'https://www.newmuseum.org/calendar',
    domain: 'newmuseum.org',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.ARTS,
    active: true,
  },
  {
    name: 'Lincoln Center',
    url: 'https://www.lincolncenter.org/events',
    domain: 'lincolncenter.org',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.THEATRE,
    active: true,
  },
  {
    name: 'Carnegie Hall',
    url: 'https://www.carnegiehall.org/calendar',
    domain: 'carnegiehall.org',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
  {
    name: 'The Public Theater',
    url: 'https://publictheater.org/programs-events',
    domain: 'publictheater.org',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.THEATRE,
    active: true,
  },
  {
    name: 'Brooklyn Academy of Music',
    url: 'https://www.bam.org/events',
    domain: 'bam.org',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.ARTS,
    active: true,
  },

  // Sports & Recreation
  {
    name: 'Madison Square Garden',
    url: 'https://www.msg.com/calendar',
    domain: 'msg.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.OTHER,
    active: true,
  },
  {
    name: 'Barclays Center',
    url: 'https://www.barclayscenter.com/events',
    domain: 'barclayscenter.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.OTHER,
    active: true,
  },

  // Markets & Food
  {
    name: 'Union Square Greenmarket',
    url: 'https://www.grownyc.org/greenmarket/manhattan-union-square-m',
    domain: 'grownyc.org',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.FOOD,
    active: true,
  },
  {
    name: 'Chelsea Market',
    url: 'https://www.chelseamarket.com/events',
    domain: 'chelseamarket.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.FOOD,
    active: true,
  },

  // Outdoor & Parks
  {
    name: 'Bryant Park Events',
    url: 'https://bryantpark.org/events',
    domain: 'bryantpark.org',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.OTHER,
    active: true,
  },
  {
    name: 'Hudson River Park Events',
    url: 'https://hudsonriverpark.org/events',
    domain: 'hudsonriverpark.org',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.OTHER,
    active: true,
  },
  {
    name: 'Brooklyn Bridge Park',
    url: 'https://www.brooklynbridgepark.org/events',
    domain: 'brooklynbridgepark.org',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.OTHER,
    active: true,
  },

  // Nightlife
  {
    name: 'Output Brooklyn',
    url: 'https://outputclub.com/events',
    domain: 'outputclub.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
  {
    name: 'Avant Gardner',
    url: 'https://avantgardner.com/events',
    domain: 'avantgardner.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
  {
    name: 'Le Poisson Rouge',
    url: 'https://lepoissonrouge.com/events',
    domain: 'lepoissonrouge.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
  {
    name: 'Baby\'s All Right',
    url: 'https://babysallright.com/events',
    domain: 'babysallright.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
  {
    name: 'Knitting Factory Brooklyn',
    url: 'https://bk.knittingfactory.com/events',
    domain: 'knittingfactory.com',
    city: 'New York',
    sourceType: SourceType.VENUE,
    category: EventCategory.MUSIC,
    active: true,
  },
];

async function addVenues() {
  console.log(`\n🚀 Adding ${newVenues.length} new venue sources...\n`);

  let added = 0;
  let skipped = 0;

  for (const venue of newVenues) {
    try {
      // Check if venue already exists
      const existing = await prisma.source.findFirst({
        where: {
          OR: [
            { url: venue.url },
            { name: venue.name },
          ],
        },
      });

      if (existing) {
        console.log(`⊘ Skipping: ${venue.name} (already exists)`);
        skipped++;
        continue;
      }

      // Add venue
      await prisma.source.create({
        data: venue,
      });

      console.log(`✓ Added: ${venue.name}`);
      console.log(`  Category: ${venue.category}`);
      console.log(`  URL: ${venue.url}`);
      console.log();

      added++;
    } catch (error: any) {
      console.error(`✗ Error adding ${venue.name}:`, error.message);
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Added: ${added} venues`);
  console.log(`   Skipped: ${skipped} venues`);
  console.log(`   Total sources: ${added + skipped}\n`);

  await prisma.$disconnect();
}

addVenues().catch(console.error);
