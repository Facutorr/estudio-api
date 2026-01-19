import { pool } from '../db/pool.js';
import { productsListQuerySchema } from '../validation.js';
export function registerCatalogRoutes(router) {
    // Get all categories
    router.get('/catalog/categories', async (_req, res) => {
        const categories = [
            { id: 'calzado', name: 'Calzado' },
            { id: 'pantalones', name: 'Pantalones' },
            { id: 'remeras', name: 'Remeras' },
            { id: 'vestidos', name: 'Vestidos' },
            { id: 'buzos', name: 'Buzos' },
            { id: 'ropa_interior', name: 'Ropa Interior' }
        ];
        return res.json({ categories });
    });
    // List products (public, filtered)
    router.get('/catalog/products', async (req, res) => {
        const parsed = productsListQuerySchema.safeParse(req.query);
        if (!parsed.success)
            return res.status(400).json({ message: 'Parámetros inválidos' });
        const { category, featured, limit, offset } = parsed.data;
        try {
            let query = `
        select id,
               name,
               description,
               category,
               price,
               stock,
               coalesce(images, '[]'::jsonb) as images,
               coalesce(sizes, '[]'::jsonb) as sizes,
               coalesce(colors, '[]'::jsonb) as colors,
               featured,
               created_at as "createdAt",
               updated_at as "updatedAt"
        from products
        where active = true
      `;
            const params = [];
            let paramIndex = 1;
            if (category) {
                query += ` and category = $${paramIndex}`;
                params.push(category);
                paramIndex++;
            }
            if (featured !== undefined) {
                query += ` and featured = $${paramIndex}`;
                params.push(featured);
                paramIndex++;
            }
            query += ` order by featured desc, created_at desc limit $${paramIndex} offset $${paramIndex + 1}`;
            params.push(limit, offset);
            const r = await pool.query(query, params);
            return res.json({ products: r.rows });
        }
        catch (err) {
            console.error('Error fetching products:', err);
            return res.status(500).json({ message: 'Error al obtener productos' });
        }
    });
    // Get single product
    router.get('/catalog/products/:id', async (req, res) => {
        const id = req.params.id;
        if (!id)
            return res.status(400).json({ message: 'ID inválido' });
        try {
            const r = await pool.query(`select id,
                name,
                description,
                category,
                price,
                stock,
                coalesce(images, '[]'::jsonb) as images,
                coalesce(sizes, '[]'::jsonb) as sizes,
                coalesce(colors, '[]'::jsonb) as colors,
                featured,
                created_at as "createdAt",
                updated_at as "updatedAt"
         from products
         where id = $1 and active = true`, [id]);
            if (r.rows.length === 0) {
                return res.status(404).json({ message: 'Producto no encontrado' });
            }
            return res.json({ product: r.rows[0] });
        }
        catch (err) {
            console.error('Error fetching product:', err);
            return res.status(500).json({ message: 'Error al obtener producto' });
        }
    });
}
//# sourceMappingURL=catalog.js.map