# E-commerce API Documentation

## Overview

This API provides a complete e-commerce solution for a clothing store in Uruguay with nationwide shipping support. The implementation follows OWASP security best practices.

## Product Categories

- **calzado** - Footwear
- **pantalones** - Pants
- **remeras** - T-shirts
- **vestidos** - Dresses
- **buzos** - Sweaters
- **ropa_interior** - Underwear

## Public Endpoints

### Get Categories

```
GET /api/catalog/categories
```

Returns all available product categories.

**Response:**
```json
{
  "categories": [
    { "id": "calzado", "name": "Calzado" },
    { "id": "pantalones", "name": "Pantalones" },
    ...
  ]
}
```

### List Products

```
GET /api/catalog/products?category=remeras&featured=true&limit=20&offset=0
```

**Query Parameters:**
- `category` (optional) - Filter by category
- `featured` (optional) - Filter by featured status (boolean)
- `limit` (optional) - Results per page (default: 50, max: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Remera Básica",
      "description": "Remera de algodón 100%",
      "category": "remeras",
      "price": 1250.00,
      "stock": 15,
      "images": ["/uploads/image1.jpg"],
      "sizes": ["S", "M", "L", "XL"],
      "colors": ["Blanco", "Negro", "Azul"],
      "featured": true,
      "createdAt": "2026-01-19T16:00:00Z",
      "updatedAt": "2026-01-19T16:00:00Z"
    }
  ]
}
```

### Get Product Details

```
GET /api/catalog/products/:id
```

**Response:**
```json
{
  "product": {
    "id": "uuid",
    "name": "Remera Básica",
    "description": "Remera de algodón 100%",
    "category": "remeras",
    "price": 1250.00,
    "stock": 15,
    "images": ["/uploads/image1.jpg"],
    "sizes": ["S", "M", "L", "XL"],
    "colors": ["Blanco", "Negro", "Azul"],
    "featured": true,
    "createdAt": "2026-01-19T16:00:00Z",
    "updatedAt": "2026-01-19T16:00:00Z"
  }
}
```

## Authenticated Endpoints (Require Login)

### Get Cart

```
GET /api/cart
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "quantity": 2,
      "size": "M",
      "color": "Azul",
      "productName": "Remera Básica",
      "productDescription": "Remera de algodón 100%",
      "productPrice": 1250.00,
      "productStock": 15,
      "productImages": ["/uploads/image1.jpg"],
      "productActive": true,
      "createdAt": "2026-01-19T16:00:00Z",
      "updatedAt": "2026-01-19T16:00:00Z"
    }
  ],
  "total": 2500.00
}
```

### Add Item to Cart

```
POST /api/cart/items
```

**Request Body:**
```json
{
  "productId": "uuid",
  "quantity": 2,
  "size": "M",
  "color": "Azul"
}
```

**Response:**
```json
{
  "ok": true,
  "id": "uuid"
}
```

### Update Cart Item

```
PUT /api/cart/items/:id
```

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response:**
```json
{
  "ok": true
}
```

### Remove Cart Item

```
DELETE /api/cart/items/:id
```

**Response:**
```json
{
  "ok": true
}
```

### Clear Cart

```
DELETE /api/cart
```

**Response:**
```json
{
  "ok": true
}
```

### Create Order

```
POST /api/orders
```

**Request Body:**
```json
{
  "shippingName": "Juan Pérez",
  "shippingEmail": "juan@example.com",
  "shippingPhone": "099123456",
  "shippingAddress": "Av. 18 de Julio 1234",
  "shippingCity": "Montevideo",
  "shippingDepartment": "Montevideo",
  "shippingPostalCode": "11200",
  "notes": "Entregar en horario de oficina"
}
```

**Response:**
```json
{
  "ok": true,
  "orderId": "uuid"
}
```

**Behavior:**
- Validates stock availability for all items
- Creates order with status "pending"
- Decreases product stock
- Clears the cart
- All operations are executed in a transaction

### List User Orders

```
GET /api/orders
```

**Response:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "status": "pending",
      "total": 2500.00,
      "shippingName": "Juan Pérez",
      "shippingEmail": "juan@example.com",
      "shippingPhone": "099123456",
      "shippingAddress": "Av. 18 de Julio 1234",
      "shippingCity": "Montevideo",
      "shippingDepartment": "Montevideo",
      "shippingPostalCode": "11200",
      "notes": "Entregar en horario de oficina",
      "createdAt": "2026-01-19T16:00:00Z",
      "updatedAt": "2026-01-19T16:00:00Z"
    }
  ]
}
```

### Get Order Details

```
GET /api/orders/:id
```

