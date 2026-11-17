'use client'

import { useRef, useState, useTransition } from 'react'
import { ETAPAS, type Etapa } from '@/lib/crm-etapas'
import { anadirNota, borrarContacto, guardarImporte, moverEtapa, type Resultado } from '../acciones'

function MensajeError({ resultado }: { resultado: Resultado | null }) {
  if (!resultado || resultado.ok) return null
  return <p className="mt-2 text-[13.5px] font-medium text-[var(--color-alerta)]">{resultado.error}</p>
}

/** Las cinco etapas como botones: un toque y el contacto cambia de columna. */
export function SelectorEtapa({ id, actual }: { id: string; actual: Etapa }) {
  const [pendiente, empezar] = useTransition()
  const [optimista, setOptimista] = useState<Etapa>(actual)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  return (
    <div>
      <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Etapa">
        {ETAPAS.map((e) => {
          const activa = optimista === e.clave
          return (
            <button
              key={e.clave}
              type="button"
              role="radio"
              aria-checked={activa}
              disabled={pendiente}
              onClick={() => {
                if (activa) return
                const anterior = optimista
                setOptimista(e.clave)
                empezar(async () => {
                  const r = await moverEtapa(id, e.clave)
                  setResultado(r)
                  if (!r.ok) setOptimista(anterior)
                })
              }}
              className={`flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left text-[14.5px] font-semibold transition-colors ${
                activa ? 'text-white' : 'border-[var(--color-borde)] bg-white hover:bg-[var(--color-papel)]'
              }`}
              style={activa ? { background: e.color, borderColor: e.color } : undefined}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: activa ? '#fff' : e.color }}
              />
              <span className="flex-1">{e.nombre}</span>
            </button>
          )
        })}
      </div>
      <MensajeError resultado={resultado} />
    </div>
  )
}

export function FormImporte({ id, valor }: { id: string; valor: string }) {
  const [pendiente, empezar] = useTransition()
  const [resultado, setResultado] = useState<Resultado | null>(null)

  return (
    <form
      action={(f) =>
        empezar(async () => {
          setResultado(await guardarImporte(id, f))
        })
      }
    >
      <label htmlFor="importe" className="text-[13px] font-semibold text-[var(--color-tinta-60)]">
        Cuánto ha pagado o va a pagar
      </label>
      <div className="mt-1.5 flex gap-2">
        <div className="flex flex-1 items-center rounded-[10px] border border-[var(--color-borde)] bg-white px-3 focus-within:border-[var(--color-tinta-40)]">
          <input
            id="importe"
            name="importe"
            inputMode="decimal"
            defaultValue={valor}
            placeholder="0"
            className="w-full bg-transparent py-2.5 text-[15px] font-semibold tabular-nums outline-none"
          />
          <span className="text-[var(--color-tinta-40)]">€</span>
        </div>
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-[10px] bg-[var(--color-tinta)] px-4 text-[14px] font-semibold text-white disabled:opacity-60"
        >
          {pendiente ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {resultado?.ok && <p className="mt-2 text-[13px] text-[var(--color-exito)]">Guardado.</p>}
      <MensajeError resultado={resultado} />
    </form>
  )
}

export function FormNota({ id }: { id: string }) {
  const [pendiente, empezar] = useTransition()
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const formulario = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formulario}
      action={(f) =>
        empezar(async () => {
          const r = await anadirNota(id, f)
          setResultado(r)
          if (r.ok) formulario.current?.reset()
        })
      }
    >
      <textarea
        name="texto"
        rows={3}
        required
        maxLength={2000}
        placeholder="Qué habéis hablado, qué quiere, cuándo volver a llamar…"
        className="w-full resize-y rounded-[10px] border border-[var(--color-borde)] bg-white px-3 py-2.5 text-[14.5px] leading-[1.5] outline-none focus:border-[var(--color-tinta-40)]"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-[10px] bg-[var(--color-tinta)] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-60"
        >
          {pendiente ? 'Guardando…' : 'Añadir nota'}
        </button>
      </div>
      <MensajeError resultado={resultado} />
    </form>
  )
}

export function BotonBorrar({ id }: { id: string }) {
  const [pendiente, empezar] = useTransition()
  const [confirmando, setConfirmando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="text-[13.5px] font-medium text-[var(--color-tinta-40)] hover:text-[var(--color-alerta)]"
      >
        Borrar este contacto
      </button>
    )
  }

  return (
    <div className="rounded-[10px] border border-[var(--color-alerta)]/40 bg-[#FDF3F2] p-3">
      <p className="text-[13.5px] leading-[1.5]">
        Se borran sus datos y sus notas, y no se puede deshacer. Hazlo si te lo ha pedido o si es spam.
      </p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          disabled={pendiente}
          onClick={() => empezar(async () => setResultado(await borrarContacto(id)))}
          className="rounded-[8px] bg-[var(--color-alerta)] px-3 py-1.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
        >
          {pendiente ? 'Borrando…' : 'Sí, borrar'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="rounded-[8px] px-3 py-1.5 text-[13.5px] font-semibold text-[var(--color-tinta-60)]"
        >
          Cancelar
        </button>
      </div>
      <MensajeError resultado={resultado} />
    </div>
  )
}
