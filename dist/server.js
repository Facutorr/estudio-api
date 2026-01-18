import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { securityMiddleware } from './middleware/security.js';
import { authOptional, requireRoot } from './middleware/auth.js';
import { ensureCsrf, requireCsrf } from './middleware/csrf.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerNewsRoutes } from './routes/news.js';
import { registerContactRoutes } from './routes/contact.js';
import { registerHomeRoutes } from './routes/home.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerReviewsRoutes } from './routes/reviews.js';
import { registerIntakeRoutes } from './routes/intake.js';
export function createServer() {
    const app = express();
    // Static uploads (almacenamiento local). En producción: usar S3/Cloudinary.
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir))
        fs.mkdirSync(uploadsDir, { recursive: true });
    app.use('/uploads', express.static(uploadsDir, {
        fallthrough: false,
        setHeaders(res) {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }));
    // Body limit (OWASP: evitar payloads enormes)
    app.use(express.json({ limit: '200kb' }));
    // Security headers, CORS, rate limit
    for (const m of securityMiddleware)
        app.use(m);
    // CSRF cookie bootstrap + auth decode
    app.use(ensureCsrf);
    app.use(authOptional);
    const api = express.Router();
    api.get('/health', (_req, res) => res.json({ ok: true }));
    // Auth
    api.use(requireCsrf);
    registerAuthRoutes(api);
    // Public-ish routes (CSRF required because cookie auth is in play; safe default)
    registerIntakeRoutes(api);
    registerNewsRoutes(api);
    registerHomeRoutes(api);
    registerContactRoutes(api);
    registerAnalyticsRoutes(api);
    registerReviewsRoutes(api);
    // Admin (root only)
    api.use('/admin', requireRoot);
    registerAdminRoutes(api);
    app.use('/api', api);
    // Default error handler
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err, _req, res, _next) => {
        // eslint-disable-next-line no-console
        console.error(err);
        res.status(500).json({ message: 'Error interno' });
    });
    return app;
}
//# sourceMappingURL=server.js.map