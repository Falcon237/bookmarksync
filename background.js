// Background service worker for Bookmark Sync extension

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Bookmark Sync extension installed');

  // Set default settings if not already set
  const settings = await chrome.storage.sync.get([
    'scanTexts',
    'encryptionKey'
  ]);

  if (!settings.scanTexts) {
    await chrome.storage.sync.set({
      scanTexts: '404 Not Found\nPage not found\nError\nDomain expired'
    });
  }

  // Initialize bookmark storage if empty
  const bookmarks = await chrome.storage.local.get(['mainBookmarks', 'privateBookmarks']);

  if (!bookmarks.mainBookmarks) {
    await chrome.storage.local.set({
      mainBookmarks: { folders: [], bookmarks: [] }
    });
  }

  if (!bookmarks.privateBookmarks) {
    await chrome.storage.local.set({
      privateBookmarks: { folders: [], bookmarks: [] }
    });
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openInPrivate') {
    chrome.windows.create({
      url: request.urls,
      incognito: true
    }).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
});

// Context menu for adding current page as bookmark
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'addToMainBookmarks',
    title: 'Add to Main Bookmarks',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'addToPrivateBookmarks',
    title: 'Add to Private Bookmarks',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'addToMainBookmarks') {
    await addCurrentPage(tab, 'main');
  } else if (info.menuItemId === 'addToPrivateBookmarks') {
    await addCurrentPage(tab, 'private');
  }
});

async function addCurrentPage(tab, type) {
  const bookmark = {
    id: Date.now().toString(),
    url: tab.url,
    title: tab.title,
    folder: null,
    corrupt: false,
    dateAdded: new Date().toISOString()
  };

  const storageKey = type === 'main' ? 'mainBookmarks' : 'privateBookmarks';
  const result = await chrome.storage.local.get(storageKey);
  const bookmarks = result[storageKey] || { folders: [], bookmarks: [] };

  bookmarks.bookmarks.push(bookmark);
  await chrome.storage.local.set({ [storageKey]: bookmarks });

  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Bookmark Added',
    message: `Added "${tab.title}" to ${type} bookmarks`
  });
}
