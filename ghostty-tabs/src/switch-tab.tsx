import { useState } from "react";
import { Action, ActionPanel, Icon, List, closeMainWindow } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { GhosttyTab, listTabs, switchToTab } from "./lib/ghostty";
import { getPinnedIds, togglePinnedId } from "./lib/pins";

export default function Command() {
  const [failed, setFailed] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const { data, isLoading, revalidate } = usePromise(listTabs, [], {
    onError: async (error) => {
      setFailed(true);
      await showFailureToast(error, { title: "Couldn't list Ghostty tabs" });
    },
  });
  usePromise(getPinnedIds, [], { onData: setPinnedIds });

  const tabs = data ?? [];
  const pinnedTabs = tabs.filter((tab) => pinnedIds.has(tab.tabId));
  const unpinnedTabs = tabs.filter((tab) => !pinnedIds.has(tab.tabId));

  async function handleSelect(tab: GhosttyTab) {
    try {
      await switchToTab(tab.windowId, tab.tabId);
      await closeMainWindow();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't switch to tab" });
    }
  }

  async function handleTogglePin(tab: GhosttyTab) {
    setPinnedIds(await togglePinnedId(tab.tabId, pinnedIds));
  }

  function renderItem(tab: GhosttyTab) {
    const pinned = pinnedIds.has(tab.tabId);
    return (
      <List.Item
        key={tab.tabId}
        title={tab.name}
        subtitle={`Tab ${tab.index}`}
        accessories={pinned ? [{ icon: Icon.Pin, tooltip: "Pinned" }] : []}
        actions={
          <ActionPanel>
            <Action title="Switch to Tab" onAction={() => handleSelect(tab)} />
            <Action
              title={pinned ? "Unpin Tab" : "Pin Tab"}
              icon={pinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={() => handleTogglePin(tab)}
            />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search open Ghostty tabs...">
      {!isLoading && tabs.length === 0 && !failed ? (
        <List.EmptyView icon={Icon.Terminal} title="No open Ghostty tabs found" />
      ) : (
        <>
          {pinnedTabs.length > 0 && (
            <List.Section title="Pinned">{pinnedTabs.map((tab) => renderItem(tab))}</List.Section>
          )}
          <List.Section title="Unpinned">{unpinnedTabs.map((tab) => renderItem(tab))}</List.Section>
        </>
      )}
    </List>
  );
}
