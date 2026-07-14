# 404later — Bookmark Manager

## Project Overview
A bookmark manager where users can save, tag, search, and organize website bookmarks via a REST API and simple web frontend.

## Tech Stack
- Backend: Node.js with Express
- Database: SQLite (using better-sqlite3)
- Frontend: Plain HTML, CSS, JavaScript (no frameworks)
- Testing: Jest

## Project Structure
404later/
  src/
    routes/       → API route handlers
    db/           → Database setup and queries
  public/         → Frontend files (HTML, CSS, JS)
  tests/          → Jest test files
  .env            → Environment variables (never commit)
  .env.example    → Template for .env
  CLAUDE.md       → This file
  README.md       → Project documentation
  package.json    → Dependencies and scripts
  .gitignore      → Files git should ignore

## Code Rules
- Use ES module syntax (import/export), not CommonJS (require)
- Use const and let, never var
- Use async/await instead of raw Promises
- Every API endpoint must have try/catch error handling
- Use descriptive variable names (not x, tmp, data)
- Always validate request body before processing

## Testing Rules
- Write Jest tests for every API endpoint
- Test both success cases and error cases
- Run tests with: npm test

## Git Workflow
- Every feature gets its own branch
- Branch naming: feature/description or fix/description
- Write clear commit messages explaining WHAT and WHY
- Never commit node_modules, .env, or database files
- Use gh CLI for all GitHub operations

## API Design
- All endpoints start with /api
- Use proper HTTP status codes (200, 201, 400, 404, 500)
- Return JSON responses with consistent format: { success: true/false, data: ..., error: ... }
- Validate required fields and return helpful error messages

## Feature Roadmap (build in this order)
1. [x] API: POST /api/bookmarks — Add a bookmark (url, title, description, tags)
2. [x] API: GET /api/bookmarks — List all bookmarks
3. [x] API: GET /api/bookmarks/search — Search by title or tag
4. [x] API: DELETE /api/bookmarks/:id — Delete a bookmark
5. [x] API: PUT /api/bookmarks/:id — Update a bookmark
6. [ ] Frontend: Page to view and add bookmarks
7. [ ] Frontend: Search bar and tag filtering

## Current Status
- [x] Project initialized
- [x] Dependencies installed
- [x] Foundation complete (Express server, folder structure, health endpoint) — PR #1 merged
- [x] Database setup (better-sqlite3, bookmarks table) — PR #2 merged
- [x] REST API complete — all 5 endpoints (POST, GET, GET/search, DELETE, PUT), 28 tests passing — PRs #2–#6 merged
- [ ] Frontend (in progress)
