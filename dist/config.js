import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Load environment variables for a workspace/monorepo setup.
// - Prefer root .env (recommended in README)
// - Allow apps/api/.env to override when present
{
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFilePath);
    const repoRootEnvPath = path.resolve(currentDir, '../../..', '.env');
    dotenv.config({ path: repoRootEnvPath });
    dotenv.config({ override: true });
}
function must(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing env var: ${name}`);
    return v;
}
export const config = {
    env: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 8080),
    webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    jwtSecret: must('JWT_SECRET'),
    jwtIssuer: process.env.JWT_ISSUER ?? 'denuncias-api',
    cookieName: process.env.AUTH_COOKIE_NAME ?? 'auth',
    dbUrl: must('DATABASE_URL'),
    piiKeyBase64: must('PII_ENC_KEY_B64'),
    rssUrl: process.env.RSS_URL ?? '',
    rootEmail: process.env.ROOT_EMAIL ?? '',
    rootPassword: process.env.ROOT_PASSWORD ?? '',
    admin1: {
        email: process.env.ADMIN1_EMAIL ?? '',
        phone: process.env.ADMIN1_PHONE ?? '',
        password: process.env.ADMIN1_PASSWORD ?? ''
    },
    admin2: {
        email: process.env.ADMIN2_EMAIL ?? '',
        phone: process.env.ADMIN2_PHONE ?? '',
        password: process.env.ADMIN2_PASSWORD ?? ''
    },
    contactEmail: process.env.CONTACT_EMAIL ?? 'estudiofernandotorres@gmail.com',
    smtp: {
        host: process.env.SMTP_HOST ?? '',
        port: Number(process.env.SMTP_PORT ?? 587),
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASS ?? '',
        from: process.env.SMTP_FROM ?? ''
    },
    // Optional: Wit.ai (Meta) for intent classification in the contact assistant.
    witServerAccessToken: process.env.WIT_SERVER_ACCESS_TOKEN ?? '',
    // Groq API for intelligent chat assistant
    groqApiKey: process.env.GROQ_API_KEY ?? ''
};
//# sourceMappingURL=config.js.map