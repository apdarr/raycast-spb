#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Copy Chrome URL
# @raycast.mode silent

# Optional parameters:
# @raycast.icon :link:
# @raycast.packageName Chrome
# @raycast.description Copy the URL of the active tab in Google Chrome

set -o pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

if ! pgrep -xq "Google Chrome"; then
  echo "Google Chrome is not running"
  exit 1
fi

url="$(osascript <<'APPLESCRIPT'
tell application "Google Chrome"
  if (count of windows) is 0 then return ""
  return URL of active tab of front window
end tell
APPLESCRIPT
)"

if [[ -z "$url" ]]; then
  echo "No active Chrome tab found"
  exit 1
fi

if ! printf '%s' "$url" | pbcopy; then
  echo "Failed to write the URL to the clipboard"
  exit 1
fi

echo "Copied: $url"
