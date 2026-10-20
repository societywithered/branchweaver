#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import process from "node:process";

type Branch = {
  name: string;
  hash: string;
  timestamp: number;
  subject: string;
  current: boolean;
  ahead: number;
  behind: number;
  ageDays: number;
};

function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}

function showHelp(): void {
  console.log(`Usage: branchweaver [--all] [--json] [--sort recent|oldest|name] [--help]

Options:
  --all          Include remote branches
  --json         Output JSON
  --sort <order> Sort by recent, oldest, or name
  --help         Show help`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  const sortIndex = args.indexOf("--sort");
  const sort = sortIndex >= 0 ? args[sortIndex + 1] : "recent";

  if (!["recent", "oldest", "name"].includes(sort)) {
    console.error("Invalid sort order. Use recent, oldest, or name.");
    process.exitCode = 1;
    return;
  }

  try {
    git(["rev-parse", "--git-dir"]);
  } catch {
    console.error("Run branchweaver inside a Git repository.");
    process.exitCode = 1;
    return;
  }

  let currentBranch = "";

  try {
    currentBranch = git(["branch", "--show-current"]);
  } catch {
    // Detached HEAD.
  }

  const refs = args.includes("--all")
    ? ["refs/heads", "refs/remotes"]
    : ["refs/heads"];

  const format =
    "%(refname:short)%09%(objectname:short)%09%(committerdate:unix)%09%(subject)%09%(HEAD)";

  let rows: string[];

  try {
    rows = git(["for-each-ref", `--format=${format}`, ...refs])
      .split("\n")
      .filter(Boolean);
  } catch {
    rows = [];
  }

  const now = Date.now() / 1000;

  const branches: Branch[] = rows
    .map((row) => {
      const [name, hash, time, subject, head] = row.split("\t");
      const timestamp = Number(time) || 0;

      return {
        name,
        hash,
        timestamp,
        subject: subject || "(no subject)",
        current: head === "*" || name === currentBranch,
        ahead: 0,
        behind: 0,
        ageDays: Math.max(0, Math.floor((now - timestamp) / 86400))
      };
    })
    .filter((branch) => !branch.name.endsWith("/HEAD"))
    .map((branch) => {
      if (currentBranch && !branch.current) {
        try {
          const counts = git([
            "rev-list",
            "--left-right",
            "--count",
            `${currentBranch}...${branch.name}`
          ])
            .split(/\s+/)
            .map(Number);

          branch.behind = counts[0] || 0;
          branch.ahead = counts[1] || 0;
        } catch {
          // Leave counts at zero for unrelated histories.
        }
      }

      return branch;
    });

  if (sort === "name") {
    branches.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "oldest") {
    branches.sort((a, b) => a.timestamp - b.timestamp);
  } else {
    branches.sort((a, b) => b.timestamp - a.timestamp);
  }

  if (args.includes("--json")) {
    console.log(JSON.stringify(branches, null, 2));
    return;
  }

  if (branches.length === 0) {
    console.log("No branches found.");
    return;
  }

  console.log(`Branches${currentBranch ? ` (current: ${currentBranch})` : ""}`);
  console.log("NAME                           AGE       AHEAD/BEHIND  HASH     SUBJECT");

  for (const branch of branches) {
    const age = branch.ageDays === 0 ? "today" : `${branch.ageDays}d ago`;
    const relation = branch.current
      ? "current"
      : `+${branch.ahead}/-${branch.behind}`;

    console.log(
      `${branch.name.padEnd(30)} ${age.padEnd(9)} ${relation.padEnd(13)} ${branch.hash.padEnd(8)} ${branch.subject.slice(0, 40)}`
    );
  }
}

main();