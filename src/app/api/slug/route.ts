import { NextResponse } from 'next/server'
import { validarSlug } from '@/lib/slug'
import { slugDisponible, sugerirSlugs } from '@/lib/slug-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Comprobación en tiempo real mientras el usuario escribe (pantalla 0). */
export async function GET(peticion: Request) {
  const { searchParams } = new URL(peticion.url)
  const entrada = searchParams.get('q') ?? ''

  if (entrada.trim().length < 2) {
    return NextResponse.json({ estado: 'vacio' })
  }

  const validacion = validarSlug(entrada)
  if (!validacion.valido) {
    return NextResponse.json({ estado: 'invalido', motivo: validacion.motivo })
  }

  const libre = await slugDisponible(validacion.slug)
  if (libre) {
    return NextResponse.json({ estado: 'libre', slug: validacion.slug })
  }

  const sugerencias = await sugerirSlugs(validacion.slug)
  return NextResponse.json({ estado: 'ocupado', slug: validacion.slug, sugerencias })
}
