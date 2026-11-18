import type { Metadata } from 'next'
import Link from 'next/link'
import { exigirSesion } from '@/lib/session'
import { listarContactos, nombreVisible } from '@/lib/crm'
import { paginaActiva } from '@/lib/paginas'
import { ETAPAS, formatoEuros, type Etapa } from '@/lib/crm-etapas'
import { limitesDe } from '@/lib/planes'
import { IconoMas } from '@/iconos'
import { AvisoPipeline, cuando } from '../contactos/piezas'
import { Tablero, type Tarjeta } from './Tablero'

export const metadata: Metadata = { title: 'Pipeline', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Perdidos de hace más de esto no se pintan: ensucian el tablero sin aportar. */
const DIAS_PERDIDOS_VISIBLES = 30

export default async function PaginaPipeline() {
  const sesion = await exigirSesion()
  const editable = limitesDe(sesion.plan).pipeline
  const { activa } = await paginaActiva(sesion.orgId)
  const contactos = await listarContactos(sesion.orgId, { pageId: activa?.id })

  const limitePerdidos = Date.now() - DIAS_PERDIDOS_VISIBLES * 86_400_000
  const columnas = Object.fromEntries(ETAPAS.map((e) => [e.clave, [] as Tarjeta[]])) as Record<Etapa, Tarjeta[]>
  for (const c of contactos) {
    if (c.etapa === 'PERDIDO' && (c.cerradoEn ?? c.actualizadoEn).getTime() < limitePerdidos) continue
    columnas[c.etapa].push({
      id: c.id,
      nombre: nombreVisible(c),
      detalle: c.telefono || c.email,
      origen: c.origen,
      importeCentimos: c.importeCentimos,
      llego: cuando(c.ts),
    })
  }

  const abiertos = contactos.filter((c) => c.etapa !== 'CLIENTE' && c.etapa !== 'PERDIDO').length
  const ganado = contactos
    .filter((c) => c.etapa === 'CLIENTE')
    .reduce((a, c) => a + (c.importeCentimos ?? 0), 0)

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em]">Pipeline</h1>
          <p className="mt-1 text-[14.5px] text-[var(--color-tinta-60)]">
            {abiertos} {abiertos === 1 ? 'contacto abierto' : 'contactos abiertos'}
            {ganado > 0 && ` · ${formatoEuros(ganado)} en clientes`}
          </p>
        </div>
        {editable && (
          <Link
            href="/panel/contactos/nuevo"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-acento)] px-4 py-2.5 text-[14.5px] font-semibold text-white no-underline"
          >
            <IconoMas tam={16} />
            Añadir contacto
          </Link>
        )}
      </header>

      {editable ? (
        contactos.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-[var(--color-borde)] bg-white px-6 py-10 text-center text-[14.5px] text-[var(--color-tinta-60)]">
            El tablero se llena solo con cada formulario que te envían. Los que te escriben por
            WhatsApp, añádelos con «Añadir contacto».
          </p>
        ) : (
          <Tablero inicial={columnas} editable />
        )
      ) : (
        <>
          <AvisoPipeline
            plan={sesion.plan}
            texto="El pipeline te dice en qué punto está cada contacto (nuevo, contactado, cita, cliente) y cuánto dinero hay en juego. Arrastras y listo."
          />
          <div aria-hidden className="pointer-events-none select-none opacity-60 blur-[2px]">
            <Tablero inicial={columnas} editable={false} />
          </div>
        </>
      )}
    </div>
  )
}
