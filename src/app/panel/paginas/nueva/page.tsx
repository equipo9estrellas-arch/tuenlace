import type { Metadata } from 'next'
import Link from 'next/link'
import { exigirSesion } from '@/lib/session'
import { huecosDePaginas } from '@/lib/paginas'
import { Onboarding } from '@/app/crear/Onboarding'

export const metadata: Metadata = { title: 'Nueva página', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function NuevaPagina() {
  const sesion = await exigirSesion()
  const { usadas, limite } = await huecosDePaginas(sesion.orgId)

  if (usadas >= limite) {
    return (
      <div className="mx-auto max-w-[520px] py-16 text-center">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Ya tienes todas las páginas de tu plan</h1>
        <p className="mt-2 text-[15px] text-[var(--color-tinta-60)]">
          Tu plan permite {limite} {limite === 1 ? 'página' : 'páginas'}.
        </p>
        <Link
          href="/panel/paginas"
          className="mt-6 inline-block rounded-[12px] bg-[var(--color-acento)] px-6 py-3.5 text-[16px] font-semibold text-white no-underline"
        >
          Ver tus páginas
        </Link>
      </div>
    )
  }

  return (
    <div className="-mx-5 -my-7 lg:-mx-8">
      <Onboarding slugInicial="" modo="panel" />
    </div>
  )
}
