#!/bin/bash
# Prompts for CRON_SECRET via a macOS password dialog (input is hidden).
# Writes to a mode-600 temp file so Claude Code's subprocess can read it.
# Usage: source scripts/set-cron-secret.sh

secret=$(osascript \
  -e 'display dialog "Enter CRON_SECRET:" default answer "" with hidden answer buttons {"OK", "Cancel"} default button "OK" with title "Boot Up — Pipeline Auth"' \
  -e 'text returned of result' 2>/dev/null)

if [ -z "$secret" ]; then
  echo "Cancelled or empty — CRON_SECRET not set." >&2
  return 1 2>/dev/null || exit 1
fi

export CRON_SECRET="$secret"

# Write to temp file for Claude Code subprocess access.
# Create it 0600 ATOMICALLY (umask 177 in a subshell) so there is no window
# where the secret is world-readable between create and chmod. chmod after is a
# belt-and-suspenders tighten in case the path pre-existed with looser perms.
tmp_file="/tmp/.bootup_cron_secret"
(umask 177; printf '%s' "$secret" > "$tmp_file")
chmod 600 "$tmp_file"

# Do NOT print the secret or its length.
echo "CRON_SECRET exported. Temp file written to $tmp_file"
