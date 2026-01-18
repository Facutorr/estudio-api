import type { Router } from 'express'
import { config } from '../config.js'
import { fetchRss } from '../services/news.js'
import { pool } from '../db/pool.js'

export function registerNewsRoutes(router: Router) {
  router.get('/news/carousel', async (_req, res) => {
    const r = await pool.query(
      `select id,
              image_url as "imageUrl",
              title,
              text,
              link,
              enabled,
              created_at as "createdAt"
       from news_carousel_slides
       where enabled = true
       order by position asc`
    )

    const items = r.rows.map((s: any) => ({
      id: `slide:${s.id}`,
      title: s.title ?? '',
      content: s.text ?? '',
      imageUrl: s.imageUrl ?? null,
      link: s.link ?? '',
      source: 'admin',
      publishedAt: new Date(s.createdAt ?? Date.now()).toISOString()
    }))

    return res.json({ items })
  })

  router.get('/news', async (_req, res) => {
    const merged: any[] = []

    // 1) Posts creados por admin
    const posts = await pool.query(
      'select id, title, content, image_url as "imageUrl", featured, template, coalesce(media,\'[]\'::jsonb) as "media", link, source, published_at as "publishedAt" from news_posts order by published_at desc limit 50'
    )
    for (const p of posts.rows) {
      merged.push({
        id: `post:${p.id}`,
        title: p.title,
        link: p.link || '',
        publishedAt: new Date(p.publishedAt).toISOString(),
        source: p.source || 'admin',
        content: p.content || '',
        imageUrl: p.imageUrl ?? null,
        featured: Boolean(p.featured),
        template: p.template || 'simple',
        media: Array.isArray(p.media) ? p.media : []
      })
    }

    // 2) Fuentes RSS administrables (enabled)
    const sources = await pool.query(
      'select name, rss_url as "rssUrl" from news_sources where enabled = true order by created_at desc'
    )

    // 3) Fuente RSS_URL (compatibilidad)
    const envSources = config.rssUrl ? [{ name: 'rss', rssUrl: config.rssUrl }] : []

    const allSources = [...sources.rows, ...envSources]
    for (const s of allSources) {
      try {
        const items = await fetchRss(s.rssUrl, s.name)
        merged.push(...items)
      } catch {
        // ignore RSS failures
      }
    }

    merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    return res.json({ items: merged.slice(0, 80) })
  })
}
