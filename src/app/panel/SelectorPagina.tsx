'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { elegirPagina } from './paginas/acciones'

type Pagina = { id: string; slug: string; titulo: string }

/**
 * El selector de página del menú lateral (plan Agencia). Con una sola página
 * y sin hueco para más no se enseña.
 */
export function SelectorPagina({
  paginas,
  activaId,
  puedeCrear,
}: {
  paginas: Pagina[]
  activaId: string | null
  puedeCrear: boolean
}) {
  const ruta = usePathname()
  const activa = paginas.find((p) => p.id === activaId) ?? paginas[0]
  if (!activa || (paginas.length <= 1 && !puedeCrear)) return null
  // Al cambiar desde el detalle de un contacto se vuelve a la lista: ese
  // contacto es de la otra página.
  const destino = ruta.startsWith('/panel/contactos') ? '/panel/contactos' : ruta

  return (
    <details className="group relative lg:mx-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-[10px] border border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-2 text-[13.5px] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
            Página
          </span>
          <span className="block truncate font-semibold">{activa.titulo}</span>
        </span>
        <span aria-hidden className="text-[var(--color-tinta-40)] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="absolute left-0 right-0 z-30 mt-1 max-h-[60vh] overflow-y-auto rounded-[10px] border border-[var(--color-borde)] bg-white p-1 shadow-lg">
        {paginas.map((p) => (
          <form key={p.id} action={elegirPagina.bind(null, p.id, destino)}>
            <button
              type="submit"
              className={`flex w-full flex-col items-start rounded-[8px] px-2.5 py-2 text-left hover:bg-[var(--color-papel)] ${
                p.id === activa.id ? 'bg-[var(--color-borde-suave)]' : ''
              }`}
            >
              <span className="w-full truncate text-[13.5px] font-semibold">{p.titulo}</span>
              <span className="w-full truncate text-[12px] text-[var(--color-tinta-40)]">/{p.slug}</span>
            </button>
          </form>
        ))}
        <div className="mt-1 border-t border-[var(--color-borde-suave)] pt-1">
          <Link
            href="/panel/paginas"
            className="block rounded-[8px] px-2.5 py-2 text-[13px] font-semibold text-[var(--color-tinta-60)] no-underline hover:bg-[var(--color-papel)]"
          >
            Gestionar páginas
          </Link>
          {puedeCrear && (
            <Link
              href="/panel/paginas/nueva"
              className="block rounded-[8px] px-2.5 py-2 text-[13px] font-semibold text-[var(--color-azul)] no-underline hover:bg-[var(--color-papel)]"
            >
              + Nueva página
            </Link>
          )}
        </div>
      </div>
    </details>
  )
}
