import path from 'node:path';
import fs from 'node:fs/promises';
import multer from 'multer';
import { pool } from '../db/pool.js';
import { adminAnalyticsOverviewQuerySchema, adminAnalyticsRecentQuerySchema, adminReviewsQuerySchema, homeHeroSlidesUpsertSchema, newsCarouselSlidesUpsertSchema, newsPostCreateSchema, newsSourceCreateSchema } from '../validation.js';
import { decryptJson } from '../crypto.js';
import { assertAllowedImage, filenameFromUploadsUrl, makeSafeFilename, safeJoinUploads } from '../services/uploads.js';
export function registerAdminRoutes(router) {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 3 * 1024 * 1024 },
        fileFilter(_req, file, cb) {
            try {
                assertAllowedImage(file.mimetype);
                cb(null, true);
            }
            catch {
                cb(null, false);
            }
        }
    });
    router.get('/admin/analytics/overview', async (req, res) => {
        const parsed = adminAnalyticsOverviewQuerySchema.safeParse(req.query);
        if (!parsed.success)
            return res.status(400).json({ message: 'Parámetros inválidos' });
        const days = parsed.data.days;
        try {
            const totalR = await pool.query(`select count(*)::int as total
           from page_views
          where created_at >= now() - ($1::int * interval '1 day')`, [days]);
            const perDayR = await pool.query(`select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
                count(*)::int as count
           from page_views
          where created_at >= now() - ($1::int * interval '1 day')
          group by 1
          order by 1 asc`, [days]);
            const topPathsR = await pool.query(`select path, count(*)::int as count
           from page_views
          where created_at >= now() - ($1::int * interval '1 day')
          group by path
          order by count desc
          limit 10`, [days]);
            return res.json({
                total: totalR.rows[0]?.total ?? 0,
                perDay: perDayR.rows,
                topPaths: topPathsR.rows
            });
        }
        catch {
            return res.json({ total: 0, perDay: [], topPaths: [] });
        }
    });
    router.get('/admin/analytics/recent', async (req, res) => {
        const parsed = adminAnalyticsRecentQuerySchema.safeParse(req.query);
        if (!parsed.success)
            return res.status(400).json({ message: 'Parámetros inválidos' });
        const limit = parsed.data.limit;
        try {
            const r = await pool.query(`select path,
                referrer,
                created_at as "createdAt"
           from page_views
          order by created_at desc
          limit $1`, [limit]);
            return res.json({ items: r.rows });
        }
        catch {
            return res.json({ items: [] });
        }
    });
    // Reviews moderation
    router.get('/admin/reviews', async (req, res) => {
        const parsed = adminReviewsQuerySchema.safeParse(req.query);
        if (!parsed.success)
            return res.status(400).json({ message: 'Parámetros inválidos' });
        const { status, limit } = parsed.data;
        try {
            const r = await pool.query(`select id,
                name,
                rating,
                message,
                status,
                created_at as "createdAt",
                approved_at as "approvedAt"
           from reviews
          where status = $1
          order by created_at desc
          limit $2`, [status, limit]);
            return res.json({ items: r.rows });
        }
        catch {
            return res.json({ items: [] });
        }
    });
    router.post('/admin/reviews/:id/approve', async (req, res) => {
        const id = String(req.params.id || '');
        if (!id)
            return res.status(400).json({ message: 'ID inválido' });
        try {
            await pool.query(`update reviews set status = 'approved', approved_at = now() where id = $1`, [id]);
            return res.json({ ok: true });
        }
        catch {
            return res.status(500).json({ message: 'No se pudo aprobar' });
        }
    });
    router.post('/admin/reviews/:id/reject', async (req, res) => {
        const id = String(req.params.id || '');
        if (!id)
            return res.status(400).json({ message: 'ID inválido' });
        try {
            await pool.query(`update reviews set status = 'rejected', approved_at = null where id = $1`, [id]);
            return res.json({ ok: true });
        }
        catch {
            return res.status(500).json({ message: 'No se pudo rechazar' });
        }
    });
    router.delete('/admin/reviews/:id', async (req, res) => {
        const id = String(req.params.id || '');
        if (!id)
            return res.status(400).json({ message: 'ID inválido' });
        try {
            await pool.query('delete from reviews where id = $1', [id]);
            return res.json({ ok: true });
        }
        catch {
            return res.status(500).json({ message: 'No se pudo eliminar' });
        }
    });
    router.get('/admin/contacts', async (_req, res) => {
        const r = await pool.query(`select id, subject, pii_encrypted as "piiEncrypted", created_at as "createdAt"
       from contact_messages
       order by created_at desc
       limit 200`);
        const items = r.rows.map((row) => {
            let pii = {};
            try {
                pii = decryptJson(row.piiEncrypted);
            }
            catch {
                pii = {};
            }
            return {
                id: row.id,
                subject: row.subject,
                createdAt: row.createdAt,
                name: pii?.name ?? '',
                email: pii?.email ?? '',
                phone: pii?.phone ?? '',
                message: pii?.message ?? ''
            };
        });
        return res.json({ items });
    });
    router.post('/admin/upload', upload.single('image'), async (req, res) => {
        const f = req.file;
        if (!f)
            return res.status(400).json({ message: 'Imagen requerida (jpg/png/webp/gif, máx 3MB)' });
        let ext = '';
        try {
            ext = assertAllowedImage(f.mimetype);
        }
        catch {
            return res.status(400).json({ message: 'Tipo de imagen no permitido' });
        }
        const filename = makeSafeFilename(ext);
        await fs.mkdir(uploadsDir, { recursive: true });
        const outPath = safeJoinUploads(uploadsDir, filename);
        await fs.writeFile(outPath, f.buffer);
        return res.json({ ok: true, url: `/uploads/${filename}` });
    });
    router.get('/admin/news/sources', async (_req, res) => {
        const r = await pool.query('select id, name, rss_url as "rssUrl", enabled, created_at as "createdAt" from news_sources order by created_at desc');
        return res.json({ items: r.rows });
    });
    router.post('/admin/news/sources/clear', async (req, res) => {
        const confirm = Boolean(req.body?.confirm);
        if (!confirm)
            return res.status(400).json({ message: 'Confirmación requerida' });
        await pool.query('delete from news_sources');
        return res.json({ ok: true });
    });
    router.post('/admin/news/sources', async (req, res) => {
        const parsed = newsSourceCreateSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: 'Datos inválidos' });
        const { name, rssUrl } = parsed.data;
        try {
            const r = await pool.query('insert into news_sources(name, rss_url, enabled) values ($1,$2,true) returning id', [name, rssUrl]);
            return res.json({ ok: true, id: r.rows[0].id });
        }
        catch {
            return res.status(409).json({ message: 'La fuente ya existe' });
        }
    });
    router.delete('/admin/news/sources/:id', async (req, res) => {
        const id = req.params.id;
        await pool.query('delete from news_sources where id = $1', [id]);
        return res.json({ ok: true });
    });
    router.get('/admin/news/posts', async (_req, res) => {
        const r = await pool.query('select id, title, content, image_url as "imageUrl", featured, template, coalesce(media,\'[]\'::jsonb) as "media", link, source, published_at as "publishedAt", created_at as "createdAt" from news_posts order by published_at desc limit 200');
        return res.json({ items: r.rows });
    });
    router.post('/admin/news/posts', async (req, res) => {
        const parsed = newsPostCreateSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: 'Datos inválidos' });
        const { title, content, imageUrl, link, publishedAt, template, media, featured } = parsed.data;
        const pub = typeof publishedAt === 'string' && publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString();
        const t = template ?? 'simple';
        const m = Array.isArray(media) ? media : [];
        const isFeatured = Boolean(featured);
        const r = await pool.query(`insert into news_posts(title, content, image_url, featured, template, media, link, source, published_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
       returning id`, [title, content ?? '', imageUrl || null, isFeatured, t, JSON.stringify(m), link || '', 'admin', pub]);
        return res.json({ ok: true, id: r.rows[0].id });
    });
    router.delete('/admin/news/posts/:id', async (req, res) => {
        const id = req.params.id;
        const prev = await pool.query('select image_url as "imageUrl" from news_posts where id = $1', [id]);
        await pool.query('delete from news_posts where id = $1', [id]);
        const imageUrl = prev.rows[0]?.imageUrl;
        if (imageUrl) {
            const filename = filenameFromUploadsUrl(imageUrl);
            if (filename) {
                try {
                    const p = safeJoinUploads(uploadsDir, filename);
                    await fs.unlink(p);
                }
                catch {
                    // best-effort cleanup
                }
            }
        }
        return res.json({ ok: true });
    });
    // Home hero carousel (replace-all upsert)
    router.get('/admin/home/hero', async (_req, res) => {
        const r = await pool.query(`select position,
              image_url as "imageUrl",
              title,
              text,
              link,
              enabled
       from home_hero_slides
       order by position asc`);
        return res.json({ items: r.rows });
    });
    router.put('/admin/home/hero', async (req, res) => {
        const parsed = homeHeroSlidesUpsertSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: 'Datos inválidos' });
        const slides = parsed.data.slides;
        if (slides.length > 7)
            return res.status(400).json({ message: 'Máximo 7 fotos' });
        await pool.query('begin');
        try {
            await pool.query('delete from home_hero_slides');
            for (let i = 0; i < slides.length; i++) {
                const s = slides[i];
                await pool.query(`insert into home_hero_slides(position, image_url, title, text, link, enabled, updated_at)
           values ($1,$2,$3,$4,$5,$6, now())`, [i + 1, s.imageUrl, s.title ?? '', s.text ?? '', s.link ?? '', s.enabled ?? true]);
            }
            await pool.query('commit');
            return res.json({ ok: true });
        }
        catch (err) {
            await pool.query('rollback');
            throw err;
        }
    });
    // Novedades carousel (replace-all upsert)
    router.get('/admin/news/carousel', async (_req, res) => {
        const r = await pool.query(`select position,
                image_url as "imageUrl",
                title,
                text,
                link,
                enabled
         from news_carousel_slides
         order by position asc`);
        return res.json({ items: r.rows });
    });
    router.put('/admin/news/carousel', async (req, res) => {
        const parsed = newsCarouselSlidesUpsertSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: 'Datos inválidos' });
        const slides = parsed.data.slides;
        if (slides.length > 12)
            return res.status(400).json({ message: 'Máximo 12 fotos' });
        await pool.query('begin');
        try {
            await pool.query('delete from news_carousel_slides');
            for (let i = 0; i < slides.length; i++) {
                const s = slides[i];
                await pool.query(`insert into news_carousel_slides(position, image_url, title, text, link, enabled, updated_at)
             values ($1,$2,$3,$4,$5,$6, now())`, [i + 1, s.imageUrl, s.title ?? '', s.text ?? '', s.link ?? '', s.enabled ?? true]);
            }
            await pool.query('commit');
            return res.json({ ok: true });
        }
        catch (err) {
            await pool.query('rollback');
            throw err;
        }
    });
}
//# sourceMappingURL=admin.js.map