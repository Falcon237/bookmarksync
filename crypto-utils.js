// Simple encryption/decryption utilities for private bookmarks
// Uses AES-GCM encryption

class CryptoUtils {
  static async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(text, password) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const key = await this.deriveKey(password, salt);

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      );

      // Combine salt, iv, and encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  static async decrypt(encryptedText, password) {
    try {
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedText)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encryptedData = combined.slice(28);

      const key = await this.deriveKey(password, salt);

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encryptedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data - wrong password?');
    }
  }
}

// Make available globally
window.CryptoUtils = CryptoUtils;
