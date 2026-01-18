import jwt from 'jsonwebtoken';
import { config } from '../config.js';
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
export function authOptional(req, _res, next) {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[config.cookieName];
    if (!token)
        return next();
    try {
        const payload = jwt.verify(token, config.jwtSecret, {
            issuer: config.jwtIssuer
        });
        req.user = payload;
    }
    catch {
        // ignore invalid token
    }
    next();
}
export function requireAuth(req, res, next) {
    if (!req.user)
        return res.status(401).json({ message: 'No autorizado' });
    next();
}
export function requireRoot(req, res, next) {
    if (!req.user)
        return res.status(401).json({ message: 'No autorizado' });
    if (req.user.role !== 'root' && req.user.role !== 'admin')
        return res.status(403).json({ message: 'Prohibido' });
    next();
}
//# sourceMappingURL=auth.js.map