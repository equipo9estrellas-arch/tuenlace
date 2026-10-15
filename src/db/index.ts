import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '@/lib/env'
import * as schema from './schema'

/**
 * Pool único reutilizado entre recargas en caliente de Next.
 * Sin esto, `next dev` abre una conexión nueva en cada cambio y agota
 * el límite de conexiones de Postgres en pocos minutos.
 */
const globalParaDb = globalThis as unknown as { __pool?: Pool }

/** '.includes("localhost")' dejaba fuera 127.0.0.1 y ::1. */
function esLocal(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')
  } catch {
    return false
  }
}

function crearPool(): Pool {
  const p = new Pool({
    connectionString: env.databaseUrl,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Ninguna consulta del producto necesita más de 8 segundos. Antes de agotar
    // el pool, que falle la consulta: un panel lento es un error; el pool
    // bloqueado tumba también todas las páginas públicas.
    statement_timeout: 8_000,
    query_timeout: 9_000,
    idle_in_transaction_session_timeout: 10_000,
    application_name: 'tuenlace',
    // Los Postgres gestionados (Railway, Neon, Supabase) exigen TLS,
    // con certificados que no siempre encadenan a una CA del sistema. Si se
    // aporta la CA en DATABASE_CA, se verifica de verdad.
    ssl: esLocal(env.databaseUrl)
      ? false
      : process.env.DATABASE_CA
        ? { ca: process.env.DATABASE_CA, rejectUnauthorized: true }
        : { rejectUnauthorized: false },
  })

  // SIN ESTE MANEJADOR EL PROCESO MUERE. node-postgres emite 'error' en el pool
  // cuando falla un cliente INACTIVO —un despliegue de Railway, un proxy que
  // cierra conexiones ociosas, un failover—, y un EventEmitter con un 'error'
  // sin escuchador lanza una excepción no capturada que mata Node entero.
  p.on('error', (error) => {
    console.error('[db] Error en un cliente inactivo del pool:', error)
  })

  return p
}

export const pool = globalParaDb.__pool ?? crearPool()
if (!env.esProduccion) globalParaDb.__pool = pool

export const db = drizzle(pool, { schema })

export * from './schema'
export { schema }
