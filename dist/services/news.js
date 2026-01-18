import Parser from 'rss-parser';
const parser = new Parser();
export async function fetchRss(url, sourceName) {
    const feed = await parser.parseURL(url);
    const items = (feed.items ?? []).slice(0, 20);
    return items.map((it) => {
        const link = it.link ?? '';
        const title = it.title ?? 'Sin título';
        const published = it.isoDate ?? it.pubDate ?? new Date().toISOString();
        const id = `${sourceName}:${link || title}:${published}`;
        return {
            id,
            title,
            link,
            publishedAt: new Date(published).toISOString(),
            source: sourceName,
            // Nunca renderizar HTML externo como HTML en el cliente.
            content: typeof it.contentSnippet === 'string' ? it.contentSnippet : undefined
        };
    });
}
//# sourceMappingURL=news.js.map