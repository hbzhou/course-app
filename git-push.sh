#!/bin/bash

# Script to push to multiple remote origins
# Pushes to both 'origin' and 'origin-epam' remotes

set -e  # Exit on any error

echo "🚀 Starting git push to multiple remotes..."

# Get current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $CURRENT_BRANCH"

# Push to origin
echo "📤 Pushing to origin..."
if git push origin "$CURRENT_BRANCH"; then
    echo "✅ Successfully pushed to origin"
else
    echo "❌ Failed to push to origin"
    exit 1
fi

# Push to origin-epam
echo "📤 Pushing to origin-epam..."
if git push origin-epam "$CURRENT_BRANCH"; then
    echo "✅ Successfully pushed to origin-epam"
else
    echo "❌ Failed to push to origin-epam"
    exit 1
fi

echo "🎉 All remotes updated successfully!"

