/**
 * Provides shared github star behavior for the Home Assistant CLI runtime.
 */
import { execFile } from "node:child_process";
import { createInterface } from "node:readline";
import { getData, saveData } from "../config/index.js";

const REPO = "unbraind/homeassistant-cli";
const REPO_URL = `https://github.com/${REPO}`;
const GH_TIMEOUT_MS = 3000;

interface GhCommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

type StarStatus = "unavailable" | "not_logged_in" | "starred" | "not_starred" | "error";
type StarPromptOutcome = "already_starred" | "starred_via_gh" | "declined" | "manual_link";

type ExecFn = (args: string[]) => Promise<GhCommandResult>;
type PromptFn = (question: string) => Promise<string>;

interface GitHubStarPromptState {
  completed: boolean;
  checkedAt: string;
  lastStatus: StarStatus;
  outcome: StarPromptOutcome;
}

interface StarPromptDeps {
  exec?: ExecFn;
  prompt?: PromptFn;
  isInteractive?: boolean;
  log?: (message: string) => void;
  warn?: (message: string) => void;
  configPath?: string;
}

function getPromptState(configPath?: string): GitHubStarPromptState | undefined {
  const data = getData(configPath) as { githubStarPrompt?: GitHubStarPromptState };
  return data.githubStarPrompt;
}

function savePromptState(outcome: StarPromptOutcome, lastStatus: StarStatus, configPath?: string): void {
  saveData({
    githubStarPrompt: {
      completed: true,
      checkedAt: new Date().toISOString(),
      lastStatus,
      outcome,
    },
  }, configPath);
}

function execGh(args: string[]): Promise<GhCommandResult> {
  return new Promise((resolve) => {
    execFile("gh", args, { encoding: "utf8", timeout: GH_TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          ok: false,
          stdout: stdout ?? "",
          stderr: stderr ?? error.message,
        });
        return;
      }

      resolve({
        ok: true,
        stdout: stdout ?? "",
        stderr: stderr ?? "",
      });
    });
  });
}

function promptInTerminal(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function getGitHubStarStatus(exec: ExecFn = execGh): Promise<StarStatus> {
  const hasGh = await exec(["--version"]);
  if (!hasGh.ok) {
    return "unavailable";
  }

  const auth = await exec(["auth", "status"]);
  if (!auth.ok) {
    return "not_logged_in";
  }

  const starred = await exec([
    "repo",
    "view",
    REPO,
    "--json",
    "viewerHasStarred",
    "--jq",
    ".viewerHasStarred",
  ]);

  if (!starred.ok) {
    return "error";
  }

  const normalized = starred.stdout.trim().toLowerCase();
  if (normalized === "true") {
    return "starred";
  }
  if (normalized === "false") {
    return "not_starred";
  }

  return "error";
}

async function starRepo(exec: ExecFn): Promise<boolean> {
  const withYes = await exec(["repo", "star", REPO, "--yes"]);
  if (withYes.ok) {
    return true;
  }

  if (withYes.stderr.toLowerCase().includes("unknown flag")) {
    const fallback = await exec(["repo", "star", REPO]);
    return fallback.ok;
  }

  return false;
}

export async function maybePromptToStarRepo(deps?: StarPromptDeps): Promise<void> {
  const exec = deps?.exec ?? execGh;
  const prompt = deps?.prompt ?? promptInTerminal;
  const log = deps?.log ?? console.error;
  const warn = deps?.warn ?? console.error;
  const isInteractive = deps?.isInteractive ?? (Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY));
  const configPath = deps?.configPath;

  // Never run gh checks in non-interactive contexts (CI/agents) to avoid hangs.
  if (!isInteractive) {
    return;
  }

  if (getPromptState(configPath)?.completed) {
    return;
  }

  const status = await getGitHubStarStatus(exec);
  if (status === "starred") {
    savePromptState("already_starred", "starred", configPath);
    return;
  }

  if (status === "unavailable" || status === "not_logged_in") {
    log(`Star this project: ${REPO_URL}`);
    savePromptState("manual_link", status, configPath);
    return;
  }

  if (status === "error") {
    warn(`Unable to check GitHub star status automatically. Star manually: ${REPO_URL}`);
    savePromptState("manual_link", "error", configPath);
    return;
  }

  const answer = (await prompt(`Would you like to star ${REPO_URL} using gh now? [y/N]: `))
    .trim()
    .toLowerCase();

  if (answer !== "y" && answer !== "yes") {
    savePromptState("declined", "not_starred", configPath);
    return;
  }

  const starred = await starRepo(exec);
  if (starred) {
    log("Thanks for starring homeassistant-cli on GitHub.");
    savePromptState("starred_via_gh", "starred", configPath);
    return;
  }

  warn(`Unable to star the repo automatically. You can run: gh repo star ${REPO} or open ${REPO_URL}`);
  savePromptState("manual_link", "error", configPath);
}
