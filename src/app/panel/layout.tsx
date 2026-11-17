import Link from 'next/link'
import { Marca } from '@/iconos'
import { redirect } from 'next/navigation'
import { cerrarSesion, obtenerSesion } from '@/lib/session'
import { contarPorEtapa } from '@/lib/crm'
import { limitesDe, planDe } from '@/lib/planes'
import { NavPanel } from './NavPanel'

export const dynamic = 'force-dynamic'

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion()
  if (!sesion) redirect('/entrar')

  const porEtapa = await contarPorEtapa(sesion.orgId)

  async function salir() {
    'use server'
    await cerrarSesion()
    redirect('/')
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 z-20 border-b border-[var(--color-borde)] bg-white lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-3 px-4 py-3 lg:gap-6 lg:px-3 lg:py-5">
          <div className="flex items-center justify-between lg:px-2">
            <Link href="/panel" aria-label="tuenlace.es, ir al panel">
              <Marca alto={22} />
            </Link>
            <form action={salir} className="lg:hidden">
              <button type="submit" className="text-[14px] font-medium text-[var(--color-tinta-60)]">
                Salir
              </button>
            </form>
          </div>

          <NavPanel nuevos={porEtapa.NUEVO} conPipeline={limitesDe(sesion.plan).pipeline} />

          <div className="mt-auto hidden flex-col gap-2 border-t border-[var(--color-borde-suave)] px-2 pt-4 lg:flex">
            <p className="truncate text-[13px] font-semibold">{sesion.orgNombre}</p>
            <p className="truncate text-[12.5px] text-[var(--color-tinta-40)]">{sesion.email}</p>
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-[var(--color-borde)] px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-60)]">
                {planDe(sesion.plan).nombre}
              </span>
              <form action={salir}>
                <button
                  type="submit"
                  className="text-[13px] font-medium text-[var(--color-tinta-60)] hover:text-[var(--color-tinta)]"
                >
                  Salir
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-[1120px] px-5 py-7 lg:px-8">{children}</main>
    </div>
  )
}
