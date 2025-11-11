// Load settings when page opens
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
});

async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    'mainFilePath',
    'privateFilePath',
    'scanTexts'
  ]);

  document.getElementById('mainFilePath').value = settings.mainFilePath || '';
  document.getElementById('privateFilePath').value = settings.privateFilePath || '';
  document.getElementById('scanTexts').value = settings.scanTexts || '404 Not Found\nPage not found\nError\nDomain expired';

  // Load bookmark data for export
  const bookmarks = await chrome.storage.local.get(['mainBookmarks', 'privateBookmarks']);
  if (bookmarks.mainBookmarks) {
    document.getElementById('mainBookmarksData').value = JSON.stringify(bookmarks.mainBookmarks, null, 2);
  }
  if (bookmarks.privateBookmarks) {
    document.getElementById('privateBookmarksData').value = JSON.stringify(bookmarks.privateBookmarks, null, 2);
  }
}

function setupEventListeners() {
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('cancelBtn').addEventListener('click', () => window.close());
  document.getElementById('copyMainBtn').addEventListener('click', () => copyToClipboard('mainBookmarksData'));
  document.getElementById('copyPrivateBtn').addEventListener('click', () => copyToClipboard('privateBookmarksData'));
  document.getElementById('importMainBtn').addEventListener('click', () => importBookmarks('main'));
  document.getElementById('importPrivateBtn').addEventListener('click', () => importBookmarks('private'));
}

async function saveSettings() {
  const settings = {
    mainFilePath: document.getElementById('mainFilePath').value,
    privateFilePath: document.getElementById('privateFilePath').value,
    scanTexts: document.getElementById('scanTexts').value
  };

  try {
    await chrome.storage.sync.set(settings);
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Error saving settings: ' + error.message, 'error');
  }
}

async function copyToClipboard(textareaId) {
  const textarea = document.getElementById(textareaId);
  const text = textarea.value;

  if (!text) {
    showStatus('No data to copy', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showStatus('Copied to clipboard! You can now paste this into your file.', 'success');
  } catch (error) {
    showStatus('Error copying to clipboard: ' + error.message, 'error');
  }
}

async function importBookmarks(type) {
  const textareaId = type === 'main' ? 'mainBookmarksData' : 'privateBookmarksData';
  const textarea = document.getElementById(textareaId);
  const text = textarea.value.trim();

  if (!text) {
    showStatus('No data to import', 'error');
    return;
  }

  try {
    const bookmarks = JSON.parse(text);
    const storageKey = type === 'main' ? 'mainBookmarks' : 'privateBookmarks';

    await chrome.storage.local.set({ [storageKey]: bookmarks });
    showStatus(`${type === 'main' ? 'Main' : 'Private'} bookmarks imported successfully!`, 'success');
  } catch (error) {
    showStatus('Error importing bookmarks: ' + error.message, 'error');
  }
}

function showStatus(message, type) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;

  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 5000);
}
