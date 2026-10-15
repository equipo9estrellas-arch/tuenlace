'use client'

import { useMemo } from 'react'
import type { Block, Tema } from '@/db/schema'
import { RenderBloque } from '@/bloques/Render'
import { conservarInternos, normalizarConfig, recalcularPrioridades } from '@/bloques/campos'
import { colorValido, textoSobre } from '@/bloques/tema'
import type { TipoBloque } from '@/bloques/registro'

/**
 * VISTA PREVIA REAL
 *
 * Antes esto eran tres <span> con los textos "Escríbenos por WhatsApp", "Pedir
 * cita" y "Cómo llegar" escritos a mano: un negocio con un botón veía tres, y
 * uno sin WhatsApp veía un botón de WhatsApp. El propio comentario del fichero
 * advertía de que en cuanto la maqueta y la página se separan, la vista previa
 * miente y el cliente publica algo que no ha visto.
 *
 * Ahora se pintan los bloques del editor con el MISMO componente que usa la
 * página pública, así que no pueden divergir. RenderBloque no toca el servidor:
 * solo tipos, iconos y funciones puras.
 */

export type BloqueParaPrevia = {
  id: string
  tipo: TipoBloque
  activo: boolean
  config: Record<string, unknown>
  valores: Record<string, string>
  esCabecera: boolean
}

export function Previa({
  bloques,
  tema,
  avatarUrl,
  portadaUrl,
  etiqueta,
  titulo,
  descripcion,
  compacta = false,
}: {
  bloques: BloqueParaPrevia[]
  tema: Tema
  avatarUrl: string
  portadaUrl: string
  etiqueta: string
  titulo: string
  descripcion: string
  /** En la pestaña de contenido la maqueta va al lado, más estrecha. */
  compacta?: boolean
}) {
  const acento = colorValido(tema.acento) ? tema.acento : '#FF5D2E'
  const hayFoto = tema.fondo === 'imagen' && Boolean(tema.fondoImagenUrl)

  // Los bloques se normalizan igual que al guardar: lo que se ve aquí es lo que
  // se publicará. Si un bloque aún no valida, se conserva su config anterior.
  const visibles = useMemo(() => {
    const editables = bloques.filter((b) => !b.esCabecera)
    const prioridades = recalcularPrioridades(
      editables.map((b) => ({ tipo: b.tipo, activo: b.activo })),
    )

    return editables
      .map((b, i) => {
        if (!b.activo) return null
        const intento = normalizarConfig(b.tipo, b.valores)
        const config = intento.ok ? conservarInternos(b.config, intento.config) : b.config
        return {
          id: b.id,
          pageId: 'previa',
          tipo: b.tipo,
          orden: i + 1,
          activo: true,
          prioridad: prioridades[i],
          config,
        } as unknown as Block
      })
      .filter((b): b is Block => b !== null)
  }, [bloques])

  return (
    <div className={compacta ? '' : 'lg:sticky lg:top-5'}>
      <p className="mb-2 text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-60)]">
        Cómo queda
      </p>
      <div className="te-maqueta rounded-[22px] border-[7px] border-[var(--color-tinta)] shadow-xl">
        <div
          className="te-pagina"
          data-preset={tema.preset}
          data-botones={tema.botones}
          data-estilo={tema.estiloBoton}
          data-fuente={tema.fuente}
          data-fondo={hayFoto ? 'imagen' : tema.fondo}
          data-fondo-fijo={tema.fondoFijo ? 'si' : 'no'}
          data-tam={tema.tamanoTexto}
          data-ancho={tema.ancho}
          data-separacion={tema.separacion}
          style={
            {
              minHeight: 0,
              // En la vista previa la escala se reduce a la mitad larga: es un
              // móvil de 300 px, no uno de 400.
              '--p-escala':
                tema.tamanoTexto === 'compacto' ? 0.62 : tema.tamanoTexto === 'grande' ? 0.75 : 0.68,
              '--p-acento': acento,
              '--p-acento-texto': textoSobre(acento),
              ...(hayFoto
                ? {
                    '--p-fondo-img': `url("${tema.fondoImagenUrl.replace(/["()\\]/g, '')}")`,
                    '--p-velo': String(tema.fondoVelo),
                  }
                : {}),
            } as React.CSSProperties
          }
        >
          <div className={portadaUrl ? 'px-3 pb-5 pt-3' : 'px-3 pb-5 pt-7'}>
            {portadaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={portadaUrl} alt="" className="te-portada" />
            )}
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                data-forma={tema.avatarForma}
                className={`te-avatar mx-auto h-[68px] w-[68px] ${
                  portadaUrl ? '-mt-[34px] mb-3' : 'mb-3'
                }`}
              />
            )}

            <div className="text-center">
              {etiqueta && <p className="te-etiqueta mb-1.5">{etiqueta}</p>}
              <p className="te-titulo te-titulo-1">{titulo || 'Tu negocio'}</p>
              {descripcion && <p className="te-parrafo mx-auto mt-1.5 max-w-[30ch]">{descripcion}</p>}
            </div>

            <div className="te-lista mt-4">
              {visibles.map((bloque) => (
                <RenderBloque key={bloque.id} bloque={bloque} />
              ))}
            </div>

            {visibles.length === 0 && (
              <p className="te-parrafo py-6 text-center">
                Añade un botón y aparecerá aquí.
              </p>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-[var(--color-tinta-60)]">
        Es tu página real, en pequeño. Los cambios se ven aquí antes de guardar.
      </p>
    </div>
  )
}
