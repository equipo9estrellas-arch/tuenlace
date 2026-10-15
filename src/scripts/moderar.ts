/**
 * MODERACIÓN DESDE LA CONSOLA
 *
 * Hasta ahora una suspensión era irreversible: /api/denunciar escribía
 * estado = 'SUSPENDIDA' y no existía ni una ruta ni una acción que lo
 * deshiciera. Los valores REVISADA y DESESTIMADA del enum de denuncias no los
 * usaba nadie.
 *
 * Esto es deliberadamente un script y no una pantalla web: la moderación la
 * hace una sola persona y una ruta de administración en producción es
 * superficie de ataque nueva que todavía no hace falta.
 *
 *   npm run moderar                      → cola de revisión pendiente
 *   npm run moderar -- ver <slug>        → ficha de una página con sus denuncias
 *   npm run moderar -- suspender <slug> "motivo"
 *   npm run moderar -- restaurar <slug>  → vuelve a PUBLICADA y cierra las denuncias
 */

import { and, desc, eq, sql } from 'drizzle-orm'
import { db, pages, pool, reports } from '../db'

type Accion = 'cola' | 'ver' | 'suspender' | 'restaurar'

async function cola() {
  const filas = await db
    .select({
      slug: pages.slug,
      titulo: pages.titulo,
      estado: pages.estado,
      creadoEn: pages.creadoEn,
      denuncias: sql<number>`(
        select count(distinct ${reports.ipHash})::int
        from ${reports} where ${reports.pageId} = ${pages.id}
      )`,
    })
    .from(pages)
    .where(eq(pages.revisionPendiente, true))
    .orderBy(desc(pages.creadoEn))
    .limit(100)

  if (filas.length === 0) {
    console.log('\nNada pendiente de revisar.\n')
    return
  }

  console.log(`\n${filas.length} página(s) pendientes de revisión:\n`)
  for (const f of filas) {
    console.log(
      `  ${f.estado.padEnd(11)} ${f.slug.padEnd(28)} ${String(f.denuncias).padStart(2)} denuncia(s)  ${f.titulo}`,
    )
  }
  console.log('\nDetalle:  npm run moderar -- ver <slug>\n')
}

async function ver(slug: string) {
  const [pagina] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1)
  if (!pagina) return console.log(`\nNo existe ninguna página con el slug "${slug}".\n`)

  console.log(`\n${pagina.titulo}  ·  /${pagina.slug}`)
  console.log(`Estado: ${pagina.estado}${pagina.motivoSuspension ? ` — ${pagina.motivoSuspension}` : ''}`)
  console.log(`Revisión pendiente: ${pagina.revisionPendiente ? 'sí' : 'no'}`)

  const denuncias = await db
    .select()
    .from(reports)
    .where(eq(reports.pageId, pagina.id))
    .orderBy(desc(reports.creadoEn))

  console.log(`\n${denuncias.length} denuncia(s):`)
  for (const d of denuncias) {
    console.log(`  · [${d.estado}] ${d.motivo}${d.detalle ? ` — ${d.detalle}` : ''}`)
  }
  console.log()
}

async function suspender(slug: string, motivo: string) {
  const [pagina] = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug)).limit(1)
  if (!pagina) return console.log(`\nNo existe ninguna página con el slug "${slug}".\n`)

  await db
    .update(pages)
    .set({
      estado: 'SUSPENDIDA',
      motivoSuspension: motivo || 'Revisión manual',
      revisionPendiente: false,
      revisadaEn: new Date(),
    })
    .where(eq(pages.id, pagina.id))

  await db
    .update(reports)
    .set({ estado: 'REVISADA', revisadoEn: new Date() })
    .where(and(eq(reports.pageId, pagina.id), eq(reports.estado, 'ABIERTA')))

  console.log(`\n/${slug} suspendida.\n`)
}

async function restaurar(slug: string) {
  const [pagina] = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug)).limit(1)
  if (!pagina) return console.log(`\nNo existe ninguna página con el slug "${slug}".\n`)

  await db
    .update(pages)
    .set({
      estado: 'PUBLICADA',
      motivoSuspension: null,
      revisionPendiente: false,
      revisadaEn: new Date(),
    })
    .where(eq(pages.id, pagina.id))

  // Las denuncias se cierran como desestimadas: si no, la siguiente denuncia
  // vuelve a sumar sobre las antiguas y la página cae otra vez sola.
  await db
    .update(reports)
    .set({ estado: 'DESESTIMADA', revisadoEn: new Date() })
    .where(and(eq(reports.pageId, pagina.id), eq(reports.estado, 'ABIERTA')))

  console.log(`\n/${slug} restaurada y publicada. Denuncias anteriores desestimadas.\n`)
}

async function main() {
  const [accion = 'cola', slug, ...resto] = process.argv.slice(2) as [Accion, string, ...string[]]

  if (accion !== 'cola' && !slug) {
    console.log('\nFalta el slug. Ejemplo: npm run moderar -- restaurar mi-peluqueria\n')
    return
  }

  if (accion === 'cola') return cola()
  if (accion === 'ver') return ver(slug)
  if (accion === 'suspender') return suspender(slug, resto.join(' '))
  if (accion === 'restaurar') return restaurar(slug)

  console.log(`\nAcción desconocida: ${accion}. Usa cola, ver, suspender o restaurar.\n`)
}

main()
  .catch((error) => {
    console.error('\nError:', error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
