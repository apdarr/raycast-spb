import { ComputeSize } from "./types";

export interface Column {
  key: keyof ComputeSize;
  /** Full label used in the metadata panel and copied tables. */
  label: string;
  /** Short label used for the wide markdown comparison table header. */
  short: string;
}

/** Ordered columns for the consolidated table. `name` is the row key. */
export const COLUMNS: Column[] = [
  { key: "name", label: "Compute Size", short: "Size" },
  { key: "vcpus", label: "vCPUs", short: "vCPU" },
  { key: "cpu", label: "CPU", short: "CPU" },
  { key: "memory", label: "Memory", short: "Mem" },
  { key: "maxDbSize", label: "Max DB Size (rec.)", short: "Max DB" },
  { key: "hourlyPriceUsd", label: "Hourly (USD)", short: "Hourly" },
  { key: "monthlyPriceUsd", label: "Monthly (USD)", short: "Monthly" },
  { key: "baselineIops", label: "Baseline IOPS", short: "Base IOPS" },
  { key: "maxIops", label: "Max IOPS", short: "Max IOPS" },
  { key: "baselineThroughput", label: "Baseline Throughput", short: "Base MB/s" },
  { key: "maxThroughput", label: "Max Throughput", short: "Max MB/s" },
  { key: "maxReplicationSlots", label: "Max Replication Slots", short: "Repl Slots" },
  { key: "maxWalSenders", label: "Max WAL Senders", short: "WAL Senders" },
  { key: "dbMaxConnections", label: "DB Max Connections", short: "DB Conns" },
  { key: "poolerMaxClients", label: "Pooler Max Clients", short: "Pooler" },
];

/** Escape a cell for use inside a Markdown table (pipes break table layout). */
function mdCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

/** Full wide comparison table (all compute sizes * all columns) as GitHub-flavored Markdown. */
export function toMarkdownTable(sizes: ComputeSize[]): string {
  const header = `| ${COLUMNS.map((c) => c.short).join(" | ")} |`;
  const divider = `| ${COLUMNS.map(() => "---").join(" | ")} |`;
  const rows = sizes.map((s) => `| ${COLUMNS.map((c) => mdCell(String(s[c.key]))).join(" | ")} |`);
  return [header, divider, ...rows].join("\n");
}

/** CSV with every field quoted so embedded commas (e.g. "11,800 IOPS") are safe. */
export function toCsv(sizes: ComputeSize[]): string {
  const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = COLUMNS.map((c) => quote(c.label)).join(",");
  const rows = sizes.map((s) => COLUMNS.map((c) => quote(String(s[c.key]))).join(","));
  return [header, ...rows].join("\n");
}

/** A single compute size as a two-column "Field | Value" Markdown table. */
export function computeSizeToMarkdown(size: ComputeSize): string {
  const header = `### ${size.name}\n\n| Field | Value |\n| --- | --- |`;
  const rows = COLUMNS.filter((c) => c.key !== "name").map(
    (c) => `| ${c.label} | ${mdCell(String(size[c.key]))} |`,
  );
  return [header, ...rows].join("\n");
}
