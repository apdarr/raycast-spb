import { Cache } from "@raycast/api";

export const SITEMAP_URL = "https://supabase.com/docs/sitemap.xml";

/** Only include docs under this path segment. */
const INCLUDE_PREFIX = "https://supabase.com/docs/guides/";

/** Refresh cached sitemap automatically after this many ms (7 days). */
export const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const CACHE_KEY = "supabase-docs-index";
const cache = new Cache();

export interface DocEntry {
  url: string;
  /** Human-friendly title derived from the final slug. */
  title: string;
  /** Breadcrumb of parent segments, e.g. "Guides / Platform". */
  breadcrumb: string;
  /** Tokens to aid fuzzy matching. */
  keywords: string[];
}

interface CachePayload {
  fetchedAt: number;
  entries: DocEntry[];
}

// Small words that stay lowercase unless they lead the title.
const LOWERCASE_WORDS = new Set([
  "and",
  "or",
  "the",
  "a",
  "an",
  "to",
  "of",
  "for",
  "in",
  "on",
  "with",
  "vs",
]);

// Known acronyms that should be fully uppercased.
const ACRONYMS = new Set([
  "api",
  "cli",
  "sql",
  "url",
  "rls",
  "jwt",
  "ai",
  "ssl",
  "ssr",
  "cdn",
  "dns",
  "orm",
  "oauth",
  "sso",
  "mfa",
  "rest",
  "grpc",
  "ip",
  "ipv4",
  "ipv6",
  "ui",
  "ci",
  "cd",
]);

function titleizeWord(word: string, isFirst: boolean): string {
  const lower = word.toLowerCase();
  if (ACRONYMS.has(lower)) return lower.toUpperCase();
  if (!isFirst && LOWERCASE_WORDS.has(lower)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function slugToTitle(slug: string): string {
  const words = slug.split("-").filter(Boolean);
  return words.map((w, i) => titleizeWord(w, i === 0)).join(" ");
}

export function buildEntry(url: string): DocEntry | undefined {
  if (!url.startsWith(INCLUDE_PREFIX)) return undefined;
  const rest = url
    .slice("https://supabase.com/docs/".length)
    .replace(/\/$/, "");
  const segments = rest.split("/").filter(Boolean); // e.g. ["guides","platform","compute-and-disk"]
  if (segments.length === 0) return undefined;

  const lastSlug = segments[segments.length - 1];
  const parents = segments.slice(0, -1);

  const title = slugToTitle(lastSlug);
  const breadcrumb = parents.map((s) => slugToTitle(s)).join(" / ");

  const keywords = segments.flatMap((s) => s.split("-")).filter(Boolean);

  return { url, title, breadcrumb, keywords };
}

function parseSitemap(xml: string): DocEntry[] {
  const entries: DocEntry[] = [];
  const seen = new Set<string>();
  const regex = /<loc>([^<]+)<\/loc>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (seen.has(url)) continue;
    const entry = buildEntry(url);
    if (entry) {
      seen.add(url);
      entries.push(entry);
    }
  }

  entries.sort((a, b) => a.title.localeCompare(b.title));
  return entries;
}

export function readCache(): CachePayload | undefined {
  const raw = cache.get(CACHE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as CachePayload;
  } catch {
    return undefined;
  }
}

function writeCache(entries: DocEntry[]): CachePayload {
  const payload: CachePayload = { fetchedAt: Date.now(), entries };
  cache.set(CACHE_KEY, JSON.stringify(payload));
  return payload;
}

export function isStale(payload: CachePayload | undefined): boolean {
  if (!payload) return true;
  return Date.now() - payload.fetchedAt > STALE_AFTER_MS;
}

export async function fetchAndCacheDocs(): Promise<CachePayload> {
  const res = await fetch(SITEMAP_URL, {
    headers: { Accept: "application/xml" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  const entries = parseSitemap(xml);
  if (entries.length === 0) {
    throw new Error("Parsed sitemap contained no guides pages");
  }
  return writeCache(entries);
}
