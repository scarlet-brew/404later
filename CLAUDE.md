# CLAUDE.md

PROJECT: 404later - Bookmark Manager

## Tech Stack

- **Backend:** Node.js with Express
- **Database:** SQLite with better-sqlite3
- **Frontend:** Plain HTML, CSS, JavaScript (no frameworks)
- **Testing:** Jest

## Rules

- Always explain what you're doing before doing it
- Write Jest tests for every API endpoint
- Use descriptive git commit messages
- Follow this folder structure:

  ```
  src/
    routes/    (API route handlers)
    db/        (database setup and queries)
  public/      (frontend HTML, CSS, JS)
  tests/       (Jest test files)
  ```

- Add proper error handling to all API routes
- Use ES module syntax (import/export) not CommonJS (require)
