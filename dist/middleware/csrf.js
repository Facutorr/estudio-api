import crypto from 'node:crypto';
const CSRF_COOKIE = 'csrf';
function setCookie(res, name, value) {
    const parts = [
        `${name}=${encodeURIComponent(value)}`,
        'Path=/',
        'SameSite=Strict'
    ];
    // En producción: agregar Secure + HttpOnly según el caso.
    res.append('Set-Cookie', parts.join('; '));
}
function parseCookies(header) {
    const cookies = {};
    if (!header)
        return cookies;
    const parts = header.split(';');
    for (const part of parts) {
        const idx = part.indexOf('=');
        if (idx < 0)
            continue;
        const k = part.slice(0, idx).trim();
        const v = part.slice(idx + 1).trim();
        cookies[k] = decodeURIComponent(v);
    }
    return cookies;
}
export function ensureCsrf(req, res, next) {
    const cookies = parseCookies(req.headers.cookie);
    if (!cookies[CSRF_COOKIE]) {
        const token = crypto.randomBytes(24).toString('base64url');
        setCookie(res, CSRF_COOKIE, token);
    }
    next();
}
export function requireCsrf(req, res, next) {
    const m = req.method.toUpperCase();
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS')
        return next();
    const cookies = parseCookies(req.headers.cookie);
    const cookieToken = cookies[CSRF_COOKIE];
    const headerToken = req.header('X-CSRF-Token');
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({ message: 'CSRF inválido' });
    }
    next();
}
//# sourceMappingURL=csrf.js.map