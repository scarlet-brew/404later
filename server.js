import express from 'express';
import { fileURLToPath } from 'node:url';
import './src/db/index.js';
import bookmarksRouter from './src/routes/bookmarks.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies (needed for POST/PUT endpoints)
app.use(express.json());

// Serve static frontend files from the public/ directory
app.use(express.static('public'));

// Health check — confirms the server is running
app.get('/api/health', (request, response) => {
  response.status(200).json({
    success: true,
    data: { status: 'ok' },
    error: null,
  });
});

// Bookmark endpoints
app.use('/api/bookmarks', bookmarksRouter);

// Only start listening when run directly (e.g. `npm start`), not when
// imported by tests — so supertest can drive the app on its own port.
const isRunDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (isRunDirectly) {
  app.listen(PORT, () => {
    console.log(`404later server listening on http://localhost:${PORT}`);
  });
}

export default app;
