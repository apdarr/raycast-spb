import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import {
  Endpoint,
  fetchAndCacheEndpoints,
  isStale,
  readCache,
} from "./lib/spec";

const METHOD_COLORS: Record<string, Color> = {
  GET: Color.Green,
  POST: Color.Blue,
  PUT: Color.Orange,
  PATCH: Color.Yellow,
  DELETE: Color.Red,
};

const METHOD_EMOJI = "🔌";

export default function Command() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh(showFeedback: boolean) {
    try {
      if (showFeedback) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Refreshing endpoints...",
        });
      }
      const payload = await fetchAndCacheEndpoints();
      setEndpoints(payload.endpoints);
      if (showFeedback) {
        await showToast({
          style: Toast.Style.Success,
          title: "Endpoints refreshed",
          message: `${payload.endpoints.length} endpoints`,
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
        setEndpoints(cached.endpoints);
        setIsLoading(false);
      }

      // Fetch fresh data if cache is missing or stale.
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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search endpoints by name, path, or method..."
    >
      {endpoints.map((endpoint) => (
        <List.Item
          key={endpoint.operationId}
          icon={{ source: METHOD_EMOJI }}
          title={endpoint.summary}
          subtitle={`${endpoint.method} ${endpoint.path}`}
          keywords={endpoint.keywords}
          accessories={[
            endpoint.tag ? { text: endpoint.tag } : {},
            {
              tag: {
                value: endpoint.method,
                color: METHOD_COLORS[endpoint.method] ?? Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser
                  title="Open Docs"
                  url={endpoint.docsUrl}
                  icon={Icon.Book}
                />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={`${endpoint.method} ${endpoint.path}`}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                />
                <Action.CopyToClipboard
                  title="Copy Docs URL"
                  content={endpoint.docsUrl}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                />
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
      ))}
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={isLoading ? "Loading endpoints..." : "No endpoints found"}
        description={
          isLoading
            ? undefined
            : "Try a different search or refresh the data (⌘R)."
        }
      />
    </List>
  );
}
