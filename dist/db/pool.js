import pg from 'pg';
import { config } from '../config.js';
export const pool = new pg.Pool({
    connectionString: config.dbUrl,
    max: 10
});
//# sourceMappingURL=pool.js.map