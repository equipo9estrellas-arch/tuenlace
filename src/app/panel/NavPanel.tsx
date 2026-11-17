'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import {
  IconoCandado,
  IconoColumnas,
  IconoEnlace,
  IconoEuro,
  IconoGente,
  IconoInicio,
} from '@/iconos'

type Props = {
  nuevos: number
  conPipeline: boolean
}

const SECCIONES = [
  { href: '/panel', nombre: 'Inicio', Icono: IconoInicio, exacta: true },
  { href: '/panel/editor', nombre: 'Mi página', Icono: IconoEnlace },
  { href: '/panel/contactos', nombre: 'Contactos', Icono: IconoGente },
  { href: '/panel/pipeline', nombre: 'Pipeline', Icono: IconoColumnas },
  { href: '/panel/plan', nombre: 'Plan', Icono: IconoEuro },
] as const

/**
 * El menú del panel. En escritorio es la barra lateral; en el móvil, una fila
 * de pestañas que se desliza, porque una lateral ocuparía media pantalla.
 */
export function NavPanel({ nuevos, conPipeline }: Props) {
  const ruta = usePathname()
  const activaRef = useRef<HTMLAnchorElement>(null)

  // En el móvil el menú es una fila que se desliza: que la sección en la que
  // estás no se quede fuera de la pantalla.
  useEffect(() => {
    activaRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [ruta])

  return (
    <nav aria-label="Panel" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {SECCIONES.map(({ href, nombre, Icono, ...s }) => {
        const activa = 'exacta' in s && s.exacta ? ruta === href : ruta === href || ruta.startsWith(`${href}/`)
        const bloqueada = href === '/panel/pipeline' && !conPipeline
        return (
          <Link
            key={href}
            href={href}
            ref={activa ? activaRef : undefined}
            aria-current={activa ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[14.5px] font-semibold no-underline transition-colors ${
              activa
                ? 'bg-[var(--color-tinta)] text-white'
                : 'text-[var(--color-tinta-60)] hover:bg-[var(--color-borde-suave)] hover:text-[var(--color-tinta)]'
            }`}
          >
            <Icono tam={18} />
            <span>{nombre}</span>
            {href === '/panel/contactos' && nuevos > 0 && (
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-[11.5px] font-bold tabular-nums ${
                  activa ? 'bg-white/20 text-white' : 'bg-[var(--color-azul)] text-white'
                }`}
                title={`${nuevos} sin contestar`}
              >
                {nuevos}
              </span>
            )}
            {bloqueada && (
              <span className="ml-auto opacity-60" title="Del plan Esencial">
                <IconoCandado tam={14} />
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
