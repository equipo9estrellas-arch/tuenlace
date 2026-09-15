import type { Metadata } from 'next'
import Link from 'next/link'
import { asc, desc, eq } from 'drizzle-orm'
import { blocks, db, pages } from '@/db'
import { exigirSesion } from '@/lib/session'
import { LIMITE_BLOQUES_GRATIS, type TipoBloque } from '@/bloques/registro'
import { normalizarTema } from '@/bloques/tema'
import { capacidades } from '@/lib/env'
import { Editor, type BloqueInicial } from './Editor'

export const metadata: Metadata = { title: 'Editar tu página', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function EditorPagina() {
  const sesion = await exigirSesion()

  const [pagina] = await db
    .select()
    .from(pages)
    .where(eq(pages.orgId, sesion.orgId))
    .orderBy(desc(pages.creadoEn))
    .limit(1)

  if (!pagina) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">No hay ninguna página que editar</h1>
        <Link
          href="/crear"
          className="mt-6 inline-block rounded-[12px] bg-[var(--color-acento)] px-6 py-3.5 text-[16px] font-semibold text-white no-underline"
        >
          Crear mi enlace
        </Link>
      </div>
    )
  }

  const filas = await db
    .select()
    .from(blocks)
    .where(eq(blocks.pageId, pagina.id))
    .orderBy(asc(blocks.orden))

  const bloques: BloqueInicial[] = filas.map((b) => ({
    id: b.id,
    tipo: b.tipo as TipoBloque,
    orden: b.orden,
    activo: b.activo,
    config: b.config,
    esCabecera: Boolean((b.config as { esCabecera?: boolean }).esCabecera),
  }))

  const cabecera = filas.find((b) => (b.config as { esCabecera?: boolean }).esCabecera)

  return (
    <Editor
      pageId={pagina.id}
      slug={pagina.slug}
      titulo={pagina.titulo}
      descripcion={pagina.descripcion ?? ''}
      bloques={bloques}
      limiteBloques={sesion.plan === 'GRATIS' ? LIMITE_BLOQUES_GRATIS : 200}
      plan={sesion.plan}
      marca={{
        avatarUrl: pagina.avatarUrl ?? '',
        portadaUrl: pagina.portadaUrl ?? '',
        etiqueta: ((cabecera?.config ?? {}) as { etiqueta?: string }).etiqueta ?? '',
        tema: normalizarTema(pagina.tema),
      }}
      puedeSubir={capacidades.almacenamiento}
    />
  )
}
