#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const reactions = new Set([
  "THUMBS_UP", "THUMBS_DOWN", "LAUGH", "HOORAY", "CONFUSED", "HEART", "ROCKET", "EYES",
]);

function runGh(args, input) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    input,
    stdio: [input === undefined ? "inherit" : "pipe", "pipe", "inherit"],
  }).trim();
}

function fail(message) {
  throw new Error(`${message}\nSee docs/PR_REVIEW_LOOP.md for supported commands.`);
}

function parseArgs(argv) {
  const [command = "inventory", ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!flag?.startsWith("--") || value === undefined) fail(`Invalid argument: ${flag ?? ""}`);
    options[flag.slice(2)] = value;
  }
  return { command, options };
}

function resolveTarget(options) {
  const repo = options.repo ?? JSON.parse(runGh(["repo", "view", "--json", "nameWithOwner"])).nameWithOwner;
  const pr = Number(options.pr ?? JSON.parse(runGh(["pr", "view", "--json", "number"])).number);
  if (!repo.includes("/") || !Number.isInteger(pr) || pr <= 0) fail("A valid repository and PR are required.");
  const [owner, name] = repo.split("/");
  return { repo, owner, name, pr };
}

function graphql(query, variables) {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined && value !== null) args.push("-F", `${key}=${value}`);
  }
  return JSON.parse(runGh(args));
}

const inventoryQuery = `
query ReviewInventory($owner: String!, $name: String!, $pr: Int!, $comments: String, $reviews: String, $threads: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $pr) {
      number url headRefOid updatedAt reviewDecision
      comments(first: 100, after: $comments) {
        pageInfo { hasNextPage endCursor }
        nodes { id databaseId author { login } body createdAt updatedAt reactionGroups { content viewerHasReacted users { totalCount } } }
      }
      reviews(first: 100, after: $reviews) {
        pageInfo { hasNextPage endCursor }
        nodes { id databaseId author { login } body state submittedAt updatedAt reactionGroups { content viewerHasReacted users { totalCount } } }
      }
      reviewThreads(first: 100, after: $threads) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id isResolved isOutdated path line originalLine
          comments(first: 100) {
            pageInfo { hasNextPage endCursor }
            nodes { id databaseId author { login } body createdAt updatedAt reactionGroups { content viewerHasReacted users { totalCount } } }
          }
        }
      }
    }
  }
}`;

const threadQuery = `
query ThreadComments($id: ID!, $cursor: String) {
  node(id: $id) {
    ... on PullRequestReviewThread {
      comments(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { id databaseId author { login } body createdAt updatedAt reactionGroups { content viewerHasReacted users { totalCount } } }
      }
    }
  }
}`;

function inventory(target) {
  const cursors = { comments: undefined, reviews: undefined, threads: undefined };
  const done = { comments: false, reviews: false, threads: false };
  const result = { comments: [], reviews: [], reviewThreads: [] };
  let header;
  do {
    const page = graphql(inventoryQuery, { owner: target.owner, name: target.name, pr: target.pr, ...cursors })
      .data.repository.pullRequest;
    header ??= {
      number: page.number,
      url: page.url,
      headRefOid: page.headRefOid,
      updatedAt: page.updatedAt,
      reviewDecision: page.reviewDecision,
    };
    for (const key of Object.keys(done)) {
      const connection = page[key === "threads" ? "reviewThreads" : key];
      result[key === "threads" ? "reviewThreads" : key].push(...connection.nodes);
      cursors[key] = connection.pageInfo.endCursor;
      done[key] = !connection.pageInfo.hasNextPage;
    }
  } while (Object.values(done).some((value) => !value));

  for (const thread of result.reviewThreads) {
    let pageInfo = thread.comments.pageInfo;
    while (pageInfo.hasNextPage) {
      const connection = graphql(threadQuery, { id: thread.id, cursor: pageInfo.endCursor }).data.node.comments;
      thread.comments.nodes.push(...connection.nodes);
      pageInfo = connection.pageInfo;
    }
    thread.comments.pageInfo = pageInfo;
  }
  return { ...header, ...result };
}

function addReaction(nodeId, reaction) {
  if (!nodeId || !reactions.has(reaction)) fail("react requires a node ID and valid GitHub reaction.");
  const mutation = `mutation($id: ID!, $content: ReactionContent!) {
    addReaction(input: { subjectId: $id, content: $content }) { reaction { content } }
  }`;
  return graphql(mutation, { id: nodeId, content: reaction });
}

function replyInline(target, commentId, body) {
  if (!commentId || !body) fail("reply-inline requires --comment-id and --body.");
  return JSON.parse(runGh([
    "api", `repos/${target.repo}/pulls/${target.pr}/comments/${commentId}/replies`, "-f", `body=${body}`,
  ]));
}

function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  const target = ["inventory", "watch", "reply-inline", "acknowledge-inline"].includes(command)
    ? resolveTarget(options)
    : undefined;
  if (command === "inventory") {
    console.log(JSON.stringify({ repository: target.repo, pullRequest: inventory(target) }, null, 2));
  } else if (command === "watch") {
    const watchedHead = JSON.parse(runGh([
      "pr", "view", String(target.pr), "--repo", target.repo, "--json", "headRefOid",
    ])).headRefOid;
    runGh(["pr", "checks", String(target.pr), "--repo", target.repo, "--watch", "--interval", "30"]);
    const pullRequest = inventory(target);
    if (pullRequest.headRefOid !== watchedHead) fail("PR head changed while checks were running; rerun the watch.");
    console.log(JSON.stringify({ repository: target.repo, watchedHead, pullRequest }, null, 2));
  } else if (command === "react") {
    console.log(JSON.stringify(addReaction(options["node-id"], options.reaction), null, 2));
  } else if (command === "reply-inline") {
    console.log(JSON.stringify(replyInline(target, options["comment-id"], options.body), null, 2));
  } else if (command === "acknowledge-inline") {
    const reaction = addReaction(options["node-id"], options.reaction);
    const reply = replyInline(target, options["comment-id"], options.body);
    console.log(JSON.stringify({ reaction, reply }, null, 2));
  } else {
    fail(`Unknown command: ${command}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
