#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import process from "node:process";

type Branch = {
  name: string;
  hash: string;
  timestamp: number;
  subject: string;
  current: boolean;
  upstream?: string;
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
  console.log(`
🪡 BRANCHWEAVER — inspect the shape of your Git branches

Usage:
  branchweaver [options]

Options:
  --all                  Include remote branches
  --json                 Output branch data as JSON
  --sort <order>         Sort by recent, oldest, or name
  --help                 Show this help
`);
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
    console.error("--sort must be recent, oldest, or name.");
    process.exitCode = 1;
    return;
  }

  try {
    git(["rev-parse", "--git-dir"]);
  } catch {
    console.error("Branchweaver must be run inside a Git repository.");
    process.exitCode = 1;
    return;
  }

  let currentBranch = "";

  try {
    currentBranch = git(["branch", "--show-current"]);
  } catch {
    // The repository may be in a detached HEAD state.
  }

  const refs = args.includes("--all")
    ? ["refs/heads", "refs/remotes"]
    : ["refs/heads"];

  const format =
    "%(refname:short)%09%(objectname:short)%09%(committerdate:unix)%09%(subject)%09%(HEAD)%09%(upstream:short)";

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
      const [name, hash, time, subject, head, upstream] = row.split("\t");
      const timestamp = Number(time) || 0;

      return {
        name,
        hash,
        timestamp,
        subject: subject || "(no subject)",
        current: head === "*" || name === currentBranch,
        ...(upstream ? { upstream } : {}),
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
          // Branch histories may be unrelated.
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

  console.log(
    `\n🪡 BRANCHWEAVER ${
      currentBranch ? `· current: ${currentBranch}` : "· detached HEAD"
    }`
  );
  console.log("─".repeat(78));

  for (const branch of branches) {
    const marker =
      branch.ageDays < 7 ? "✦" : branch.ageDays < 30 ? "◌" : "☄";

    const age =
      branch.ageDays === 0 ? "today" : `${branch.ageDays}d ago`;

    const relation = branch.current
      ? "current"
      : `+${branch.ahead}/-${branch.behind}`;

    const name = branch.current
      ? `\x1b[1;36m${branch.name}\x1b[0m`
      : branch.name;

    console.log(
      `${marker} ${name.padEnd(28)} ${age.padEnd(9)} ${relation.padEnd(12)} ${branch.hash}  ${branch.subject.slice(0, 40)}`
    );
  }

  console.log(
    "\n✦ active <7d   ◌ quiet <30d   ☄ stale ≥30d   +ahead/-behind vs current\n"
  );
}

main();