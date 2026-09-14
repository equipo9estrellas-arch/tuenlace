import { NextResponse } from 'next/server'
import { asegurarOrganizacion, verificarToken } from '@/lib/auth'
import { iniciarSesion } from '@/lib/session'
import { publicarDesdeOnboarding } from '@/lib/publicar'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Verificación del enlace mágico.
 *
 * Si el token trae contexto de onboarding, aquí es donde la página se
 * materializa: organización, página y bloques, todo de golpe. El usuario
 * aterriza en el panel con su página ya publicada.
 */
export async function GET(peticion: Request) {
  const { searchParams } = new URL(peticion.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(`${env.appUrl}/entrar?error=sin-token`)
  }

  const resultado = await verificarToken(token)
  if (!resultado.ok) {
    return NextResponse.redirect(`${env.appUrl}/entrar?error=caducado`)
  }

  const orgId = await asegurarOrganizacion(
    resultado.userId,
    resultado.contexto?.titulo ?? undefined,
  )
  await iniciarSesion(resultado.userId)

  if (!resultado.contexto) {
    return NextResponse.redirect(`${env.appUrl}/panel`)
  }

  try {
    const { slug } = await publicarDesdeOnboarding(orgId, resultado.contexto)
    return NextResponse.redirect(`${env.appUrl}/panel?nueva=${encodeURIComponent(slug)}`)
  } catch (error) {
    console.error('[verificar] No se pudo crear la página:', error)
    return NextResponse.redirect(`${env.appUrl}/panel?error=creacion`)
  }
}
