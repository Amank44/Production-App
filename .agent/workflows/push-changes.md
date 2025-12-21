---
description: Push changes to the existing branch
---

# Push Changes to Main Branch

This workflow helps you pull the latest code from main, commit your changes, and push them back to main.

## Steps:

1. **Check current branch and status**
   // turbo
   ```bash
   git status
   ```

2. **Ensure you're on the main branch**
   // turbo
   ```bash
   git checkout main
   ```

3. **Pull latest code from main branch**
   // turbo
   ```bash
   git pull origin main
   ```
   This ensures you have the latest changes before making your commits.

4. **Stage all changes**
   // turbo
   ```bash
   git add .
   ```

5. **Commit changes with a descriptive message**
   ```bash
   git commit -m "Your commit message here"
   ```
   Note: Replace "Your commit message here" with a meaningful description of your changes.

6. **Push to main branch**
   // turbo
   ```bash
   git push origin main
   ```

## Important Notes:
- This workflow **always pulls from main** before pushing to ensure you have the latest code
- If there are merge conflicts during the pull, you'll need to resolve them before pushing
- Make sure to write clear commit messages describing what changes you made

## Available branches:
- `main` (primary branch - always pull from here)
- `develop`
- `feature/ayush-dev`
