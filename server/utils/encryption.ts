import { scrypt, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Encryption key derived from environment variable or a fallback
const ENCRYPTION_KEY_ENV = process.env.ENCRYPTION_KEY || 'j8$pZ&2qV#mX!7tG9cF@5wL*3yRnE6bA';

/**
 * Encrypts a string value using AES-256-GCM
 * @param value String to encrypt
 * @returns Encrypted string (iv:authTag:encryptedData format)
 */
export async function encrypt(value: string): Promise<string> {
  try {
    // Derive key using scrypt
    const key = await scryptAsync(ENCRYPTION_KEY_ENV, 'salt', 32) as Buffer;
    
    // Create initialization vector
    const iv = randomBytes(16);
    
    // Create cipher
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt the value
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return combined string: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts a string encrypted with the encrypt function
 * @param encrypted String in the format iv:authTag:encryptedData
 * @returns Decrypted string
 */
export async function decrypt(encrypted: string): Promise<string> {
  try {
    // Split the encrypted text
    const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
    
    if (!ivHex || !authTagHex || !encryptedData) {
      throw new Error('Invalid encrypted format');
    }
    
    // Derive key using scrypt
    const key = await scryptAsync(ENCRYPTION_KEY_ENV, 'salt', 32) as Buffer;
    
    // Convert hex strings back to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}