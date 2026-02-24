#!/bin/bash

# 1. Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI ('gh') is not installed."
    exit 1
fi

# 2. Get the PR Number
# Accepts a number as an argument (./script.sh 123)
# OR defaults to the current branch's PR if no argument is provided.
PR_NUM=${1:-$(gh pr view --json number -q .number 2>/dev/null)}

if [ -z "$PR_NUM" ]; then
    echo "Error: Could not detect a PR number. Are you on a branch with an open PR?"
    echo "Usage: $0 [pr-number]"
    exit 1
fi

echo "Fetching review comments for PR #$PR_NUM..."
echo "---------------------------------------------------"

# 3. Fetch Comments via API
# - GH_PAGER="": Disables interactive pager (less)
# - --paginate: Ensures we get all comments (not just the first 30)
# - jq: Formats the raw JSON into readable text
GH_PAGER="" gh api --paginate \
  "repos/:owner/:repo/pulls/$PR_NUM/comments" \
  --jq '.[] | 
    "File:   \(.path)",
    "Line:   \(if .line then .line else (.original_line | tostring + " (outdated)") end)",
    "----",
    "\(.body)",
    "\n===================================================\n"'

#     "Author: \(.user.login)",