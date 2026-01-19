import type { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth, requireRoot } from '../middleware/auth.js'
import { orderCreateSchema, orderStatusUpdateSchema, ordersListQuerySchema } from '../validation.js'

export function registerOrdersRoutes(router: Router) {
  // Create order from cart (authenticated users)
  router.post('/orders', requireAuth, async (req, res) => {
    const parsed = orderCreateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Datos inválidos' })

    const userId = req.user!.sub
    const {
      shippingName,
      shippingEmail,
      shippingPhone,
      shippingAddress,
      shippingCity,
      shippingDepartment,
      shippingPostalCode,
      notes
    } = parsed.data

    try {
      // Get cart items
      const cartResult = await pool.query(
        `select ci.id,
                ci.product_id as "productId",
                ci.quantity,
                ci.size,
                ci.color,
                p.name as "productName",
                p.price as "productPrice",
                p.stock as "productStock",
                p.active as "productActive"
         from cart_items ci
         join products p on p.id = ci.product_id
         where ci.user_id = $1`,
        [userId]
      )

      if (cartResult.rows.length === 0) {
        return res.status(400).json({ message: 'Carrito vacío' })
      }

      const cartItems = cartResult.rows

      // Validate stock and calculate total
      let total = 0
      for (const item of cartItems) {
        if (!item.productActive) {
          return res.status(400).json({ message: `Producto ${item.productName} no disponible` })
        }
        if (item.productStock < item.quantity) {
          return res.status(400).json({ message: `Stock insuficiente para ${item.productName}` })
        }
        total += Number(item.productPrice) * item.quantity
      }

      // Begin transaction
      await pool.query('begin')

      try {
        // Create order
        const orderResult = await pool.query(
          `insert into orders(
            user_id, status, total,
            shipping_name, shipping_email, shipping_phone,
            shipping_address, shipping_city, shipping_department,
            shipping_postal_code, notes
          )
          values ($1, 'pending', $2, $3, $4, $5, $6, $7, $8, $9, $10)
          returning id`,
          [
            userId,
            total,
            shippingName,
            shippingEmail,
            shippingPhone,
            shippingAddress,
            shippingCity,
            shippingDepartment,
            shippingPostalCode,
            notes
          ]
        )

        const orderId = orderResult.rows[0].id

        // Create order items and update product stock
        for (const item of cartItems) {
          await pool.query(
            `insert into order_items(
              order_id, product_id, product_name, product_price, quantity, size, color
            )
            values ($1, $2, $3, $4, $5, $6, $7)`,
            [orderId, item.productId, item.productName, item.productPrice, item.quantity, item.size, item.color]
          )

          // Decrease stock
          await pool.query(
            'update products set stock = stock - $1, updated_at = now() where id = $2',
            [item.quantity, item.productId]
          )
        }

        // Clear cart
        await pool.query('delete from cart_items where user_id = $1', [userId])

        await pool.query('commit')

        return res.json({ ok: true, orderId })
      } catch (err) {
        await pool.query('rollback')
        throw err
      }
    } catch (err) {
      console.error('Error creating order:', err)
      return res.status(500).json({ message: 'Error al crear orden' })
    }
  })

  // Get user orders
  router.get('/orders', requireAuth, async (req, res) => {
    const userId = req.user!.sub

    try {
      const r = await pool.query(
        `select id,
                status,
                total,
                shipping_name as "shippingName",
                shipping_email as "shippingEmail",
                shipping_phone as "shippingPhone",
                shipping_address as "shippingAddress",
                shipping_city as "shippingCity",
                shipping_department as "shippingDepartment",
                shipping_postal_code as "shippingPostalCode",
                notes,
                created_at as "createdAt",
                updated_at as "updatedAt"
         from orders
         where user_id = $1
         order by created_at desc`,
        [userId]
      )

      return res.json({ orders: r.rows })
    } catch (err) {
      console.error('Error fetching orders:', err)
      return res.status(500).json({ message: 'Error al obtener órdenes' })
    }
  })

  // Get single order
  router.get('/orders/:id', requireAuth, async (req, res) => {
    const id = req.params.id
    const userId = req.user!.sub

    try {
      const orderResult = await pool.query(
        `select id,
                status,
                total,
                shipping_name as "shippingName",
                shipping_email as "shippingEmail",
                shipping_phone as "shippingPhone",
                shipping_address as "shippingAddress",
                shipping_city as "shippingCity",
                shipping_department as "shippingDepartment",
                shipping_postal_code as "shippingPostalCode",
                notes,
                created_at as "createdAt",
                updated_at as "updatedAt"
         from orders
         where id = $1 and user_id = $2`,
        [id, userId]
      )

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ message: 'Orden no encontrada' })
      }

      const order = orderResult.rows[0]

      // Get order items
      const itemsResult = await pool.query(
        `select id,
                product_id as "productId",
                product_name as "productName",
                product_price as "productPrice",
                quantity,
                size,
                color,
                created_at as "createdAt"
         from order_items
         where order_id = $1`,
        [id]
      )

      return res.json({ order: { ...order, items: itemsResult.rows } })
    } catch (err) {
      console.error('Error fetching order:', err)
      return res.status(500).json({ message: 'Error al obtener orden' })
    }
  })

  // Admin: List all orders
  router.get('/admin/orders', requireRoot, async (req, res) => {
    const parsed = ordersListQuerySchema.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ message: 'Parámetros inválidos' })

    const { status, limit, offset } = parsed.data

    try {
      let query = `
        select o.id,
               o.user_id as "userId",
               u.email as "userEmail",
               o.status,
               o.total,
               o.shipping_name as "shippingName",
               o.shipping_email as "shippingEmail",
               o.shipping_phone as "shippingPhone",
               o.shipping_address as "shippingAddress",
               o.shipping_city as "shippingCity",
               o.shipping_department as "shippingDepartment",
               o.shipping_postal_code as "shippingPostalCode",
               o.notes,
               o.created_at as "createdAt",
               o.updated_at as "updatedAt"
        from orders o
        join users u on u.id = o.user_id
      `
      const params: (string | number)[] = []

      if (status) {
        query += ' where o.status = $1'
        params.push(status)
        query += ` order by o.created_at desc limit $2 offset $3`
        params.push(limit, offset)
      } else {
        query += ` order by o.created_at desc limit $1 offset $2`
        params.push(limit, offset)
      }

      const r = await pool.query(query, params)

      return res.json({ orders: r.rows })
    } catch (err) {
      console.error('Error fetching admin orders:', err)
      return res.status(500).json({ message: 'Error al obtener órdenes' })
    }
  })

  // Admin: Update order status
  router.put('/admin/orders/:id/status', requireRoot, async (req, res) => {
    const id = req.params.id
    const parsed = orderStatusUpdateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Datos inválidos' })

    const { status } = parsed.data

    try {
      const result = await pool.query(
        'update orders set status = $1, updated_at = now() where id = $2 returning id',
        [status, id]
      )

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Orden no encontrada' })
      }

      return res.json({ ok: true })
    } catch (err) {
      console.error('Error updating order status:', err)
      return res.status(500).json({ message: 'Error al actualizar estado' })
    }
  })
}
