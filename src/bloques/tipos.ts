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
  /** Animación para llamar la atención. Plan con `animaciones`. */
  animacion?: AnimacionBoton
}

export type AnimacionBoton = 'pulso' | 'brillo' | 'vaiven'

/**
 * Programación: el bloque solo se ve entre estas dos fechas (ISO). Plan con
 * `programar`. Se copia a blocks.visibleDesde/visibleHasta al guardar.
 */
export type Programa = { desde?: string; hasta?: string }

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

export type ProveedorVideo = 'youtube' | 'tiktok' | 'vimeo'

export type ConfigVideo = {
  url: string
  titulo?: string
  /** Se deducen de la URL al guardar. */
  proveedor: ProveedorVideo
  idVideo: string
  /** YouTube Shorts y TikTok son verticales. */
  vertical?: boolean
}

export type ConfigGaleria = {
  titulo?: string
  imagenes: { url: string; alt?: string }[]
}

export type ConfigFaq = {
  titulo?: string
  preguntas: { pregunta: string; respuesta: string }[]
}

export const DIAS_SEMANA = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const
export type DiaSemana = (typeof DIAS_SEMANA)[number]

export type ConfigHorario = {
  titulo?: string
  /** "9:00-14:00, 17:00-20:00". Vacío o ausente = cerrado. */
  dias: Partial<Record<DiaSemana, string>>
  /** Canarias va una hora por detrás de la península. */
  canarias?: boolean
}

/**
 * Reservar cita: el visitante elige día y hora entre los huecos libres. La
 * cita entra en el pipeline (etapa CITA) con la red de la que vino, y los dos,
 * visitante y dueño, reciben el botón para meterla en su Google Calendar.
 */
export type ConfigReserva = ExtrasBoton & {
  /** Título del bloque: «Reserva tu cita» */
  texto: string
  /** Qué se reserva: el título del evento en el calendario. «Corte de pelo» */
  servicio: string
  /** Minutos, como texto (los campos del editor son cadenas). */
  duracion: string
  /** Cuándo atiendes. Mismo formato que el horario: "9:00-14:00, 17:00-20:00" */
  dias: Partial<Record<DiaSemana, string>>
  canarias?: boolean
  /** Horas mínimas de antelación para reservar. */
  antelacion: string
  /** Hasta cuántos días vista se puede reservar. */
  diasVista: string
  /** Dónde: aparece en el evento del calendario. Opcional. */
  direccion?: string
  /** A quién avisar. Si falta, al correo de la cuenta. */
  emailAvisos?: string
  textoExito?: string
}

export type ConfigSeparador = {
  titulo: string
}

export type ConfigPorTipo = {
  ENLACE: ConfigEnlace
  WHATSAPP: ConfigWhatsapp
  LLAMAR: ConfigLlamar
  UBICACION: ConfigUbicacion
  REDES: ConfigRedes
  TEXTO: ConfigTexto
  IMAGEN: ConfigImagen
  FORMULARIO: ConfigFormulario
  VIDEO: ConfigVideo
  GALERIA: ConfigGaleria
  FAQ: ConfigFaq
  HORARIO: ConfigHorario
  RESERVA: ConfigReserva
  SEPARADOR: ConfigSeparador
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
  VIDEO: {
    nombre: 'Vídeo',
    descripcion: 'Un vídeo de YouTube, TikTok o Vimeo',
    esConversion: false,
  },
  GALERIA: {
    nombre: 'Galería',
    descripcion: 'Varias fotos que se deslizan',
    esConversion: false,
  },
  FAQ: {
    nombre: 'Preguntas',
    descripcion: 'Preguntas frecuentes que se despliegan',
    esConversion: false,
  },
  HORARIO: {
    nombre: 'Horario',
    descripcion: 'Tu horario y si estás abierto ahora',
    esConversion: false,
  },
  RESERVA: {
    nombre: 'Reservar cita',
    descripcion: 'Un calendario para que te reserven hora',
    esConversion: true,
  },
  SEPARADOR: {
    nombre: 'Sección',
    descripcion: 'Un título para separar grupos de botones',
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
    case 'RESERVA':
      return 'CITA'
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
