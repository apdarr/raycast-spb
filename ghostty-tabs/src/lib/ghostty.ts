import { runAppleScript } from "@raycast/utils";

export type GhosttyTab = {
  windowId: string;
  windowName: string;
  tabId: string;
  index: string;
  name: string;
  selected: boolean;
};

// Ghostty's scripting dictionary defines a "tab" class, which shadows AppleScript's
// built-in "tab"/"linefeed" whitespace constants inside this tell block. Use ASCII
// character codes instead so the delimiters aren't swallowed by Ghostty's terminology.
const LIST_TABS_SCRIPT = `
tell application "Ghostty"
  set output to {}
  set fieldSep to ASCII character 9
  set rowSep to ASCII character 10
  repeat with w in every window
    set wId to id of w
    set wName to name of w
    repeat with t in every tab of w
      set end of output to wId & fieldSep & wName & fieldSep & (id of t) & fieldSep & (index of t as string) & fieldSep & (name of t) & fieldSep & (selected of t as string)
    end repeat
  end repeat
  set AppleScript's text item delimiters to rowSep
  set outStr to output as string
  set AppleScript's text item delimiters to ""
  return outStr
end tell
`;

export async function listTabs(): Promise<GhosttyTab[]> {
  const result = await runAppleScript(LIST_TABS_SCRIPT);
  if (!result.trim()) {
    return [];
  }

  return result
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [windowId, windowName, tabId, index, name, selected] = line.split("\t");
      return { windowId, windowName, tabId, index, name, selected: selected === "true" };
    });
}

export async function switchToTab(windowId: string, tabId: string): Promise<void> {
  const script = `
    tell application "Ghostty"
      select tab (tab id "${tabId}" of window id "${windowId}")
      activate window (window id "${windowId}")
    end tell
    tell application "System Events" to tell process "Ghostty" to set frontmost to true
  `;
  await runAppleScript(script);
}
