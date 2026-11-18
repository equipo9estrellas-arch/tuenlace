'use client'

import { useEffect, useId, useState } from 'react'
import {
  ACENTOS,
  ANCHOS,
  AVATAR_FORMAS,
  AVATAR_TAMS,
  BOTONES,
  CABECERAS,
  ENTRADAS,
  ESTILOS_BOTON,
  FONDOS,
  FUENTES,
  HOVERS,
  ICONOS_POS,
  PATRONES,
  PLANTILLAS,
  PRESETS,
  PRESETS_OSCUROS,
  REDES_ESTILOS,
  REDES_POSICIONES,
  SEPARACIONES,
  SOMBRAS,
  TAMANOS_TEXTO,
  TEMA_POR_DEFECTO,
  colorValido,
  contraste,
  textoSobre,
  type OpcionTema,
  type Tema,
} from '@/bloques/tema'
import { limitesDe, precioEnEuros, siguientePlan } from '@/lib/planes'
import { IconoBien, IconoCandado } from '@/iconos'
import { Subidor } from './Subidor'
import { Previa, type BloqueParaPrevia } from './Previa'

/**
 * La pestaña de marca del editor.
 *
 * Todo lo que se toca aquí se ve a la derecha en la vista previa, que usa las
 * mismas clases (.te-pagina, .te-boton) que la página real. Nada de recrear el
 * diseño con estilos paralelos: en cuanto los dos se separan, la vista previa
 * empieza a mentir y el cliente publica algo que no ha visto.
 *
 * Se empieza por el AMBIENTE (paleta, pareja tipográfica, plantilla) y se
 * baja al detalle si se quiere: colores exactos, radio en píxeles, fuente de
 * títulos aparte. Lo que sí no se deja pasar en silencio es lo ilegible: con
 * colores libres se mide el contraste y se avisa.
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
  plan,
  bloques,
  onCambiar,
}: {
  estado: MarcaEstado
  titulo: string
  descripcion: string
  puedeSubir: boolean
  plan: string
  /** Los bloques reales del editor: la vista previa pinta estos, no una maqueta. */
  bloques: BloqueParaPrevia[]
  onCambiar: (parcial: Partial<MarcaEstado>) => void
}) {
  const t = estado.tema
  const poner = (parcial: Partial<Tema>) => onCambiar({ tema: { ...t, ...parcial } })
  const avanzado = limitesDe(plan).disenoAvanzado
  const siguiente = siguientePlan(plan)
  const candado = siguiente
    ? `Incluido en ${siguiente.nombre}, ${precioEnEuros(siguiente.precioMensualCentimos)} + IGIC al mes`
    : null

  // Contraste de los colores libres, con lo que se verá de verdad.
  const fondoEf = t.colorFondo || PRESETS.find((p) => p.clave === t.preset)?.muestra?.fondo || '#ffffff'
  const textoEf = t.colorTexto || PRESETS.find((p) => p.clave === t.preset)?.muestra?.texto || '#14120f'
  const botonEf = t.colorBoton || (PRESETS_OSCUROS.includes(t.preset) ? '#2a2a2a' : '#ffffff')
  const botonTextoEf = t.colorBotonTexto || textoEf
  const avisoTexto = (t.colorFondo || t.colorTexto) && contraste(fondoEf, textoEf) < 4.5
  const avisoBoton = (t.colorBoton || t.colorBotonTexto) && contraste(botonEf, botonTextoEf) < 4.5

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="flex flex-col gap-5">
        <Tarjeta titulo="Plantillas" bloqueada={!avanzado ? candado : null}>
          <p className="mb-3 text-[13.5px] text-[var(--color-tinta-60)]">
            Un diseño completo para tu sector en un toque. Luego lo retocas como quieras.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PLANTILLAS.map((p) => {
              const fondo =
                p.tema.fondo === 'gradiente'
                  ? `linear-gradient(${p.tema.gradienteAngulo ?? 160}deg, ${p.tema.gradienteDesde}, ${p.tema.gradienteHasta})`
                  : (PRESETS.find((x) => x.clave === p.tema.preset)?.muestra?.fondo ?? '#fff')
              const texto = PRESETS.find((x) => x.clave === p.tema.preset)?.muestra?.texto ?? '#14120f'
              return (
                <button
                  key={p.clave}
                  type="button"
                  disabled={!avanzado}
                  title={p.para}
                  // Una plantilla parte de cero: lo que no define vuelve al valor
                  // por defecto, para que no se mezcle con la anterior. Las
                  // fotos y el vídeo que ya subiste se conservan.
                  onClick={() =>
                    poner({
                      ...TEMA_POR_DEFECTO,
                      fondoImagenUrl: t.fondoImagenUrl,
                      fondoVideoUrl: t.fondoVideoUrl,
                      ...p.tema,
                    })
                  }
                  className="overflow-hidden rounded-[10px] border-2 border-[var(--color-borde)] text-left transition-colors hover:border-[var(--color-tinta-40)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-20 flex-col justify-end gap-1.5 p-2.5" style={{ background: fondo, color: texto }}>
                    <span
                      className="text-[15px] leading-none font-bold"
                      style={{ fontFamily: FUENTES.find((f) => f.clave === (p.tema.fuenteTitulo || p.tema.fuente))?.familia }}
                    >
                      Aa
                    </span>
                    <span
                      className="h-3 w-full"
                      style={{
                        background: p.tema.acento,
                        borderRadius: p.tema.botones === 'pildora' ? 999 : p.tema.botones === 'rectos' ? 2 : 6,
                      }}
                    />
                  </span>
                  <span className="block px-2 py-1.5">
                    <span className="block text-[12.5px] font-semibold">{p.nombre}</span>
                    <span className="block truncate text-[11px] text-[var(--color-tinta-40)]">{p.para}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Tu imagen">
          <Etiqueta texto="Logo o foto" />
          <Subidor
            valor={estado.avatarUrl}
            puedeSubir={puedeSubir}
            forma={t.avatarForma}
            ayuda="Cuadrada si puede ser. Se ve arriba del todo."
            onCambiar={(avatarUrl) => onCambiar({ avatarUrl })}
          />

          <div className="mt-3 flex flex-col gap-2">
            <Segmentado
              opciones={AVATAR_FORMAS}
              valor={t.avatarForma}
              onCambiar={(avatarForma) => poner({ avatarForma })}
            />
            <Segmentado opciones={AVATAR_TAMS} valor={t.avatarTam} onCambiar={(avatarTam) => poner({ avatarTam })} />
          </div>

          <div className="mt-5">
            <Etiqueta texto="Cabecera" />
            <Segmentado opciones={CABECERAS} valor={t.cabecera} onCambiar={(cabecera) => poner({ cabecera })} />
            <Pista opciones={CABECERAS} valor={t.cabecera} />
            {t.cabecera === 'portada' && !estado.portadaUrl && (
              <p className="mt-1.5 text-[12.5px] text-[var(--color-alerta)]">Sube una portada aquí abajo para verla.</p>
            )}
            {t.cabecera === 'logo' && !estado.avatarUrl && (
              <p className="mt-1.5 text-[12.5px] text-[var(--color-alerta)]">Sube tu logo para que se vea en lugar del título.</p>
            )}
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

          <div className="mt-5 border-t border-[var(--color-borde-suave)] pt-4">
            <Etiqueta texto="O tus colores exactos" opcional />
            <p className="mb-3 text-[12.5px] leading-snug text-[var(--color-tinta-40)]">
              Lo que elijas aquí pisa el conjunto de arriba. Lo que dejes vacío, se queda como está.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorOpcional etiqueta="Fondo" valor={t.colorFondo} onCambiar={(colorFondo) => poner({ colorFondo })} />
              <ColorOpcional etiqueta="Texto" valor={t.colorTexto} onCambiar={(colorTexto) => poner({ colorTexto })} />
              <ColorOpcional etiqueta="Botones" valor={t.colorBoton} onCambiar={(colorBoton) => poner({ colorBoton })} />
              <ColorOpcional
                etiqueta="Texto de los botones"
                valor={t.colorBotonTexto}
                onCambiar={(colorBotonTexto) => poner({ colorBotonTexto })}
              />
            </div>
            {avisoTexto && (
              <Aviso>El texto casi no se distingue del fondo. Prueba con uno más claro o más oscuro.</Aviso>
            )}
            {avisoBoton && (
              <Aviso>El texto de los botones se lee mal sobre ese color de botón.</Aviso>
            )}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Fondo">
          <Segmentado
            opciones={FONDOS}
            valor={t.fondo}
            bloqueadas={avanzado ? [] : ['video']}
            onCambiar={(fondo) => poner({ fondo })}
          />
          <Pista opciones={FONDOS} valor={t.fondo} />
          {!avanzado && candado && (
            <p className="mt-1.5 text-[12.5px] text-[var(--color-tinta-40)]">Vídeo de fondo: {candado.toLowerCase()}.</p>
          )}

          {t.fondo === 'gradiente' && (
            <div className="mt-4 rounded-[12px] bg-[var(--color-borde-suave)]/50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorOpcional
                  etiqueta="Desde"
                  valor={t.gradienteDesde}
                  vacio="Tu color de marca"
                  onCambiar={(gradienteDesde) => poner({ gradienteDesde })}
                />
                <ColorOpcional
                  etiqueta="Hasta"
                  valor={t.gradienteHasta}
                  vacio="El fondo de la paleta"
                  onCambiar={(gradienteHasta) => poner({ gradienteHasta })}
                />
              </div>
              <Deslizador
                etiqueta="Dirección"
                valor={t.gradienteAngulo}
                min={0}
                max={360}
                paso={15}
                sufijo="°"
                onCambiar={(gradienteAngulo) => poner({ gradienteAngulo })}
              />
            </div>
          )}

          {t.fondo === 'patron' && (
            <div className="mt-4">
              <Segmentado opciones={PATRONES} valor={t.patron} onCambiar={(patron) => poner({ patron })} />
            </div>
          )}

          {t.fondo === 'video' && avanzado && (
            <div className="mt-4 rounded-[12px] bg-[var(--color-borde-suave)]/50 p-4">
              <Etiqueta texto="El vídeo de fondo" />
              <Subidor
                valor={t.fondoVideoUrl}
                puedeSubir={puedeSubir}
                forma="ancho"
                video
                ayuda="MP4 o WebM, hasta 20 MB. Corto y sin sonido: se repite en bucle. En el móvil de quien pide menos movimiento no se reproduce."
                onCambiar={(fondoVideoUrl) => poner({ fondoVideoUrl })}
              />
              <Deslizador
                etiqueta="Velo sobre el vídeo"
                valor={t.fondoVelo}
                min={0}
                max={90}
                paso={5}
                sufijo="%"
                onCambiar={(fondoVelo) => poner({ fondoVelo })}
              />
              {!t.fondoVideoUrl && (
                <p className="mt-3 text-[13px] text-[var(--color-alerta)]">Sin vídeo, la página vuelve al halo de color.</p>
              )}
            </div>
          )}

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
              <Interruptor
                etiqueta="Desenfocar la foto"
                valor={t.fondoDesenfoque}
                onCambiar={(fondoDesenfoque) => poner({ fondoDesenfoque })}
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

          <label className="mt-5 block">
            <Etiqueta texto="Fuente solo para los títulos" opcional />
            <select
              value={t.fuenteTitulo}
              onChange={(e) => poner({ fuenteTitulo: e.target.value as Tema['fuenteTitulo'] })}
              className="h-[46px] w-full rounded-[10px] border-2 border-[var(--color-borde)] bg-white px-3 text-[15px] outline-none focus:border-[var(--color-acento)]"
            >
              <option value="">La de la pareja elegida</option>
              {FUENTES.map((f) => (
                <option key={f.clave} value={f.clave}>
                  {f.etiqueta} — {f.pista}
                </option>
              ))}
            </select>
          </label>

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

          <Deslizador
            etiqueta="Redondez a medida"
            valor={t.radio < 0 ? (t.botones === 'rectos' ? 3 : t.botones === 'suaves' ? 20 : t.botones === 'pildora' ? 40 : 14) : t.radio}
            min={0}
            max={40}
            paso={1}
            sufijo=" px"
            onCambiar={(radio) => poner({ radio })}
            restablecer={t.radio >= 0 ? () => poner({ radio: -1 }) : undefined}
          />

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <Etiqueta texto="Sombra" />
              <Segmentado opciones={SOMBRAS} valor={t.sombra} onCambiar={(sombra) => poner({ sombra })} />
            </div>
            <div>
              <Etiqueta texto="Borde" />
              <Segmentado
                opciones={[0, 1, 2, 3].map((n) => ({ clave: String(n) as '0' | '1' | '2' | '3', etiqueta: n === 0 ? 'Sin borde' : `${n} px` }))}
                valor={String(t.bordeBoton) as '0' | '1' | '2' | '3'}
                onCambiar={(v) => poner({ bordeBoton: Number(v) })}
              />
            </div>
          </div>

          <div className="mt-5">
            <Etiqueta texto="Iconos de los botones" />
            <Segmentado opciones={ICONOS_POS} valor={t.iconoBoton} onCambiar={(iconoBoton) => poner({ iconoBoton })} />
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

        <Tarjeta titulo="Redes sociales">
          <Etiqueta texto="Dónde van" />
          <Segmentado
            opciones={REDES_POSICIONES}
            valor={t.redesPosicion}
            onCambiar={(redesPosicion) => poner({ redesPosicion })}
          />
          <div className="mt-4">
            <Etiqueta texto="Cómo se ven" />
            <Segmentado opciones={REDES_ESTILOS} valor={t.redesEstilo} onCambiar={(redesEstilo) => poner({ redesEstilo })} />
          </div>
          <p className="mt-2 text-[12.5px] text-[var(--color-tinta-40)]">
            Se aplica al bloque de redes sociales. Si no tienes uno, añádelo en Contenido.
          </p>
        </Tarjeta>

        <Tarjeta titulo="Efectos" bloqueada={!avanzado ? candado : null}>
          <Etiqueta texto="Al abrir la página" />
          <Segmentado
            opciones={ENTRADAS}
            valor={t.entrada}
            bloqueadas={avanzado ? [] : ENTRADAS.map((e) => e.clave).filter((c) => c !== 'ninguna')}
            onCambiar={(entrada) => poner({ entrada })}
          />
          <div className="mt-4">
            <Etiqueta texto="Al pasar por encima de un botón" />
            <Segmentado
              opciones={HOVERS}
              valor={t.efectoHover}
              bloqueadas={avanzado ? [] : HOVERS.map((e) => e.clave).filter((c) => c !== 'elevar')}
              onCambiar={(efectoHover) => poner({ efectoHover })}
            />
          </div>
          <p className="mt-2 text-[12.5px] text-[var(--color-tinta-40)]">
            Siempre suaves. Quien tenga activado «reducir movimiento» en su móvil no los verá.
          </p>
        </Tarjeta>
      </div>

      <div className="lg:sticky lg:top-5">
        <Previa
          bloques={bloques}
          tema={t}
          avatarUrl={estado.avatarUrl}
          portadaUrl={estado.portadaUrl}
          etiqueta={estado.etiqueta}
          titulo={titulo}
          descripcion={descripcion}
          compacta
        />
        {PRESETS_OSCUROS.includes(t.preset) &&
          textoSobre(colorValido(t.acento) ? t.acento : '#FF5D2E') === '#14120f' && (
            <p className="mt-2 rounded-[10px] bg-[#FFF6E8] p-2.5 text-[12.5px] leading-snug text-[var(--color-tinta-80)]">
              Con este fondo oscuro y ese color, la letra del botón principal sale negra. Se lee,
              pero un color más oscuro luce mejor aquí.
            </p>
          )}
      </div>
    </div>
  )
}

// ── Piezas de interfaz ───────────────────────────────────────────────────────

function Tarjeta({
  titulo,
  bloqueada,
  children,
}: {
  titulo: string
  /** Texto del candado si el plan no lo incluye. */
  bloqueada?: string | null
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">{titulo}</h2>
        {bloqueada && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-borde-suave)] px-2.5 py-1 text-[12px] font-semibold">
            <IconoCandado tam={13} />
            {bloqueada}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-[10px] bg-[#FFF6E8] p-2.5 text-[12.5px] leading-snug text-[var(--color-tinta-80)]">
      {children}
    </p>
  )
}

function Deslizador({
  etiqueta,
  valor,
  min,
  max,
  paso,
  sufijo,
  onCambiar,
  restablecer,
}: {
  etiqueta: string
  valor: number
  min: number
  max: number
  paso: number
  sufijo: string
  onCambiar: (v: number) => void
  restablecer?: () => void
}) {
  return (
    <label className="mt-4 block">
      <span className="mb-1.5 flex items-center justify-between text-[14px] font-medium">
        {etiqueta}
        <span className="flex items-center gap-2">
          {restablecer && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                restablecer()
              }}
              className="text-[12.5px] font-semibold text-[var(--color-azul)]"
            >
              Usar la forma
            </button>
          )}
          <span className="tabular-nums text-[var(--color-tinta-40)]">
            {valor}
            {sufijo}
          </span>
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => onCambiar(Number(e.target.value))}
        className="w-full accent-[var(--color-acento)]"
      />
    </label>
  )
}

