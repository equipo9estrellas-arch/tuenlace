import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { solicitarAcceso } from '@/lib/auth'
import { obtenerSesion } from '@/lib/session'

export const metadata: Metadata = { title: 'Entrar', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const MENSAJES: Record<string, string> = {
  caducado: 'Ese enlace ya no vale. Pide uno nuevo y listo.',
  'sin-token': 'El enlace estaba incompleto. Prueba otra vez.',
}

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; enviado?: string }>
}) {
  const sesion = await obtenerSesion()
  if (sesion) redirect('/panel')

  const { error, enviado } = await searchParams

  async function pedirEnlace(formulario: FormData) {
    'use server'
    const email = String(formulario.get('email') ?? '')
    const resultado = await solicitarAcceso(email)
    redirect(resultado.ok ? '/entrar?enviado=1' : '/entrar?error=envio')
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-9 text-[15px] font-bold no-underline">
        TUENLACE
      </Link>

      {enviado ? (
        <>
          <h1 className="text-[25px] font-bold leading-tight tracking-[-0.02em]">Mira tu correo</h1>
          <p className="mt-3 text-[15.5px] leading-[1.55] text-[var(--color-tinta-60)]">
            Te hemos enviado un enlace para entrar. Caduca en 30 minutos y solo se puede usar una
            vez.
          </p>
          <p className="mt-6 text-[13px] text-[var(--color-tinta-40)]">¿No lo ves? Mira en spam.</p>
        </>
      ) : (
        <>
          <h1 className="text-[25px] font-bold leading-tight tracking-[-0.02em]">Entra en tu cuenta</h1>
          <p className="mt-2.5 text-[15px] leading-[1.5] text-[var(--color-tinta-60)]">
            Sin contraseñas. Te mandamos un enlace y entras.
          </p>

          {error && (
            <p className="mt-5 rounded-[10px] border border-[#F5C6C2] bg-[#FDF0EF] px-3.5 py-2.5 text-[14px] text-[var(--color-alerta)]">
              {MENSAJES[error] ?? 'Algo ha fallado. Inténtalo otra vez.'}
            </p>
          )}

          <form action={pedirEnlace} className="mt-6">
            <input
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="tu@correo.com"
              className="h-[56px] w-full rounded-[12px] border-2 border-[var(--color-borde)] bg-white px-4 text-[16.5px] outline-none focus:border-[var(--color-acento)]"
            />
            <button
              type="submit"
              className="mt-3 h-[56px] w-full rounded-[12px] bg-[var(--color-acento)] text-[16.5px] font-semibold text-white"
            >
              Enviarme el enlace
            </button>
          </form>

          <p className="mt-7 text-center text-[14px] text-[var(--color-tinta-60)]">
            ¿Todavía no tienes enlace?{' '}
            <Link href="/crear" className="font-semibold text-[var(--color-azul)]">
              Créalo gratis
            </Link>
          </p>
        </>
      )}
    </main>
  )
}
