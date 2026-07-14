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
