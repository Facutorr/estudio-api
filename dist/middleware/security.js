import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { config } from '../config.js';
export const securityMiddleware = [
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                // Ajustar según necesidades en producción
                'script-src': ["'self'"],
                'object-src': ["'none'"]
            }
        },
        referrerPolicy: { policy: 'no-referrer' }
    }),
    cors({
        origin: config.webOrigin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'X-CSRF-Token']
    }),
    rateLimit({
        windowMs: 60_000,
        limit: 120,
        standardHeaders: 'draft-7',
        legacyHeaders: false
    })
];
//# sourceMappingURL=security.js.map