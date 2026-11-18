import type { Metadata } from 'next'
import Link from 'next/link'
import { Marca } from '@/iconos'
import { redirect } from 'next/navigation'
import { entrarConClave } from '@/lib/auth'
import { iniciarSesion, obtenerSesion } from '@/lib/session'
import { Aviso, BOTON, CAMPO } from './Campos'

export const metadata: Metadata = { title: 'Entrar', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const MENSAJES: Record<string, string> = {
  clave: 'El correo o la contraseña no son correctos.',
  caducado: 'Ese enlace ya no vale. Pide uno nuevo.',
  'sin-token': 'El enlace estaba incompleto. Prueba otra vez.',
}

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; clave?: string }>
}) {
  const sesion = await obtenerSesion()
  if (sesion) redirect('/panel')

  const { error, email, clave } = await searchParams

  async function entrar(formulario: FormData) {
    'use server'
    const correo = String(formulario.get('email') ?? '').trim()
    const r = await entrarConClave(correo, String(formulario.get('clave') ?? ''))
    if (!r.ok) redirect(`/entrar?error=clave&email=${encodeURIComponent(correo)}`)
    await iniciarSesion(r.userId)
    redirect('/panel')
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-9" aria-label="tuenlace.es, ir al inicio">
        <Marca alto={26} />
      </Link>

      <h1 className="text-[25px] font-bold leading-tight tracking-[-0.02em]">Entra en tu cuenta</h1>

      {clave === 'lista' && <Aviso tono="bien">Contraseña guardada. Ya puedes entrar con ella.</Aviso>}
      {error && <Aviso tono="error">{MENSAJES[error] ?? 'Algo ha fallado. Inténtalo otra vez.'}</Aviso>}

      <form action={entrar} className="mt-6 flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          autoFocus={!email}
          defaultValue={email ?? ''}
          autoComplete="email"
          placeholder="tu@correo.com"
          aria-label="Correo"
          className={CAMPO}
        />
        <input
          name="clave"
          type="password"
          required
          autoFocus={Boolean(email)}
          autoComplete="current-password"
          placeholder="Contraseña"
          aria-label="Contraseña"
          className={CAMPO}
        />
        <button type="submit" className={BOTON}>
          Entrar
        </button>
      </form>

      <p className="mt-4 text-center text-[14px]">
        <Link href="/entrar/recuperar" className="font-semibold text-[var(--color-azul)]">
          ¿No tienes contraseña o la has olvidado?
        </Link>
      </p>

      <p className="mt-7 text-center text-[14px] text-[var(--color-tinta-60)]">
        ¿Todavía no tienes enlace?{' '}
        <Link href="/crear" className="font-semibold text-[var(--color-azul)]">
          Pruébalo 15 días gratis
        </Link>
      </p>
    </main>
  )
}
