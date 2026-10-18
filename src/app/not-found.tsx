import type { Metadata } from 'next'
import Link from 'next/link'
import { Marca } from '@/iconos'

export const metadata: Metadata = {
  title: 'Ese enlace no existe',
  robots: { index: false, follow: false },
}

/**
 * No existía: un slug inexistente devolvía la pantalla de error en inglés de
 * Next ("404: This page could not be found"), que es lo que veía cualquiera al
 * teclear mal la dirección de un cliente.
 */
export default function NoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Marca alto={26} className="mb-6" />
      <h1 className="text-[23px] font-bold tracking-[-0.02em]">Ese enlace no existe</h1>
      <p className="mt-2 max-w-[34ch] text-[15.5px] leading-relaxed text-[var(--color-tinta-60)]">
        Puede que esté mal escrito, o que su dueño lo haya cambiado. Comprueba la dirección.
      </p>
      <Link
        href="/crear"
        className="mt-7 rounded-[12px] bg-[var(--color-acento)] px-6 py-3.5 text-[16px] font-semibold text-white no-underline"
      >
        Crear mi enlace
      </Link>
    </main>
  )
}
