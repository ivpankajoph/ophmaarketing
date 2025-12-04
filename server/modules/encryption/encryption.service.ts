import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const masterKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!masterKey) {
    console.warn('[Encryption] CREDENTIAL_ENCRYPTION_KEY not set, using fallback key (NOT SECURE FOR PRODUCTION)');
    return crypto.scryptSync('default-insecure-key-change-me', 'salt', 32);
  }
  return crypto.scryptSync(masterKey, 'whatsapp-saas-salt', 32);
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ]);
  
  return combined.toString('base64');
}

export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[Encryption] Decryption failed:', error);
    return '';
  }
}

export function maskSecret(secret: string, visibleChars: number = 4): string {
  if (!secret || secret.length <= visibleChars * 2) {
    return '••••••••';
  }
  const start = secret.substring(0, visibleChars);
  const end = secret.substring(secret.length - visibleChars);
  return `${start}••••••••${end}`;
}

export function isEncrypted(value: string): boolean {
  if (!value) return false;
  try {
    const decoded = Buffer.from(value, 'base64');
    return decoded.length > IV_LENGTH + AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}

export interface EncryptedCredentials {
  whatsappToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  webhookVerifyToken?: string;
  appId?: string;
  appSecret?: string;
  openaiApiKey?: string;
  facebookAccessToken?: string;
  facebookPageId?: string;
}

export interface DecryptedCredentials {
  whatsappToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  appId: string;
  appSecret: string;
  openaiApiKey: string;
  facebookAccessToken: string;
  facebookPageId: string;
}

export function encryptCredentials(credentials: Partial<DecryptedCredentials>): EncryptedCredentials {
  const encrypted: EncryptedCredentials = {};
  
  if (credentials.whatsappToken) encrypted.whatsappToken = encrypt(credentials.whatsappToken);
  if (credentials.phoneNumberId) encrypted.phoneNumberId = encrypt(credentials.phoneNumberId);
  if (credentials.businessAccountId) encrypted.businessAccountId = encrypt(credentials.businessAccountId);
  if (credentials.webhookVerifyToken) encrypted.webhookVerifyToken = encrypt(credentials.webhookVerifyToken);
  if (credentials.appId) encrypted.appId = encrypt(credentials.appId);
  if (credentials.appSecret) encrypted.appSecret = encrypt(credentials.appSecret);
  if (credentials.openaiApiKey) encrypted.openaiApiKey = encrypt(credentials.openaiApiKey);
  if (credentials.facebookAccessToken) encrypted.facebookAccessToken = encrypt(credentials.facebookAccessToken);
  if (credentials.facebookPageId) encrypted.facebookPageId = encrypt(credentials.facebookPageId);
  
  return encrypted;
}

export function decryptCredentials(encrypted: EncryptedCredentials): DecryptedCredentials {
  return {
    whatsappToken: encrypted.whatsappToken ? decrypt(encrypted.whatsappToken) : '',
    phoneNumberId: encrypted.phoneNumberId ? decrypt(encrypted.phoneNumberId) : '',
    businessAccountId: encrypted.businessAccountId ? decrypt(encrypted.businessAccountId) : '',
    webhookVerifyToken: encrypted.webhookVerifyToken ? decrypt(encrypted.webhookVerifyToken) : '',
    appId: encrypted.appId ? decrypt(encrypted.appId) : '',
    appSecret: encrypted.appSecret ? decrypt(encrypted.appSecret) : '',
    openaiApiKey: encrypted.openaiApiKey ? decrypt(encrypted.openaiApiKey) : '',
    facebookAccessToken: encrypted.facebookAccessToken ? decrypt(encrypted.facebookAccessToken) : '',
    facebookPageId: encrypted.facebookPageId ? decrypt(encrypted.facebookPageId) : '',
  };
}

export function getMaskedCredentials(encrypted: EncryptedCredentials): Record<string, string> {
  const decrypted = decryptCredentials(encrypted);
  return {
    whatsappToken: maskSecret(decrypted.whatsappToken),
    phoneNumberId: decrypted.phoneNumberId ? maskSecret(decrypted.phoneNumberId, 3) : '',
    businessAccountId: decrypted.businessAccountId ? maskSecret(decrypted.businessAccountId, 3) : '',
    webhookVerifyToken: maskSecret(decrypted.webhookVerifyToken),
    appId: decrypted.appId ? maskSecret(decrypted.appId, 3) : '',
    appSecret: maskSecret(decrypted.appSecret),
    openaiApiKey: maskSecret(decrypted.openaiApiKey, 3),
    facebookAccessToken: maskSecret(decrypted.facebookAccessToken),
    facebookPageId: decrypted.facebookPageId ? maskSecret(decrypted.facebookPageId, 3) : '',
  };
}
