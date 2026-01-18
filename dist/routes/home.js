import { pool } from '../db/pool.js';
export function registerHomeRoutes(router) {
    // Public: configurable hero slides for Home
    router.get('/home/hero', async (_req, res) => {
        const r = await pool.query(`select position,
              image_url as "imageUrl",
              title,
              text,
              link,
              enabled
       from home_hero_slides
       where enabled = true
       order by position asc`);
        return res.json({ items: r.rows });
    });
}
//# sourceMappingURL=home.js.map