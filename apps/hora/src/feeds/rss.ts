// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NewsItem {
  id?: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  lat?: number;
  lon?: number;
  category?: string;
  publishedAt?: string;
  sentiment?: string;
  url?: string;
}

// ---------------------------------------------------------------------------
// RSS sources
// ---------------------------------------------------------------------------

const RSS_SOURCES: { name: string; url: string }[] = [
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews' },
  { name: 'AP News', url: 'https://rsshub.app/apnews/topics/apf-topnews' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'TASS', url: 'https://tass.com/rss/v2.xml' },
];

// Public RSS-to-JSON proxy (free tier)
const PROXY_BASE = 'https://api.rss2json.com/v1/api.json';

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

export async function fetchNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    RSS_SOURCES.map((src) => fetchSingleFeed(src.name, src.url)),
  );

  const items: NewsItem[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled') {
      items.push(...r.value);
    }
  }

  // Sort newest first
  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  return items;
}

// ---------------------------------------------------------------------------
// Single feed via proxy
// ---------------------------------------------------------------------------

async function fetchSingleFeed(sourceName: string, rssUrl: string): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const proxyUrl = `${PROXY_BASE}?rss_url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(proxyUrl, { signal: controller.signal });
    if (!res.ok) return [];

    const json = await res.json();
    const rawItems: any[] = json?.items ?? [];
    const items: NewsItem[] = [];

    for (const raw of rawItems) {
      items.push({
        title: raw.title ?? '',
        link: raw.link ?? '',
        pubDate: raw.pubDate ?? '',
        source: sourceName,
        description: stripHtml(raw.description ?? ''),
        // lat/lon not generally available in RSS; leave undefined
      });
    }

    return items;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  // Lightweight tag stripper (no DOM dependency for SSR/worker compat)
  // Decode entities first, then strip tags to prevent double-encoded payloads
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]*>/g, '')
    .trim();
}
