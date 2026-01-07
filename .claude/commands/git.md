# Commit and Push to GitHub

Commit all changes and push to GitHub. Follow these steps:

1. Run `git status` to see all changes (staged, unstaged, and untracked files)
2. Run `git diff` to review the actual code changes
3. Run `git log --oneline -3` to see recent commit message style
4. Stage all changes with `git add -A`
5. Analyze all changes and create a clear, descriptive commit message that:
   - Summarizes what was changed (new feature, bug fix, refactor, etc.)
   - Focuses on the "why" not just the "what"
   - Uses imperative mood (e.g., "Add feature" not "Added feature")
6. Create the commit with the standard footer:
   ```
   🤖 Generated with Claude Code

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
7. Push to the remote repository with `git push`
8. Report the commit hash and confirm the push was successful

IMPORTANT:
- Do NOT commit files that contain secrets (.env, credentials, API keys)
- If there are no changes to commit, inform the user
- If push fails due to remote changes, ask the user before force pushing
