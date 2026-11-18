import Link from 'next/link'
import { Marca } from '@/iconos'
import { redirect } from 'next/navigation'
import { cerrarSesion, obtenerSesion } from '@/lib/session'
import { contarPorEtapa } from '@/lib/crm'
import { limitesDe, planDe } from '@/lib/planes'
import { esSuperadmin } from '@/lib/admin'
import { volverAMiCuenta } from '@/app/admin/acciones'
import { NavPanel } from './NavPanel'
import { SelectorPagina } from './SelectorPagina'
import { paginaActiva } from '@/lib/paginas'

export const dynamic = 'force-dynamic'

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion()
  if (!sesion) redirect('/entrar')

  const { activa, todas } = await paginaActiva(sesion.orgId)
  const porEtapa = await contarPorEtapa(sesion.orgId, activa?.id)
  const limitePaginas = limitesDe(sesion.plan).paginas

  async function salir() {
    'use server'
    // Dentro de una cuenta ajena, "Salir" es volver a la propia: cerrar sin
    // más dejaría al superadmin fuera y la cookie guardada huérfana.
    const actual = await obtenerSesion()
    if (actual?.suplantadoPor) return volverAMiCuenta()
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

          <SelectorPagina
            paginas={todas.map((p) => ({ id: p.id, slug: p.slug, titulo: p.titulo }))}
            activaId={activa?.id ?? null}
            puedeCrear={todas.length < limitePaginas}
          />

          <NavPanel nuevos={porEtapa.NUEVO} conPipeline={limitesDe(sesion.plan).pipeline} />

          {esSuperadmin(sesion.email) && !sesion.suplantadoPor && (
            <Link
              href="/admin"
              className="hidden rounded-[10px] px-3 py-2 text-[13.5px] font-semibold text-[var(--color-tinta-60)] no-underline hover:text-[var(--color-tinta)] lg:block"
            >
              Superadmin →
            </Link>
          )}

          <div className="mt-auto hidden flex-col gap-2 border-t border-[var(--color-borde-suave)] px-2 pt-4 lg:flex">
            <p className="truncate text-[13px] font-semibold">{sesion.orgNombre}</p>
            <p className="truncate text-[12.5px] text-[var(--color-tinta-40)]">{sesion.email}</p>
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-[var(--color-borde)] px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-60)]">
                {sesion.enPrueba ? 'Prueba' : sesion.sinPlan ? 'Sin plan' : planDe(sesion.plan).nombre}
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

      <main className="mx-auto w-full max-w-[1120px] px-5 py-7 lg:px-8">
        {sesion.suplantadoPor && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border-2 border-[var(--color-alerta)] bg-[#FDF3F2] px-4 py-3">
            <p className="text-[14.5px]">
              Estás viendo la cuenta de <strong>{sesion.email}</strong> como superadmin
              {sesion.suplantadoDesdeCentral ? ' (desde Gestiona-lo)' : ''}. Lo que cambies aquí lo
              cambias de verdad.
            </p>
            <form action={volverAMiCuenta}>
              <button
                type="submit"
                className="rounded-[10px] bg-[var(--color-alerta)] px-4 py-2 text-[14px] font-semibold text-white"
              >
                {sesion.suplantadoDesdeCentral ? 'Salir de esta cuenta' : 'Volver a mi cuenta'}
              </button>
            </form>
          </div>
        )}
        {sesion.enPrueba && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--color-borde)] bg-white px-4 py-3">
            <p className="text-[14.5px]">
              {sesion.diasPrueba <= 1
                ? 'Tu prueba gratis termina hoy.'
                : `Te quedan ${sesion.diasPrueba} días de prueba gratis.`}{' '}
              <span className="text-[var(--color-tinta-60)]">
                Tienes todo lo de Esencial mientras tanto.
              </span>
            </p>
            <Link
              href="/panel/plan"
              className="rounded-[10px] bg-[var(--color-acento)] px-4 py-2 text-[14px] font-semibold text-white no-underline"
            >
              Activar mi plan
            </Link>
          </div>
        )}
        {sesion.sinPlan && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border-2 border-[var(--color-alerta)] bg-[#FDF3F2] px-4 py-3">
            <p className="text-[14.5px]">
              <strong>Tu página no se ve.</strong> La prueba ha terminado; tu página y tus contactos
              siguen guardados y vuelven en cuanto actives un plan.
            </p>
            <Link
              href="/panel/plan"
              className="rounded-[10px] bg-[var(--color-alerta)] px-4 py-2 text-[14px] font-semibold text-white no-underline"
            >
              Activar mi plan
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
