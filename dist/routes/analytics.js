import { pageViewSchema } from '../validation.js';
import { pool } from '../db/pool.js';
export function registerAnalyticsRoutes(router) {
    router.post('/analytics/pageview', async (req, res) => {
        const parsed = pageViewSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: 'Datos inválidos' });
        const { path, referrer } = parsed.data;
        // Analytics should never take down the API.
        try {
            await pool.query('insert into page_views(path, referrer) values ($1, $2)', [path, referrer ?? '']);
            return res.json({ ok: true });
        }
        catch {
            // If DB isn't migrated yet (table missing) or any transient DB error, ignore.
            return res.json({ ok: false });
        }
    });
}
//# sourceMappingURL=analytics.js.map