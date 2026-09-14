/**
 * Renderizado de los bloques en la página pública.
 *
 * Reglas no negociables (blueprint bloque 3, punto 9.1):
 *   · Todo son enlaces <a> reales: la página FUNCIONA SIN JAVASCRIPT.
 *     El tracking se añade encima; si el JS falla, los botones siguen yendo
 *     donde tienen que ir.
 *   · Botones grandes, contraste alto, un pulgar en la calle.
 *   · La acción principal cabe en la primera pantalla.
 */

import type { Block } from '@/db/schema'
import {
  NOMBRES_REDES,
  URLS_REDES,
  urlMapa,
  urlWhatsapp,
  type ConfigEnlace,
  type ConfigFormulario,
  type ConfigImagen,
  type ConfigLlamar,
  type ConfigRedes,
  type ConfigTexto,
  type ConfigUbicacion,
  type ConfigWhatsapp,
  type RedSocial,
} from './tipos'

type Props = {
  bloque: Block
  /** De dónde viene el visitante: alimenta el mensaje de WhatsApp y el tracking */
  origen?: string
}

export function RenderBloque({ bloque, origen }: Props) {
  const comun = {
    'data-bloque': bloque.id,
    'data-prioridad': String(bloque.prioridad),
    'data-tipo': bloque.tipo,
  }

  switch (bloque.tipo) {
    case 'TEXTO': {
      const c = bloque.config as ConfigTexto
      if (c.esCabecera) {
        return (
          <header className="mb-7 text-center">
            {c.titulo && (
              <h1 className="text-[26px] font-bold leading-[1.2] tracking-[-0.02em]">{c.titulo}</h1>
            )}
            {c.texto && (
              <p
                className="mx-auto mt-2.5 max-w-[34ch] text-[15.5px] leading-[1.55]"
                style={{ color: 'var(--p-texto-suave)' }}
              >
                {c.texto}
              </p>
            )}
          </header>
        )
      }
      return (
        <div className={c.alineacion === 'centro' ? 'py-1.5 text-center' : 'py-1.5'}>
          {c.titulo && <h2 className="text-[18px] font-semibold">{c.titulo}</h2>}
          {c.texto && (
            <p className="mt-1 text-[15px] leading-[1.55]" style={{ color: 'var(--p-texto-suave)' }}>
              {c.texto}
            </p>
          )}
        </div>
      )
    }

    case 'WHATSAPP': {
      const c = bloque.config as ConfigWhatsapp
      return (
        <a
          {...comun}
          className="te-boton"
          href={urlWhatsapp(c, origen)}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
        >
          <IconoWhatsapp />
          {c.texto}
        </a>
      )
    }

    case 'LLAMAR': {
      const c = bloque.config as ConfigLlamar
      return (
        <a {...comun} className="te-boton" href={`tel:+${c.telefono}`}>
          <IconoTelefono />
          {c.texto}
        </a>
      )
    }

    case 'UBICACION': {
      const c = bloque.config as ConfigUbicacion
      return (
        <a
          {...comun}
          className="te-boton"
          href={urlMapa(c)}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
        >
          <IconoUbicacion />
          <span className="flex flex-col items-center leading-tight">
            <span>{c.texto}</span>
            <span className="text-[12.5px] font-normal opacity-70">{c.direccion}</span>
          </span>
        </a>
      )
    }

    case 'ENLACE': {
      const c = bloque.config as ConfigEnlace
      return (
        <a
          {...comun}
          className="te-boton"
          href={c.url}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
        >
          <span className="flex flex-col items-center leading-tight">
            <span>{c.texto}</span>
            {c.descripcion && (
              <span className="text-[12.5px] font-normal opacity-70">{c.descripcion}</span>
            )}
          </span>
        </a>
      )
    }

    case 'REDES': {
      const c = bloque.config as ConfigRedes
      const entradas = Object.entries(c.redes).filter(([, v]) => Boolean(v)) as [RedSocial, string][]
      if (entradas.length === 0) return null
      return (
        <nav {...comun} className="flex flex-wrap justify-center gap-2.5 py-1" aria-label="Redes sociales">
          {entradas.map(([red, usuario]) => (
            <a
              key={red}
              href={URLS_REDES[red](usuario)}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              data-bloque={bloque.id}
              data-red={red}
              aria-label={NOMBRES_REDES[red]}
              className="flex h-11 min-w-11 items-center justify-center rounded-full border px-4 text-[14px] font-medium"
              style={{ borderColor: 'var(--p-borde)', background: 'var(--p-tarjeta)' }}
            >
              {NOMBRES_REDES[red]}
            </a>
          ))}
        </nav>
      )
    }

    case 'IMAGEN': {
      const c = bloque.config as ConfigImagen
      const clase =
        c.formato === 'circulo'
          ? 'mx-auto h-24 w-24 rounded-full object-cover'
          : c.formato === 'cuadrado'
            ? 'mx-auto aspect-square w-full rounded-[var(--p-radio)] object-cover'
            : 'w-full rounded-[var(--p-radio)] object-cover'
      // eslint-disable-next-line @next/next/no-img-element
      const img = <img src={c.url} alt={c.alt} className={clase} loading="lazy" />
      return c.enlace ? (
        <a {...comun} href={c.enlace} target="_blank" rel="noopener noreferrer nofollow ugc">
          {img}
        </a>
      ) : (
        <div {...comun}>{img}</div>
      )
    }

    case 'FORMULARIO': {
      const c = bloque.config as ConfigFormulario
      return (
        <form
          {...comun}
          method="post"
          action="/api/lead"
          className="rounded-[var(--p-radio)] border p-4"
          style={{ borderColor: 'var(--p-borde)', background: 'var(--p-tarjeta)' }}
        >
          <input type="hidden" name="bloqueId" value={bloque.id} />
          <input type="hidden" name="paginaId" value={bloque.pageId} />
          <p className="mb-3 text-center text-[16px] font-semibold">{c.texto}</p>

          <div className="flex flex-col gap-2">
            {c.campos.includes('nombre') && (
              <input
                name="nombre"
                required
                autoComplete="name"
                placeholder="Tu nombre"
                className="h-12 rounded-[var(--p-radio)] border px-3.5 text-[16px]"
                style={{ borderColor: 'var(--p-borde)', background: 'var(--p-fondo)' }}
              />
            )}
            {c.campos.includes('telefono') && (
              <input
                name="telefono"
                type="tel"
                required
                autoComplete="tel"
                placeholder="Tu teléfono"
                className="h-12 rounded-[var(--p-radio)] border px-3.5 text-[16px]"
                style={{ borderColor: 'var(--p-borde)', background: 'var(--p-fondo)' }}
              />
            )}
            {c.campos.includes('email') && (
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Tu correo"
                className="h-12 rounded-[var(--p-radio)] border px-3.5 text-[16px]"
                style={{ borderColor: 'var(--p-borde)', background: 'var(--p-fondo)' }}
              />
            )}
            {c.campos.includes('mensaje') && (
              <textarea
                name="mensaje"
                rows={3}
                placeholder="¿Qué necesitas?"
                className="rounded-[var(--p-radio)] border p-3.5 text-[16px]"
                style={{ borderColor: 'var(--p-borde)', background: 'var(--p-fondo)' }}
              />
            )}
          </div>

          {/* Trampa para bots: un humano nunca rellena esto */}
          <input
            type="text"
            name="empresa_web"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          <button type="submit" className="te-boton mt-3" data-prioridad={bloque.prioridad}>
            Enviar
          </button>

          <p className="mt-2.5 text-center text-[11.5px] leading-snug" style={{ color: 'var(--p-texto-suave)' }}>
            {c.textoLegal ??
              'Al enviar aceptas que guardemos tus datos para responderte. Nada más.'}
          </p>
        </form>
      )
    }

    default:
      return null
  }
}

// ── Iconos ───────────────────────────────────────────────────────────────────
// SVG en línea: sin librería de iconos, sin petición extra, sin JavaScript.

function IconoWhatsapp() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.004c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.004a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29Z" />
    </svg>
  )
}

function IconoTelefono() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  )
}

function IconoUbicacion() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
