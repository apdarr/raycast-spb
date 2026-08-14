import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "pinnedTabIds";

export async function getPinnedIds(): Promise<Set<string>> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  return new Set(raw ? (JSON.parse(raw) as string[]) : []);
}

export async function togglePinnedId(tabId: string, pinned: Set<string>): Promise<Set<string>> {
  const next = new Set(pinned);
  if (next.has(tabId)) {
    next.delete(tabId);
  } else {
    next.add(tabId);
  }
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
  return next;
}
