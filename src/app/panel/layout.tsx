import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cerrarSesion, obtenerSesion } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion()
  if (!sesion) redirect('/entrar')

  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/')
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--color-borde)] bg-white">
        <div className="mx-auto flex w-full max-w-[860px] items-center justify-between px-5 py-3.5">
          <Link href="/panel" className="text-[15px] font-bold no-underline">
            TUENLACE
          </Link>
          <div className="flex items-center gap-4 text-[14px]">
            <span className="hidden text-[var(--color-tinta-40)] sm:inline">{sesion.email}</span>
            <span className="rounded-full border border-[var(--color-borde)] px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-tinta-60)]">
              {sesion.plan}
            </span>
            <form action={salir}>
              <button type="submit" className="font-medium text-[var(--color-tinta-60)] hover:text-[var(--color-tinta)]">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[860px] px-5 py-7">{children}</main>
    </div>
  )
}
