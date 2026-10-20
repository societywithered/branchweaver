# Branchweaver

A read-only TypeScript command-line tool for exploring Git branches. View recent branch activity, compare branches with your current branch, and sort the results.

## Features

- Lists local branches, with optional remote branches
- Shows each branch’s latest commit, hash, and age
- Shows how many commits each branch is ahead of or behind the current branch
- Sorts by recent activity, oldest activity, or branch name
- Supports JSON output
- Does not change your repository

## Requirements

- Node.js 18 or newer
- Git installed and available in your terminal

## Install

```bash
git clone https://github.com/SocietyWithered/branchweaver.git
cd branchweaver
npm install
npm run build
```

To use `branchweaver` as a command on your computer, run:

```bash
npm link
```

## Run

Run Branchweaver from inside a Git repository:

```bash
branchweaver
```

Or, from the project folder without linking it globally:

```bash
npm start
```

## Options

Include remote branches:

```bash
branchweaver --all
```

Sort branches by recent activity, oldest activity, or name:

```bash
branchweaver --sort recent
branchweaver --sort oldest
branchweaver --sort name
```

Print branch information as JSON:

```bash
branchweaver --json
```

Show help:

```bash
branchweaver --help
```

Options can be combined:

```bash
branchweaver --all --sort name
branchweaver --all --json
```

## Example

```text
Branches (current: main)
NAME                           AGE       AHEAD/BEHIND  HASH     SUBJECT
feature/search                 2d ago    +3/-1         a1b2c3d  Add search filters
main                           today     current       e4f5g6h  Update documentation
```

Ahead/behind counts compare each branch with the currently checked-out branch.

## Development

After making changes, rebuild the project:

```bash
npm run build
