import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { exigirSesion } from '@/lib/session'
import { nombreVisible, notasDe, obtenerContacto } from '@/lib/crm'
import { etapaDe, formatoEuros, nombreOrigen } from '@/lib/crm-etapas'
import { limitesDe } from '@/lib/planes'
import { IconoAtras, IconoCorreo, IconoTelefono, IconoWhatsapp } from '@/iconos'
import { AvisoPipeline, Caja, ChipEtapa, cuando } from '../piezas'
import { BotonBorrar, FormImporte, FormNota, SelectorEtapa } from './Controles'

export const metadata: Metadata = { title: 'Contacto', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const FECHA = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Atlantic/Canary',
})

/** Un teléfono escrito a mano → el número que entiende wa.me (con 34 si falta). */
function numeroWhatsapp(telefono: string): string | null {
  let n = telefono.replace(/[^\d+]/g, '')
  if (n.startsWith('+')) n = n.slice(1)
  else if (n.startsWith('00')) n = n.slice(2)
  else if (/^[6789]\d{8}$/.test(n)) n = `34${n}`
  return /^\d{8,15}$/.test(n) ? n : null
}

export default async function FichaContacto({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await exigirSesion()
  const { id } = await params
  const contacto = await obtenerContacto(sesion.orgId, id)
  if (!contacto) notFound()

  const conPipeline = limitesDe(sesion.plan).pipeline
  const notas = conPipeline ? await notasDe(contacto.id) : []
  const wa = contacto.telefono ? numeroWhatsapp(contacto.telefono) : null

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/panel/contactos"
        className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-[var(--color-tinta-60)] no-underline"
      >
        <IconoAtras tam={16} /> Contactos
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-bold tracking-[-0.02em]">{nombreVisible(contacto)}</h1>
          <p className="mt-1 text-[14.5px] text-[var(--color-tinta-60)]">
            Llegó por <strong className="font-semibold">{nombreOrigen(contacto.origen)}</strong>
            {contacto.manual ? ' (añadido a mano)' : ''} · {FECHA.format(contacto.ts)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {contacto.importeCentimos ? (
            <span className="text-[22px] font-bold tabular-nums">{formatoEuros(contacto.importeCentimos)}</span>
          ) : null}
          <ChipEtapa etapa={contacto.etapa} />
        </div>
      </header>

      {!conPipeline && (
        <AvisoPipeline
          plan={sesion.plan}
          texto="Con Esencial puedes mover este contacto por etapas, apuntar lo que te ha pagado y guardar notas de lo que habéis hablado."
        />
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <Caja titulo="Datos">
            <div className="flex flex-wrap gap-2">
              {wa && (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[#25D366] px-4 py-2.5 text-[14.5px] font-semibold text-white no-underline"
                >
                  <IconoWhatsapp tam={17} /> WhatsApp
                </a>
              )}
              {contacto.telefono && (
                <a
                  href={`tel:${contacto.telefono.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-borde)] px-4 py-2.5 text-[14.5px] font-semibold no-underline"
                >
                  <IconoTelefono tam={17} /> Llamar
                </a>
              )}
              {contacto.email && (
                <a
                  href={`mailto:${contacto.email}`}
                  className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-borde)] px-4 py-2.5 text-[14.5px] font-semibold no-underline"
                >
                  <IconoCorreo tam={17} /> Correo
                </a>
              )}
            </div>

            <dl className="mt-4 grid gap-3 text-[14.5px] sm:grid-cols-2">
              <Dato nombre="Nombre" valor={contacto.nombre} />
              <Dato nombre="Teléfono" valor={contacto.telefono} />
              <Dato nombre="Correo" valor={contacto.email} />
              <Dato nombre="Canal" valor={nombreOrigen(contacto.origen)} />
            </dl>

            {contacto.mensaje && (
              <div className="mt-4 rounded-[10px] bg-[var(--color-papel)] p-3.5">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
                  {contacto.manual ? 'Nota inicial' : 'Su mensaje'}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[15px] leading-[1.55]">{contacto.mensaje}</p>
              </div>
            )}
          </Caja>

          {conPipeline && (
            <Caja titulo="Historial">
              <FormNota id={contacto.id} />
              <ol className="mt-5 flex flex-col gap-4 border-l-2 border-[var(--color-borde-suave)] pl-4">
                {notas.map((n) => (
                  <li key={n.id} className="relative">
                    <span
                      className={`absolute top-1.5 -left-[22px] h-2.5 w-2.5 rounded-full border-2 border-white ${
                        n.tipo === 'NOTA' ? 'bg-[var(--color-tinta)]' : 'bg-[var(--color-tinta-40)]'
                      }`}
                    />
                    <p
                      className={
                        n.tipo === 'NOTA'
                          ? 'whitespace-pre-wrap text-[15px] leading-[1.5]'
                          : 'text-[14px] font-medium text-[var(--color-tinta-60)]'
                      }
                    >
                      {n.texto}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--color-tinta-40)]">
                      {cuando(n.ts)}
                      {n.autor ? ` · ${n.autor}` : ''}
                    </p>
                  </li>
                ))}
                <li className="relative">
                  <span className="absolute top-1.5 -left-[22px] h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--color-azul)]" />
                  <p className="text-[14px] font-medium text-[var(--color-tinta-60)]">
                    {contacto.manual ? 'Añadido a mano' : `Llegó desde tu página (${nombreOrigen(contacto.origen)})`}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-[var(--color-tinta-40)]">{cuando(contacto.ts)}</p>
                </li>
              </ol>
            </Caja>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {conPipeline ? (
            <>
              <Caja titulo="Etapa">
                <SelectorEtapa id={contacto.id} actual={contacto.etapa} />
                <p className="mt-3 text-[13px] leading-[1.5] text-[var(--color-tinta-40)]">
                  {etapaDe(contacto.etapa).ayuda}
                </p>
              </Caja>
              <Caja titulo="Importe">
                <FormImporte
                  id={contacto.id}
                  valor={
                    contacto.importeCentimos
                      ? String(contacto.importeCentimos / 100).replace('.', ',')
                      : ''
                  }
                />
                <p className="mt-2.5 text-[12.5px] leading-[1.5] text-[var(--color-tinta-40)]">
                  Cuenta en «euros por canal» cuando el contacto está en Cliente.
                </p>
              </Caja>
            </>
          ) : (
            <Caja titulo="Etapa">
              <ChipEtapa etapa={contacto.etapa} />
            </Caja>
          )}
          <div className="px-1">
            <BotonBorrar id={contacto.id} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-tinta-40)]">{nombre}</dt>
      <dd className="mt-0.5 break-words font-medium">{valor || '—'}</dd>
    </div>
  )
}
