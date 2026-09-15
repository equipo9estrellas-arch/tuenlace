/**
 * Los 8 bloques del MVP. La lista cerrada del blueprint (bloque 2, punto 6.3).
 *
 * "Un negocio local usa cinco bloques. Construir treinta es hacer producto
 *  para sentirse completo, no porque alguien lo pida."
 *
 * Añadir un tipo aquí es una decisión de producto, no un detalle técnico:
 * exige añadirlo también al enum de la base de datos y al editor.
 */

import type { TipoBloque } from './registro'

/**
 * Personalización que comparten todos los bloques que se pintan como botón.
 *
 * Lo que NO está aquí, y es deliberado: tamaño de letra, alineación y posición.
 * La jerarquía la sigue decidiendo el orden (ver recalcularPrioridades). Si
 * cada botón pudiera declararse "grande", el dueño pondría ocho grandes y no
 * destacaría ninguno, que es exactamente el problema que resuelve el producto.
 */
export type ExtrasBoton = {
  /** Color propio. Si falta, el acento de la página. */
  color?: string
  /** Clave de ICONOS_BOTON. Si falta, el icono propio del tipo de bloque. */
  icono?: string
  /** Miniatura cuadrada a la izquierda del texto */
  imagen?: string
  /** Lo pinta como el botón principal aunque no sea el primero */
  destacado?: boolean
}

export type ConfigEnlace = ExtrasBoton & {
  texto: string
  url: string
  objetivo?: string
  descripcion?: string
}

export type ConfigWhatsapp = ExtrasBoton & {
  texto: string
  /** Solo dígitos, con prefijo de país. Ej: 34612345678 */
  telefono: string
  /** Mensaje pretecleado. Sube la conversión y permite atribuir el origen. */
  mensaje: string
}

export type ConfigLlamar = ExtrasBoton & {
  texto: string
  telefono: string
}

export type ConfigUbicacion = ExtrasBoton & {
  texto: string
  direccion: string
  /** Opcional: si el usuario pega su enlace de Google Maps */
  urlMapa?: string
}

export type ConfigRedes = {
  redes: Partial<Record<RedSocial, string>>
}

export type RedSocial =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'youtube'
  | 'linkedin'
  | 'x'
  | 'web'

export type ConfigTexto = {
  titulo?: string
  texto?: string
  /** Solo en la cabecera: la línea pequeña sobre el título ("Peluquería · La Laguna") */
  etiqueta?: string
  alineacion?: 'izquierda' | 'centro'
  esCabecera?: boolean
}

export type ConfigImagen = {
  url: string
  alt: string
  enlace?: string
  formato?: 'ancho' | 'cuadrado' | 'circulo'
}

export type ConfigFormulario = {
  texto: string
  campos: CampoFormulario[]
  emailAvisos: string
  textoExito: string
  textoLegal?: string
}

export type CampoFormulario = 'nombre' | 'telefono' | 'email' | 'mensaje'

export type ConfigPorTipo = {
  ENLACE: ConfigEnlace
  WHATSAPP: ConfigWhatsapp
  LLAMAR: ConfigLlamar
  UBICACION: ConfigUbicacion
  REDES: ConfigRedes
  TEXTO: ConfigTexto
  IMAGEN: ConfigImagen
  FORMULARIO: ConfigFormulario
}

export type { TipoBloque }

/** Metadatos para el editor: nombre, descripción y si consume cupo. */
export const META_BLOQUES: Record<
  TipoBloque,
  { nombre: string; descripcion: string; esConversion: boolean }
> = {
  WHATSAPP: {
    nombre: 'WhatsApp',
    descripcion: 'Abre WhatsApp con un mensaje ya escrito',
    esConversion: true,
  },
  LLAMAR: {
    nombre: 'Llamar',
    descripcion: 'Marca tu teléfono directamente',
    esConversion: true,
  },
  UBICACION: {
    nombre: 'Cómo llegar',
    descripcion: 'Tu dirección y el enlace al mapa',
    esConversion: true,
  },
  FORMULARIO: {
    nombre: 'Recoger datos',
    descripcion: 'Un formulario corto; te avisamos por correo',
    esConversion: true,
  },
  ENLACE: {
    nombre: 'Botón',
    descripcion: 'Un botón que lleva a donde quieras',
    esConversion: false,
  },
  REDES: {
    nombre: 'Redes sociales',
    descripcion: 'Los iconos de tus redes',
    esConversion: false,
  },
  TEXTO: {
    nombre: 'Texto',
    descripcion: 'Un título o un párrafo',
    esConversion: false,
  },
  IMAGEN: {
    nombre: 'Imagen',
    descripcion: 'Una foto o un banner',
    esConversion: false,
  },
}

/** Qué conversión registra cada tipo de bloque, si registra alguna. */
export function tipoConversionDe(tipo: TipoBloque, config: Record<string, unknown>):
  | 'CONTACTO'
  | 'CITA'
  | 'LEAD'
  | 'CATALOGO'
  | null {
  switch (tipo) {
    case 'WHATSAPP':
    case 'LLAMAR':
      return 'CONTACTO'
    case 'FORMULARIO':
      return 'LEAD'
    case 'ENLACE': {
      const objetivo = config.objetivo
      if (objetivo === 'cita') return 'CITA'
      if (objetivo === 'catalogo') return 'CATALOGO'
      return null
    }
    default:
      return null
  }
}

// ── Construcción de URLs ─────────────────────────────────────────────────────

export function urlWhatsapp(config: ConfigWhatsapp, origen?: string): string {
  const mensaje = origen
    ? `${config.mensaje} (${origen})`
    : config.mensaje
  return `https://wa.me/${config.telefono}?text=${encodeURIComponent(mensaje)}`
}

export function urlMapa(config: ConfigUbicacion): string {
  if (config.urlMapa) return config.urlMapa
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.direccion)}`
}

export const URLS_REDES: Record<RedSocial, (usuario: string) => string> = {
  instagram: (u) => `https://instagram.com/${u}`,
  tiktok: (u) => `https://tiktok.com/@${u}`,
  facebook: (u) => `https://facebook.com/${u}`,
  youtube: (u) => (u.startsWith('@') ? `https://youtube.com/${u}` : `https://youtube.com/@${u}`),
  linkedin: (u) => `https://linkedin.com/in/${u}`,
  x: (u) => `https://x.com/${u}`,
  web: (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`),
}

export const NOMBRES_REDES: Record<RedSocial, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  web: 'Web',
}
