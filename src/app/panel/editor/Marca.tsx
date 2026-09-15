'use client'

import { useId, useState } from 'react'
import {
  ACENTOS,
  ANCHOS,
  AVATAR_FORMAS,
  BOTONES,
  ESTILOS_BOTON,
  FONDOS,
  FUENTES,
  PRESETS,
  PRESETS_OSCUROS,
  SEPARACIONES,
  TAMANOS_TEXTO,
  colorValido,
  textoSobre,
  type OpcionTema,
  type Tema,
} from '@/bloques/tema'
import { IconoBien } from '@/iconos'
import { Subidor } from './Subidor'

/**
 * La pestaña de marca del editor.
 *
 * Todo lo que se toca aquí se ve a la derecha en la vista previa, que usa las
 * mismas clases (.te-pagina, .te-boton) que la página real. Nada de recrear el
 * diseño con estilos paralelos: en cuanto los dos se separan, la vista previa
 * empieza a mentir y el cliente publica algo que no ha visto.
 *
 * Y lo que el cliente elige aquí es el AMBIENTE, no el píxel: dieciséis
 * paletas completas, dieciocho parejas tipográficas, no un selector de color
 * para cada texto. Las combinaciones ilegibles no están entre las opciones.
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
    <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="flex flex-col gap-5">
        <Tarjeta titulo="Tu imagen">
          <Etiqueta texto="Logo o foto" />
          <Subidor
            valor={estado.avatarUrl}
            puedeSubir={puedeSubir}
            forma={t.avatarForma}
            ayuda="Cuadrada si puede ser. Se ve arriba del todo."
            onCambiar={(avatarUrl) => onCambiar({ avatarUrl })}
          />

          <div className="mt-3">
            <Segmentado
              opciones={AVATAR_FORMAS}
              valor={t.avatarForma}
              onCambiar={(avatarForma) => poner({ avatarForma })}
            />
          </div>

          <div className="mt-5">
            <Etiqueta texto="Portada" opcional />
            <Subidor
              valor={estado.portadaUrl}
              puedeSubir={puedeSubir}
              forma="ancho"
              ayuda="Apaisada, tipo 1200 × 400. El logo se monta encima."
              onCambiar={(portadaUrl) => onCambiar({ portadaUrl })}
            />
          </div>

          <label className="mt-5 block">
            <Etiqueta texto="Línea pequeña sobre el título" opcional />
            <input
              value={estado.etiqueta}
              onChange={(e) => onCambiar({ etiqueta: e.target.value.slice(0, 48) })}
              placeholder="Peluquería · La Laguna"
              className="h-[48px] w-full rounded-[10px] border-2 border-[var(--color-borde)] px-3.5 text-[16px] outline-none focus:border-[var(--color-acento)]"
            />
          </label>
        </Tarjeta>

        <Tarjeta titulo="Color de marca">
          <p className="mb-3 text-[13.5px] text-[var(--color-tinta-60)]">
            El color del botón principal. Uno solo: si todo destaca, no destaca nada.
          </p>
          <div className="flex flex-wrap gap-2">
            {ACENTOS.map((a) => {
              const elegido = t.acento.toLowerCase() === a.valor.toLowerCase()
              return (
                <button
                  key={a.valor}
                  type="button"
                  aria-label={a.nombre}
                  aria-pressed={elegido}
                  title={a.nombre}
                  onClick={() => poner({ acento: a.valor })}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                    elegido ? 'ring-2 ring-[var(--color-tinta)] ring-offset-2' : ''
                  }`}
                  style={{ background: a.valor, color: textoSobre(a.valor) }}
                >
                  {elegido && <IconoBien tam={17} />}
                </button>
              )
            })}
          </div>
          <ColorLibre valor={t.acento} onCambiar={(acento) => poner({ acento })} />
        </Tarjeta>

        <Tarjeta titulo="Conjunto de colores">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {PRESETS.map((p) => (
              <button
                key={p.clave}
                type="button"
                title={p.pista}
                aria-pressed={t.preset === p.clave}
                onClick={() => poner({ preset: p.clave })}
                className={`overflow-hidden rounded-[10px] border-2 text-left transition-colors ${
                  t.preset === p.clave
                    ? 'border-[var(--color-tinta)]'
                    : 'border-[var(--color-borde)] hover:border-[var(--color-tinta-40)]'
                }`}
              >
                <span
                  className="flex h-14 flex-col justify-end gap-1 p-2"
                  style={{ background: p.muestra?.fondo, color: p.muestra?.texto }}
                >
                  <span className="text-[10px] font-bold leading-none opacity-80">Aa</span>
                  <span
                    className="h-2.5 w-full rounded-full"
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
          <Pista opciones={PRESETS} valor={t.preset} />
        </Tarjeta>

        <Tarjeta titulo="Fondo">
          <Segmentado opciones={FONDOS} valor={t.fondo} onCambiar={(fondo) => poner({ fondo })} />
          <Pista opciones={FONDOS} valor={t.fondo} />

          {t.fondo === 'imagen' && (
            <div className="mt-4 rounded-[12px] bg-[var(--color-borde-suave)]/50 p-4">
              <Etiqueta texto="La foto de fondo" />
              <Subidor
                valor={t.fondoImagenUrl}
                puedeSubir={puedeSubir}
                forma="ancho"
                ayuda="Apaisada y sin texto. Se ve detrás de todo."
                onCambiar={(fondoImagenUrl) => poner({ fondoImagenUrl })}
              />

              <label className="mt-4 block">
                <span className="mb-1.5 flex items-center justify-between text-[14px] font-medium">
                  Velo sobre la foto
                  <span className="tabular-nums text-[var(--color-tinta-40)]">{t.fondoVelo}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={t.fondoVelo}
                  onChange={(e) => poner({ fondoVelo: Number(e.target.value) })}
                  className="w-full accent-[var(--color-acento)]"
                />
                <span className="mt-1 block text-[12.5px] leading-snug text-[var(--color-tinta-40)]">
                  Cubre la foto con el color de la paleta. Si lo bajas mucho, el texto deja de
                  leerse encima de la foto.
                </span>
              </label>

              <Interruptor
                etiqueta="La foto se queda quieta al bajar"
                valor={t.fondoFijo}
                onCambiar={(fondoFijo) => poner({ fondoFijo })}
              />

              {!t.fondoImagenUrl && (
                <p className="mt-3 text-[13px] text-[var(--color-alerta)]">
                  Sin foto, la página vuelve al halo de color.
                </p>
              )}
            </div>
          )}
        </Tarjeta>

        <Tarjeta titulo="Tipografía">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FUENTES.map((f) => (
              <button
                key={f.clave}
                type="button"
                title={f.pista}
                aria-pressed={t.fuente === f.clave}
                onClick={() => poner({ fuente: f.clave })}
                className={`rounded-[10px] border-2 px-3 py-2.5 text-left transition-colors ${
                  t.fuente === f.clave
                    ? 'border-[var(--color-tinta)] bg-[var(--color-borde-suave)]/60'
                    : 'border-[var(--color-borde)] hover:border-[var(--color-tinta-40)]'
                }`}
              >
                <span
                  className="block text-[21px] leading-none"
                  style={{ fontFamily: f.familia }}
                  aria-hidden="true"
                >
                  Aa
                </span>
                <span className="mt-1.5 block text-[12.5px] font-semibold">{f.etiqueta}</span>
              </button>
            ))}
          </div>
          <Pista opciones={FUENTES} valor={t.fuente} />

          <div className="mt-5">
            <Etiqueta texto="Tamaño del texto" />
            <Segmentado
              opciones={TAMANOS_TEXTO}
              valor={t.tamanoTexto}
              onCambiar={(tamanoTexto) => poner({ tamanoTexto })}
            />
            <Pista opciones={TAMANOS_TEXTO} valor={t.tamanoTexto} />
          </div>
        </Tarjeta>

        <Tarjeta titulo="Botones y espacio">
          <Etiqueta texto="Forma" />
          <Segmentado opciones={BOTONES} valor={t.botones} onCambiar={(botones) => poner({ botones })} />

          <div className="mt-5">
            <Etiqueta texto="Acabado" />
            <Segmentado
              opciones={ESTILOS_BOTON}
              valor={t.estiloBoton}
              onCambiar={(estiloBoton) => poner({ estiloBoton })}
            />
            <Pista opciones={ESTILOS_BOTON} valor={t.estiloBoton} />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <Etiqueta texto="Ancho de la página" />
              <Segmentado opciones={ANCHOS} valor={t.ancho} onCambiar={(ancho) => poner({ ancho })} />
            </div>
            <div>
              <Etiqueta texto="Separación" />
              <Segmentado
                opciones={SEPARACIONES}
                valor={t.separacion}
                onCambiar={(separacion) => poner({ separacion })}
              />
            </div>
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
  const acento = colorValido(t.acento) ? t.acento : '#FF5D2E'
  const hayFoto = t.fondo === 'imagen' && Boolean(t.fondoImagenUrl)

  return (
    <div className="lg:sticky lg:top-5">
      <p className="mb-2 text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
        Cómo queda
      </p>
      <div className="overflow-hidden rounded-[22px] border-[7px] border-[var(--color-tinta)] shadow-xl">
        <div
          className="te-pagina"
          data-preset={t.preset}
          data-botones={t.botones}
          data-estilo={t.estiloBoton}
          data-fuente={t.fuente}
          data-fondo={hayFoto ? 'imagen' : t.fondo}
          data-tam={t.tamanoTexto}
          data-separacion={t.separacion}
          style={
            {
              minHeight: 0,
              // En la vista previa la escala se reduce a la mitad larga: es un
              // móvil de 300 px, no uno de 400.
              '--p-escala': t.tamanoTexto === 'compacto' ? 0.62 : t.tamanoTexto === 'grande' ? 0.75 : 0.68,
              '--p-acento': acento,
              '--p-acento-texto': textoSobre(acento),
              ...(hayFoto
                ? {
                    '--p-fondo-img': `url("${t.fondoImagenUrl.replace(/["()\\]/g, '')}")`,
                    '--p-velo': String(t.fondoVelo),
                  }
                : {}),
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
                data-forma={t.avatarForma}
                className={`te-avatar mx-auto h-[68px] w-[68px] ${
                  estado.portadaUrl ? '-mt-[34px] mb-3' : 'mb-3'
                }`}
              />
            )}

            <div className="text-center">
              {estado.etiqueta && <p className="te-etiqueta mb-1.5">{estado.etiqueta}</p>}
              <p className="te-titulo te-titulo-1">{titulo || 'Tu negocio'}</p>
              {descripcion && (
                <p className="te-parrafo mx-auto mt-1.5 max-w-[30ch]">{descripcion}</p>
              )}
            </div>

            <div className="te-lista mt-4">
              <span className="te-boton" data-prioridad="1">
                Escríbenos por WhatsApp
              </span>
              <span className="te-boton" data-prioridad="2">
                Pedir cita
              </span>
              <span className="te-boton" data-prioridad="3">
                Cómo llegar
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-[var(--color-tinta-40)]">
        Es la página real, en pequeño. Los cambios se ven aquí antes de guardar.
      </p>
      {PRESETS_OSCUROS.includes(t.preset) && textoSobre(acento) === '#14120f' && (
        <p className="mt-2 rounded-[10px] bg-[#FFF6E8] p-2.5 text-[12.5px] leading-snug text-[var(--color-tinta-80)]">
          Con este fondo oscuro y ese color, la letra del botón principal sale negra. Se lee, pero
          un color más oscuro luce mejor aquí.
        </p>
      )}
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

function Etiqueta({ texto, opcional }: { texto: string; opcional?: boolean }) {
  return (
    <p className="mb-1.5 text-[14px] font-medium">
      {texto}
      {opcional && (
        <span className="ml-1.5 font-normal text-[var(--color-tinta-40)]">(opcional)</span>
      )}
    </p>
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

function Interruptor({
  etiqueta,
  valor,
  onCambiar,
}: {
  etiqueta: string
  valor: boolean
  onCambiar: (v: boolean) => void
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <span className="text-[14px] font-medium">{etiqueta}</span>
      <button
        type="button"
        role="switch"
        aria-checked={valor}
        aria-label={etiqueta}
        onClick={() => onCambiar(!valor)}
        className={`h-6 w-10 shrink-0 rounded-full transition-colors ${
          valor ? 'bg-[var(--color-exito)]' : 'bg-[var(--color-borde)]'
        }`}
      >
        <span
          className={`block h-[18px] w-[18px] rounded-full bg-white transition-transform ${
            valor ? 'translate-x-[21px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
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
