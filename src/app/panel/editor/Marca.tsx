'use client'

import { useId, useRef, useState } from 'react'
import type { Tema } from '@/db/schema'
import {
  ACENTOS,
  BOTONES,
  FONDOS,
  FUENTES,
  PRESETS,
  colorValido,
  textoSobre,
  type OpcionTema,
} from '@/bloques/tema'
import { IconoBien, IconoPapelera, IconoSubir } from '@/iconos'

/**
 * La pestaña de marca del editor.
 *
 * Todo lo que se toca aquí se ve a la derecha en la vista previa, que usa las
 * mismas clases (.te-pagina, .te-boton) que la página real. Nada de recrear el
 * diseño con estilos paralelos: en cuanto los dos se separan, la vista previa
 * empieza a mentir y el cliente publica algo que no ha visto.
 */

export type MarcaEstado = {
  avatarUrl: string
  portadaUrl: string
  etiqueta: string
  tema: Tema
}

export function Marca({
  estado,
  titulo,
  descripcion,
  puedeSubir,
  onCambiar,
}: {
  estado: MarcaEstado
  titulo: string
  descripcion: string
  puedeSubir: boolean
  onCambiar: (parcial: Partial<MarcaEstado>) => void
}) {
  const t = estado.tema
  const poner = (parcial: Partial<Tema>) => onCambiar({ tema: { ...t, ...parcial } })

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
      <div className="flex flex-col gap-5">
        <Tarjeta titulo="Tu imagen">
          <Subidor
            etiqueta="Logo o foto"
            ayuda="Cuadrada si puede ser. Se ve arriba del todo."
            valor={estado.avatarUrl}
            puedeSubir={puedeSubir}
            forma={t.avatarForma === 'cuadrado' ? 'cuadrado' : 'circulo'}
            onCambiar={(avatarUrl) => onCambiar({ avatarUrl })}
          />

          <div className="mt-4">
            <Subidor
              etiqueta="Portada"
              ayuda="Apaisada, tipo 1200 × 400. Opcional."
              valor={estado.portadaUrl}
              puedeSubir={puedeSubir}
              forma="ancho"
              onCambiar={(portadaUrl) => onCambiar({ portadaUrl })}
            />
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[14px] font-medium">
              Línea pequeña sobre el título
              <span className="ml-1.5 font-normal text-[var(--color-tinta-40)]">(opcional)</span>
            </span>
            <input
              value={estado.etiqueta}
              onChange={(e) => onCambiar({ etiqueta: e.target.value.slice(0, 48) })}
              placeholder="Peluquería · La Laguna"
              className="h-[48px] w-full rounded-[10px] border-2 border-[var(--color-borde)] px-3.5 text-[16px] outline-none focus:border-[var(--color-acento)]"
            />
          </label>

          <fieldset className="mt-4">
            <legend className="mb-2 text-[14px] font-medium">Forma del logo</legend>
            <Segmentado
              opciones={[
                { clave: 'circulo', etiqueta: 'Redondo' },
                { clave: 'cuadrado', etiqueta: 'Cuadrado' },
              ]}
              valor={t.avatarForma}
              onCambiar={(avatarForma) => poner({ avatarForma })}
            />
          </fieldset>
        </Tarjeta>

        <Tarjeta titulo="Color">
          <p className="mb-3 text-[13.5px] text-[var(--color-tinta-60)]">
            El color del botón principal. Uno solo: si todo destaca, no destaca nada.
          </p>
          <div className="flex flex-wrap gap-2">
            {ACENTOS.map((a) => (
              <button
                key={a.valor}
                type="button"
                aria-label={a.nombre}
                title={a.nombre}
                onClick={() => poner({ acento: a.valor })}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                  t.acento.toLowerCase() === a.valor.toLowerCase()
                    ? 'ring-2 ring-[var(--color-tinta)] ring-offset-2'
                    : ''
                }`}
                style={{ background: a.valor, color: textoSobre(a.valor) }}
              >
                {t.acento.toLowerCase() === a.valor.toLowerCase() && <IconoBien tam={17} />}
              </button>
            ))}
          </div>
          <ColorLibre valor={t.acento} onCambiar={(acento) => poner({ acento })} />
        </Tarjeta>

        <Tarjeta titulo="Fondo y paleta">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {PRESETS.map((p) => (
              <button
                key={p.clave}
                type="button"
                title={p.pista}
                onClick={() => poner({ preset: p.clave })}
                className={`overflow-hidden rounded-[10px] border-2 text-left transition-colors ${
                  t.preset === p.clave
                    ? 'border-[var(--color-tinta)]'
                    : 'border-[var(--color-borde)] hover:border-[var(--color-tinta-40)]'
                }`}
              >
                <span
                  className="flex h-12 items-end justify-start p-1.5"
                  style={{ background: p.muestra?.fondo }}
                >
                  <span
                    className="h-2.5 w-8 rounded-full"
                    style={{ background: t.acento }}
                    aria-hidden="true"
                  />
                </span>
                <span
                  className="block px-1.5 py-1 text-[11.5px] font-semibold"
                  style={{ borderTop: `1px solid ${p.muestra?.borde}` }}
                >
                  {p.etiqueta}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[14px] font-medium">Acabado del fondo</p>
            <Segmentado opciones={FONDOS} valor={t.fondo} onCambiar={(fondo) => poner({ fondo })} />
            <Pista opciones={FONDOS} valor={t.fondo} />
          </div>
        </Tarjeta>

        <Tarjeta titulo="Tipografía">
          <Segmentado opciones={FUENTES} valor={t.fuente} onCambiar={(fuente) => poner({ fuente })} />
          <Pista opciones={FUENTES} valor={t.fuente} />

          <div className="mt-4">
            <p className="mb-2 text-[14px] font-medium">Forma de los botones</p>
            <Segmentado
              opciones={BOTONES}
              valor={t.botones}
              onCambiar={(botones) => poner({ botones })}
            />
          </div>
        </Tarjeta>
      </div>

      <VistaPrevia estado={estado} titulo={titulo} descripcion={descripcion} />
    </div>
  )
}

// ── Vista previa ─────────────────────────────────────────────────────────────

function VistaPrevia({
  estado,
  titulo,
  descripcion,
}: {
  estado: MarcaEstado
  titulo: string
  descripcion: string
}) {
  const t = estado.tema
  return (
    <div className="lg:sticky lg:top-5">
      <p className="mb-2 text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
        Cómo queda
      </p>
      <div className="overflow-hidden rounded-[20px] border-[6px] border-[var(--color-tinta)] shadow-lg">
        <div
          className="te-pagina"
          data-preset={t.preset}
          data-botones={t.botones}
          data-fuente={t.fuente}
          data-fondo={t.fondo}
          style={
            {
              minHeight: 0,
              '--p-acento': colorValido(t.acento) ? t.acento : '#FF5D2E',
              '--p-acento-texto': textoSobre(t.acento),
            } as React.CSSProperties
          }
        >
          <div className={estado.portadaUrl ? 'px-3 pb-5 pt-3' : 'px-3 pb-5 pt-7'}>
            {estado.portadaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={estado.portadaUrl} alt="" className="te-portada" />
            )}
            {estado.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={estado.avatarUrl}
                alt=""
                className={`te-avatar mx-auto h-[68px] w-[68px] ${
                  t.avatarForma === 'cuadrado' ? 'rounded-[16px]' : 'rounded-full'
                } ${estado.portadaUrl ? '-mt-[34px] mb-3' : 'mb-3'}`}
              />
            )}

            <div className="text-center">
              {estado.etiqueta && (
                <p
                  className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.13em]"
                  style={{ color: 'var(--p-texto-suave)' }}
                >
                  {estado.etiqueta}
                </p>
              )}
              <p className="te-titulo te-titulo-mini">{titulo || 'Tu negocio'}</p>
              {descripcion && (
                <p
                  className="mx-auto mt-1.5 max-w-[30ch] text-[11.5px] leading-[1.5]"
                  style={{ color: 'var(--p-texto-suave)' }}
                >
                  {descripcion}
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <span
                className="te-boton"
                data-prioridad="1"
                style={{ minHeight: 44, fontSize: 13, padding: '10px 16px' }}
              >
                Escríbenos por WhatsApp
              </span>
              <span
                className="te-boton"
                data-prioridad="2"
                style={{ minHeight: 40, fontSize: 12.5, padding: '9px 16px' }}
              >
                Pedir cita
              </span>
              <span
                className="te-boton"
                data-prioridad="3"
                style={{ minHeight: 40, fontSize: 12.5, padding: '9px 16px' }}
              >
                Cómo llegar
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-[var(--color-tinta-40)]">
        Es la página real, en pequeño. Los cambios se ven aquí antes de guardar.
      </p>
    </div>
  )
}

// ── Subidor de imágenes ──────────────────────────────────────────────────────

function Subidor({
  etiqueta,
  ayuda,
  valor,
  puedeSubir,
  forma,
  onCambiar,
}: {
  etiqueta: string
  ayuda: string
  valor: string
  puedeSubir: boolean
  forma: 'circulo' | 'cuadrado' | 'ancho'
  onCambiar: (url: string) => void
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  async function subir(fichero: File) {
    setFallo(null)
    setSubiendo(true)
    try {
      const cuerpo = new FormData()
      cuerpo.append('fichero', fichero)
      const respuesta = await fetch('/api/subir', { method: 'POST', body: cuerpo })
      const datos = (await respuesta.json()) as { ok: boolean; url?: string; error?: string }
      if (datos.ok && datos.url) onCambiar(datos.url)
      else setFallo(datos.error ?? 'No hemos podido subir la imagen.')
    } catch {
      setFallo('No hemos podido subir la imagen. Revisa tu conexión.')
    } finally {
      setSubiendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  // La portada es apaisada: en fila, la muestra se come el ancho y deja el
  // botón sin sitio. Se apila.
  const apilado = forma === 'ancho'
  const clasesMuestra = apilado
    ? 'h-20 w-full rounded-[10px]'
    : forma === 'cuadrado'
      ? 'h-16 w-16 rounded-[12px]'
      : 'h-16 w-16 rounded-full'

  return (
    <div>
      <p className="mb-1.5 text-[14px] font-medium">{etiqueta}</p>
      <div className={apilado ? 'flex flex-col gap-2.5' : 'flex items-center gap-3'}>
        {valor ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={valor}
            alt=""
            className={`${clasesMuestra} shrink-0 border border-[var(--color-borde)] object-cover`}
          />
        ) : (
          <div
            className={`${clasesMuestra} shrink-0 border-2 border-dashed border-[var(--color-borde)]`}
          />
        )}

        <div className={`flex min-w-0 flex-col gap-1.5 ${apilado ? '' : 'flex-1'}`}>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={subiendo || !puedeSubir}
              onClick={() => entrada.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-[9px] border-2 border-[var(--color-borde)] px-3 py-2 text-[13.5px] font-semibold hover:border-[var(--color-tinta-40)] disabled:opacity-40"
            >
              <IconoSubir tam={15} />
              {subiendo ? 'Subiendo…' : valor ? 'Cambiar' : 'Subir imagen'}
            </button>
            {valor && (
              <button
                type="button"
                aria-label="Quitar imagen"
                onClick={() => onCambiar('')}
                className="rounded-[9px] border-2 border-[var(--color-borde)] px-2.5 text-[var(--color-tinta-60)] hover:border-[var(--color-alerta)] hover:text-[var(--color-alerta)]"
              >
                <IconoPapelera tam={15} />
              </button>
            )}
          </div>
          <p className="text-[12.5px] leading-snug text-[var(--color-tinta-40)]">{ayuda}</p>
        </div>
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void subir(f)
        }}
      />

      {!puedeSubir && (
        <label className="mt-2 block">
          <span className="mb-1 block text-[12.5px] text-[var(--color-tinta-60)]">
            La subida de ficheros todavía no está activada. Puedes pegar la dirección de una imagen:
          </span>
          <input
            value={valor}
            onChange={(e) => onCambiar(e.target.value.trim())}
            placeholder="https://…"
            spellCheck={false}
            className="h-[42px] w-full rounded-[9px] border-2 border-[var(--color-borde)] px-3 text-[15px] outline-none focus:border-[var(--color-acento)]"
          />
        </label>
      )}

      {fallo && <p className="mt-1.5 text-[13px] text-[var(--color-alerta)]">{fallo}</p>}
    </div>
  )
}

// ── Piezas de interfaz ───────────────────────────────────────────────────────

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
      <h2 className="mb-3.5 text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Segmentado<T extends string>({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: { clave: T; etiqueta: string }[]
  valor: T
  onCambiar: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={o.clave}
          type="button"
          onClick={() => onCambiar(o.clave)}
          aria-pressed={valor === o.clave}
          className={`rounded-full border-2 px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors ${
            valor === o.clave
              ? 'border-[var(--color-tinta)] bg-[var(--color-tinta)] text-white'
              : 'border-[var(--color-borde)] hover:border-[var(--color-tinta-40)]'
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}

function Pista<T extends string>({ opciones, valor }: { opciones: OpcionTema<T>[]; valor: T }) {
  const pista = opciones.find((o) => o.clave === valor)?.pista
  if (!pista) return null
  return <p className="mt-2 text-[12.5px] text-[var(--color-tinta-40)]">{pista}</p>
}

function ColorLibre({ valor, onCambiar }: { valor: string; onCambiar: (v: string) => void }) {
  const id = useId()
  const [texto, setTexto] = useState(valor)
  const valido = colorValido(texto)

  return (
    <div className="mt-4 flex items-end gap-2.5">
      <label htmlFor={id} className="shrink-0">
        <span className="mb-1 block text-[13.5px] font-medium">Tu color</span>
        <input
          id={id}
          type="color"
          value={valido ? texto : valor}
          onChange={(e) => {
            setTexto(e.target.value)
            onCambiar(e.target.value)
          }}
          className="h-[42px] w-[54px] cursor-pointer rounded-[9px] border-2 border-[var(--color-borde)] bg-white p-1"
        />
      </label>
      <label className="min-w-0 flex-1">
        <span className="sr-only">Código del color</span>
        <input
          value={texto}
          onChange={(e) => {
            const v = e.target.value
            setTexto(v)
            if (colorValido(v)) onCambiar(v.trim())
          }}
          placeholder="#FF5D2E"
          spellCheck={false}
          className={`h-[42px] w-full rounded-[9px] border-2 px-3 font-mono text-[14px] uppercase outline-none ${
            texto && !valido ? 'border-[var(--color-alerta)]' : 'border-[var(--color-borde)]'
          }`}
        />
      </label>
    </div>
  )
}
