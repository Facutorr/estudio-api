import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { cartItemCreateSchema, cartItemUpdateSchema } from '../validation.js';
export function registerCartRoutes(router) {
    // All cart routes require authentication
    router.use('/cart', requireAuth);
    // Get user's cart
    router.get('/cart', async (req, res) => {
        const userId = req.user.sub;
        try {
            const r = await pool.query(`select ci.id,
                ci.product_id as "productId",
                ci.quantity,
                ci.size,
                ci.color,
                ci.created_at as "createdAt",
                ci.updated_at as "updatedAt",
                p.name as "productName",
                p.description as "productDescription",
                p.price as "productPrice",
                p.stock as "productStock",
                coalesce(p.images, '[]'::jsonb) as "productImages",
                p.active as "productActive"
         from cart_items ci
         join products p on p.id = ci.product_id
         where ci.user_id = $1
         order by ci.created_at desc`, [userId]);
            // Calculate total
            const items = r.rows;
            const total = items.reduce((sum, item) => sum + (Number(item.productPrice) * item.quantity), 0);
            return res.json({ items, total });
        }
        catch (err) {
            console.error('Error fetching cart:', err);
            return res.status(500).json({ message: 'Error al obtener carrito' });
        }
    });
    // Add item to cart
    router.post('/cart/items', async (req, res) => {
        const parsed = cartItemCreateSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: 'Datos inválidos' });
        const userId = req.user.sub;
        const { productId, quantity, size, color } = parsed.data;
        try {
            // Check if product exists and is active
            const productCheck = await pool.query('select id, stock, active from products where id = $1', [productId]);
            if (productCheck.rows.length === 0) {
                return res.status(404).json({ message: 'Producto no encontrado' });
            }
            const product = productCheck.rows[0];
            if (!product.active) {
                return res.status(400).json({ message: 'Producto no disponible' });
            }
            if (product.stock < quantity) {
                return res.status(400).json({ message: 'Stock insuficiente' });
            }
            // Check if item already exists in cart
            const existing = await pool.query('select id, quantity from cart_items where user_id = $1 and product_id = $2 and size = $3 and color = $4', [userId, productId, size, color]);
            if (existing.rows.length > 0) {
                // Update quantity
                const newQuantity = existing.rows[0].quantity + quantity;
                if (product.stock < newQuantity) {
                    return res.status(400).json({ message: 'Stock insuficiente' });
                }
                await pool.query('update cart_items set quantity = $1, updated_at = now() where id = $2', [newQuantity, existing.rows[0].id]);
                return res.json({ ok: true, id: existing.rows[0].id });
            }
            // Insert new item
            const r = await pool.query(`insert into cart_items(user_id, product_id, quantity, size, color)
         values ($1, $2, $3, $4, $5)
         returning id`, [userId, productId, quantity, size, color]);
            return res.json({ ok: true, id: r.rows[0].id });
        }
        catch (err) {
            console.error('Error adding to cart:', err);
            return res.status(500).json({ message: 'Error al agregar al carrito' });
        }
    });
    // Update cart item quantity
    router.put('/cart/items/:id', async (req, res) => {
        const id = req.params.id;
        const userId = req.user.sub;
        const parsed = cartItemUpdateSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: 'Datos inválidos' });
        const { quantity } = parsed.data;
        try {
            // Check ownership and get product stock
            const check = await pool.query(`select ci.id, p.stock
         from cart_items ci
         join products p on p.id = ci.product_id
         where ci.id = $1 and ci.user_id = $2`, [id, userId]);
            if (check.rows.length === 0) {
                return res.status(404).json({ message: 'Item no encontrado' });
            }
            if (check.rows[0].stock < quantity) {
                return res.status(400).json({ message: 'Stock insuficiente' });
            }
            await pool.query('update cart_items set quantity = $1, updated_at = now() where id = $2', [quantity, id]);
            return res.json({ ok: true });
        }
        catch (err) {
            console.error('Error updating cart item:', err);
            return res.status(500).json({ message: 'Error al actualizar item' });
        }
    });
    // Remove item from cart
    router.delete('/cart/items/:id', async (req, res) => {
        const id = req.params.id;
        const userId = req.user.sub;
        try {
            const result = await pool.query('delete from cart_items where id = $1 and user_id = $2 returning id', [id, userId]);
            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'Item no encontrado' });
            }
            return res.json({ ok: true });
        }
        catch (err) {
            console.error('Error removing cart item:', err);
            return res.status(500).json({ message: 'Error al eliminar item' });
        }
    });
    // Clear cart
    router.delete('/cart', async (req, res) => {
        const userId = req.user.sub;
        try {
            await pool.query('delete from cart_items where user_id = $1', [userId]);
            return res.json({ ok: true });
        }
        catch (err) {
            console.error('Error clearing cart:', err);
            return res.status(500).json({ message: 'Error al vaciar carrito' });
        }
    });
}
//# sourceMappingURL=cart.js.map