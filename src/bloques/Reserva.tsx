'use client'

import { useEffect, useMemo, useState } from 'react'
import { diaCorto, diasReservables, type Hueco } from './reservas'
import type { ConfigReserva } from './tipos'

type Props = {
  bloqueId: string
  paginaId: string
  config: ConfigReserva
  /** El origen que calculó la página: se manda con la reserva. */
  origen?: string
  prioridad: number
}

type Hecha = { cuando: string; enlaceGoogle: string; ics: string }

/**
 * El calendario de reservas que ve el visitante: día → hora → datos → hecho.
 * Al terminar, el botón para meter la cita en SU Google Calendar y el .ics
 * para iPhone y Outlook.
 */
export function Reserva({ bloqueId, paginaId, config, origen, prioridad }: Props) {
  // Los días dependen de la hora actual: se calculan en el navegador para no
  // pintar en el servidor un «hoy» que ya no lo es.
  const [dias, setDias] = useState<string[] | null>(null)
  const [dia, setDia] = useState<string | null>(null)
  const [huecos, setHuecos] = useState<Hueco[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [hueco, setHueco] = useState<Hueco | null>(null)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [hecha, setHecha] = useState<Hecha | null>(null)

  useEffect(() => {
    const lista = diasReservables(config)
    setDias(lista)
    if (lista[0]) setDia(lista[0])
  }, [config])

  useEffect(() => {
    if (!dia) return
    let vigente = true
    setCargando(true)
    setHueco(null)
    setError('')
    fetch(`/api/reservas/huecos?b=${encodeURIComponent(bloqueId)}&p=${encodeURIComponent(paginaId)}&f=${dia}`)
      .then(async (r) => {
        if (r.status === 404) throw new Error('previa')
        const j = (await r.json()) as { huecos?: Hueco[] }
        if (vigente) setHuecos(j.huecos ?? [])
      })
      .catch((e: Error) => {
        if (!vigente) return
        setHuecos([])
        setError(
          e.message === 'previa'
            ? 'Las reservas funcionan en la página publicada.'
            : 'No hemos podido cargar las horas. Prueba otra vez.',
        )
      })
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [dia, bloqueId, paginaId])

  const urlIcs = useMemo(
    () => (hecha ? `data:text/calendar;charset=utf-8,${encodeURIComponent(hecha.ics)}` : ''),
    [hecha],
  )

  async function enviar(formulario: FormData) {
    if (!hueco) return
    setEnviando(true)
    setError('')
    try {
      const r = await fetch('/api/reservas/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloqueId,
          paginaId,
          inicio: hueco.inicio,
          nombre: formulario.get('nombre'),
          telefono: formulario.get('telefono'),
          email: formulario.get('email'),
          nota: formulario.get('nota'),
          web: formulario.get('web'),
          origen,
        }),
      })
      const j = (await r.json().catch(() => ({}))) as Partial<Hecha> & { ok?: boolean; error?: string; codigo?: string }
      if (!r.ok || !j.ok) {
        setError(j.error ?? 'No se ha podido reservar. Inténtalo otra vez.')
        if (j.codigo === 'ocupado' && dia) {
          // La hora se ha ido: se recargan las horas de ese día.
          setHueco(null)
          setDia(null)
          setTimeout(() => setDia(dia), 0)
        }
        return
      }
      setHecha({ cuando: j.cuando ?? '', enlaceGoogle: j.enlaceGoogle ?? '', ics: j.ics ?? '' })
      // Para el píxel y la analítica de la página: una conversión de cita.
      window.dispatchEvent(new CustomEvent('te:conversion', { detail: { tipo: 'CITA', bloqueId } }))
    } catch {
      setError('No hay conexión. Inténtalo otra vez.')
    } finally {
      setEnviando(false)
    }
  }

  if (hecha) {
    return (
      <div className="te-tarjeta te-reserva p-5 text-center" data-tipo="RESERVA">
        <p className="te-titulo te-titulo-2">{config.textoExito || '¡Reservado! Te esperamos.'}</p>
        <p className="te-parrafo mt-1.5">
          {config.servicio} · {hecha.cuando}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <a href={hecha.enlaceGoogle} target="_blank" rel="noopener noreferrer" className="te-boton" data-prioridad="1">
            Añadir a mi Google Calendar
          </a>
          <a href={urlIcs} download="cita.ics" className="te-boton">
            Añadir al calendario del iPhone u Outlook
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="te-tarjeta te-reserva p-5" data-tipo="RESERVA" data-bloque={bloqueId}>
      <p className="te-titulo te-titulo-2 text-center">{config.texto}</p>
      {config.servicio && <p className="te-menudo mt-1 text-center">{config.servicio} · {config.duracion} min</p>}

      {dias === null ? (
        <p className="te-menudo mt-4 text-center">Cargando días…</p>
      ) : dias.length === 0 ? (
        <p className="te-parrafo mt-4 text-center">Ahora mismo no hay días libres para reservar.</p>
      ) : (
        <>
          <div className="te-reserva-dias mt-4" role="listbox" aria-label="Elige día">
            {dias.map((f) => {
              const d = diaCorto(f)
              return (
                <button
                  key={f}
                  type="button"
                  role="option"
                  aria-selected={f === dia}
                  data-activo={f === dia ? 'si' : 'no'}
                  onClick={() => setDia(f)}
                >
                  <span className="te-reserva-semana">{d.semana}</span>
                  <span className="te-reserva-numero">{d.dia}</span>
                  <span className="te-reserva-semana">{d.mes}</span>
                </button>
              )
            })}
          </div>

          <div className="te-reserva-horas mt-3" role="listbox" aria-label="Elige hora">
            {cargando || huecos === null ? (
              <p className="te-menudo col-span-full py-2 text-center">Buscando horas…</p>
            ) : huecos.length === 0 ? (
              <p className="te-menudo col-span-full py-2 text-center">{error || 'Este día ya no quedan horas.'}</p>
            ) : (
              huecos.map((h) => (
                <button
                  key={h.inicio}
                  type="button"
                  role="option"
                  aria-selected={hueco?.inicio === h.inicio}
                  data-activo={hueco?.inicio === h.inicio ? 'si' : 'no'}
                  onClick={() => setHueco(h)}
                >
                  {h.etiqueta}
                </button>
              ))
            )}
          </div>
        </>
      )}

      {hueco && (
        <form action={enviar} className="mt-4 flex flex-col gap-2">
          <input name="nombre" required autoComplete="name" placeholder="Tu nombre" className="te-campo" />
          <input name="telefono" type="tel" autoComplete="tel" placeholder="Tu teléfono" className="te-campo" />
          <input name="email" type="email" autoComplete="email" placeholder="Tu correo (te mandamos la cita)" className="te-campo" />
          <textarea name="nota" rows={2} placeholder="¿Algo que debamos saber? (opcional)" className="te-campo" />
          <input type="text" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" />
          {error && <p className="te-menudo text-center" role="alert">{error}</p>}
          <button type="submit" className="te-boton mt-1" data-prioridad={String(prioridad)} disabled={enviando}>
            {enviando ? 'Reservando…' : `Reservar a las ${hueco.etiqueta}`}
          </button>
          <p className="te-menudo text-center">
            Al reservar aceptas que el negocio guarde tus datos para atender tu cita. Nada más.
          </p>
        </form>
      )}
    </div>
  )
}
