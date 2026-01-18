import { createServer } from '../dist/server.js'
import { pool } from '../dist/db/pool.js'

function parseSetCookie(line) {
  // "name=value; Path=/; ..."
  const first = String(line).split(';', 1)[0] ?? ''
  const idx = first.indexOf('=')
  if (idx < 0) return null
  const name = first.slice(0, idx).trim()
  const value = decodeURIComponent(first.slice(idx + 1).trim())
  if (!name) return null
  return { name, value }
}

function getSetCookies(headers) {
  // Node/undici: headers.getSetCookie() exists; fall back to single header.
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }
  const one = headers.get('set-cookie')
  return one ? [one] : []
}

async function main() {
  const app = createServer()
  const server = app.listen(0)

  try {
    const mutate = process.env.SMOKE_MUTATE === '1'
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Failed to bind ephemeral port')

    const base = `http://127.0.0.1:${address.port}`
    const jar = new Map()

    const cookieHeader = () => {
      if (jar.size === 0) return ''
      return Array.from(jar.entries())
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('; ')
    }

    const request = async (path, { method = 'GET', json, csrf = false } = {}) => {
      const headers = { Accept: 'application/json' }
      const cookie = cookieHeader()
      if (cookie) headers.Cookie = cookie

      if (csrf) {
        const token = jar.get('csrf')
        if (!token) throw new Error('Missing csrf cookie; cannot send CSRF header')
        headers['X-CSRF-Token'] = token
      }

      let body
      if (json !== undefined) {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(json)
      }

      const res = await fetch(`${base}${path}`, { method, headers, body })

      for (const line of getSetCookies(res.headers)) {
        const parsed = parseSetCookie(line)
        if (parsed) jar.set(parsed.name, parsed.value)
      }

      const text = await res.text()
      const contentType = res.headers.get('content-type') ?? ''
      const data = contentType.includes('application/json') && text ? JSON.parse(text) : text

      return { res, data }
    }

    // 1) Health (also sets CSRF cookie via ensureCsrf)
    {
      const { res, data } = await request('/api/health')
      if (!res.ok || data?.ok !== true) throw new Error(`health failed: ${res.status} ${JSON.stringify(data)}`)
      if (!jar.get('csrf')) throw new Error('health did not set csrf cookie')
      console.log('OK /api/health + csrf cookie')
    }

    // 2) Root login (bootstraps user if users table empty)
    {
      const email = process.env.ADMIN1_EMAIL || 'admin1@example.com'
      const phone = process.env.ADMIN1_PHONE || '098518211'
      const password = process.env.ADMIN1_PASSWORD || 'ChangeMe_Admin1_12345'

      const { res, data } = await request('/api/auth/login', {
        method: 'POST',
        csrf: true,
        json: { email, phone, password }
      })
      if (!res.ok || data?.ok !== true) throw new Error(`login failed: ${res.status} ${JSON.stringify(data)}`)
      if (!jar.get('auth')) throw new Error('login did not set auth cookie')
      console.log('OK /api/auth/login (admin)')
    }

    // 3) Session check
    {
      const { res, data } = await request('/api/auth/me')
      if (!res.ok || data?.authenticated !== true || (data?.user?.role !== 'root' && data?.user?.role !== 'admin')) {
        throw new Error(`auth/me failed: ${res.status} ${JSON.stringify(data)}`)
      }
      console.log('OK /api/auth/me (authenticated admin)')
    }

    // 4) Admin endpoint
    {
      const { res, data } = await request('/api/admin/reports')
      if (!res.ok || !Array.isArray(data?.items)) throw new Error(`admin/reports failed: ${res.status} ${JSON.stringify(data)}`)
      console.log('OK /api/admin/reports')
    }

    if (mutate) {
      // 5) Create a contact message
      {
        const { res, data } = await request('/api/contact', {
          method: 'POST',
          csrf: true,
          json: {
            name: 'Test User',
            email: 'test@example.com',
            phone: '099123456',
            subject: 'consulta',
            message: 'Mensaje de prueba (mínimo 10 chars).',
            acceptPrivacy: true
          }
        })
        if (!res.ok || data?.ok !== true || !data?.id) throw new Error(`contact failed: ${res.status} ${JSON.stringify(data)}`)
        console.log('OK /api/contact (mutating)')
      }

      // 6) Create a report (denuncia)
      {
        const { res, data } = await request('/api/reports', {
          method: 'POST',
          csrf: true,
          json: {
            idType: 'cedula',
            idNumber: '12345678',
            email: 'reporter@example.com',
            celular: '099123456',
            nombre: 'Juan',
            apellido: 'Pérez',
            pais: 'Uruguay',
            departamento: 'Montevideo',
            ciudad: 'Montevideo',
            tipo: 'divorcio',
            costoUyu: 59900,
            details: 'Detalle de prueba.',
            acceptPrivacy: true
          }
        })
        if (!res.ok || data?.ok !== true || !data?.id) throw new Error(`reports failed: ${res.status} ${JSON.stringify(data)}`)
        console.log('OK /api/reports (mutating)')
      }

      // 7) Admin reports should now include at least 1
      {
        const { res, data } = await request('/api/admin/reports')
        if (!res.ok || !Array.isArray(data?.items) || data.items.length < 1) {
          throw new Error(`admin/reports after insert failed: ${res.status} ${JSON.stringify(data)}`)
        }
        console.log('OK /api/admin/reports (after insert)')
      }
    } else {
      console.log('SKIP /api/contact + /api/reports (set SMOKE_MUTATE=1 to write test data)')
    }

    // 8) Public home hero endpoint (configurable carousel)
    {
      const { res, data } = await request('/api/home/hero')
      if (!res.ok || !Array.isArray(data?.items)) throw new Error(`home/hero failed: ${res.status} ${JSON.stringify(data)}`)
      console.log('OK /api/home/hero')
    }

    console.log('SMOKE OK')
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await pool.end().catch(() => {})
  }
}

main().catch((err) => {
  console.error('SMOKE FAILED')
  console.error(err)
  process.exit(1)
})
