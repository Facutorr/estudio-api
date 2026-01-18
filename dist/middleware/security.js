import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { config } from '../config.js';
// Allow both www and non-www versions of the domain
const allowedOrigins = [
    config.webOrigin,
    config.webOrigin.replace('://www.', '://'),
    config.webOrigin.replace('://', '://www.')
].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
export const securityMiddleware = [
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                'script-src': ["'self'"],
                'object-src': ["'none'"]
            }
        },
        referrerPolicy: { policy: 'no-referrer' }
    }),
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl, etc)
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.includes(origin))
                return callback(null, true);
            // In development, allow localhost
            if (origin.includes('localhost'))
                return callback(null, true);
            callback(new Error('Not allowed by CORS'));
        },
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