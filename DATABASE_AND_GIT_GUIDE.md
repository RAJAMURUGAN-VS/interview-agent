# Database & Git Configuration Guide

## What is `insights.db`?

`insights.db` is a **SQLite database file** used by the Insights feature in the backend. Here's what it stores:

### Purpose
- Stores user interview experience data (feedback, notes, performance metrics)
- Stores preparation strategies and study plans
- Used for the Prep Plan feature to cache company patterns and topic resources

### Location
```
backend/instance/insights.db
```

The `backend/instance/` directory is Flask's standard location for local instance files that should NOT be committed to Git.

### Why It Shouldn't Be in Git

1. **Local Data**: `insights.db` contains local test data specific to your machine
2. **Conflicts**: If both you and your friend run the app, you'll have different database states
3. **Size**: Database files can grow large and slow down Git operations
4. **Merge Conflicts**: When both people modify the database, Git can't merge them intelligently

## Why Your Friend Gets a Push Error

When you push to GitHub and your friend pulls:
- They get a different version of `insights.db` with YOUR data
- When they run the backend, it creates NEW data in their `insights.db`
- Git detects a conflict: "Hey, the database changed on both sides!"
- This causes merge conflicts that are hard to resolve

## The Solution: `.gitignore`

The `.gitignore` file now includes:
```
# Database files (should never be committed)
backend/instance/
*.db
*.sqlite
*.sqlite3
```

This tells Git to **ignore** all database files.

## What You Need To Do

### If `insights.db` is already in Git history:

1. **Remove it from Git tracking** (but keep it locally):
   ```bash
   git rm --cached backend/instance/insights.db
   git commit -m "Remove insights.db from tracking"
   git push
   ```

2. **Both you and your friend pull**:
   ```bash
   git pull
   ```

3. **Create a fresh database** (runs automatically):
   When you start the backend, it will create a new `insights.db` with empty tables.

### Going Forward:

- Push code changes freely without worrying about database conflicts
- Each person has their own local database
- Share real user data via exports/backups if needed, NOT through Git

## Other Files Now Ignored

The updated `.gitignore` also ignores:
- `__pycache__/` - Python cache files
- `.venv/` - Virtual environments
- `.env` - API keys and secrets
- `.log` - Log files
- `.idea/`, `.vscode/` - IDE configuration
- `node_modules/` - Node dependencies

These should NEVER be in Git because:
- **API Keys** (.env) - Security risk
- **Virtual Environments** (venv/) - System-specific, can be recreated
- **Dependencies** (node_modules/) - Use package.json/requirements.txt instead
- **IDE Files** - Personal preference, not needed for collaboration

## Quick Checklist

✅ Updated `.gitignore` with database patterns
✅ Now safe to push/pull without database conflicts
✅ Each developer has their own local database
✅ No sensitive data in Git history

## Questions?

- **Q: Will I lose my data?**
  A: No, it stays on your local machine. Git just stops tracking it.

- **Q: How do I share data with my friend?**
  A: Export as JSON/CSV from the database, or share via cloud storage, NOT Git.

- **Q: What if I need a backup?**
  A: Back it up locally. Consider adding an export feature to the backend for data sharing.

- **Q: Can I commit `.env` if I'm careful?**
  A: **Never**. Use `.env.example` instead (which IS in Git) and document the required keys.
