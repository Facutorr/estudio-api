import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { config } from '../config.js';
function findSchemaPath() {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFilePath);
    const candidates = [
        // Running from src
        path.resolve(currentDir, 'schema.sql'),
        // Running from dist (dist/db -> src/db)
        path.resolve(currentDir, '../../src/db/schema.sql'),
        // Running with cwd at apps/api
        path.resolve(process.cwd(), 'src/db/schema.sql')
    ];
    for (const p of candidates) {
        if (fs.existsSync(p))
            return p;
    }
    throw new Error(`No se encontró schema.sql (probé: ${candidates.join(', ')})`);
}
export async function ensureSchema() {
    const env = config.env;
    // Safe defaults:
    // - dev/test: run unless explicitly disabled
    // - prod: run only if explicitly enabled
    const auto = process.env.AUTO_MIGRATE;
    const shouldRun = env === 'production' ? auto === '1' : auto !== '0';
    if (!shouldRun)
        return;
    const schemaPath = findSchemaPath();
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
}
//# sourceMappingURL=migrate.js.map