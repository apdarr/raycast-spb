import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { parseComputeSizes } from "./parse";
import { CachedData } from "./types";
import { FALLBACK_SIZES } from "./fallback";

export const DOCS_URL = "https://supabase.com/docs/guides/platform/compute-and-disk";

const STORAGE_KEY = "supabase-compute-size:data:v1";
const DEFAULT_INTERVAL_DAYS = 3;
const FETCH_TIMEOUT_MS = 15_000;

interface Preferences {
  refreshIntervalDays?: string;
}

export function getRefreshIntervalDays(): number {
  const raw = getPreferenceValues<Preferences>().refreshIntervalDays;
  const parsed = Number.parseFloat(raw ?? "");
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_INTERVAL_DAYS;
  return parsed;
}

async function readCache(): Promise<CachedData | null> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedData;
    if (!Array.isArray(parsed.sizes) || parsed.sizes.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(data: CachedData): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isStale(cache: CachedData, intervalDays: number): boolean {
  if (!cache.fetchedAt) return true;
  const fetchedAt = new Date(cache.fetchedAt).getTime();
  if (Number.isNaN(fetchedAt)) return true;
  const ageMs = Date.now() - fetchedAt;
  return ageMs >= intervalDays * 24 * 60 * 60 * 1000;
}

async function fetchLive(): Promise<CachedData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(DOCS_URL, {
      signal: controller.signal,
      headers: { "User-Agent": "raycast-supabase-compute-size" },
    });
    if (!res.ok) throw new Error(`Supabase docs returned HTTP ${res.status}`);
    const html = await res.text();
    const sizes = parseComputeSizes(html);
    if (sizes.length === 0) throw new Error("Parsed 0 compute sizes from the docs");
    return { fetchedAt: new Date().toISOString(), source: "live", sizes };
  } finally {
    clearTimeout(timeout);
  }
}

export interface LoadResult {
  data: CachedData;
  /** Non-null when a live refresh was attempted but failed. */
  error: string | null;
}

/**
 * Load compute sizes, refreshing from the live docs when the cache is missing,
 * older than the configured interval, or when `force` is set. On fetch failure
 * it falls back to the last cache, then to the bundled seed, and reports the
 * error so the UI can surface it without blocking.
 */
export async function loadComputeSizes(options: { force?: boolean } = {}): Promise<LoadResult> {
  const intervalDays = getRefreshIntervalDays();
  const cache = await readCache();
  const shouldRefresh = options.force || !cache || isStale(cache, intervalDays);

  if (!shouldRefresh && cache) {
    return { data: { ...cache, source: "cache" }, error: null };
  }

  try {
    const live = await fetchLive();
    await writeCache(live);
    return { data: live, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (cache) {
      return { data: { ...cache, source: "cache" }, error: message };
    }
    const fallback: CachedData = { fetchedAt: null, source: "fallback", sizes: FALLBACK_SIZES };
    await writeCache(fallback);
    return { data: fallback, error: message };
  }
}
