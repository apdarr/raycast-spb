/** Value used whenever the Supabase docs do not list a metric for a compute size. */
export const NA = "NA";

/**
 * A single Supabase compute size, consolidated from the three separate tables
 * in https://supabase.com/docs/guides/platform/compute-and-disk:
 *  - the main "Compute" table (price, CPU, memory, max DB size)
 *  - the "Disk > Compute size" table (baseline/max IOPS and throughput)
 *  - the "Limits and constraints" table (replication slots, WAL senders,
 *    database connections, pooler clients)
 *
 * The disk table goes up to 48XL while the limits/compute tables stop at 16XL,
 * so compute sizes beyond 16XL carry `NA` for the columns that only exist in
 * the smaller tables.
 */
export interface ComputeSize {
  /** Compute size name, e.g. "XL", "24XL - Optimized CPU". */
  name: string;

  // --- Compute table ---
  hourlyPriceUsd: string;
  monthlyPriceUsd: string;
  /** Raw CPU description, e.g. "4-core (dedicated)" or "Shared". */
  cpu: string;
  /** vCPU count derived from `cpu`, e.g. "4", or "Shared" / "NA". */
  vcpus: string;
  memory: string;
  maxDbSize: string;

  // --- Instance IOPS / throughput ---
  baselineThroughput: string;
  maxThroughput: string;
  baselineIops: string;
  maxIops: string;

  // --- Limits table ---
  maxReplicationSlots: string;
  maxWalSenders: string;
  dbMaxConnections: string;
  poolerMaxClients: string;
}

/** Where the currently-displayed data came from. */
export type DataSource = "live" | "cache" | "fallback";

/** Cached payload persisted in Raycast LocalStorage. */
export interface CachedData {
  /** ISO timestamp of the last successful live fetch, or null if never. */
  fetchedAt: string | null;
  source: DataSource;
  sizes: ComputeSize[];
}
