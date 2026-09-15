/**
 * Renderizado de los bloques en la página pública.
 *
 * Reglas no negociables (blueprint bloque 3, punto 9.1):
 *   · Todo son enlaces <a> reales: la página FUNCIONA SIN JAVASCRIPT.
 *     El tracking se añade encima; si el JS falla, los botones siguen yendo
 *     donde tienen que ir.
 *   · Botones grandes, contraste alto, un pulgar en la calle.
 *   · La acción principal cabe en la primera pantalla.
 *   · Ni un emoji. Los dibuja el sistema operativo, así que la misma página
 *     se vería distinta en cada móvil. Iconos propios en SVG.
 */

import type { Block } from '@/db/schema'
import { ICONO_BLOQUE, LOGO_RED } from '@/iconos/mapas'
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
      if (c.esCabecera) return <Cabecera c={c} />

      return (
        <div className={c.alineacion === 'centro' ? 'py-2 text-center' : 'py-2'}>
          {c.titulo && <h2 className="te-titulo text-[19px] leading-[1.25]">{c.titulo}</h2>}
          {c.texto && (
            <p
              className="mt-1.5 text-[15px] leading-[1.6]"
              style={{ color: 'var(--p-texto-suave)' }}
            >
              {c.texto}
            </p>
          )}
        </div>
      )
    }

    case 'WHATSAPP': {
      const c = bloque.config as ConfigWhatsapp
      const Icono = ICONO_BLOQUE.WHATSAPP
      return (
        <a
          {...comun}
          className="te-boton"
          href={urlWhatsapp(c, origen)}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
        >
          <Icono tam={20} />
          {c.texto}
        </a>
      )
    }

    case 'LLAMAR': {
      const c = bloque.config as ConfigLlamar
      const Icono = ICONO_BLOQUE.LLAMAR
      return (
        <a {...comun} className="te-boton" href={`tel:+${c.telefono}`}>
          <Icono tam={19} />
          {c.texto}
        </a>
      )
    }

    case 'UBICACION': {
      const c = bloque.config as ConfigUbicacion
      const Icono = ICONO_BLOQUE.UBICACION
      return (
        <a
          {...comun}
          className="te-boton"
          href={urlMapa(c)}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
        >
          <Icono tam={19} />
          <Etiquetas principal={c.texto} secundaria={c.direccion} />
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
          <Etiquetas principal={c.texto} secundaria={c.descripcion} />
        </a>
      )
    }

    case 'REDES': {
      const c = bloque.config as ConfigRedes
      const entradas = Object.entries(c.redes).filter(([, v]) => Boolean(v)) as [RedSocial, string][]
      if (entradas.length === 0) return null
      return (
        <nav
          {...comun}
          className="flex flex-wrap justify-center gap-2.5 py-1.5"
          aria-label="Redes sociales"
        >
          {entradas.map(([red, usuario]) => {
            const Logo = LOGO_RED[red]
            return (
              <a
                key={red}
                href={URLS_REDES[red](usuario)}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                data-bloque={bloque.id}
                data-red={red}
                aria-label={NOMBRES_REDES[red]}
                title={NOMBRES_REDES[red]}
                className="te-red"
              >
                <Logo tam={21} />
              </a>
            )
          })}
        </nav>
      )
    }

    case 'IMAGEN': {
      const c = bloque.config as ConfigImagen
      const clase =
        c.formato === 'circulo'
          ? 'mx-auto h-28 w-28 rounded-full object-cover'
          : c.formato === 'cuadrado'
            ? 'mx-auto aspect-square w-full rounded-[calc(var(--p-radio)+4px)] object-cover'
            : 'w-full rounded-[calc(var(--p-radio)+4px)] object-cover'
      // eslint-disable-next-line @next/next/no-img-element
      const img = (
        <img
          src={c.url}
          alt={c.alt}
          className={clase}
          loading="lazy"
          decoding="async"
          style={{ boxShadow: 'var(--p-sombra)' }}
        />
      )
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
          className="rounded-[calc(var(--p-radio)+4px)] border p-5"
          style={{
            borderColor: 'var(--p-borde)',
            background: 'var(--p-tarjeta)',
            boxShadow: 'var(--p-sombra)',
          }}
        >
          <input type="hidden" name="bloqueId" value={bloque.id} />
          <input type="hidden" name="paginaId" value={bloque.pageId} />
          <p className="te-titulo mb-3.5 text-center text-[17px]">{c.texto}</p>

          <div className="flex flex-col gap-2">
            {c.campos.includes('nombre') && (
              <input name="nombre" required autoComplete="name" placeholder="Tu nombre" className="te-campo" />
            )}
            {c.campos.includes('telefono') && (
              <input
                name="telefono"
                type="tel"
                required
                autoComplete="tel"
                placeholder="Tu teléfono"
                className="te-campo"
              />
            )}
            {c.campos.includes('email') && (
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Tu correo"
                className="te-campo"
              />
            )}
            {c.campos.includes('mensaje') && (
              <textarea name="mensaje" rows={3} placeholder="¿Qué necesitas?" className="te-campo" />
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

          <button type="submit" className="te-boton mt-3.5" data-prioridad={bloque.prioridad}>
            Enviar
          </button>

          <p
            className="mt-3 text-center text-[11.5px] leading-snug"
            style={{ color: 'var(--p-texto-suave)' }}
          >
            {c.textoLegal ?? 'Al enviar aceptas que guardemos tus datos para responderte. Nada más.'}
          </p>
        </form>
      )
    }

    default:
      return null
  }
}

// ── Piezas ───────────────────────────────────────────────────────────────────

/**
 * La cabecera: etiqueta, título y descripción.
 *
 * La portada y el logo van por encima, y los pinta la propia página
 * ([slug]/page.tsx), porque dependen de columnas de `pages` y no del bloque.
 * Aquí solo vive el texto.
 */
function Cabecera({ c }: { c: ConfigTexto }) {
  return (
    <header className="mb-2 text-center">
      {c.etiqueta && (
        <p
          className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.13em]"
          style={{ color: 'var(--p-texto-suave)' }}
        >
          {c.etiqueta}
        </p>
      )}
      {c.titulo && <h1 className="te-titulo te-titulo-1">{c.titulo}</h1>}
      {c.texto && (
        <p
          className="mx-auto mt-2.5 max-w-[36ch] text-[15.5px] leading-[1.6]"
          style={{ color: 'var(--p-texto-suave)' }}
        >
          {c.texto}
        </p>
      )}
    </header>
  )
}

function Etiquetas({ principal, secundaria }: { principal: string; secundaria?: string }) {
  if (!secundaria) return <span>{principal}</span>
  return (
    <span className="flex flex-col items-center leading-tight">
      <span>{principal}</span>
      <span className="mt-0.5 text-[12.5px] font-normal opacity-65">{secundaria}</span>
    </span>
  )
}
