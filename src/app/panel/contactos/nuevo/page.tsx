import type { Metadata } from 'next'
import Link from 'next/link'
import { exigirSesion } from '@/lib/session'
import { limitesDe } from '@/lib/planes'
import { IconoAtras } from '@/iconos'
import { AvisoPipeline } from '../piezas'
import { FormNuevo } from './FormNuevo'

export const metadata: Metadata = { title: 'Añadir contacto', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function NuevoContacto() {
  const sesion = await exigirSesion()

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      <Link
        href="/panel/contactos"
        className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-[var(--color-tinta-60)] no-underline"
      >
        <IconoAtras tam={16} /> Contactos
      </Link>
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">Añadir contacto</h1>
        <p className="mt-1 text-[14.5px] leading-[1.5] text-[var(--color-tinta-60)]">
          Para los que te escriben por WhatsApp, te llaman o vienen en persona. Así entran en el
          pipeline y en lo que te trae cada canal.
        </p>
      </div>
      {limitesDe(sesion.plan).pipeline ? (
        <FormNuevo />
      ) : (
        <AvisoPipeline plan={sesion.plan} texto="Añadir contactos a mano es parte del pipeline." />
      )}
    </div>
  )
}
