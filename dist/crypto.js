import crypto from 'node:crypto';
import { config } from './config.js';
const key = Buffer.from(config.piiKeyBase64, 'base64');
if (key.length !== 32) {
    throw new Error('PII_ENC_KEY_B64 must be 32 bytes base64 (AES-256 key)');
}
export function encryptJson(payload) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    // base64(iv).base64(tag).base64(ciphertext)
    return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}
export function decryptJson(token) {
    const [ivB64, tagB64, dataB64] = token.split('.');
    if (!ivB64 || !tagB64 || !dataB64)
        throw new Error('Bad encrypted payload');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
}
//# sourceMappingURL=crypto.js.map