/** Un color que puede quedarse vacío (= el de la paleta). */
function ColorOpcional({
  etiqueta,
  valor,
  vacio = 'El de la paleta',
  onCambiar,
}: {
  etiqueta: string
  valor: string
  vacio?: string
  onCambiar: (v: string) => void
}) {
  const [texto, setTexto] = useState(valor)
  const valido = colorValido(texto)
  // Si el valor cambia desde fuera (una plantilla, "Quitar"), el campo de
  // texto lo sigue; si el usuario está a medio escribir, no se le pisa.
  useEffect(() => {
    setTexto((actual) => (actual === '' || colorValido(actual) ? valor : actual))
  }, [valor])
  return (
    <div>
      <span className="mb-1 block text-[13px] font-medium">{etiqueta}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={etiqueta}
          value={colorValido(valor) ? valor : '#ffffff'}
          onChange={(e) => {
            setTexto(e.target.value)
            onCambiar(e.target.value)
          }}
          className="h-[40px] w-[48px] shrink-0 cursor-pointer rounded-[9px] border-2 border-[var(--color-borde)] bg-white p-1"
        />
        <input
          value={texto}
          onChange={(e) => {
            const v = e.target.value.trim()
            setTexto(v)
            if (v === '' || colorValido(v)) onCambiar(v)
          }}
          placeholder={vacio}
          spellCheck={false}
          className={`h-[40px] min-w-0 flex-1 rounded-[9px] border-2 px-2.5 font-mono text-[13px] uppercase outline-none placeholder:font-sans placeholder:normal-case ${
            texto && !valido ? 'border-[var(--color-alerta)]' : 'border-[var(--color-borde)]'
          }`}
        />
        {valor && (
          <button
            type="button"
            onClick={() => {
              setTexto('')
              onCambiar('')
            }}
            className="shrink-0 text-[12.5px] font-semibold text-[var(--color-tinta-60)]"
          >
            Quitar
          </button>
        )}
      </div>
    </div>
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
  bloqueadas = [],
  onCambiar,
}: {
  opciones: { clave: T; etiqueta: string }[]
  valor: T
  /** Opciones que el plan no da: se ven con candado y no se pueden elegir. */
  bloqueadas?: T[]
  onCambiar: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const cerrada = bloqueadas.includes(o.clave)
        return (
          <button
            key={o.clave}
            type="button"
            disabled={cerrada}
            onClick={() => onCambiar(o.clave)}
            aria-pressed={valor === o.clave}
            className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              valor === o.clave
                ? 'border-[var(--color-tinta)] bg-[var(--color-tinta)] text-white'
                : 'border-[var(--color-borde)] hover:border-[var(--color-tinta-40)]'
            }`}
          >
            {cerrada && <IconoCandado tam={12} />}
            {o.etiqueta}
          </button>
        )
      })}
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
