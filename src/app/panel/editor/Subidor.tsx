'use client'

import { useRef, useState } from 'react'
import { IconoPapelera, IconoSubir } from '@/iconos'

/**
 * Elegir una imagen: subirla, o pegar su dirección.
 *
 * Vive aparte porque lo usan dos sitios que no se conocen entre sí: la pestaña
 * de marca (logo, portada, fondo) y los campos de tipo imagen de cualquier
 * bloque. Cuando estaban duplicados, arreglar el recorte en uno dejaba el otro
 * con el corte antiguo.
 *
 * El campo de pegar la URL aparece siempre, no solo cuando la subida está
 * apagada: hay clientes que ya tienen la foto en su web y pegar el enlace es
 * más rápido que descargarla para volver a subirla.
 */
export function Subidor({
  valor,
  puedeSubir,
  forma,
  ayuda,
  onCambiar,
}: {
  valor: string
  puedeSubir: boolean
  forma: 'circulo' | 'redondeado' | 'cuadrado' | 'ancho'
  ayuda?: string
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
      const datos = (await respuesta.json().catch(() => ({}))) as {
        ok?: boolean
        url?: string
        error?: string
      }
      if (datos.ok && datos.url) onCambiar(datos.url)
      else setFallo(datos.error ?? `No hemos podido subir la imagen (${respuesta.status}).`)
    } catch {
      setFallo('No hemos podido subir la imagen. Revisa tu conexión.')
    } finally {
      setSubiendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  // La portada y el fondo son apaisados: en fila, la muestra se come el ancho
  // y deja el botón sin sitio. Se apilan.
  const apilado = forma === 'ancho'
  const clasesMuestra = apilado
    ? 'h-20 w-full rounded-[10px]'
    : forma === 'cuadrado'
      ? 'h-16 w-16 rounded-[4px]'
      : forma === 'redondeado'
        ? 'h-16 w-16 rounded-[14px]'
        : 'h-16 w-16 rounded-full'

  return (
    <div>
      <div className={apilado ? 'flex flex-col gap-2.5' : 'flex items-center gap-3'}>
        {valor ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={valor}
            alt=""
            className={`${clasesMuestra} shrink-0 border border-[var(--color-borde)] bg-[var(--color-borde-suave)] object-cover`}
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
              title={puedeSubir ? undefined : 'La subida de ficheros no está activada'}
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
          {ayuda && <p className="text-[12.5px] leading-snug text-[var(--color-tinta-40)]">{ayuda}</p>}
        </div>
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,.jpg,.jpeg,.png,.webp,.avif,.gif"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void subir(f)
        }}
      />

      <label className="mt-2 block">
        <span className="sr-only">Dirección de la imagen</span>
        <input
          value={valor}
          onChange={(e) => onCambiar(e.target.value.trim())}
          placeholder={puedeSubir ? 'o pega aquí la dirección de una imagen' : 'https://…'}
          spellCheck={false}
          className="h-[40px] w-full rounded-[9px] border-2 border-[var(--color-borde)] px-3 text-[14px] outline-none focus:border-[var(--color-acento)]"
        />
      </label>

      {!puedeSubir && (
        <p className="mt-1.5 text-[12.5px] leading-snug text-[var(--color-tinta-40)]">
          La subida de ficheros todavía no está activada en este servidor.
        </p>
      )}

      {fallo && <p className="mt-1.5 text-[13px] text-[var(--color-alerta)]">{fallo}</p>}
    </div>
  )
}
