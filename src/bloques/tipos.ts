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

export type ConfigEnlace = {
  texto: string
  url: string
  objetivo?: string
  descripcion?: string
}

export type ConfigWhatsapp = {
  texto: string
  /** Solo dígitos, con prefijo de país. Ej: 34612345678 */
  telefono: string
  /** Mensaje pretecleado. Sube la conversión y permite atribuir el origen. */
  mensaje: string
}

export type ConfigLlamar = {
  texto: string
  telefono: string
}

export type ConfigUbicacion = {
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
  { nombre: string; descripcion: string; icono: string; esConversion: boolean }
> = {
  WHATSAPP: {
    nombre: 'WhatsApp',
    descripcion: 'Abre WhatsApp con un mensaje ya escrito',
    icono: '💬',
    esConversion: true,
  },
  LLAMAR: {
    nombre: 'Llamar',
    descripcion: 'Marca tu teléfono directamente',
    icono: '📞',
    esConversion: true,
  },
  UBICACION: {
    nombre: 'Cómo llegar',
    descripcion: 'Tu dirección y el enlace al mapa',
    icono: '📍',
    esConversion: true,
  },
  FORMULARIO: {
    nombre: 'Recoger datos',
    descripcion: 'Un formulario corto; te avisamos por correo',
    icono: '📋',
    esConversion: true,
  },
  ENLACE: {
    nombre: 'Botón',
    descripcion: 'Un botón que lleva a donde quieras',
    icono: '🔗',
    esConversion: false,
  },
  REDES: {
    nombre: 'Redes sociales',
    descripcion: 'Los iconos de tus redes',
    icono: '✳️',
    esConversion: false,
  },
  TEXTO: {
    nombre: 'Texto',
    descripcion: 'Un título o un párrafo',
    icono: '✍️',
    esConversion: false,
  },
  IMAGEN: {
    nombre: 'Imagen',
    descripcion: 'Una foto o un banner',
    icono: '🖼️',
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
