import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Marca } from '@/iconos'
import { solicitarCambioDeClave } from '@/lib/auth'
import { Aviso, BOTON, CAMPO } from '../Campos'

export const metadata: Metadata = { title: 'Crear o cambiar contraseña', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaRecuperar({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; error?: string }>
}) {
  const { enviado, error } = await searchParams

  async function pedir(formulario: FormData) {
    'use server'
    const r = await solicitarCambioDeClave(String(formulario.get('email') ?? ''))
    redirect(r.ok ? '/entrar/recuperar?enviado=1' : '/entrar/recuperar?error=envio')
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-9" aria-label="tuenlace.es, ir al inicio">
        <Marca alto={26} />
      </Link>

      {enviado ? (
        <>
          <h1 className="text-[25px] font-bold leading-tight tracking-[-0.02em]">Mira tu correo</h1>
          <p className="mt-3 text-[15.5px] leading-[1.55] text-[var(--color-tinta-60)]">
            Si hay una cuenta con ese correo, te hemos enviado un enlace para crear tu contraseña.
            Caduca en 30 minutos.
          </p>
          <p className="mt-6 text-[13px] text-[var(--color-tinta-40)]">¿No lo ves? Mira en spam.</p>
        </>
      ) : (
        <>
          <h1 className="text-[25px] font-bold leading-tight tracking-[-0.02em]">
            Crea o cambia tu contraseña
          </h1>
          <p className="mt-2.5 text-[15px] leading-[1.5] text-[var(--color-tinta-60)]">
            Te mandamos un enlace al correo de tu cuenta para que elijas una.
          </p>
          {error && <Aviso tono="error">No hemos podido enviar el correo. Inténtalo otra vez.</Aviso>}
          <form action={pedir} className="mt-6 flex flex-col gap-3">
            <input
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="tu@correo.com"
              aria-label="Correo"
              className={CAMPO}
            />
            <button type="submit" className={BOTON}>
              Enviarme el enlace
            </button>
          </form>
        </>
      )}

      <p className="mt-7 text-center text-[14px]">
        <Link href="/entrar" className="font-semibold text-[var(--color-azul)]">
          ← Volver a entrar
        </Link>
      </p>
    </main>
  )
}
