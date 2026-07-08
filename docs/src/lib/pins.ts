import { LocalStorage } from "@raycast/api";

const PINS_KEY = "supabase-docs-pins";

/** Returns pinned URLs in pin order (most recently pinned last). */
export async function getPins(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(PINS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

async function setPins(urls: string[]): Promise<void> {
  await LocalStorage.setItem(PINS_KEY, JSON.stringify(urls));
}

export async function addPin(url: string): Promise<string[]> {
  const pins = await getPins();
  if (pins.includes(url)) return pins;
  const next = [...pins, url];
  await setPins(next);
  return next;
}

export async function removePin(url: string): Promise<string[]> {
  const pins = await getPins();
  const next = pins.filter((u) => u !== url);
  await setPins(next);
  return next;
}
