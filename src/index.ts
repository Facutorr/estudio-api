import { createServer } from './server.js'
import { config } from './config.js'
import { ensureSchema } from './db/migrate.js'

async function main() {
  try {
    await ensureSchema()
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to run schema migration:', e)
    if (config.env === 'production') process.exit(1)
  }

  const app = createServer()
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${config.port}`)
  })
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e)
  process.exit(1)
})
