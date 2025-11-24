
import {
    RankingContext,
    RankableEvent,
    UserProfile
} from '@citypass/llm';

// Mock the internal functions since they are not exported directly or are hard to test in isolation
// We will reproduce the logic here to verify the *algorithm* I implemented.
// Ideally we would import extractFeatures/calculateFinalScore but they might not be exported.
// Let's check if they are exported. If not, I will rely on the fact that I just edited the code.

// Actually, I can't easily import non-exported functions. 
// But I can use the `fineRanking` function which IS exported.

import { fineRanking } from '@citypass/llm';

async function main() {
    console.log('--- Testing Location Ranking Logic ---');

    const context: RankingContext = {
        query: 'things to do in midtown',
        city: 'New York',
        neighborhood: 'Midtown', // This is what the planner should now extract
    };

    const midtownEvent: RankableEvent = {
        id: '1',
        title: 'Midtown Jazz',
        category: 'MUSIC',
        city: 'New York',
        neighborhood: 'Midtown',
        startTime: new Date().toISOString(),
        hasDescription: true,
        hasVenue: true,
        hasPrice: true,
        embedding: Array(1536).fill(0.1), // Mock embedding
    };

    const harlemEvent: RankableEvent = {
        id: '2',
        title: 'Harlem Gospel',
        category: 'MUSIC',
        city: 'New York',
        neighborhood: 'Harlem',
        startTime: new Date().toISOString(),
        hasDescription: true,
        hasVenue: true,
        hasPrice: true,
        embedding: Array(1536).fill(0.1), // Same embedding to isolate location factor
    };

    // Mock profile
    const profile: UserProfile = {
        sessionId: 'test',
    };

    console.log('Running fineRanking...');
    const results = await fineRanking([midtownEvent, harlemEvent], context, profile);

    console.log('\nResults:');
    results.forEach(r => {
        console.log(`- ${r.event.title} (${r.event.neighborhood}): Score ${r.score.toFixed(4)}`);
        console.log(`  Features: CityMatch=${r.features.cityMatch}, NeighborhoodMatch=${r.features.neighborhoodMatch}`);
    });

    const midtownScore = results.find(r => r.event.id === '1')?.score || 0;
    const harlemScore = results.find(r => r.event.id === '2')?.score || 0;

    if (midtownScore > harlemScore) {
        console.log('\n✅ PASS: Midtown event ranked higher than Harlem event for Midtown query.');
    } else {
        console.log('\n❌ FAIL: Midtown event did NOT rank higher.');
    }
}

main().catch(console.error);
