# Bookmark Sync - Edge Browser Extension

A powerful Edge browser extension for managing and synchronizing bookmarks with local text files (perfect for Google Drive sync). Features encryption for private bookmarks, random bookmark opener, corruption detection, and folder organization.

## Features

### Core Features
- **Dual Bookmark Lists**: Separate storage for main and private bookmarks
- **Encryption**: Private bookmarks are encrypted with AES-GCM encryption
- **Local File Sync**: Export/import bookmarks to text files (JSON format) for syncing via Google Drive
- **Folder Organization**: Organize bookmarks into collapsible folders
- **Random Opener**: Open a random number of bookmarks
- **Corruption Scanner**: Scan bookmark pages for specific texts to detect dead/corrupt links
- **Batch Delete**: Delete all corrupt bookmarks at once

### Opening Options
- Open in new tabs
- Open in new private/incognito window

### Additional Features
- Add bookmarks by URL
- Quick add via right-click context menu
- Select/deselect bookmarks via checkboxes
- Individual bookmark deletion
- Settings page for configuration

## Installation

1. **Clone or download this repository**

2. **Open Edge browser** and navigate to `edge://extensions/`

3. **Enable Developer Mode** (toggle in the bottom-left corner)

4. **Click "Load unpacked"** and select the `bookmarksync` folder

5. **The extension is now installed!** Click the extension icon in the toolbar to start using it.

## Usage

### Initial Setup

1. Click the extension icon and then click the **Settings (⚙️)** button
2. Configure the following:
   - **Main Bookmarks File Path**: Path where you'll store your main bookmarks (e.g., `C:\Users\YourName\Google Drive\bookmarks.txt`)
   - **Private Bookmarks File Path**: Path for private bookmarks (e.g., `C:\Users\YourName\Google Drive\private-bookmarks.txt`)
   - **Encryption Password**: Set a strong password for encrypting private bookmarks
   - **Scan Texts**: Enter texts to search for when scanning for corrupt bookmarks (one per line)

### Adding Bookmarks

**Method 1: Via Extension Popup**
1. Click the extension icon
2. Switch to "Main Bookmarks" or "Private Bookmarks" tab
3. Enter a URL in the input field
4. Click "Add"

**Method 2: Via Right-Click Context Menu**
1. Right-click anywhere on a webpage
2. Select "Add to Main Bookmarks" or "Add to Private Bookmarks"

### Managing Bookmarks

- **View Bookmarks**: Click the extension icon to see all your bookmarks
- **Open Bookmark**: Click on the bookmark title to open it
- **Delete Bookmark**: Click the "Delete" button next to a bookmark
- **Toggle Private Encryption**: Click the "🔓 Decrypt" / "🔒 Encrypt" button to view private bookmarks

### Syncing with Files (Google Drive)

Due to browser security restrictions, the extension cannot directly read/write to your file system. Instead, use the copy/paste workflow:

**To Export (Save to File):**
1. Click "Save to File" button in the popup (this copies to clipboard)
2. Open your text file in Google Drive
3. Paste the content and save

**To Import (Load from File):**
1. Go to Settings (⚙️ button)
2. Copy the content from your text file
3. Paste into the "Main Bookmarks Data" or "Private Bookmarks Data" textarea
4. Click the corresponding "Import" button

### Random Bookmark Opener

1. Enter the number of bookmarks you want to open randomly
2. Select opening mode (New Tabs or Private Window)
3. Click "Open Random"

### Scanning for Corrupt Bookmarks

1. Configure scan texts in Settings (e.g., "404 Not Found", "Page not found", "Error")
2. Click "Scan for Corrupt Bookmarks"
3. The extension will check each bookmark's page for the configured texts
4. Bookmarks containing these texts will be marked as corrupt (red highlight)
5. Click "Delete All Corrupt" to remove all corrupt bookmarks at once

## File Format

Bookmarks are stored in JSON format:

```json
{
  "folders": [
    {
      "id": "1234567890",
      "name": "Work",
      "collapsed": false
    }
  ],
  "bookmarks": [
    {
      "id": "1234567891",
      "url": "https://example.com",
      "title": "Example Website",
      "folder": "1234567890",
      "corrupt": false,
      "dateAdded": "2025-11-09T12:00:00.000Z"
    }
  ]
}
```

## Security Notes

- **Private bookmarks** are encrypted using AES-GCM with PBKDF2 key derivation
- Remember your encryption password - there's no recovery option
- The encryption password is stored locally in the browser's sync storage
- For maximum security, use a strong, unique password

## Privacy

- All data is stored locally in your browser
- No data is sent to external servers
- The extension only accesses websites when:
  - Fetching page titles when adding bookmarks
  - Scanning for corrupt bookmarks

## Troubleshooting

**Extension not loading:**
- Make sure Developer Mode is enabled
- Check that all files are in the correct locations
- Try reloading the extension from `edge://extensions/`

**Private bookmarks won't decrypt:**
- Verify you've set an encryption password in Settings
- Make sure you're using the correct password
- Re-enter the password in Settings if needed

**Scan function not working:**
- Ensure scan texts are configured in Settings
- Some websites may block requests from extensions
- Check the browser console for errors

**Bookmarks not syncing:**
- Remember to manually copy/paste between the extension and your files
- The extension cannot directly access Google Drive
- Make sure you're using the Import/Export functions in Settings

## Technical Details

- **Manifest Version**: 3
- **Encryption**: AES-GCM with PBKDF2 (100,000 iterations)
- **Storage**: Chrome Storage API (sync for settings, local for bookmarks)
- **Permissions**: storage, tabs, activeTab, scripting, contextMenus, notifications

## Development

### File Structure
```
bookmarksync/
├── manifest.json           # Extension manifest
├── popup.html             # Main popup interface
├── popup.css              # Popup styles
├── popup.js               # Popup logic
├── settings.html          # Settings page
├── settings.js            # Settings logic
├── background.js          # Background service worker
├── crypto-utils.js        # Encryption utilities
├── file-manager.js        # Bookmark management
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Future Enhancements

Potential features for future versions:
- Import/export to different formats (HTML, CSV)
- Advanced search and filtering
- Bookmark tags and categories
- Duplicate detection
- Auto-sync with cloud storage (if APIs allow)
- Bookmark statistics and analytics
- Browser bookmark import

## License

This extension is provided as-is for personal use.

## Support

For issues, bugs, or feature requests, please check the repository's issue tracker.

---

**Enjoy managing your bookmarks with Bookmark Sync!**
