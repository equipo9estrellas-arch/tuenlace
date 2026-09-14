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

function crearPool(): Pool {
  return new Pool({
    connectionString: env.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Los Postgres gestionados (Railway, Neon, Supabase) exigen TLS,
    // con certificados que no siempre encadenan a una CA del sistema.
    ssl: env.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  })
}

export const pool = globalParaDb.__pool ?? crearPool()
if (!env.esProduccion) globalParaDb.__pool = pool

export const db = drizzle(pool, { schema })

export * from './schema'
export { schema }
