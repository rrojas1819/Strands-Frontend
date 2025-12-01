/**
 * Decrypts AES-256-GCM encrypted messages
 * Uses Web Crypto API for browser-based decryption
 * 
 * @param {string} encryptedData - Base64 encoded encrypted data with format: iv:tag:ciphertext
 * @param {string} keyHex - Hex-encoded encryption key
 * @returns {Promise<string>} Decrypted plaintext message
 */
export async function decryptMessage(encryptedData, keyHex) {
  try {
    if (!encryptedData || !keyHex) {
      return encryptedData; // Return original if no encryption data/key
    }

    // Parse the encrypted data format: iv:tag:ciphertext (all base64)
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      console.warn('Invalid encrypted data format, returning original');
      return encryptedData; // Return original if format is invalid
    }

    const [ivBase64, tagBase64, ciphertextBase64] = parts;

    // Convert hex key to ArrayBuffer
    const keyBuffer = new Uint8Array(
      keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );

    // Convert base64 strings to ArrayBuffers
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    const tag = Uint8Array.from(atob(tagBase64), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));

    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Combine ciphertext and tag for GCM mode
    const encrypted = new Uint8Array(ciphertext.length + tag.length);
    encrypted.set(ciphertext);
    encrypted.set(tag, ciphertext.length);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // 16 bytes = 128 bits
      },
      cryptoKey,
      encrypted
    );

    // Convert decrypted ArrayBuffer to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    // Return original encrypted data if decryption fails
    return encryptedData;
  }
}

/**
 * Checks if a string appears to be encrypted (has the iv:tag:ciphertext format)
 * @param {string} data - Data to check
 * @returns {boolean} True if data appears encrypted
 */
export function isEncrypted(data) {
  if (!data || typeof data !== 'string') return false;
  const parts = data.split(':');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

