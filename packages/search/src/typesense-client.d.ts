declare module 'typesense' {
  type Protocol = 'http' | 'https';

  export interface TypesenseNode {
    host: string;
    port: number;
    protocol: Protocol;
  }

  export interface ClientConfig {
    nodes: TypesenseNode[];
    apiKey: string;
    connectionTimeoutSeconds?: number;
  }

  export interface SearchParams {
    q: string;
    query_by: string;
    filter_by?: string;
    sort_by?: string;
    page?: number;
    per_page?: number;
    [key: string]: unknown;
  }

  export interface DocumentCollection {
    upsert(document: Record<string, unknown>): Promise<void>;
    search<T = Record<string, unknown>>(params: SearchParams): Promise<T>;
  }

  export interface CollectionRef {
    retrieve(): Promise<unknown>;
    create(schema: Record<string, unknown>): Promise<unknown>;
    documents(): DocumentCollection;
  }

  export interface CollectionsResource {
    retrieve(): Promise<unknown>;
  }

  export class Client {
    constructor(config: ClientConfig);
    collections(): CollectionsResource;
    collections(name: string): CollectionRef;
  }

  const Typesense: {
    Client: typeof Client;
  };

  export default Typesense;
}
