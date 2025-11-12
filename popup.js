// Global state
let currentTab = 'main';
let privateDecrypted = false;
let selectedBookmarks = new Set();
let encryptionPassword = null; // Temporary password storage (only in memory)

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await displayConfiguredFiles();
  await checkAndAutoImport();
  await loadAndDisplayBookmarks('main');
});

// Display configured file names
async function displayConfiguredFiles() {
  const fileNames = await FileAccessManager.getConfiguredFileNames();
  const fileStatusEl = document.getElementById('fileStatus');

  if (fileNames.main || fileNames.private) {
    const parts = [];
    if (fileNames.main) {
      parts.push(`Main: <span class="file-name">${fileNames.main}</span>`);
    }
    if (fileNames.private) {
      parts.push(`Private: <span class="file-name">${fileNames.private}</span>`);
    }

    fileStatusEl.innerHTML = `📁 Loaded from files: ${parts.join(' | ')}`;
    fileStatusEl.classList.add('show');
  } else {
    fileStatusEl.classList.remove('show');
  }
}

async function checkAndAutoImport() {
  showStatus('Loading bookmarks...', 'info');

  try {
    // Check which file handles are configured
    const configured = await FileAccessManager.hasConfiguredFiles();

    // Load from saved file handles if available
    let mainResult = null;
    let privateResult = null;

    if (configured.main) {
      const mainText = await FileAccessManager.loadFromSavedFile('main');
      if (mainText) {
        const urls = FileAccessManager.extractUrls(mainText);
        if (urls.length > 0) {
          mainResult = await importUrlsDirectly(urls, 'main');
          console.log(`Auto-loaded ${urls.length} URLs from main file (${mainResult.added} new, ${mainResult.skipped} duplicates)`);
        }
      }
    }

    if (configured.private) {
      const privateText = await FileAccessManager.loadFromSavedFile('private');
      if (privateText) {
        const urls = FileAccessManager.extractUrls(privateText);
        if (urls.length > 0) {
          privateResult = await importUrlsDirectly(urls, 'private');
          console.log(`Auto-loaded ${urls.length} URLs from private file (${privateResult.added} new, ${privateResult.skipped} duplicates)`);
        }
      }
    }

    // Show results
    if (mainResult || privateResult) {
      const messages = [];
      if (mainResult && mainResult.added > 0) {
        messages.push(`${mainResult.added} main`);
      }
      if (privateResult && privateResult.added > 0) {
        messages.push(`${privateResult.added} private`);
      }

      if (messages.length > 0) {
        showStatus(`Loaded ${messages.join(' and ')} new bookmarks from files`, 'success');
      } else {
        showStatus('Bookmarks loaded (no new URLs)', 'info');
      }
    } else {
      showStatus('Ready', 'success');
    }

  } catch (error) {
    console.error('Error in auto-import:', error);
    showStatus('Error loading bookmarks: ' + error.message, 'error');
  }
}

// Import URLs directly without UI interaction (fast bulk import)
async function importUrlsDirectly(urls, type) {
  // Validate all URLs first
  const validUrls = [];
  for (const url of urls) {
    const trimmedUrl = url.trim();
    try {
      new URL(trimmedUrl);
      validUrls.push(trimmedUrl);
    } catch (error) {
      console.error('Invalid URL, skipping:', url, error);
    }
  }

  // Use fast bulk import (skips title fetching)
  if (validUrls.length > 0) {
    const result = await FileManager.addBookmarksBulk(validUrls, type);
    console.log(`Bulk import complete: ${result.added} added, ${result.skipped} duplicates skipped`);
    return result;
  }

  return { added: 0, skipped: 0 };
}

