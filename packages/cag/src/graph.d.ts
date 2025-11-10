import { Driver } from 'neo4j-driver';
export interface GraphNode {
    id: string;
    labels: string[];
    properties: Record<string, any>;
}
export interface SimilarEvent {
    eventId: string;
    similarity: number;
    reason: 'category' | 'venue' | 'tags' | 'temporal';
}
export interface NoveltyScore {
    eventId: string;
    novelty: number;
    userHistoryCount: number;
    similarViewedCount: number;
}
export interface FriendSignal {
    eventId: string;
    friendCount: number;
    friends: Array<{
        userId: string;
        action: 'viewed' | 'saved' | 'attended';
    }>;
}
export declare function initializeGraphDB(): Driver;
export declare function similarEvents(eventIds: string[], limit?: number): Promise<SimilarEvent[]>;
export declare function noveltyForUser(userId: string, candidateIds: string[]): Promise<NoveltyScore[]>;
export declare function friendOverlap(userId: string, candidateIds: string[]): Promise<FriendSignal[]>;
export declare function diversifyByGraph(candidateIds: string[], userId?: string | null, diversityThreshold?: number, maxResults?: number): Promise<string[]>;
export declare function getSocialHeat(eventIds: string[], hoursBack?: number): Promise<Record<string, {
    views: number;
    saves: number;
    attends: number;
}>>;
export declare function healthCheck(): Promise<boolean>;
export declare function closeGraphDB(): Promise<void>;
//# sourceMappingURL=graph.d.ts.map