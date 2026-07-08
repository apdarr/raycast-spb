import { Cache } from "@raycast/api";

export const SPEC_URL = "https://api.supabase.com/api/v1-json";
export const DOCS_BASE = "https://supabase.com/docs/reference/api";

/** Refresh cached spec automatically after this many ms (7 days). */
export const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const CACHE_KEY = "management-api-endpoints";
const cache = new Cache();

export interface Endpoint {
  operationId: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  tag: string;
  docsUrl: string;
  /** Extra tokens to help fuzzy matching (path segments, tag, id). */
  keywords: string[];
}

interface CachePayload {
  fetchedAt: number;
  endpoints: Endpoint[];
}

const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
];

/** OpenAPI operation shape (only the parts we consume). */
interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
}

interface OpenApiSpec {
  paths?: Record<string, Record<string, OpenApiOperation>>;
}

function tokenizePath(path: string): string[] {
  return path
    .split(/[/{}]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseSpec(spec: OpenApiSpec): Endpoint[] {
  const endpoints: Endpoint[] = [];
  const paths = spec.paths ?? {};

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!HTTP_METHODS.includes(method.toLowerCase())) continue;
      const op = operation;
      if (!op || !op.operationId) continue;

      const operationId = op.operationId;
      const tag = op.tags?.[0] ?? "";
      endpoints.push({
        operationId,
        method: method.toUpperCase(),
        path,
        summary: op.summary?.trim() || operationId,
        description: op.description?.trim() || "",
        tag,
        docsUrl: `${DOCS_BASE}/${operationId}`,
        keywords: [operationId, tag, ...tokenizePath(path)].filter(Boolean),
      });
    }
  }

  endpoints.sort((a, b) => a.summary.localeCompare(b.summary));
  return endpoints;
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

function writeCache(endpoints: Endpoint[]): CachePayload {
  const payload: CachePayload = { fetchedAt: Date.now(), endpoints };
  cache.set(CACHE_KEY, JSON.stringify(payload));
  return payload;
}

export function isStale(payload: CachePayload | undefined): boolean {
  if (!payload) return true;
  return Date.now() - payload.fetchedAt > STALE_AFTER_MS;
}

export async function fetchAndCacheEndpoints(): Promise<CachePayload> {
  const res = await fetch(SPEC_URL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch spec: ${res.status} ${res.statusText}`);
  }
  const spec = (await res.json()) as OpenApiSpec;
  const endpoints = parseSpec(spec);
  if (endpoints.length === 0) {
    throw new Error("Parsed spec contained no endpoints");
  }
  return writeCache(endpoints);
}
