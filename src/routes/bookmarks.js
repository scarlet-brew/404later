import express from 'express';
import db from '../db/index.js';

const router = express.Router();

// Prepared statements are compiled once and reused for every request.
const insertBookmark = db.prepare(
  `INSERT INTO bookmarks (url, title, description, tags)
   VALUES (?, ?, ?, ?)`
);
const getBookmarkById = db.prepare(`SELECT * FROM bookmarks WHERE id = ?`);
const getAllBookmarks = db.prepare(
  `SELECT * FROM bookmarks ORDER BY created_at DESC, id DESC`
);

// Treat null/undefined and empty/whitespace-only strings as "not provided".
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

// tags may arrive as an array (["js", "api"]) or a comma-separated string.
// Normalize to a single comma-separated string for storage, or null if absent.
const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    const cleaned = tags.filter(isNonEmptyString).map((tag) => tag.trim());
    return cleaned.length > 0 ? cleaned.join(',') : null;
  }
  if (isNonEmptyString(tags)) {
    return tags.trim();
  }
  return null;
};

// GET /api/bookmarks — list all bookmarks (newest first)
router.get('/', (request, response) => {
  try {
    const bookmarks = getAllBookmarks.all();

    return response.status(200).json({
      success: true,
      data: bookmarks,
      error: null,
    });
  } catch (error) {
    console.error('Failed to list bookmarks:', error);
    return response.status(500).json({
      success: false,
      data: null,
      error: 'Failed to list bookmarks.',
    });
  }
});

// POST /api/bookmarks — create a new bookmark
router.post('/', (request, response) => {
  try {
    const { url, title, description, tags } = request.body ?? {};

    // Validate required fields before touching the database.
    if (!isNonEmptyString(url)) {
      return response.status(400).json({
        success: false,
        data: null,
        error: 'A non-empty "url" is required.',
      });
    }
    if (!isNonEmptyString(title)) {
      return response.status(400).json({
        success: false,
        data: null,
        error: 'A non-empty "title" is required.',
      });
    }

    const info = insertBookmark.run(
      url.trim(),
      title.trim(),
      isNonEmptyString(description) ? description.trim() : null,
      normalizeTags(tags)
    );

    const createdBookmark = getBookmarkById.get(info.lastInsertRowid);

    return response.status(201).json({
      success: true,
      data: createdBookmark,
      error: null,
    });
  } catch (error) {
    console.error('Failed to create bookmark:', error);
    return response.status(500).json({
      success: false,
      data: null,
      error: 'Failed to create bookmark.',
    });
  }
});

export default router;
