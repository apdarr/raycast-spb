import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { DocEntry, fetchAndCacheDocs, isStale, readCache } from "./lib/sitemap";
import { addPin, getPins, removePin } from "./lib/pins";

const DOC_EMOJI = "📘";

export default function Command() {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [pins, setPins] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh(showFeedback: boolean) {
    try {
      if (showFeedback) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Refreshing docs...",
        });
      }
      const payload = await fetchAndCacheDocs();
      setEntries(payload.entries);
      if (showFeedback) {
        await showToast({
          style: Toast.Style.Success,
          title: "Docs refreshed",
          message: `${payload.entries.length} pages`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = readCache();
      if (cached && !cancelled) {
        setEntries(cached.entries);
        setIsLoading(false);
      }

      const storedPins = await getPins();
      if (!cancelled) setPins(storedPins);

      if (isStale(cached)) {
        await refresh(!cached);
      }

      if (!cancelled) setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const pinSet = useMemo(() => new Set(pins), [pins]);

  const { pinnedEntries, otherEntries } = useMemo(() => {
    const byUrl = new Map(entries.map((e) => [e.url, e]));
    const pinned = pins
      .map((url) => byUrl.get(url))
      .filter((e): e is DocEntry => Boolean(e));
    const others = entries.filter((e) => !pinSet.has(e.url));
    return { pinnedEntries: pinned, otherEntries: others };
  }, [entries, pins, pinSet]);

  async function handlePin(url: string) {
    const next = await addPin(url);
    setPins(next);
    await showToast({ style: Toast.Style.Success, title: "Pinned" });
  }

  async function handleUnpin(url: string) {
    const next = await removePin(url);
    setPins(next);
    await showToast({ style: Toast.Style.Success, title: "Unpinned" });
  }

  function renderItem(entry: DocEntry, isPinned: boolean) {
    return (
      <List.Item
        key={entry.url}
        icon={{ source: DOC_EMOJI }}
        title={entry.title}
        subtitle={entry.breadcrumb}
        keywords={entry.keywords}
        accessories={
          isPinned ? [{ icon: Icon.Tack, tooltip: "Pinned" }] : undefined
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open Page"
                url={entry.url}
                icon={Icon.Globe}
              />
              <Action.CopyToClipboard
                title="Copy URL"
                content={entry.url}
                shortcut={Keyboard.Shortcut.Common.Pin}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              {isPinned ? (
                <Action
                  title="Unpin"
                  icon={Icon.TackDisabled}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  onAction={() => handleUnpin(entry.url)}
                />
              ) : (
                <Action
                  title="Pin"
                  icon={Icon.Tack}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  onAction={() => handlePin(entry.url)}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Refresh Data"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => refresh(true)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Supabase guides..."
    >
      {pinnedEntries.length > 0 && (
        <List.Section title="Pinned">
          {pinnedEntries.map((entry) => renderItem(entry, true))}
        </List.Section>
      )}
      <List.Section title="All Docs">
        {otherEntries.map((entry) => renderItem(entry, false))}
      </List.Section>
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={isLoading ? "Loading docs..." : "No docs found"}
        description={
          isLoading
            ? undefined
            : "Try a different search or refresh the data (⌘R)."
        }
      />
    </List>
  );
}
