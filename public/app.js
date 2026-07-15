const API_BASE = '/api/bookmarks';

const addForm = document.getElementById('add-form');
const formMessage = document.getElementById('form-message');
const listMessage = document.getElementById('list-message');
const bookmarkList = document.getElementById('bookmark-list');
const countEl = document.getElementById('count');

// Show a transient message in one of the message slots.
function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type || ''}`.trim();
}

// Build a DOM node for a single bookmark. Uses textContent throughout so
// user-supplied values can't inject HTML.
function renderBookmark(bookmark) {
  const item = document.createElement('li');
  item.className = 'bookmark';

  const main = document.createElement('div');
  main.className = 'bookmark-main';

  const titleEl = document.createElement('p');
  titleEl.className = 'bookmark-title';
  const link = document.createElement('a');
  link.href = bookmark.url;
  link.textContent = bookmark.title;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  titleEl.appendChild(link);
  main.appendChild(titleEl);

  const urlEl = document.createElement('p');
  urlEl.className = 'bookmark-url';
  urlEl.textContent = bookmark.url;
  main.appendChild(urlEl);

  if (bookmark.description) {
    const descEl = document.createElement('p');
    descEl.className = 'bookmark-desc';
    descEl.textContent = bookmark.description;
    main.appendChild(descEl);
  }

  if (bookmark.tags) {
    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'tags';
    for (const tag of bookmark.tags.split(',')) {
      const trimmed = tag.trim();
      if (!trimmed) continue;
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = trimmed;
      tagsWrap.appendChild(tagEl);
    }
    main.appendChild(tagsWrap);
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => deleteBookmark(bookmark.id, bookmark.title));

  item.appendChild(main);
  item.appendChild(deleteBtn);
  return item;
}

// Fetch all bookmarks and render them.
async function loadBookmarks() {
  try {
    const response = await fetch(API_BASE);
    const body = await response.json();

    if (!response.ok || !body.success) {
      throw new Error(body.error || 'Failed to load bookmarks.');
    }

    bookmarkList.innerHTML = '';
    const bookmarks = body.data;
    countEl.textContent = bookmarks.length
      ? `${bookmarks.length} saved`
      : '';

    if (bookmarks.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'No bookmarks yet. Add your first one above.';
      bookmarkList.appendChild(empty);
      return;
    }

    for (const bookmark of bookmarks) {
      bookmarkList.appendChild(renderBookmark(bookmark));
    }
    showMessage(listMessage, '', '');
  } catch (error) {
    showMessage(listMessage, error.message, 'error');
  }
}

// Create a new bookmark from the form.
async function handleAddSubmit(event) {
  event.preventDefault();
  const submitBtn = addForm.querySelector('button[type="submit"]');

  const payload = {
    url: document.getElementById('url').value.trim(),
    title: document.getElementById('title').value.trim(),
    description: document.getElementById('description').value.trim(),
    tags: document.getElementById('tags').value.trim(),
  };

  // Basic client-side validation (the server validates too).
  if (!payload.url || !payload.title) {
    showMessage(formMessage, 'URL and title are required.', 'error');
    return;
  }

  submitBtn.disabled = true;
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json();

    if (!response.ok || !body.success) {
      throw new Error(body.error || 'Failed to add bookmark.');
    }

    addForm.reset();
    showMessage(formMessage, 'Bookmark added.', 'success');
    await loadBookmarks();
  } catch (error) {
    showMessage(formMessage, error.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

// Delete a bookmark after confirmation.
async function deleteBookmark(id, title) {
  if (!window.confirm(`Delete "${title}"?`)) return;

  try {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    const body = await response.json();

    if (!response.ok || !body.success) {
      throw new Error(body.error || 'Failed to delete bookmark.');
    }

    await loadBookmarks();
  } catch (error) {
    showMessage(listMessage, error.message, 'error');
  }
}

addForm.addEventListener('submit', handleAddSubmit);
loadBookmarks();