// Request file from user and import
async function requestAndImportFile(type) {
  try {
    const key = type === 'main' ? 'mainFileHandle' : 'privateFileHandle';
    const fileHandle = await FileAccessManager.requestAndSaveFile(key);

    if (fileHandle) {
      const text = await FileAccessManager.readFileContent(fileHandle);
      const urls = FileAccessManager.extractUrls(text);

      if (urls.length > 0) {
        showStatus(`Importing ${urls.length} ${type} bookmarks...`, 'info');
        const result = await importUrlsDirectly(urls, type);
        await loadAndDisplayBookmarks(type);
        showStatus(`Imported ${result.added} new ${type} bookmarks`, 'success');
        return true; // Success
      }
      return true; // File selected but no URLs (still count as configured)
    }
    return false; // User cancelled file selection
  } catch (error) {
    console.error(`Error requesting ${type} file:`, error);
    showStatus(`Error loading ${type} bookmarks`, 'error');
    return false; // Error
  }
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Sync buttons
  document.getElementById('syncMainBtn').addEventListener('click', () => syncBookmarks('main'));
  document.getElementById('syncPrivateBtn').addEventListener('click', () => syncBookmarks('private'));

  // Save buttons
  document.getElementById('saveMainBtn').addEventListener('click', () => saveBookmarks('main'));
  document.getElementById('savePrivateBtn').addEventListener('click', () => saveBookmarks('private'));

  // Toggle encryption
  document.getElementById('toggleEncryptBtn').addEventListener('click', toggleEncryption);

  // Add bookmark buttons
  document.getElementById('addBtnMain').addEventListener('click', () => addBookmark('main'));
  document.getElementById('addBtnPrivate').addEventListener('click', () => addBookmark('private'));

  // Import from TXT file
  document.getElementById('importTxtBtnMain').addEventListener('click', () => {
    document.getElementById('importFileMain').click();
  });
  document.getElementById('importTxtBtnPrivate').addEventListener('click', () => {
    document.getElementById('importFilePrivate').click();
  });
  document.getElementById('importFileMain').addEventListener('change', (e) => importUrlsFromTxt(e, 'main'));
  document.getElementById('importFilePrivate').addEventListener('change', (e) => importUrlsFromTxt(e, 'private'));

  // Random opener
  document.getElementById('randomBtn').addEventListener('click', openRandomBookmarks);

  // Scan and delete
  document.getElementById('scanBtn').addEventListener('click', scanForCorrupt);
  document.getElementById('deleteCorruptBtn').addEventListener('click', deleteAllCorrupt);
}

function switchTab(tab) {
  currentTab = tab;

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Update tab content
  document.getElementById('mainTab').classList.toggle('hidden', tab !== 'main');
  document.getElementById('privateTab').classList.toggle('hidden', tab !== 'private');

  // Load bookmarks for this tab
  loadAndDisplayBookmarks(tab);
}

async function loadAndDisplayBookmarks(type) {
  console.log('Loading bookmarks for type:', type);
  const bookmarks = await FileManager.loadBookmarks(type);
  console.log('Loaded bookmarks:', bookmarks);
  const containerId = type === 'main' ? 'mainBookmarks' : 'privateBookmarks';
  const container = document.getElementById(containerId);

  if (!bookmarks.bookmarks || bookmarks.bookmarks.length === 0) {
    console.log('No bookmarks found, showing empty state');
    container.innerHTML = '<div class="empty-state">No bookmarks yet. Add one above!</div>';
    return;
  }

  console.log('Rendering', bookmarks.bookmarks.length, 'bookmarks');

  // Group bookmarks by folder
  const folderMap = new Map();
  folderMap.set(null, []); // Bookmarks without folder

  bookmarks.bookmarks.forEach(bookmark => {
    if (!folderMap.has(bookmark.folder)) {
      folderMap.set(bookmark.folder, []);
    }
    folderMap.get(bookmark.folder).push(bookmark);
  });

  let html = '';

  // Render folders
  if (bookmarks.folders) {
    bookmarks.folders.forEach(folder => {
      const folderBookmarks = folderMap.get(folder.id) || [];
      if (folderBookmarks.length > 0) {
        html += renderFolder(folder, folderBookmarks);
      }
    });
  }

  // Render bookmarks without folder
  const noFolderBookmarks = folderMap.get(null) || [];
  noFolderBookmarks.forEach(bookmark => {
    html += renderBookmark(bookmark);
  });

  container.innerHTML = html;

  // Setup event listeners for bookmarks
  setupBookmarkListeners(type);
}

