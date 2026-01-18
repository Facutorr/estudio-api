import crypto from 'node:crypto';
import path from 'node:path';
const allowedMime = new Map([
    ['image/jpeg', '.jpg'],
    ['image/png', '.png'],
    ['image/webp', '.webp'],
    ['image/gif', '.gif']
]);
export function assertAllowedImage(mime) {
    const ext = allowedMime.get(mime);
    if (!ext)
        throw new Error('Tipo de imagen no permitido');
    return ext;
}
export function makeSafeFilename(ext) {
    const id = crypto.randomBytes(16).toString('hex');
    const safeExt = ext.startsWith('.') ? ext : `.${ext}`;
    return `${id}${safeExt}`;
}
export function safeJoinUploads(uploadsDir, filename) {
    const p = path.join(uploadsDir, filename);
    const normalizedBase = path.resolve(uploadsDir) + path.sep;
    const normalizedPath = path.resolve(p);
    if (!normalizedPath.startsWith(normalizedBase))
        throw new Error('Ruta inválida');
    return normalizedPath;
}
export function isUploadsUrl(url) {
    return url.startsWith('/uploads/');
}
export function filenameFromUploadsUrl(url) {
    if (!isUploadsUrl(url))
        return '';
    const filename = url.slice('/uploads/'.length);
    // hard stop on weird paths
    if (!filename || filename.includes('/') || filename.includes('\\'))
        return '';
    return filename;
}
//# sourceMappingURL=uploads.js.map