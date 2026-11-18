import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Marca } from '@/iconos'
import { cambiarClaveConEnlace, enlaceDeClaveValido } from '@/lib/auth'
import { MIN_CLAVE, huellaDeClave, validarClave } from '@/lib/clave'
import { iniciarSesion } from '@/lib/session'
import { Aviso, BOTON, CAMPO } from '../Campos'

export const metadata: Metadata = { title: 'Nueva contraseña', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * Elegir contraseña desde el enlace del correo. Abrir la página NO consume el
 * enlace (los antivirus del correo abren los enlaces para revisarlos); se
 * consume al guardar.
 */
export default async function PaginaNuevaClave({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token = '', error } = await searchParams
  const valido = token ? await enlaceDeClaveValido(token) : false

  async function guardar(formulario: FormData) {
    'use server'
    const t = String(formulario.get('token') ?? '')
    const clave = String(formulario.get('clave') ?? '')
    const repetida = String(formulario.get('repetida') ?? '')
    const volver = (e: string) => redirect(`/entrar/nueva-clave?token=${encodeURIComponent(t)}&error=${e}`)
    if (validarClave(clave)) volver('corta')
    if (clave !== repetida) volver('distintas')
    const r = await cambiarClaveConEnlace(t, await huellaDeClave(clave))
    if (!r.ok) volver('caducado')
    else {
      await iniciarSesion(r.userId)
      redirect('/panel')
    }
  }

  const MENSAJES: Record<string, string> = {
    corta: `La contraseña tiene que tener al menos ${MIN_CLAVE} caracteres.`,
    distintas: 'Las dos contraseñas no coinciden.',
    caducado: 'Este enlace ya no vale. Pide uno nuevo.',
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-9" aria-label="tuenlace.es, ir al inicio">
        <Marca alto={26} />
      </Link>

      {!valido ? (
        <>
          <h1 className="text-[25px] font-bold leading-tight tracking-[-0.02em]">Este enlace ya no vale</h1>
          <p className="mt-3 text-[15.5px] leading-[1.55] text-[var(--color-tinta-60)]">
            Caduca a los 30 minutos y solo se puede usar una vez.
          </p>
          <Link href="/entrar/recuperar" className={`${BOTON} mt-6 flex items-center justify-center no-underline`}>
            Pedir uno nuevo
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-[25px] font-bold leading-tight tracking-[-0.02em]">Elige tu contraseña</h1>
          <p className="mt-2.5 text-[15px] leading-[1.5] text-[var(--color-tinta-60)]">
            Al menos {MIN_CLAVE} caracteres. Con ella entrarás a partir de ahora.
          </p>
          {error && <Aviso tono="error">{MENSAJES[error] ?? 'Algo ha fallado. Inténtalo otra vez.'}</Aviso>}
          <form action={guardar} className="mt-6 flex flex-col gap-3">
            <input type="hidden" name="token" value={token} />
            <input
              name="clave"
              type="password"
              required
              minLength={MIN_CLAVE}
              autoFocus
              autoComplete="new-password"
              placeholder="Contraseña nueva"
              aria-label="Contraseña nueva"
              className={CAMPO}
            />
            <input
              name="repetida"
              type="password"
              required
              minLength={MIN_CLAVE}
              autoComplete="new-password"
              placeholder="Repítela"
              aria-label="Repite la contraseña"
              className={CAMPO}
            />
            <button type="submit" className={BOTON}>
              Guardar y entrar
            </button>
          </form>
        </>
      )}
    </main>
  )
}