function renderFolder(folder, bookmarks) {
  const collapsed = folder.collapsed ? 'collapsed' : '';
  const toggle = folder.collapsed ? '▶' : '▼';

  let html = `
    <div class="folder" data-folder-id="${folder.id}">
      <div class="folder-header" onclick="toggleFolder('${folder.id}')">
        <span class="folder-toggle">${toggle}</span>
        <span>${folder.name}</span>
      </div>
      <div class="folder-content ${collapsed}">
  `;

  bookmarks.forEach(bookmark => {
    html += renderBookmark(bookmark);
  });

  html += `
      </div>
    </div>
  `;

  return html;
}

function renderBookmark(bookmark) {
  const corruptClass = bookmark.corrupt ? 'corrupt' : '';
  const corruptBadge = bookmark.corrupt ? '<span class="corrupt-badge">CORRUPT</span>' : '';

  return `
    <div class="bookmark-item ${corruptClass}" data-bookmark-id="${bookmark.id}">
      <input type="checkbox" class="bookmark-checkbox" data-id="${bookmark.id}">
      <span class="bookmark-title">${bookmark.title}</span>
      ${corruptBadge}
      <div class="bookmark-actions">
        <button class="delete-btn" data-id="${bookmark.id}">Delete</button>
      </div>
    </div>
  `;
}

function setupBookmarkListeners(type) {
  const containerId = type === 'main' ? 'mainBookmarks' : 'privateBookmarks';
  const container = document.getElementById(containerId);

  // Checkbox listeners
  container.querySelectorAll('.bookmark-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) {
        selectedBookmarks.add(id);
      } else {
        selectedBookmarks.delete(id);
      }
    });
  });

  // Delete button listeners
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      await FileManager.removeBookmark(id, type);
      await loadAndDisplayBookmarks(type);
    });
  });

  // Bookmark click to open
  container.querySelectorAll('.bookmark-title').forEach(title => {
    title.addEventListener('click', async (e) => {
      const bookmarkId = e.target.closest('.bookmark-item').dataset.bookmarkId;
      const bookmarks = await FileManager.loadBookmarks(type);
      const bookmark = bookmarks.bookmarks.find(b => b.id === bookmarkId);

      if (bookmark) {
        await openBookmarks([bookmark]);
      }
    });
  });
}

window.toggleFolder = async function(folderId) {
  const bookmarks = await FileManager.loadBookmarks(currentTab);
  const folder = bookmarks.folders.find(f => f.id === folderId);

  if (folder) {
    folder.collapsed = !folder.collapsed;
    await FileManager.saveBookmarks(bookmarks, currentTab);
    await loadAndDisplayBookmarks(currentTab);
  }
};

async function addBookmark(type) {
  const inputId = type === 'main' ? 'addUrlMain' : 'addUrlPrivate';
  const input = document.getElementById(inputId);
  const url = input.value.trim();

  if (!url) {
    showStatus('Please enter a URL', 'error');
    return;
  }

  // Validate URL
  try {
    new URL(url);
  } catch (error) {
    showStatus('Invalid URL format', 'error');
    return;
  }

  try {
    // If adding to private bookmarks, ensure we have a password
    if (type === 'private' && !encryptionPassword) {
      const password = prompt('Enter your encryption password:');
      if (!password) {
        showStatus('Password required for private bookmarks', 'error');
        return;
      }
      encryptionPassword = password;
    }

    console.log('Adding bookmark:', url, 'to', type);
    const bookmark = await FileManager.addBookmark(url, type);
    console.log('Bookmark added:', bookmark);
    input.value = '';

    // If adding to private bookmarks and they're encrypted, decrypt them so user can see the new bookmark
    if (type === 'private') {
      const btn = document.getElementById('toggleEncryptBtn');
      const container = document.getElementById('privateBookmarks');

      if (!privateDecrypted) {
        console.log('Auto-decrypting private bookmarks to show new bookmark');
        container.classList.remove('encrypted');
        btn.textContent = '🔒 Encrypt';
        privateDecrypted = true;
      }
    }

    await loadAndDisplayBookmarks(type);
    showStatus('Bookmark added successfully', 'success');
  } catch (error) {
    console.error('Error adding bookmark:', error);
    showStatus('Error adding bookmark: ' + error.message, 'error');
  }
}

