"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalUrlHash = canonicalUrlHash;
exports.contentChecksum = contentChecksum;
exports.canonicalVenueName = canonicalVenueName;
exports.extractDomain = extractDomain;
exports.retryWithBackoff = retryWithBackoff;
exports.normalizeCategory = normalizeCategory;
exports.sleep = sleep;
exports.chunk = chunk;
const crypto_1 = require("crypto");
function canonicalUrlHash(url) {
    try {
        const parsed = new URL(url);
        const canonical = `${parsed.protocol}//${parsed.host}${parsed.pathname}`.toLowerCase();
        return (0, crypto_1.createHash)('sha256').update(canonical).digest('hex');
    }
    catch {
        return (0, crypto_1.createHash)('sha256').update(url.toLowerCase()).digest('hex');
    }
}
function contentChecksum(data) {
    const relevant = {
        title: data.title,
        description: data.description,
        start_time: data.start_time,
        end_time: data.end_time,
        venue_name: data.venue_name,
        price_min: data.price_min,
        price_max: data.price_max,
    };
    const normalized = JSON.stringify(relevant, Object.keys(relevant).sort());
    return (0, crypto_1.createHash)('md5').update(normalized).digest('hex');
}
function canonicalVenueName(name) {
    return name
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/^the-/, '')
        .trim();
}
function extractDomain(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '');
    }
    catch {
        return url;
    }
}
async function retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                const delay = baseDelayMs * Math.pow(2, i);
                console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
function normalizeCategory(cat) {
    if (!cat)
        return undefined;
    const normalized = cat.toLowerCase();
    const mapping = {
        'music': 'MUSIC',
        'concert': 'MUSIC',
        'show': 'MUSIC',
        'comedy': 'COMEDY',
        'standup': 'COMEDY',
        'theater': 'THEATRE',
        'theatre': 'THEATRE',
        'play': 'THEATRE',
        'fitness': 'FITNESS',
        'workout': 'FITNESS',
        'yoga': 'FITNESS',
        'dance': 'DANCE',
        'dancing': 'DANCE',
        'art': 'ARTS',
        'arts': 'ARTS',
        'gallery': 'ARTS',
        'food': 'FOOD',
        'dining': 'FOOD',
        'networking': 'NETWORKING',
        'meetup': 'NETWORKING',
        'family': 'FAMILY',
        'kids': 'FAMILY',
    };
    for (const [key, value] of Object.entries(mapping)) {
        if (normalized.includes(key)) {
            return value;
        }
    }
    return 'OTHER';
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
//# sourceMappingURL=index.js.map