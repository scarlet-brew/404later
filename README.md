# 404later

A bookmark manager to save, tag, search, and organize website bookmarks — a REST API plus a simple web frontend.

## Tech Stack

- **Backend:** Node.js with Express
- **Database:** SQLite (better-sqlite3)
- **Frontend:** Plain HTML, CSS, JavaScript (no frameworks)
- **Testing:** Jest + Supertest

## Setup

**Prerequisites:** Node.js 18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open the app
#    http://localhost:3000
```

The SQLite database (`bookmarks.db`) is created automatically at the project root on first run. It is gitignored.

### Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Express server (http://localhost:3000). |
| `npm run dev` | Start with auto-restart on file changes (`node --watch`). |
| `npm test` | Run the Jest test suite. |

The server port can be overridden with the `PORT` environment variable (defaults to `3000`).

## API

All endpoints live under `/api` and return JSON in the shape
`{ success: boolean, data: ..., error: ... }`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/bookmarks` | Add a bookmark. Body: `url` and `title` (required), `description`, `tags` (optional; array or comma string). |
| `GET` | `/api/bookmarks` | List all bookmarks, newest first. |
| `GET` | `/api/bookmarks/search?q=term` | Search by title or tag (partial, case-insensitive). |
| `PUT` | `/api/bookmarks/:id` | Update a bookmark (full replace; `url` and `title` required). |
| `DELETE` | `/api/bookmarks/:id` | Delete a bookmark by id. |

### Example

```bash
curl -X POST http://localhost:3000/api/bookmarks \
  -H "Content-Type: application/json" \
  -d '{"url":"https://claude.ai","title":"Claude","tags":["ai","tools"]}'
```

## Features

- Add bookmarks with a URL, title, description, and tags.
- View all saved bookmarks, newest first.
- Search by title or tag from the search bar.
- Filter by clicking any tag.
- Edit and delete bookmarks inline.
- REST API covered by 29 automated tests.

## Project Structure

```
404later/
  src/
    routes/      API route handlers
    db/          Database setup and queries
  public/        Frontend (HTML, CSS, JS)
  tests/         Jest test files
  server.js      Express app entry point
```

## Testing

```bash
npm test
```

Tests use an isolated temporary database (via the `DATABASE_PATH` env var) and never touch your real `bookmarks.db`.