async function importUrlsFromTxt(event, type) {
  const file = event.target.files[0];
  if (!file) return;

  const statusId = type === 'main' ? 'importStatusMain' : 'importStatusPrivate';
  const statusEl = document.getElementById(statusId);

  try {
    // Read file content
    const text = await file.text();

    // Extract all URLs from the text using regex
    // This regex matches http:// and https:// URLs
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = text.match(urlRegex);

    if (!urls || urls.length === 0) {
      statusEl.textContent = 'No URLs found in file';
      statusEl.className = 'import-status error';
      setTimeout(() => statusEl.textContent = '', 3000);
      return;
    }

    // Remove duplicates
    const uniqueUrls = [...new Set(urls)];

    console.log(`Found ${uniqueUrls.length} unique URLs to import`);

    // If importing to private bookmarks, ensure we have a password
    if (type === 'private' && !encryptionPassword) {
      const password = prompt('Enter your encryption password to import private bookmarks:');
      if (!password) {
        statusEl.textContent = 'Password required for private bookmarks';
        statusEl.className = 'import-status error';
        setTimeout(() => statusEl.textContent = '', 3000);
        return;
      }
      encryptionPassword = password;
    }

    statusEl.textContent = `Importing ${uniqueUrls.length} URLs...`;
    statusEl.className = 'import-status info';

    // If importing to private bookmarks and they're encrypted, decrypt them
    if (type === 'private' && !privateDecrypted) {
      const btn = document.getElementById('toggleEncryptBtn');
      const container = document.getElementById('privateBookmarks');
      container.classList.remove('encrypted');
      btn.textContent = '🔒 Encrypt';
      privateDecrypted = true;
    }

    // Use fast bulk import
    const result = await importUrlsDirectly(uniqueUrls, type);

    // Show final result
    await loadAndDisplayBookmarks(type);

    if (result.added > 0) {
      const message = result.skipped > 0
        ? `✓ Added ${result.added} new URLs (${result.skipped} duplicates skipped)`
        : `✓ Successfully imported ${result.added} URLs`;
      statusEl.textContent = message;
      statusEl.className = 'import-status success';
      showStatus(`Imported ${result.added} bookmarks`, 'success');
    } else if (result.skipped > 0) {
      statusEl.textContent = `All ${result.skipped} URLs already exist`;
      statusEl.className = 'import-status info';
      showStatus(`No new bookmarks added (all duplicates)`, 'info');
    } else {
      statusEl.textContent = 'No valid URLs found';
      statusEl.className = 'import-status error';
      showStatus('No valid URLs found', 'error');
    }

    setTimeout(() => statusEl.textContent = '', 5000);

  } catch (error) {
    console.error('Error reading file:', error);
    statusEl.textContent = 'Error reading file';
    statusEl.className = 'import-status error';
    showStatus('Error reading file: ' + error.message, 'error');
    setTimeout(() => statusEl.textContent = '', 3000);
  }

  // Reset file input
  event.target.value = '';
}

async function toggleEncryption() {
  const btn = document.getElementById('toggleEncryptBtn');
  const container = document.getElementById('privateBookmarks');

  if (privateDecrypted) {
    // Encrypt (hide)
    container.classList.add('encrypted');
    btn.textContent = '🔓 Decrypt';
    privateDecrypted = false;
    // Clear password from memory when encrypting
    encryptionPassword = null;
  } else {
    // Decrypt - ask for password
    const password = prompt('Enter your encryption password:');

    if (!password) {
      showStatus('Password required to decrypt private bookmarks', 'error');
      return;
    }

    // Store password temporarily in memory (not in storage!)
    encryptionPassword = password;

    // Decrypt and show
    container.classList.remove('encrypted');
    btn.textContent = '🔒 Encrypt';
    privateDecrypted = true;
    showStatus('Private bookmarks decrypted', 'success');
  }
}

