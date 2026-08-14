import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { DOCS_URL, getRefreshIntervalDays, loadComputeSizes } from "./lib/data";
import { CachedData, NA, ComputeSize } from "./lib/types";
import { COLUMNS, toCsv, toMarkdownTable, computeSizeToMarkdown } from "./lib/format";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return "unknown";
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function updatedLabel(data: CachedData): string {
  if (data.source === "fallback") return "bundled offline data";
  if (!data.fetchedAt) return "unknown";
  return `updated ${relativeTime(data.fetchedAt)}`;
}

function dashNA(value: string): string {
  return value === NA ? "-" : value;
}

function FullTable({ data }: { data: CachedData }) {
  const markdown = `# Supabase Compute Size\n\n_${updatedLabel(data)} . [source](${DOCS_URL})_\n\n${toMarkdownTable(
    data.sizes,
  )}`;
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Compute Size - Full Table"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Table as Markdown"
            content={toMarkdownTable(data.sizes)}
          />
          <Action.CopyToClipboard title="Copy Table as CSV" content={toCsv(data.sizes)} />
          <Action.OpenInBrowser title="Open Supabase Docs" url={DOCS_URL} />
        </ActionPanel>
      }
    />
  );
}

function ComputeSizeDetail({ size }: { size: ComputeSize }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Compute Size"
            text={size.name}
            icon={Icon.MemoryChip}
          />
          <List.Item.Detail.Metadata.Separator />
          {COLUMNS.filter((col) => col.key !== "name").map((col) => (
            <List.Item.Detail.Metadata.Label
              key={col.key}
              title={col.label}
              text={dashNA(String(size[col.key]))}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const [result, setResult] = useState<CachedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showingDetail, setShowingDetail] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const { push } = useNavigation();

  async function run(force: boolean) {
    setIsLoading(true);
    if (force) {
      await showToast({ style: Toast.Style.Animated, title: "Refreshing from Supabase docs..." });
    }
    const { data, error: err } = await loadComputeSizes({ force });
    setResult(data);
    setError(err);
    setIsLoading(false);
    setSelectedItemId(data.sizes[0]?.name ?? null);

    if (err && data.source !== "live") {
      await showFailureToast(err, { title: "Using cached data - live refresh failed" });
    } else if (force) {
      await showToast({ style: Toast.Style.Success, title: "Updated from Supabase docs" });
    }
  }

  useEffect(() => {
    run(false);
  }, []);

  const sizes = result?.sizes ?? [];
  const sectionTitle = result
    ? `${sizes.length} compute sizes . ${updatedLabel(result)}`
    : "Loading...";
  const intervalDays = getRefreshIntervalDays();

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      selectedItemId={selectedItemId ?? undefined}
      onSelectionChange={setSelectedItemId}
      searchBarPlaceholder="Filter compute sizes (name, vCPUs, memory, IOPS, connections...)"
    >
      {error && result?.source !== "live" ? (
        <List.Section title="Live refresh failed">
          <List.Item
            title="Showing cached data"
            subtitle={error}
            icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          />
        </List.Section>
      ) : null}

      <List.Section title={sectionTitle}>
        {sizes.map((size) => (
          <List.Item
            key={size.name}
            title={size.name}
            keywords={[
              size.vcpus,
              size.cpu,
              size.memory,
              size.baselineIops,
              size.maxIops,
              size.dbMaxConnections,
              size.poolerMaxClients,
            ]}
            accessories={
              showingDetail
                ? undefined
                : [
                    { tag: size.vcpus === NA ? "-" : `${size.vcpus} vCPU` },
                    { text: dashNA(size.memory) },
                    { text: dashNA(size.dbMaxConnections), icon: Icon.Plug },
                  ]
            }
            detail={<ComputeSizeDetail size={size} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={showingDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => setShowingDetail((v) => !v)}
                  />
                  {result ? (
                    <Action
                      title="Show Full Comparison Table"
                      icon={Icon.AppWindowGrid3x3}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      onAction={() => push(<FullTable data={result} />)}
                    />
                  ) : null}
                </ActionPanel.Section>

                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Compute Size as Markdown"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    content={computeSizeToMarkdown(size)}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Data">
                  <Action
                    title="Refresh from Supabase Docs"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => run(true)}
                  />
                  <Action.OpenInBrowser
                    title="Open Supabase Docs"
                    url={DOCS_URL}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="About">
        <List.Item
          title="Auto-refresh"
          icon={Icon.Clock}
          accessories={[{ text: `every ${intervalDays} day${intervalDays === 1 ? "" : "s"}` }]}
        />
      </List.Section>
    </List>
  );
}
