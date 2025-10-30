---
title: "Rewriting Git History"
type: "explanation"
audience: "advanced"
estimated_time: "10 minutes"
prerequisites:
  - "Familiarity with Git commands"
  - "Access to the repository remote"
related_docs:
  - "../how-to/development.md"
  - "../guides/troubleshooting.md"
last_updated: "2025-10-30"
---

# Rewriting Git History to Remove Accidentally Committed Files

## Introduction

In software development, it's not uncommon to accidentally commit files that shouldn't be part of the repository—whether they're sensitive configuration files, temporary artifacts, or simply files meant to remain local. When such files are pushed to a shared remote repository like GitHub, removing them requires more than just deleting the file; you need to rewrite the commit history to erase all traces.

This article walks through a real-world scenario where a file was accidentally committed and pushed to the `main` branch, and how to safely remove it from the repository's history while preserving it locally.

## The Problem

Imagine you've been working on a project and accidentally committed a file called `prompts/sprints.md` that contains sensitive or private information. You realize this after pushing the commit to the remote `main` branch. Simply deleting the file and committing again won't remove it from the history—anyone with access to the repository can still check out the old commit and view the file.

The goal is to:
- Remove all traces of the file from the repository's history
- Keep the file locally for your continued use
- Ensure the file won't be committed again in the future

## The Solution: Git History Rewriting

Git provides tools to rewrite history, but they must be used carefully as they can affect collaborators. The key commands involved are:

- `git rm --cached`: Remove a file from the index without deleting it from the working directory
- `git commit --amend`: Modify the last commit to exclude the file
- `git push --force-with-lease`: Update the remote branch with the rewritten history

### Prerequisites

- The file should only exist in recent commits (ideally the last one) to minimize the impact
- You have permission to force-push to the remote branch
- Inform collaborators before rewriting shared history

## Step-by-Step Resolution

### 1. Identify the Problematic Commit

First, check when the file was committed:

```bash
git log --oneline --follow prompts/sprints.md
```

This shows the commit hash where the file was added. In our case, it was the latest commit.

### 2. Stash Any Uncommitted Changes

If you have uncommitted changes, stash them to avoid conflicts:

```bash
git stash push -m "temp stash before removing file"
```

### 3. Remove the File from Git Tracking

Remove the file from the index while keeping it in your working directory:

```bash
git rm --cached prompts/sprints.md
```

### 4. Amend the Commit

Rewrite the last commit to exclude the file:

```bash
git commit --amend --no-edit
```

This creates a new commit hash with the same message but without the file.

### 5. Force Push the Rewritten History

Update the remote repository:

```bash
git push --force-with-lease origin main
```

The `--force-with-lease` option is safer than `--force` as it checks if someone else has pushed since your last fetch.

### 6. Restore Your Changes

If you stashed changes earlier, restore them:

```bash
git stash pop
```

If there are conflicts (as in our case where the file was untracked), resolve them by temporarily moving the file and then restoring it.

### 7. Ensure the File Stays Ignored

Add the file or its directory to `.gitignore`:

```gitignore
prompts/
```

Or specifically:

```gitignore
prompts/sprints.md
```

Commit this change:

```bash
git add .gitignore
git commit -m "Add file to .gitignore"
git push origin main
```

## Verification

Confirm the file is no longer in history:

```bash
git log --oneline --follow prompts/sprints.md
```

(No output should appear)

Verify the file exists locally but is untracked:

```bash
ls prompts/sprints.md
git ls-files prompts/sprints.md
```

(The first command shows the file exists, the second shows no output)

## Best Practices

### Prevention
- Use `.gitignore` from the start of your project
- Review changes before committing with `git diff --cached`
- Use `git add -p` for selective staging

### When Rewriting History
- Only rewrite history on branches you control
- Communicate with your team before force-pushing
- Consider using `git filter-branch` or `git filter-repo` for complex cases affecting multiple commits
- Test the rewritten history locally before pushing

### Alternatives
- If the file is in many commits, use `git filter-branch`:
  ```bash
  git filter-branch --tree-filter 'rm -f prompts/sprints.md' --prune-empty HEAD
  ```
- For large repositories, `git filter-repo` is more efficient than `filter-branch`

### Security Considerations
- Force-pushing rewrites history but doesn't delete old commits from git's internal storage immediately
- Old commits may still be accessible via reflog or if others have cloned them
- For truly sensitive data, consider rotating secrets and invalidating any exposed information

## Conclusion

Rewriting git history is a powerful but dangerous tool that should be used judiciously. In this scenario, we successfully removed an accidentally committed file from the repository's history while keeping it locally available. The key was using `git rm --cached` followed by `git commit --amend` and a force push.

Remember: prevention through proper `.gitignore` usage and careful staging is always better than cure. When you must rewrite history, do so with caution and clear communication with your team.