import type { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../db/pool.js'
import { config } from '../config.js'
import { loginSchema } from '../validation.js'

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

async function ensureAdminUsers() {
  const admins = [config.admin1, config.admin2].filter(Boolean) as Array<{
    email: string
    phone: string
    password: string
  }>

  for (const a of admins) {
    const phone = normalizePhone(a.phone)
    if (!a.email || !phone || !a.password) continue
    const hash = await bcrypt.hash(a.password, 12)
    // Create if missing. If the user exists, only fill phone when empty.
    await pool.query(
      `insert into users(email, phone, password_hash, role)
       values ($1,$2,$3,$4)
       on conflict (email) do update
       set phone = case when users.phone is null or users.phone = '' then excluded.phone else users.phone end`,
      [a.email, phone, hash, 'admin']
    )
  }
}

async function ensureRootUser() {
  const email = (config.rootEmail ?? '').trim()
  const password = config.rootPassword ?? ''
  if (!email || !password) return

  const hash = await bcrypt.hash(password, 12)
  await pool.query(
    `insert into users(email, phone, password_hash, role)
     values ($1,$2,$3,$4)
     on conflict (email) do update
     set password_hash = excluded.password_hash,
         role = excluded.role`,
    [email, '', hash, 'root']
  )
}

function setCookie(res: any, name: string, value: string) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict'
  ]
  // En producción: agregar Secure.
  res.append('Set-Cookie', parts.join('; '))
}

function clearCookie(res: any, name: string) {
  res.append('Set-Cookie', `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`)
}

export function registerAuthRoutes(router: Router) {
  // Auth/session info (para UI). No requiere CSRF porque es GET.
  router.get('/auth/me', (req, res) => {
    const user = (req as any).user as { email: string; role: 'root' | 'admin' | 'user' } | undefined
    if (!user) return res.json({ authenticated: false })
    return res.json({ authenticated: true, user: { email: user.email, role: user.role } })
  })

  router.post('/auth/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      try {
        await pool.query(
          'insert into auth_audit(email, ip, user_agent, success) values ($1,$2,$3,$4)',
          [String((req.body as any)?.email ?? ''), req.ip ?? '', String(req.headers['user-agent'] ?? ''), false]
        )
      } catch {
        // ignore
      }
      return res.status(400).json({ message: 'Datos inválidos' })
    }

    const { email, password, phone } = parsed.data

    // Ensure configured root/admin users exist (idempotent).
    try {
      await ensureRootUser()
      await ensureAdminUsers()
    } catch {
      // ignore bootstrap errors
    }

    const r = await pool.query(
      'select id, email, phone, password_hash, role from users where email = $1 limit 1',
      [email]
    )
    const user = r.rows[0]
    if (!user) {
      try {
        await pool.query(
          'insert into auth_audit(email, ip, user_agent, success) values ($1,$2,$3,$4)',
          [email, req.ip ?? '', String(req.headers['user-agent'] ?? ''), false]
        )
      } catch {
        // ignore
      }
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      try {
        await pool.query(
          'insert into auth_audit(email, ip, user_agent, success) values ($1,$2,$3,$4)',
          [email, req.ip ?? '', String(req.headers['user-agent'] ?? ''), false]
        )
      } catch {
        // ignore
      }
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    // Root users don't need phone verification
    // Admins: enforce phone when configured
    if (user.role !== 'root') {
      const expectedPhone = normalizePhone(String(user.phone ?? ''))
      const providedPhone = normalizePhone(phone ?? '')
      
      if (!expectedPhone || expectedPhone !== providedPhone) {
        try {
          await pool.query(
            'insert into auth_audit(email, ip, user_agent, success) values ($1,$2,$3,$4)',
            [email, req.ip ?? '', String(req.headers['user-agent'] ?? ''), false]
          )
        } catch {
          // ignore
        }
        return res.status(401).json({ message: 'Credenciales inválidas' })
      }
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { issuer: config.jwtIssuer, expiresIn: '8h' }
    )

    setCookie(res, config.cookieName, token)

    try {
      await pool.query(
        'insert into auth_audit(email, ip, user_agent, success) values ($1,$2,$3,$4)',
        [email, req.ip ?? '', String(req.headers['user-agent'] ?? ''), true]
      )
    } catch {
      // ignore
    }

    return res.json({ ok: true })
  })

  router.post('/auth/logout', async (_req, res) => {
    clearCookie(res, config.cookieName)
    return res.json({ ok: true })
  })
}
