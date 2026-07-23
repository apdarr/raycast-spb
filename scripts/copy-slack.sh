#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Copy Slack Thread as Markdown
# @raycast.mode silent

# Optional parameters:
# @raycast.packageName Slack
# @raycast.description Convert the Slack permalink on the clipboard to Markdown

set -o pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI not found"
  exit 1
fi

url="$(pbpaste)"
if [[ ! "$url" =~ ^https://[^/[:space:]]+\.slack\.com/archives/[^/[:space:]]+/p[0-9]+([?][^[:space:]]*)?$ ]]; then
  echo "Clipboard does not contain a Slack message permalink"
  exit 1
fi

error_file="$(mktemp)"
trap 'rm -f "$error_file"' EXIT

if ! markdown="$(gh slack read "$url" 2>"$error_file")"; then
  error="$(<"$error_file")"
  echo "${error:-Failed to read the Slack thread}"
  exit 1
fi

if [[ -z "$markdown" ]]; then
  echo "gh-slack returned no Markdown"
  exit 1
fi

if ! printf '%s' "$markdown" | pbcopy; then
  echo "Failed to write Markdown to the clipboard"
  exit 1
fi

echo "Slack thread copied as Markdown"
