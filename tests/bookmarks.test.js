import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Point the database at a throwaway temp file BEFORE importing the app,
// so these tests never touch the real bookmarks.db.
const testDatabasePath = path.join(os.tmpdir(), `bookmarks-test-${Date.now()}.db`);
process.env.DATABASE_PATH = testDatabasePath;

let app;

beforeAll(async () => {
  // Dynamic import so the env var above is set before the db module runs.
  ({ default: app } = await import('../server.js'));
});

afterAll(() => {
  // Clean up the temp database file (and any sidecar journal files).
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    fs.rmSync(`${testDatabasePath}${suffix}`, { force: true });
  }
});

describe('POST /api/bookmarks', () => {
  test('creates a bookmark with all fields and returns 201', async () => {
    const response = await request(app)
      .post('/api/bookmarks')
      .send({
        url: 'https://example.com',
        title: 'Example',
        description: 'An example site',
        tags: ['reference', 'demo'],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.error).toBeNull();
    expect(response.body.data).toMatchObject({
      url: 'https://example.com',
      title: 'Example',
      description: 'An example site',
      tags: 'reference,demo',
    });
    expect(response.body.data.id).toBeGreaterThan(0);
    expect(response.body.data.created_at).toBeTruthy();
  });

  test('creates a bookmark with only the required fields', async () => {
    const response = await request(app)
      .post('/api/bookmarks')
      .send({ url: 'https://minimal.com', title: 'Minimal' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.description).toBeNull();
    expect(response.body.data.tags).toBeNull();
  });

  test('accepts tags as a comma-separated string', async () => {
    const response = await request(app)
      .post('/api/bookmarks')
      .send({ url: 'https://tags.com', title: 'Tags', tags: 'a,b' });

    expect(response.status).toBe(201);
    expect(response.body.data.tags).toBe('a,b');
  });

  test('returns 400 when url is missing', async () => {
    const response = await request(app)
      .post('/api/bookmarks')
      .send({ title: 'No URL' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.data).toBeNull();
    expect(response.body.error).toMatch(/url/i);
  });

  test('returns 400 when title is missing', async () => {
    const response = await request(app)
      .post('/api/bookmarks')
      .send({ url: 'https://notitle.com' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/title/i);
  });

  test('returns 400 when url is an empty/whitespace string', async () => {
    const response = await request(app)
      .post('/api/bookmarks')
      .send({ url: '   ', title: 'Blank URL' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test('returns 400 when the body is empty', async () => {
    const response = await request(app).post('/api/bookmarks').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('GET /api/bookmarks', () => {
  test('returns 200 with an array of bookmarks in the standard shape', async () => {
    const response = await request(app).get('/api/bookmarks');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.error).toBeNull();
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('includes a newly created bookmark in the list', async () => {
    const uniqueUrl = `https://list-me-${Date.now()}.com`;
    await request(app)
      .post('/api/bookmarks')
      .send({ url: uniqueUrl, title: 'List Me' });

    const response = await request(app).get('/api/bookmarks');
    const urls = response.body.data.map((bookmark) => bookmark.url);

    expect(urls).toContain(uniqueUrl);
  });

  test('returns bookmarks newest first', async () => {
    const olderUrl = `https://older-${Date.now()}.com`;
    const newerUrl = `https://newer-${Date.now()}.com`;

    await request(app).post('/api/bookmarks').send({ url: olderUrl, title: 'Older' });
    await request(app).post('/api/bookmarks').send({ url: newerUrl, title: 'Newer' });

    const response = await request(app).get('/api/bookmarks');
    const urls = response.body.data.map((bookmark) => bookmark.url);
    const olderIndex = urls.indexOf(olderUrl);
    const newerIndex = urls.indexOf(newerUrl);

    // The more recently created bookmark should appear earlier in the list.
    expect(newerIndex).toBeLessThan(olderIndex);
  });
});

describe('GET /api/bookmarks/search', () => {
  // Seed bookmarks with distinctive, unique tokens so searches are isolated
  // from data created by other tests in this shared database.
  const token = `zqx${Date.now()}`;
  const titleUrl = `https://title-match-${token}.com`;
  const tagUrl = `https://tag-match-${token}.com`;

  beforeAll(async () => {
    await request(app)
      .post('/api/bookmarks')
      .send({ url: titleUrl, title: `A ${token} Article`, tags: ['reading'] });
    await request(app)
      .post('/api/bookmarks')
      .send({ url: tagUrl, title: 'Unrelated Title', tags: [token, 'misc'] });
  });

  test('finds a bookmark by a partial, case-insensitive title match', async () => {
    const response = await request(app)
      .get('/api/bookmarks/search')
      .query({ q: token.toUpperCase() });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.error).toBeNull();
    const urls = response.body.data.map((bookmark) => bookmark.url);
    expect(urls).toContain(titleUrl);
  });

  test('finds a bookmark by tag match', async () => {
    const response = await request(app)
      .get('/api/bookmarks/search')
      .query({ q: token });

    expect(response.status).toBe(200);
    const urls = response.body.data.map((bookmark) => bookmark.url);
    // The token appears in one title and one tag — both should be returned.
    expect(urls).toContain(titleUrl);
    expect(urls).toContain(tagUrl);
  });

  test('returns an empty array when nothing matches', async () => {
    const response = await request(app)
      .get('/api/bookmarks/search')
      .query({ q: 'no-such-bookmark-anywhere-xyz987' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([]);
  });

  test('returns 400 when the q parameter is missing', async () => {
    const response = await request(app).get('/api/bookmarks/search');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/q/i);
  });

  test('returns 400 when the q parameter is empty/whitespace', async () => {
    const response = await request(app)
      .get('/api/bookmarks/search')
      .query({ q: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('DELETE /api/bookmarks/:id', () => {
  // Helper: create a bookmark and return its id.
  const createBookmark = async () => {
    const response = await request(app)
      .post('/api/bookmarks')
      .send({ url: `https://delete-me-${Date.now()}-${Math.random()}.com`, title: 'Delete Me' });
    return response.body.data.id;
  };

  test('deletes an existing bookmark and returns 200 with the deleted record', async () => {
    const id = await createBookmark();

    const response = await request(app).delete(`/api/bookmarks/${id}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.error).toBeNull();
    expect(response.body.data.id).toBe(id);
  });

  test('the bookmark no longer appears in the list after deletion', async () => {
    const id = await createBookmark();
    await request(app).delete(`/api/bookmarks/${id}`);

    const listResponse = await request(app).get('/api/bookmarks');
    const ids = listResponse.body.data.map((bookmark) => bookmark.id);
    expect(ids).not.toContain(id);
  });

  test('returns 404 when deleting a non-existent id', async () => {
    const response = await request(app).delete('/api/bookmarks/99999999');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.data).toBeNull();
  });

  test('returns 404 when deleting the same bookmark twice', async () => {
    const id = await createBookmark();

    const first = await request(app).delete(`/api/bookmarks/${id}`);
    const second = await request(app).delete(`/api/bookmarks/${id}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(404);
  });

  test('returns 400 for a non-numeric id', async () => {
    const response = await request(app).delete('/api/bookmarks/not-a-number');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/positive integer/i);
  });

  test('returns 400 for a zero or negative id', async () => {
    const zeroResponse = await request(app).delete('/api/bookmarks/0');
    const negativeResponse = await request(app).delete('/api/bookmarks/-5');

    expect(zeroResponse.status).toBe(400);
    expect(negativeResponse.status).toBe(400);
  });
});

describe('PUT /api/bookmarks/:id', () => {
  // Helper: create a bookmark and return its full record.
  const createBookmark = async (overrides = {}) => {
    const response = await request(app)
      .post('/api/bookmarks')
      .send({
        url: `https://update-me-${Date.now()}-${Math.random()}.com`,
        title: 'Original Title',
        description: 'Original description',
        tags: ['original'],
        ...overrides,
      });
    return response.body.data;
  };

  test('updates an existing bookmark and returns 200 with the new values', async () => {
    const { id } = await createBookmark();

    const response = await request(app)
      .put(`/api/bookmarks/${id}`)
      .send({
        url: 'https://updated.com',
        title: 'Updated Title',
        description: 'Updated description',
        tags: ['updated', 'edited'],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.error).toBeNull();
    expect(response.body.data).toMatchObject({
      id,
      url: 'https://updated.com',
      title: 'Updated Title',
      description: 'Updated description',
      tags: 'updated,edited',
    });
  });

  test('persists the update so a later GET reflects the new values', async () => {
    const { id } = await createBookmark();
    await request(app)
      .put(`/api/bookmarks/${id}`)
      .send({ url: 'https://persisted.com', title: 'Persisted' });

    const listResponse = await request(app).get('/api/bookmarks');
    const updated = listResponse.body.data.find((bookmark) => bookmark.id === id);
    expect(updated.url).toBe('https://persisted.com');
    expect(updated.title).toBe('Persisted');
  });

  test('clears optional fields when they are omitted (full update)', async () => {
    const { id } = await createBookmark();

    const response = await request(app)
      .put(`/api/bookmarks/${id}`)
      .send({ url: 'https://minimal-update.com', title: 'Minimal' });

    expect(response.status).toBe(200);
    expect(response.body.data.description).toBeNull();
    expect(response.body.data.tags).toBeNull();
  });

  test('returns 404 when updating a non-existent id', async () => {
    const response = await request(app)
      .put('/api/bookmarks/99999999')
      .send({ url: 'https://nope.com', title: 'Nope' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('returns 400 when url is missing', async () => {
    const { id } = await createBookmark();

    const response = await request(app)
      .put(`/api/bookmarks/${id}`)
      .send({ title: 'No URL' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/url/i);
  });

  test('returns 400 when title is missing', async () => {
    const { id } = await createBookmark();

    const response = await request(app)
      .put(`/api/bookmarks/${id}`)
      .send({ url: 'https://notitle.com' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/title/i);
  });

  test('returns 400 for a non-numeric id', async () => {
    const response = await request(app)
      .put('/api/bookmarks/not-a-number')
      .send({ url: 'https://x.com', title: 'X' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/positive integer/i);
  });
});
