'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { ETAPAS, formatoEuros, nombreOrigen, type Etapa } from '@/lib/crm-etapas'
import { moverEtapa } from '../contactos/acciones'

export type Tarjeta = {
  id: string
  nombre: string
  detalle: string
  origen: string | null
  importeCentimos: number | null
  llego: string
}

/**
 * El tablero. Se arrastra con el ratón; en el móvil, donde arrastrar entre
 * columnas que no caben en pantalla es una tortura, cada tarjeta tiene su
 * selector de etapa. Los dos llaman a la misma acción del servidor.
 *
 * El cambio se pinta al momento y se deshace si el servidor dice que no.
 */
export function Tablero({ inicial, editable }: { inicial: Record<Etapa, Tarjeta[]>; editable: boolean }) {
  const [columnas, setColumnas] = useState(inicial)
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  const [encima, setEncima] = useState<Etapa | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, empezar] = useTransition()

  function mover(id: string, destino: Etapa) {
    const origen = (Object.keys(columnas) as Etapa[]).find((e) => columnas[e].some((t) => t.id === id))
    if (!origen || origen === destino) return
    const tarjeta = columnas[origen].find((t) => t.id === id)!
    const antes = columnas
    setColumnas({
      ...columnas,
      [origen]: columnas[origen].filter((t) => t.id !== id),
      [destino]: [tarjeta, ...columnas[destino]],
    })
    setError(null)
    empezar(async () => {
      const r = await moverEtapa(id, destino)
      if (!r.ok) {
        setColumnas(antes)
        setError(r.error)
      }
    })
  }

  return (
    <div>
      {error && <p className="mb-3 text-[14px] font-medium text-[var(--color-alerta)]">{error}</p>}
      <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-3 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {ETAPAS.map((e) => {
          const tarjetas = columnas[e.clave]
          const suma = tarjetas.reduce((a, t) => a + (t.importeCentimos ?? 0), 0)
          return (
            <section
              key={e.clave}
              aria-label={e.nombre}
              onDragOver={(ev) => {
                if (!editable || !arrastrando) return
                ev.preventDefault()
                setEncima(e.clave)
              }}
              onDragLeave={() => setEncima((x) => (x === e.clave ? null : x))}
              onDrop={(ev) => {
                ev.preventDefault()
                if (arrastrando) mover(arrastrando, e.clave)
                setArrastrando(null)
                setEncima(null)
              }}
              className={`flex w-[78vw] max-w-[300px] shrink-0 snap-start flex-col rounded-[14px] border bg-[var(--color-papel)] p-2.5 transition-colors lg:w-auto lg:max-w-none ${
                encima === e.clave ? 'border-[var(--color-tinta-40)] bg-white' : 'border-[var(--color-borde)]'
              }`}
            >
              <header className="flex items-center gap-2 px-1.5 pt-1 pb-2.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
                <h2 className="flex-1 truncate text-[13.5px] font-bold">{e.nombre}</h2>
                <span className="text-[13px] font-semibold text-[var(--color-tinta-40)] tabular-nums">
                  {tarjetas.length}
                </span>
              </header>
              {suma > 0 && (
                <p className="-mt-1.5 px-1.5 pb-2 text-[12.5px] font-semibold text-[var(--color-tinta-60)] tabular-nums">
                  {formatoEuros(suma)}
                </p>
              )}

              <ol className="flex min-h-[80px] flex-col gap-2">
                {tarjetas.map((t) => (
                  <li
                    key={t.id}
                    draggable={editable}
                    onDragStart={(ev) => {
                      setArrastrando(t.id)
                      ev.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => {
                      setArrastrando(null)
                      setEncima(null)
                    }}
                    className={`rounded-[10px] border border-[var(--color-borde)] bg-white p-3 shadow-[0_1px_2px_rgba(20,18,15,0.04)] ${
                      editable ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${arrastrando === t.id ? 'opacity-40' : ''}`}
                  >
                    <Link
                      href={`/panel/contactos/${t.id}`}
                      className="block truncate text-[14.5px] font-semibold text-[var(--color-tinta)] no-underline"
                      draggable={false}
                    >
                      {t.nombre}
                    </Link>
                    {t.detalle && <p className="truncate text-[12.5px] text-[var(--color-tinta-40)]">{t.detalle}</p>}
                    <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
                      <span className="rounded-full bg-[var(--color-borde-suave)] px-2 py-0.5 font-semibold text-[var(--color-tinta-60)]">
                        {nombreOrigen(t.origen)}
                      </span>
                      <span className="text-[var(--color-tinta-40)]">
                        {t.importeCentimos ? (
                          <strong className="text-[var(--color-tinta)] tabular-nums">
                            {formatoEuros(t.importeCentimos)}
                          </strong>
                        ) : (
                          t.llego
                        )}
                      </span>
                    </div>
                    {editable && (
                      <select
                        aria-label={`Mover ${t.nombre} a otra etapa`}
                        value={e.clave}
                        onChange={(ev) => mover(t.id, ev.target.value as Etapa)}
                        className="mt-2 w-full rounded-[8px] border border-[var(--color-borde)] bg-white px-2 py-1.5 text-[12.5px] lg:hidden"
                      >
                        {ETAPAS.map((x) => (
                          <option key={x.clave} value={x.clave}>
                            {x.clave === e.clave ? `En ${x.nombre}` : `Mover a ${x.nombre}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )
        })}
      </div>
    </div>
  )
}
