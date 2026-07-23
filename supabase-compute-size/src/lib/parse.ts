import { HTMLElement, parse } from "node-html-parser";
import { NA, ComputeSize } from "./types";

interface RawTable {
  headers: string[];
  rows: string[][];
}

/** Read a cell's text with footnote superscripts stripped and whitespace collapsed. */
function cleanText(node: HTMLElement): string {
  node.querySelectorAll("sup").forEach((s) => s.remove());
  return node.text
    .replace(/\u00a0/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTables(html: string): RawTable[] {
  const root = parse(html);
  return root.querySelectorAll("table").map((table) => {
    const headers = table.querySelectorAll("thead th, thead td").map(cleanText);
    const rows = table
      .querySelectorAll("tbody tr")
      .map((tr) => tr.querySelectorAll("th, td").map(cleanText));
    return { headers, rows };
  });
}

/** "Nano (free)" -> "Nano"; also collapses whitespace. Keeps variant suffixes. */
function normalizeName(raw: string): string {
  return raw
    .replace(/\(free\)/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Derive a vCPU count from a CPU description like "4-core (dedicated)". */
function vcpusFromCpu(cpu: string): string {
  if (!cpu || cpu === NA) return NA;
  const m = cpu.match(/(\d+)\s*-?\s*core/i);
  if (m) return m[1];
  if (/shared/i.test(cpu)) return "Shared";
  return NA;
}

function findTable(
  tables: RawTable[],
  predicate: (headers: string) => boolean,
): RawTable | undefined {
  return tables.find((t) => predicate(t.headers.join(" | ").toLowerCase()));
}

/**
 * Parse the compute-and-disk docs HTML and merge the three source tables into a
 * single list of compute sizes. Throws if any of the expected tables is missing
 * (which usually means the docs layout changed and the parser needs updating).
 */
export function parseComputeSizes(html: string): ComputeSize[] {
  const tables = parseTables(html);

  const compute = findTable(
    tables,
    (h) => h.includes("compute size") && h.includes("monthly price"),
  );
  const disk = findTable(tables, (h) => h.includes("baseline iops") && h.includes("throughput"));
  const limits = findTable(tables, (h) => h.includes("replication slots"));

  if (!compute || !disk || !limits) {
    throw new Error(
      `Unexpected docs layout (compute=${!!compute}, disk=${!!disk}, limits=${!!limits}). The parser may need updating.`,
    );
  }

  const computeByName = new Map<
    string,
    Omit<
      ComputeSize,
      | "name"
      | "vcpus"
      | "baselineThroughput"
      | "maxThroughput"
      | "baselineIops"
      | "maxIops"
      | "maxReplicationSlots"
      | "maxWalSenders"
      | "dbMaxConnections"
      | "poolerMaxClients"
    >
  >();
  for (const r of compute.rows) {
    const name = normalizeName(r[0] ?? "");
    if (!name || name.startsWith(">")) continue; // skip ">16XL" contact-us row
    computeByName.set(name, {
      hourlyPriceUsd: r[1] || NA,
      monthlyPriceUsd: r[2] || NA,
      cpu: r[3] || NA,
      memory: r[4] || NA,
      maxDbSize: r[5] || NA,
    });
  }

  const limitsByName = new Map<
    string,
    Pick<
      ComputeSize,
      "maxReplicationSlots" | "maxWalSenders" | "dbMaxConnections" | "poolerMaxClients"
    >
  >();
  for (const r of limits.rows) {
    const name = normalizeName(r[0] ?? "");
    if (!name) continue;
    limitsByName.set(name, {
      maxReplicationSlots: r[1] || NA,
      maxWalSenders: r[2] || NA,
      dbMaxConnections: r[3] || NA,
      poolerMaxClients: r[4] || NA,
    });
  }

  // The disk table drives the master compute-size list because it is the most
  // complete (up to 48XL plus optimized/high-memory variants).
  return disk.rows
    .filter((r) => normalizeName(r[0] ?? "").length > 0)
    .map((r) => {
      const name = normalizeName(r[0]);
      const c = computeByName.get(name);
      const l = limitsByName.get(name);
      const cpu = c?.cpu ?? NA;
      return {
        name,
        hourlyPriceUsd: c?.hourlyPriceUsd ?? NA,
        monthlyPriceUsd: c?.monthlyPriceUsd ?? NA,
        cpu,
        vcpus: vcpusFromCpu(cpu),
        memory: c?.memory ?? NA,
        maxDbSize: c?.maxDbSize ?? NA,
        baselineThroughput: r[1] || NA,
        maxThroughput: r[2] || NA,
        baselineIops: r[3] || NA,
        maxIops: r[4] || NA,
        maxReplicationSlots: l?.maxReplicationSlots ?? NA,
        maxWalSenders: l?.maxWalSenders ?? NA,
        dbMaxConnections: l?.dbMaxConnections ?? NA,
        poolerMaxClients: l?.poolerMaxClients ?? NA,
      };
    });
}
