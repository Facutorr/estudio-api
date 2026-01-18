import { pool } from '../db/pool.js';
import { reviewCreateSchema, reviewsListQuerySchema } from '../validation.js';
import { sendNotificationEmail } from '../services/mailer.js';
import { config } from '../config.js';
export function registerReviewsRoutes(router) {
    router.get('/reviews', async (req, res) => {
        const parsed = reviewsListQuerySchema.safeParse(req.query);
        if (!parsed.success)
            return res.status(400).json({ message: 'Parámetros inválidos' });
        const limit = parsed.data.limit;
        try {
            const r = await pool.query(`select id,
                name,
                rating,
                message,
                created_at as "createdAt"
           from reviews
          where status = 'approved'
          order by approved_at desc nulls last, created_at desc
          limit $1`, [limit]);
            return res.json({ items: r.rows });
        }
        catch {
            return res.json({ items: [] });
        }
    });
    router.post('/reviews', async (req, res) => {
        const parsed = reviewCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            const first = parsed.error.issues[0];
            const detail = first ? `${first.path.join('.') || 'datos'}: ${first.message}` : 'Datos inválidos';
            return res.status(400).json({ message: detail });
        }
        const data = parsed.data;
        try {
            const r = await pool.query(`insert into reviews(name, rating, message, status)
         values ($1,$2,$3,'pending')
         returning id`, [data.name, data.rating, data.message]);
            // Send email in background (don't await)
            sendNotificationEmail({
                subject: 'Nueva reseña pendiente de aprobación',
                text: `Nombre: ${data.name}\nCalificación: ${data.rating}/5\n\n${data.message}`
            }).catch(() => { }); // Ignore email errors
            return res.json({ ok: true, id: r.rows[0]?.id });
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            const detail = e instanceof Error ? e.message : 'Error';
            const msg = config.env === 'production'
                ? 'No se pudo guardar la reseña'
                : `No se pudo guardar la reseña: ${detail}`;
            return res.status(500).json({ message: msg });
        }
    });
}
//# sourceMappingURL=reviews.js.map