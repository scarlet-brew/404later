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
// LIKE is case-insensitive for ASCII in SQLite; matches title OR tags.
const searchBookmarks = db.prepare(
  `SELECT * FROM bookmarks
   WHERE title LIKE ? OR tags LIKE ?
   ORDER BY created_at DESC, id DESC`
);
const deleteBookmarkById = db.prepare(`DELETE FROM bookmarks WHERE id = ?`);
const updateBookmarkById = db.prepare(
  `UPDATE bookmarks
   SET url = ?, title = ?, description = ?, tags = ?
   WHERE id = ?`
);

// Parse a route :id param into a positive integer, or null if it isn't one.
const parseId = (rawId) => {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

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

// GET /api/bookmarks/search?q=term — search by title or tag
// Defined before any "/:id" routes so "search" isn't treated as an id.
router.get('/search', (request, response) => {
  try {
    const { q } = request.query;

    // The search term is required and must be a non-empty string.
    if (!isNonEmptyString(q)) {
      return response.status(400).json({
        success: false,
        data: null,
        error: 'A non-empty "q" query parameter is required.',
      });
    }

    // Wrap the term in wildcards for a partial, case-insensitive match.
    const likePattern = `%${q.trim()}%`;
    const matches = searchBookmarks.all(likePattern, likePattern);

    return response.status(200).json({
      success: true,
      data: matches,
      error: null,
    });
  } catch (error) {
    console.error('Failed to search bookmarks:', error);
    return response.status(500).json({
      success: false,
      data: null,
      error: 'Failed to search bookmarks.',
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

// PUT /api/bookmarks/:id — update a bookmark by id (full update)
router.put('/:id', (request, response) => {
  try {
    const id = parseId(request.params.id);

    // Reject ids that aren't positive integers.
    if (id === null) {
      return response.status(400).json({
        success: false,
        data: null,
        error: 'The bookmark id must be a positive integer.',
      });
    }

    const { url, title, description, tags } = request.body ?? {};

    // url and title are required, same as when creating.
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

    // 404 if there's nothing to update.
    const existingBookmark = getBookmarkById.get(id);
    if (!existingBookmark) {
      return response.status(404).json({
        success: false,
        data: null,
        error: `No bookmark found with id ${id}.`,
      });
    }

    updateBookmarkById.run(
      url.trim(),
      title.trim(),
      isNonEmptyString(description) ? description.trim() : null,
      normalizeTags(tags),
      id
    );

    const updatedBookmark = getBookmarkById.get(id);

    return response.status(200).json({
      success: true,
      data: updatedBookmark,
      error: null,
    });
  } catch (error) {
    console.error('Failed to update bookmark:', error);
    return response.status(500).json({
      success: false,
      data: null,
      error: 'Failed to update bookmark.',
    });
  }
});

// DELETE /api/bookmarks/:id — delete a bookmark by id
router.delete('/:id', (request, response) => {
  try {
    const id = parseId(request.params.id);

    // Reject ids that aren't positive integers.
    if (id === null) {
      return response.status(400).json({
        success: false,
        data: null,
        error: 'The bookmark id must be a positive integer.',
      });
    }

    // 404 if there's nothing to delete.
    const existingBookmark = getBookmarkById.get(id);
    if (!existingBookmark) {
      return response.status(404).json({
        success: false,
        data: null,
        error: `No bookmark found with id ${id}.`,
      });
    }

    deleteBookmarkById.run(id);

    // Return the deleted record so the client can confirm what was removed.
    return response.status(200).json({
      success: true,
      data: existingBookmark,
      error: null,
    });
  } catch (error) {
    console.error('Failed to delete bookmark:', error);
    return response.status(500).json({
      success: false,
      data: null,
      error: 'Failed to delete bookmark.',
    });
  }
});

export default router;
