'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Source {
  id: string;
  name: string;
  url: string;
  domain: string;
  city: string;
  sourceType: string;
  crawlMethod: string;
  active: boolean;
  lastCrawled?: string;
  lastSuccess?: string;
}

export default function SourcesAdminPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/admin/sources');
      const data = await response.json();
      setSources(data.sources || []);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerCrawl = async (sourceId: string) => {
    try {
      await fetch('/api/admin/trigger-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });
      alert('Crawl triggered!');
    } catch (error) {
      console.error('Failed to trigger crawl:', error);
      alert('Failed to trigger crawl');
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Sources Admin</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-4">
          {sources.map((source) => (
            <Card key={source.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{source.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {source.domain} • {source.city} • {source.sourceType}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        source.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {source.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      {source.crawlMethod}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <p>
                      <span className="text-muted-foreground">URL:</span>{' '}
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {source.url}
                      </a>
                    </p>
                    {source.lastCrawled && (
                      <p className="mt-1">
                        <span className="text-muted-foreground">Last crawled:</span>{' '}
                        {new Date(source.lastCrawled).toLocaleString()}
                      </p>
                    )}
                    {source.lastSuccess && (
                      <p className="mt-1">
                        <span className="text-muted-foreground">Last success:</span>{' '}
                        {new Date(source.lastSuccess).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button onClick={() => triggerCrawl(source.id)}>
                    Trigger Crawl
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
