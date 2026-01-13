#!/bin/bash
# sync-llama-cpp.sh - Sync fork with upstream llama.cpp
# Usage: ./sync-llama-cpp.sh [--dry-run] [--rebase]

set -e

UPSTREAM_URL="https://github.com/ggml-org/llama.cpp.git"
UPSTREAM_BRANCH="master"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd "$SCRIPT_DIR"

# Parse arguments
DRY_RUN=false
USE_REBASE=false
for arg in "$@"; do
    case $arg in
        --dry-run) DRY_RUN=true ;;
        --rebase) USE_REBASE=true ;;
        --help|-h)
            echo "Usage: $0 [--dry-run] [--rebase]"
            echo "  --dry-run  Show what would be synced without making changes"
            echo "  --rebase   Use rebase instead of merge (rewrites history)"
            exit 0
            ;;
    esac
done

echo -e "${BLUE}=== llama.cpp Sync Tool ===${NC}"
echo ""

# Ensure upstream remote exists
if ! git remote get-url upstream &>/dev/null; then
    echo -e "${YELLOW}Adding upstream remote...${NC}"
    git remote add upstream "$UPSTREAM_URL"
fi

# Fetch upstream
echo -e "${BLUE}Fetching upstream...${NC}"
git fetch upstream --quiet

# Count divergence
YOURS=$(git log --oneline upstream/$UPSTREAM_BRANCH..HEAD | wc -l)
THEIRS=$(git log --oneline HEAD..upstream/$UPSTREAM_BRANCH | wc -l)

echo ""
echo -e "${GREEN}Your custom commits:${NC} $YOURS"
echo -e "${YELLOW}Upstream commits to sync:${NC} $THEIRS"
echo ""

if [ "$THEIRS" -eq 0 ]; then
    echo -e "${GREEN}✓ Already up to date with upstream!${NC}"
    exit 0
fi

# Show upstream commits
echo -e "${BLUE}Upstream commits to merge:${NC}"
git log --oneline HEAD..upstream/$UPSTREAM_BRANCH
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY-RUN] Would sync $THEIRS commits from upstream${NC}"
    echo ""
    echo -e "${BLUE}Files that would be affected:${NC}"
    git diff --stat HEAD...upstream/$UPSTREAM_BRANCH | tail -20
    exit 0
fi

# Perform sync
if [ "$USE_REBASE" = true ]; then
    echo -e "${YELLOW}Rebasing onto upstream/$UPSTREAM_BRANCH...${NC}"
    git rebase upstream/$UPSTREAM_BRANCH
else
    echo -e "${YELLOW}Merging upstream/$UPSTREAM_BRANCH...${NC}"
    git merge upstream/$UPSTREAM_BRANCH -m "sync: merge upstream llama.cpp ($THEIRS commits)"
fi

echo ""
echo -e "${GREEN}✓ Sync complete!${NC}"
echo ""
echo -e "${BLUE}Don't forget to push:${NC} git push origin $(git branch --show-current)"
