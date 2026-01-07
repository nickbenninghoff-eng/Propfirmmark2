# End of Session Review

Review all work completed in this session before committing.

## Step 1: Identify Changes
Run `git status` and `git diff` to see all modified, added, and deleted files.

## Step 2: Code Quality Review
For each changed file, verify:
- **Best Practices**: Clean code, proper naming, no code smells, DRY principles
- **TypeScript**: Proper typing, no `any` types unless justified, correct interfaces
- **React/Next.js**: Proper hooks usage, no unnecessary re-renders, correct patterns
- **Error Handling**: Appropriate try/catch, user-friendly error messages

## Step 3: Efficiency Check
- No redundant code or duplicate logic
- Database queries are optimized (no N+1 problems)
- No unnecessary API calls or re-fetches
- Imports are clean (no unused imports)

## Step 4: Security Audit
Check for common vulnerabilities:
- No hardcoded secrets, API keys, or credentials
- SQL injection prevention (parameterized queries)
- XSS prevention (proper input sanitization)
- Authentication/authorization checks in place
- No sensitive data exposed in client-side code

## Step 5: Summary Report
Provide a brief summary:
1. What was accomplished this session
2. Any issues found and fixed during review
3. Any remaining concerns or technical debt

## Step 6: Commit Prompt
If everything looks good, ask the user:
"Ready to commit these changes to git? Type /git to commit and push."

If issues were found, list them and ask if the user wants to fix them first.
