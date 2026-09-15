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
import { iconoDeBoton } from '@/iconos/botones'
import { colorValido, textoSobre } from './tema'
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
  type ExtrasBoton,
  type RedSocial,
  type TipoBloque,
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
          {c.titulo && <h2 className="te-titulo te-titulo-2">{c.titulo}</h2>}
          {c.texto && <p className="te-parrafo mt-1.5">{c.texto}</p>}
        </div>
      )
    }

    case 'WHATSAPP': {
      const c = bloque.config as ConfigWhatsapp
      return (
        <Boton
          comun={comun}
          extras={c}
          tipo="WHATSAPP"
          href={urlWhatsapp(c, origen)}
          externo
          principal={c.texto}
        />
      )
    }

    case 'LLAMAR': {
      const c = bloque.config as ConfigLlamar
      return (
        <Boton comun={comun} extras={c} tipo="LLAMAR" href={`tel:+${c.telefono}`} principal={c.texto} />
      )
    }

    case 'UBICACION': {
      const c = bloque.config as ConfigUbicacion
      return (
        <Boton
          comun={comun}
          extras={c}
          tipo="UBICACION"
          href={urlMapa(c)}
          externo
          principal={c.texto}
          secundaria={c.direccion}
        />
      )
    }

    case 'ENLACE': {
      const c = bloque.config as ConfigEnlace
      return (
        <Boton
          comun={comun}
          extras={c}
          tipo="ENLACE"
          href={c.url}
          externo
          principal={c.texto}
          secundaria={c.descripcion}
          sinIconoPorDefecto
        />
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
          className="te-tarjeta p-5"
        >
          <input type="hidden" name="bloqueId" value={bloque.id} />
          <input type="hidden" name="paginaId" value={bloque.pageId} />
          <p className="te-titulo te-titulo-2 mb-3.5 text-center">{c.texto}</p>

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

          <p className="te-menudo mt-3 text-center">
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
 * Un botón de la página.
 *
 * Los cuatro tipos que se pintan como botón comparten exactamente el mismo
 * marcado. Tenerlos en cuatro copias era lo que hacía que arreglar el icono en
 * uno dejara los otros tres torcidos.
 *
 * El color propio se aplica pisando --p-acento SOLO en este elemento. Así el
 * botón hereda todo lo demás del tema (forma, sombra, estilo) y basta con que
 * el CSS use la variable: no hay una segunda vía de estilos que mantener.
 */
function Boton({
  comun,
  extras,
  tipo,
  href,
  externo,
  principal,
  secundaria,
  sinIconoPorDefecto,
}: {
  comun: Record<string, string>
  extras: ExtrasBoton
  tipo: Extract<TipoBloque, 'WHATSAPP' | 'LLAMAR' | 'UBICACION' | 'ENLACE'>
  href: string
  externo?: boolean
  principal: string
  secundaria?: string
  sinIconoPorDefecto?: boolean
}) {
  const Elegido = iconoDeBoton(extras.icono)
  const PorDefecto = sinIconoPorDefecto ? null : ICONO_BLOQUE[tipo]
  const Icono = Elegido ?? PorDefecto

  const color = extras.color && colorValido(extras.color) ? extras.color : null
  const estilo = color
    ? ({ '--p-acento': color, '--p-acento-texto': textoSobre(color) } as React.CSSProperties)
    : undefined

  return (
    <a
      {...comun}
      className="te-boton"
      data-destacado={extras.destacado ? 'si' : undefined}
      style={estilo}
      href={href}
      {...(externo ? { target: '_blank', rel: 'noopener noreferrer nofollow ugc' } : {})}
    >
      {/* La miniatura manda sobre el icono: si el dueño ha subido una foto del
          producto, es más informativa que cualquier dibujo. */}
      {extras.imagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={extras.imagen} alt="" className="te-miniatura" loading="lazy" decoding="async" />
      ) : (
        Icono && <Icono tam={20} />
      )}
      <Etiquetas principal={principal} secundaria={secundaria} />
    </a>
  )
}

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
      {c.etiqueta && <p className="te-etiqueta mb-2">{c.etiqueta}</p>}
      {c.titulo && <h1 className="te-titulo te-titulo-1">{c.titulo}</h1>}
      {c.texto && <p className="te-parrafo mx-auto mt-2.5 max-w-[42ch]">{c.texto}</p>}
    </header>
  )
}

function Etiquetas({ principal, secundaria }: { principal: string; secundaria?: string }) {
  if (!secundaria) return <span>{principal}</span>
  return (
    <span className="flex flex-col items-center leading-tight">
      <span>{principal}</span>
      <span className="mt-0.5 font-normal opacity-65" style={{ fontSize: 'var(--p-tam-menudo)' }}>
        {secundaria}
      </span>
    </span>
  )
}
