/**
 * APLICADOR DE MIGRACIONES
 *
 * Se ejecuta al arrancar, antes de `next start`, para que el despliegue aplique
 * por sí mismo lo que haya pendiente en drizzle/.
 *
 * Por qué no `drizzle-kit migrate`: drizzle-kit es dependencia de DESARROLLO y
 * puede no existir en la imagen desplegada. Esto usa solo `pg`, que sí es de
 * producción.
 *
 * Usa EXACTAMENTE la misma tabla y el mismo hash que el migrador de Drizzle
 * (drizzle.__drizzle_migrations, sha256 del contenido del fichero), así que los
 * dos son intercambiables: lo que aplique uno, el otro lo da por hecho. Sin eso
 * un `npm run db:migrate` desde tu portátil intentaría aplicarlo todo otra vez.
 *
 * Cada fichero entra en UNA transacción: o se aplica entero o no se aplica.
 *
 * Si falla, avisa muy alto pero NO impide que la aplicación arranque. Es
 * deliberado: el código funciona sin la migración 0001 —está comprobado— y
 * tirar la web entera por un índice sería peor que no tenerlo. Para que un
 * fallo sea bloqueante (en CI, por ejemplo), MIGRACION_ESTRICTA=1.
 */

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const CARPETA = join(RAIZ, 'drizzle')
const ESTRICTA = process.env.MIGRACION_ESTRICTA === '1'

function aviso(...a) {
  console.log('[migrar]', ...a)
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    aviso('No hay DATABASE_URL. No hay nada que migrar.')
    return
  }

  const diario = JSON.parse(await readFile(join(CARPETA, 'meta', '_journal.json'), 'utf8'))
  const entradas = [...diario.entries].sort((a, b) => a.idx - b.idx)
  if (entradas.length === 0) {
    aviso('El diario de migraciones está vacío.')
    return
  }

  const esLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url)
  const cliente = new pg.Client({
    connectionString: url,
    ssl: esLocal
      ? false
      : process.env.DATABASE_CA
        ? { ca: process.env.DATABASE_CA, rejectUnauthorized: true }
        : { rejectUnauthorized: false },
    // Un índice sobre una tabla grande puede tardar; pero si algo se queda
    // colgado, mejor fallar que dejar el arranque bloqueado para siempre.
    statement_timeout: 120_000,
    connectionTimeoutMillis: 15_000,
  })

  await cliente.connect()
  try {
    await cliente.query('CREATE SCHEMA IF NOT EXISTS drizzle')
    await cliente.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )`)

    const { rows } = await cliente.query('SELECT hash FROM drizzle.__drizzle_migrations')
    const aplicadas = new Set(rows.map((r) => r.hash))

    // ── Asentar una base que ya existía ──────────────────────────────────────
    //
    // Producción se creó aplicando 0000 a mano con psql, así que tiene el
    // esquema pero no el registro. Sin esto, el aplicador intentaría crear
    // tablas que ya existen, fallaría en la primera, y 0001 no llegaría nunca.
    //
    // Si no hay NINGÚN registro pero las tablas ya están, damos la primera
    // migración por aplicada sin ejecutarla y seguimos con el resto.
    if (aplicadas.size === 0) {
      const { rows: yaEsta } = await cliente.query(
        "SELECT to_regclass('public.pages') IS NOT NULL AS existe",
      )
      if (yaEsta[0]?.existe) {
        const primera = entradas[0]
        const sqlPrimera = await readFile(join(CARPETA, `${primera.tag}.sql`), 'utf8')
        const hashPrimera = createHash('sha256').update(sqlPrimera).digest('hex')
        await cliente.query(
          'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
          [hashPrimera, primera.when],
        )
        aplicadas.add(hashPrimera)
        aviso(`· ${primera.tag} se da por aplicada: el esquema ya existía en esta base`)
      }
    }

    let nuevas = 0
    for (const entrada of entradas) {
      const ruta = join(CARPETA, `${entrada.tag}.sql`)
      const sql = await readFile(ruta, 'utf8')
      const hash = createHash('sha256').update(sql).digest('hex')

      if (aplicadas.has(hash)) {
        aviso(`· ${entrada.tag} ya estaba aplicada`)
        continue
      }

      const sentencias = sql
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      aviso(`→ aplicando ${entrada.tag} (${sentencias.length} sentencias)`)
      await cliente.query('BEGIN')
      try {
        for (const s of sentencias) await cliente.query(s)
        await cliente.query(
          'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
          [hash, entrada.when],
        )
        await cliente.query('COMMIT')
        nuevas += 1
        aviso(`✓ ${entrada.tag} aplicada`)
      } catch (error) {
        await cliente.query('ROLLBACK')
        throw new Error(`${entrada.tag}: ${error.message}`, { cause: error })
      }
    }

    aviso(nuevas === 0 ? 'Nada pendiente.' : `Listo: ${nuevas} migración(es) aplicada(s).`)
  } finally {
    await cliente.end()
  }
}

main().catch((error) => {
  console.error('\n' + '='.repeat(68))
  console.error('[migrar] LA MIGRACIÓN HA FALLADO Y NO SE HA APLICADO NADA.')
  console.error('[migrar] ' + error.message)
  console.error('[migrar] La aplicación va a arrancar igualmente: el código')
  console.error('[migrar] funciona sin la migración, solo pierde los índices.')
  console.error('[migrar] Revísalo, esto no se arregla solo.')
  console.error('='.repeat(68) + '\n')
  if (ESTRICTA) process.exitCode = 1
})