async function openRandomBookmarks() {
  const count = parseInt(document.getElementById('randomCount').value) || 1;
  const bookmarks = await FileManager.loadBookmarks(currentTab);

  if (!bookmarks.bookmarks || bookmarks.bookmarks.length === 0) {
    showStatus('No bookmarks to open', 'error');
    return;
  }

  // Get random bookmarks
  const shuffled = [...bookmarks.bookmarks].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(count, bookmarks.bookmarks.length));

  await openBookmarks(selected);
  showStatus(`Opening ${selected.length} random bookmark(s)`, 'success');
}

async function openBookmarks(bookmarks) {
  const openMode = document.querySelector('input[name="openMode"]:checked').value;

  if (openMode === 'private') {
    // Open in private window with delay between each tab
    const privateWindow = await chrome.windows.create({
      url: bookmarks[0].url,
      incognito: true
    });

    // Open remaining bookmarks with 750ms delay
    for (let i = 1; i < bookmarks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 750));
      await chrome.tabs.create({
        windowId: privateWindow.id,
        url: bookmarks[i].url,
        active: false
      });
    }
  } else {
    // Open as new tabs with 750ms delay between each
    for (let i = 0; i < bookmarks.length; i++) {
      await chrome.tabs.create({ url: bookmarks[i].url, active: false });

      // Add delay except after the last bookmark
      if (i < bookmarks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 750));
      }
    }
  }
}

async function scanForCorrupt() {
  const settings = await chrome.storage.sync.get('scanTexts');
  const scanTexts = settings.scanTexts ? settings.scanTexts.split('\n').map(t => t.trim()).filter(t => t) : [];

  if (scanTexts.length === 0) {
    showStatus('Please configure scan texts in settings', 'error');
    chrome.runtime.openOptionsPage();
    return;
  }

  showStatus('Scanning bookmarks...', 'info');

  const bookmarks = await FileManager.loadBookmarks(currentTab);
  let corruptCount = 0;

  for (const bookmark of bookmarks.bookmarks) {
    try {
      const response = await fetch(bookmark.url);
      const html = await response.text();

      // Check if any scan text is found
      const isCorrupt = scanTexts.some(text => html.includes(text));

      if (isCorrupt !== bookmark.corrupt) {
        await FileManager.markCorrupt(bookmark.id, isCorrupt, currentTab);
        if (isCorrupt) corruptCount++;
      }
    } catch (error) {
      // If we can't fetch, mark as corrupt
      await FileManager.markCorrupt(bookmark.id, true, currentTab);
      corruptCount++;
    }
  }

  await loadAndDisplayBookmarks(currentTab);
  showStatus(`Scan complete. Found ${corruptCount} corrupt bookmark(s)`, corruptCount > 0 ? 'error' : 'success');
}

async function deleteAllCorrupt() {
  if (!confirm('Are you sure you want to delete all corrupt bookmarks?')) {
    return;
  }

  const deletedCount = await FileManager.deleteAllCorrupt(currentTab);
  await loadAndDisplayBookmarks(currentTab);
  showStatus(`Deleted ${deletedCount} corrupt bookmark(s)`, 'success');
}

async function syncBookmarks(type) {
  showStatus('To sync from file, go to Settings and paste your bookmark data', 'info');
  chrome.runtime.openOptionsPage();
}

async function saveBookmarks(type) {
  const bookmarks = await FileManager.loadBookmarks(type);

  if (!bookmarks.bookmarks || bookmarks.bookmarks.length === 0) {
    showStatus('No bookmarks to save', 'error');
    return;
  }

  // Create a text file with all URLs (one per line)
  const urls = bookmarks.bookmarks.map(b => b.url).join('\n');

  // Create download
  const blob = new Blob([urls], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-bookmarks-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showStatus(`Downloaded ${bookmarks.bookmarks.length} bookmarks as TXT file`, 'success');
}

function showStatus(message, type) {
  const statusEl = document.getElementById('scanStatus');
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;

  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 5000);
}
