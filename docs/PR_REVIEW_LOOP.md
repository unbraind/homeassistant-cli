# Pull Request Review Loop

Use the repository-owned review helper to inventory every PR conversation, review, paginated inline thread, reaction, resolution state, and exact head SHA. It uses authenticated `gh` GraphQL and REST calls, never stores credentials, and emits JSON suitable for `jq` or archival in a pm item.

```bash
# Complete review inventory for the current PR
bun run review:inventory

# Wait once for GitHub checks, then return the complete inventory for the same head
bun run review:watch

# React to a review, conversation comment, or inline comment GraphQL node
bun run review:loop -- react --node-id PRRC_... --reaction THUMBS_UP

# React and reply to an inline finding in one operation
bun run review:loop -- acknowledge-inline \
  --comment-id 123456 --node-id PRRC_... --reaction THUMBS_UP \
  --body "Fixed in the current head and covered by the regression test."
```

Pass `--pr <number> --repo <owner/name>` to target a PR other than the current branch. `inventory` and `watch` paginate PR comments, submitted reviews, review threads, and every inline thread comment. The `watch` command delegates waiting to `gh pr checks --watch`; it does not implement an external polling loop, and rejects results if the PR head changes while checks run.

For every bot contribution, use the inventory to verify the author, current body, edit time, reaction state, thread resolution, and current-head relevance. Add a thumbs-up for accepted/actioned feedback or a thumbs-down for a technically incorrect finding, and add a specific inline reply. Rerun the full inventory immediately before merge so edited and newly added feedback cannot be missed.
