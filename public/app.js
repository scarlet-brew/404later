const API_BASE = '/api/bookmarks';

const form = document.getElementById('bookmark-form');
const formHeading = document.getElementById('form-heading');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formMessage = document.getElementById('form-message');
const urlInput = document.getElementById('url');
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const tagsInput = document.getElementById('tags');

const listMessage = document.getElementById('list-message');
const bookmarkList = document.getElementById('bookmark-list');
const countEl = document.getElementById('count');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const activeFilterEl = document.getElementById('active-filter');

// Which bookmark we're editing (null means we're adding a new one).
let editingId = null;
// The current search term ('' means show everything).
let currentQuery = '';

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type || ''}`.trim();
}

// Small debounce so we don't hit the API on every keystroke.
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Build a DOM node for a single bookmark. textContent is used for all
// user-supplied values so they can't inject HTML.
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
      // Tags are buttons so you can click one to filter by it.
      const tagEl = document.createElement('button');
      tagEl.type = 'button';
      tagEl.className = 'tag';
      tagEl.textContent = trimmed;
      tagEl.addEventListener('click', () => filterByTag(trimmed));
      tagsWrap.appendChild(tagEl);
    }
    main.appendChild(tagsWrap);
  }

  const actions = document.createElement('div');
  actions.className = 'bookmark-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-edit';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => enterEditMode(bookmark));

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => deleteBookmark(bookmark.id, bookmark.title));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  item.appendChild(main);
  item.appendChild(actions);
  return item;
}

// Fetch bookmarks — all of them, or search results when a query is active.
async function loadBookmarks() {
  const isSearching = currentQuery.length > 0;
  const endpoint = isSearching
    ? `${API_BASE}/search?q=${encodeURIComponent(currentQuery)}`
    : API_BASE;

  clearSearchBtn.hidden = !isSearching;
  if (isSearching) {
    activeFilterEl.hidden = false;
    activeFilterEl.textContent = `Filtered by “${currentQuery}”`;
  } else {
    activeFilterEl.hidden = true;
  }

  try {
    const response = await fetch(endpoint);
    const body = await response.json();

    if (!response.ok || !body.success) {
      throw new Error(body.error || 'Failed to load bookmarks.');
    }

    bookmarkList.innerHTML = '';
    const bookmarks = body.data;
    countEl.textContent = bookmarks.length
      ? `${bookmarks.length} ${isSearching ? 'found' : 'saved'}`
      : '';

    if (bookmarks.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = isSearching
        ? 'No bookmarks match your search.'
        : 'No bookmarks yet. Add your first one above.';
      bookmarkList.appendChild(empty);
      showMessage(listMessage, '', '');
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

// Create (POST) or update (PUT) depending on whether we're editing.
async function handleFormSubmit(event) {
  event.preventDefault();

  const payload = {
    url: urlInput.value.trim(),
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    tags: tagsInput.value.trim(),
  };

  if (!payload.url || !payload.title) {
    showMessage(formMessage, 'URL and title are required.', 'error');
    return;
  }

  const isEditing = editingId !== null;
  const endpoint = isEditing ? `${API_BASE}/${editingId}` : API_BASE;
  const method = isEditing ? 'PUT' : 'POST';

  submitBtn.disabled = true;
  try {
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json();

    if (!response.ok || !body.success) {
      throw new Error(body.error || 'Something went wrong.');
    }

    if (isEditing) {
      exitEditMode();
      showMessage(formMessage, 'Bookmark updated.', 'success');
    } else {
      form.reset();
      showMessage(formMessage, 'Bookmark added.', 'success');
      // Clear any active filter so the new bookmark is visible.
      resetSearch();
    }
    await loadBookmarks();
  } catch (error) {
    showMessage(formMessage, error.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

// Populate the form with an existing bookmark and switch to "update" mode.
function enterEditMode(bookmark) {
  editingId = bookmark.id;
  urlInput.value = bookmark.url;
  titleInput.value = bookmark.title;
  descriptionInput.value = bookmark.description || '';
  tagsInput.value = bookmark.tags || '';

  formHeading.textContent = 'Edit bookmark';
  submitBtn.textContent = 'Update bookmark';
  cancelBtn.hidden = false;
  showMessage(formMessage, '', '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  urlInput.focus();
}

// Leave "update" mode and return the form to "add" mode.
function exitEditMode() {
  editingId = null;
  form.reset();
  formHeading.textContent = 'Add a bookmark';
  submitBtn.textContent = 'Add bookmark';
  cancelBtn.hidden = true;
}

async function deleteBookmark(id, title) {
  if (!window.confirm(`Delete "${title}"?`)) return;

  try {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    const body = await response.json();

    if (!response.ok || !body.success) {
      throw new Error(body.error || 'Failed to delete bookmark.');
    }
    // If we were editing the bookmark we just deleted, reset the form.
    if (editingId === id) exitEditMode();
    await loadBookmarks();
  } catch (error) {
    showMessage(listMessage, error.message, 'error');
  }
}

// Filter the list by clicking a tag.
function filterByTag(tag) {
  searchInput.value = tag;
  currentQuery = tag;
  loadBookmarks();
}

// Reset the search box and show everything.
function resetSearch() {
  searchInput.value = '';
  currentQuery = '';
}

const runSearch = debounce(() => {
  currentQuery = searchInput.value.trim();
  loadBookmarks();
}, 250);

form.addEventListener('submit', handleFormSubmit);
cancelBtn.addEventListener('click', exitEditMode);
searchInput.addEventListener('input', runSearch);
clearSearchBtn.addEventListener('click', () => {
  resetSearch();
  loadBookmarks();
});

loadBookmarks();
