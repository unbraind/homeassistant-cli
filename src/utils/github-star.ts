import { execFile } from "node:child_process";
import { createInterface } from "node:readline";

const REPO = "unbraind/homeassistant-cli";
const GH_TIMEOUT_MS = 3000;

interface GhCommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

type StarStatus = "unavailable" | "not_logged_in" | "starred" | "not_starred" | "error";

type ExecFn = (args: string[]) => Promise<GhCommandResult>;
type PromptFn = (question: string) => Promise<string>;

interface StarPromptDeps {
  exec?: ExecFn;
  prompt?: PromptFn;
  isInteractive?: boolean;
  log?: (message: string) => void;
  warn?: (message: string) => void;
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

  // Never run gh checks in non-interactive contexts (CI/agents) to avoid hangs.
  if (!isInteractive) {
    return;
  }

  const status = await getGitHubStarStatus(exec);
  if (status !== "not_starred") {
    return;
  }

  const answer = (await prompt(`Would you like to star https://github.com/${REPO} using gh now? [y/N]: `))
    .trim()
    .toLowerCase();

  if (answer !== "y" && answer !== "yes") {
    return;
  }

  const starred = await starRepo(exec);
  if (starred) {
    log("Thanks for starring homeassistant-cli on GitHub.");
    return;
  }

  warn(`Unable to star the repo automatically. You can run: gh repo star ${REPO}`);
}
