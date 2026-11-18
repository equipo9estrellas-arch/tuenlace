'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SECCIONES = [
  { href: '/admin', nombre: 'Resumen', exacta: true },
  { href: '/admin/cuentas', nombre: 'Cuentas' },
  { href: '/admin/paginas', nombre: 'Páginas' },
  { href: '/admin/denuncias', nombre: 'Denuncias' },
  { href: '/admin/registro', nombre: 'Registro' },
] as const

export function NavAdmin({ denuncias }: { denuncias: number }) {
  const ruta = usePathname()
  return (
    <nav aria-label="Superadmin" className="flex gap-1 overflow-x-auto">
      {SECCIONES.map((s) => {
        const activa = 'exacta' in s ? ruta === s.href : ruta === s.href || ruta.startsWith(`${s.href}/`)
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={activa ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2 text-[14px] font-semibold no-underline ${
              activa
                ? 'bg-[var(--color-tinta)] text-white'
                : 'text-[var(--color-tinta-60)] hover:bg-[var(--color-borde-suave)] hover:text-[var(--color-tinta)]'
            }`}
          >
            {s.nombre}
            {s.href === '/admin/denuncias' && denuncias > 0 && (
              <span className="rounded-full bg-[var(--color-alerta)] px-2 py-0.5 text-[11.5px] font-bold text-white tabular-nums">
                {denuncias}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
