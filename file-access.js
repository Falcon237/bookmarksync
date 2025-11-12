// File System Access API - for automatic file loading
// Stores file handles in IndexedDB for persistent access

class FileAccessManager {
  static DB_NAME = 'BookmarkSyncDB';
  static DB_VERSION = 1;
  static STORE_NAME = 'fileHandles';

  // Initialize IndexedDB
  static async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  }

  // Save file handle to IndexedDB
  static async saveFileHandle(key, fileHandle) {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(fileHandle, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get file handle from IndexedDB
  static async getFileHandle(key) {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Request file from user and save handle
  static async requestAndSaveFile(key, acceptTypes = ['.txt']) {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Text Files',
          accept: { 'text/plain': acceptTypes }
        }],
        multiple: false
      });

      await this.saveFileHandle(key, fileHandle);
      return fileHandle;
    } catch (error) {
      console.error('Error requesting file:', error);
      return null;
    }
  }

  // Read file content from handle
  static async readFileContent(fileHandle) {
    try {
      // Request permission if needed
      const permission = await fileHandle.queryPermission({ mode: 'read' });

      if (permission !== 'granted') {
        const newPermission = await fileHandle.requestPermission({ mode: 'read' });
        if (newPermission !== 'granted') {
          throw new Error('File access permission denied');
        }
      }

      const file = await fileHandle.getFile();
      const text = await file.text();
      return text;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  // Load bookmarks from saved file handle
  static async loadFromSavedFile(type) {
    const key = type === 'main' ? 'mainFileHandle' : 'privateFileHandle';

    try {
      const fileHandle = await this.getFileHandle(key);

      if (!fileHandle) {
        console.log(`No saved file handle for ${type}`);
        return null;
      }

      const text = await this.readFileContent(fileHandle);
      return text;
    } catch (error) {
      console.error(`Error loading from saved file (${type}):`, error);
      // If permission was denied or file no longer accessible, remove the handle
      await this.removeFileHandle(key);
      return null;
    }
  }

  // Remove file handle
  static async removeFileHandle(key) {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Extract URLs from text content
  static extractUrls(text) {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = text.match(urlRegex);

    if (!urls || urls.length === 0) {
      return [];
    }

    // Remove duplicates
    return [...new Set(urls)];
  }

  // Get file name from handle (async to get file info)
  static async getFileName(fileHandle) {
    try {
      const file = await fileHandle.getFile();
      return file.name;
    } catch (error) {
      console.error('Error getting file name:', error);
      return null;
    }
  }

  // Check if file handles are configured
  static async hasConfiguredFiles() {
    const mainHandle = await this.getFileHandle('mainFileHandle');
    const privateHandle = await this.getFileHandle('privateFileHandle');
    return { main: !!mainHandle, private: !!privateHandle };
  }

  // Get both file names
  static async getConfiguredFileNames() {
    const mainHandle = await this.getFileHandle('mainFileHandle');
    const privateHandle = await this.getFileHandle('privateFileHandle');

    const names = {};
    if (mainHandle) {
      names.main = await this.getFileName(mainHandle);
    }
    if (privateHandle) {
      names.private = await this.getFileName(privateHandle);
    }

    return names;
  }
}

// Make available globally
window.FileAccessManager = FileAccessManager;
