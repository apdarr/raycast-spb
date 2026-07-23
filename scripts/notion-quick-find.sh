#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Notion Quick Find
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🔎
# @raycast.packageName Notion

# Documentation:
# @raycast.description Focuses Notion (launching it if needed) and opens its Quick Find.
# @raycast.author apdarr

osascript <<'APPLESCRIPT'
tell application "Notion" to activate

-- Wait until Notion actually becomes the frontmost app before sending the keystroke
repeat 50 times
	tell application "System Events"
		if (name of first process whose frontmost is true) is "Notion" then exit repeat
	end tell
	delay 0.1
end repeat

tell application "System Events"
	keystroke "k" using {command down}
end tell
APPLESCRIPT