**Response:**
```json
{
  "order": {
    "id": "uuid",
    "status": "pending",
    "total": 2500.00,
    "shippingName": "Juan Pérez",
    "shippingEmail": "juan@example.com",
    "shippingPhone": "099123456",
    "shippingAddress": "Av. 18 de Julio 1234",
    "shippingCity": "Montevideo",
    "shippingDepartment": "Montevideo",
    "shippingPostalCode": "11200",
    "notes": "Entregar en horario de oficina",
    "createdAt": "2026-01-19T16:00:00Z",
    "updatedAt": "2026-01-19T16:00:00Z",
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "productName": "Remera Básica",
        "productPrice": 1250.00,
        "quantity": 2,
        "size": "M",
        "color": "Azul",
        "createdAt": "2026-01-19T16:00:00Z"
      }
    ]
  }
}
```

## Admin Endpoints (Require Admin/Root Role)

### List All Products (Admin)

```
GET /api/admin/products?category=remeras&featured=true&limit=50&offset=0
```

**Query Parameters:** Same as public catalog, but includes inactive products

**Response:** Same structure as public catalog

### Create Product

```
POST /api/admin/products
```

**Request Body:**
```json
{
  "name": "Remera Básica",
  "description": "Remera de algodón 100%",
  "category": "remeras",
  "price": 1250.00,
  "stock": 15,
  "images": ["/uploads/image1.jpg"],
  "sizes": ["S", "M", "L", "XL"],
  "colors": ["Blanco", "Negro", "Azul"],
  "featured": true,
  "active": true
}
```

**Response:**
```json
{
  "ok": true,
  "id": "uuid"
}
```

### Update Product

```
PUT /api/admin/products/:id
```

**Request Body:** (all fields optional)
```json
{
  "name": "Remera Premium",
  "price": 1500.00,
  "stock": 20,
  "featured": false
}
```

**Response:**
```json
{
  "ok": true
}
```

### Delete Product

```
DELETE /api/admin/products/:id
```

**Response:**
```json
{
  "ok": true,
  "softDeleted": false
}
```

**Behavior:**
- If product has associated orders: soft delete (sets `active = false`)
- If product has no orders: hard delete from database
- Attempts to clean up uploaded images

### List All Orders (Admin)

```
GET /api/admin/orders?status=pending&limit=50&offset=0
```

**Query Parameters:**
- `status` (optional) - Filter by status: pending, confirmed, shipped, delivered, cancelled
- `limit` (optional) - Results per page (default: 50, max: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userEmail": "user@example.com",
      "status": "pending",
      "total": 2500.00,
      "shippingName": "Juan Pérez",
      "shippingEmail": "juan@example.com",
      "shippingPhone": "099123456",
      "shippingAddress": "Av. 18 de Julio 1234",
      "shippingCity": "Montevideo",
      "shippingDepartment": "Montevideo",
      "shippingPostalCode": "11200",
      "notes": "Entregar en horario de oficina",
      "createdAt": "2026-01-19T16:00:00Z",
      "updatedAt": "2026-01-19T16:00:00Z"
    }
  ]
}
```

### Update Order Status

```
PUT /api/admin/orders/:id/status
```

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Valid statuses:** pending, confirmed, shipped, delivered, cancelled

**Response:**
```json
{
  "ok": true
}
```

## Security Features

### OWASP Compliance

1. **Input Validation** - All inputs validated with Zod schemas
2. **SQL Injection Prevention** - Parameterized queries throughout
3. **XSS Prevention** - JSON responses with proper content types
4. **Authentication** - JWT-based authentication for cart and orders
5. **Authorization** - Role-based access control (admin/root for admin endpoints)
6. **Rate Limiting** - 120 requests per minute per IP
7. **Security Headers** - Helmet middleware with CSP, HSTS, etc.
8. **CORS** - Restricted to configured origins
9. **HTTPS Enforcement** - Required in production
10. **Session Security** - HTTP-only cookies for auth tokens

### Stock Management

- Stock is checked before adding to cart
- Stock is validated again when creating order
- Stock is decreased atomically in transaction
- Prevents overselling through database constraints

### Order Integrity

- Orders created in database transaction
- Product details (name, price) stored as snapshots
- Product soft delete when has orders (maintains referential integrity)
- Order items reference original products but preserve order history

## Error Responses

All endpoints return consistent error responses:

```json
{
  "message": "Error description in Spanish"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., duplicate entry)
- `500` - Internal Server Error

## Testing

Run the smoke tests:

```bash
npm run smoke
```

With mutations (creates test data):

```bash
SMOKE_MUTATE=1 npm run smoke
```

The smoke tests verify:
- Catalog endpoints (categories, products)
- Cart operations (add, get, update, delete)
- Order creation and listing
- Admin product management
- Admin order management
