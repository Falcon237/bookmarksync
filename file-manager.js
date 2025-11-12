// File manager for handling bookmark storage and sync
class FileManager {
  static async saveBookmarks(bookmarks, type = 'main') {
    const storageKey = type === 'main' ? 'mainBookmarks' : 'privateBookmarks';

    try {
      await chrome.storage.local.set({ [storageKey]: bookmarks });
      return true;
    } catch (error) {
      console.error('Error saving bookmarks:', error);
      throw error;
    }
  }

  static async loadBookmarks(type = 'main') {
    const storageKey = type === 'main' ? 'mainBookmarks' : 'privateBookmarks';

    try {
      const result = await chrome.storage.local.get(storageKey);
      return result[storageKey] || { folders: [], bookmarks: [] };
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      return { folders: [], bookmarks: [] };
    }
  }

  static async addBookmark(url, type = 'main', folder = null) {
    console.log('FileManager.addBookmark - Loading existing bookmarks for type:', type);
    const bookmarks = await this.loadBookmarks(type);
    console.log('FileManager.addBookmark - Current bookmarks:', bookmarks);

    // Try to fetch the page title
    let title = url;
    try {
      const response = await fetch(url);
      const html = await response.text();
      const match = html.match(/<title>([^<]*)<\/title>/i);
      if (match && match[1]) {
        title = match[1].trim();
      }
    } catch (error) {
      console.log('Could not fetch title for URL:', url, error.message);
    }

    const bookmark = {
      id: Date.now().toString(),
      url: url,
      title: title,
      folder: folder,
      corrupt: false,
      dateAdded: new Date().toISOString()
    };

    bookmarks.bookmarks.push(bookmark);
    console.log('FileManager.addBookmark - Saving bookmarks, total count:', bookmarks.bookmarks.length);
    await this.saveBookmarks(bookmarks, type);
    console.log('FileManager.addBookmark - Bookmark saved successfully');
    return bookmark;
  }

  // Fast bulk import - skips title fetching for speed
  static async addBookmarksBulk(urls, type = 'main', folder = null) {
    console.log('FileManager.addBookmarksBulk - Loading existing bookmarks for type:', type);
    const bookmarks = await this.loadBookmarks(type);

    // Get existing URLs to avoid duplicates
    const existingUrls = new Set(bookmarks.bookmarks.map(b => b.url));

    let addedCount = 0;
    let skippedCount = 0;

    // Add all new URLs at once without fetching titles
    for (const url of urls) {
      // Skip if already exists
      if (existingUrls.has(url)) {
        skippedCount++;
        continue;
      }

      const bookmark = {
        id: `${Date.now()}-${addedCount}`, // Ensure unique IDs
        url: url,
        title: url, // Use URL as title for fast import
        folder: folder,
        corrupt: false,
        dateAdded: new Date().toISOString()
      };

      bookmarks.bookmarks.push(bookmark);
      existingUrls.add(url);
      addedCount++;
    }

    // Save once at the end
    if (addedCount > 0) {
      await this.saveBookmarks(bookmarks, type);
      console.log(`FileManager.addBookmarksBulk - Added ${addedCount} bookmarks, skipped ${skippedCount} duplicates`);
    }

    return { added: addedCount, skipped: skippedCount };
  }

  static async removeBookmark(id, type = 'main') {
    const bookmarks = await this.loadBookmarks(type);
    bookmarks.bookmarks = bookmarks.bookmarks.filter(b => b.id !== id);
    await this.saveBookmarks(bookmarks, type);
  }

  static async updateBookmark(id, updates, type = 'main') {
    const bookmarks = await this.loadBookmarks(type);
    const bookmark = bookmarks.bookmarks.find(b => b.id === id);

    if (bookmark) {
      Object.assign(bookmark, updates);
      await this.saveBookmarks(bookmarks, type);
    }
  }

  static async addFolder(name, type = 'main') {
    const bookmarks = await this.loadBookmarks(type);

    const folder = {
      id: Date.now().toString(),
      name: name,
      collapsed: false
    };

    if (!bookmarks.folders) {
      bookmarks.folders = [];
    }

    bookmarks.folders.push(folder);
    await this.saveBookmarks(bookmarks, type);
    return folder;
  }

  static async removeFolder(id, type = 'main') {
    const bookmarks = await this.loadBookmarks(type);

    // Remove folder
    bookmarks.folders = bookmarks.folders.filter(f => f.id !== id);

    // Move bookmarks in this folder to no folder
    bookmarks.bookmarks.forEach(b => {
      if (b.folder === id) {
        b.folder = null;
      }
    });

    await this.saveBookmarks(bookmarks, type);
  }

  static async markCorrupt(id, corrupt, type = 'main') {
    await this.updateBookmark(id, { corrupt }, type);
  }

  static async deleteAllCorrupt(type = 'main') {
    const bookmarks = await this.loadBookmarks(type);
    const originalCount = bookmarks.bookmarks.length;
    bookmarks.bookmarks = bookmarks.bookmarks.filter(b => !b.corrupt);
    const deletedCount = originalCount - bookmarks.bookmarks.length;
    await this.saveBookmarks(bookmarks, type);
    return deletedCount;
  }

  static async exportToJSON(type = 'main') {
    const bookmarks = await this.loadBookmarks(type);
    return JSON.stringify(bookmarks, null, 2);
  }

  static async importFromJSON(jsonString, type = 'main') {
    try {
      const bookmarks = JSON.parse(jsonString);
      await this.saveBookmarks(bookmarks, type);
      return true;
    } catch (error) {
      console.error('Error importing JSON:', error);
      throw new Error('Invalid JSON format');
    }
  }
}

// Make available globally
window.FileManager = FileManager;
