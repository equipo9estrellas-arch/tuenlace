import Link from 'next/link'
import { IconoCandado } from '@/iconos'
import { etapaDe, type Etapa } from '@/lib/crm-etapas'
import { precioEnEuros, siguientePlan } from '@/lib/planes'

/** La etiqueta de color de una etapa. Sirve en servidor y en cliente. */
export function ChipEtapa({ etapa }: { etapa: Etapa }) {
  const e = etapaDe(etapa)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap"
      style={{ background: `${e.color}17`, color: e.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.color }} />
      {e.nombre}
    </span>
  )
}

const FECHA_CORTA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const FECHA_LARGA = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** "hace 3 h", "ayer", "12 nov". Lo reciente en relativo, lo demás con fecha. */
export function cuando(fecha: Date, ahora = new Date()): string {
  const min = Math.floor((ahora.getTime() - fecha.getTime()) / 60_000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  if (h < 48) return 'ayer'
  return fecha.getFullYear() === ahora.getFullYear() ? FECHA_CORTA.format(fecha) : FECHA_LARGA.format(fecha)
}

/** Aviso de función de pago: qué se gana y cuánto cuesta, sin dramatismo. */
export function AvisoPipeline({ plan, texto }: { plan: string; texto: string }) {
  const siguiente = siguientePlan(plan)
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[14px] border-2 border-dashed border-[var(--color-acento)]/50 bg-[#FFF6F2] p-4">
      <span className="text-[var(--color-acento)]">
        <IconoCandado tam={20} />
      </span>
      <p className="min-w-[220px] flex-1 text-[14.5px] leading-[1.5]">{texto}</p>
      {siguiente && (
        <Link
          href="/panel/plan"
          className="rounded-[10px] bg-[var(--color-acento)] px-4 py-2.5 text-[14px] font-semibold text-white no-underline"
        >
          Pasar a {siguiente.nombre} · {precioEnEuros(siguiente.precioMensualCentimos)} + IGIC/mes
        </Link>
      )}
    </div>
  )
}

export function Caja({ titulo, children, accion }: { titulo?: string; children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
      {(titulo || accion) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {titulo && (
            <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">{titulo}</h2>
          )}
          {accion}
        </div>
      )}
      {children}
    </section>
  )
}
