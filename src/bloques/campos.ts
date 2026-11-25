/**
 * QUÉ SE PUEDE EDITAR DE CADA BLOQUE
 *
 * Esta lista es el editor. No hay lienzo libre, no hay arrastrar cajas por la
 * pantalla, no se elige color por bloque ni tamaño de letra. Ocho tipos, unos
 * pocos campos cada uno, y se acabó. Está en el blueprint (bloque 2, punto
 * 6.3) como decisión cerrada: «Editor visual libre sin restricciones» es una
 * de las cosas que NO se construyen.
 *
 * El motivo no es ahorrar trabajo. Un editor libre convierte peor, porque el
 * usuario decide la jerarquía sin datos y casi siempre la decide mal: mete
 * ocho botones del mismo tamaño y ninguno destaca. La estructura la sigue
 * decidiendo el producto; lo que el usuario cambia son los textos y el orden.
 *
 * Y lo que NO se puede tocar a mano: la prioridad visual. Se deriva del orden
 * (ver `recalcularPrioridades`). Subir un botón ES hacerlo el principal.
 */

import type { TipoBloque } from './registro'
import { DIAS_SEMANA, META_BLOQUES, type RedSocial } from './tipos'
import { NOMBRES_DIA, leerTramos, reconocerVideo } from './medios'
import { CLAVES_ICONO } from '@/iconos/botones'
import { colorValido } from './tema'
import { emailValido, limpiarUsuario, soloDigitos, texto, textoLargo, urlValida } from '@/lib/normalizar'

export type TipoCampo =
  | 'texto'
  | 'textarea'
  | 'tel'
  | 'url'
  | 'email'
  | 'usuario'
  | 'color'
  | 'imagen'
  | 'icono'
  | 'interruptor'
  | 'fecha'
  | 'opciones'

export type CampoBloque = {
  /** Ruta dentro de config. Admite un nivel: "redes.instagram" */
  ruta: string
  etiqueta: string
  tipo: TipoCampo
  ayuda?: string
  obligatorio: boolean
  marcador?: string
  /** Agrupa el campo en la sección de apariencia del bloque, plegada por defecto */
  apariencia?: boolean
  /** Para tipo 'opciones'. La primera es la de por defecto. */
  opciones?: { valor: string; etiqueta: string }[]
  /**
   * Solo se enseña si esta otra ruta tiene algo. Es lo que permite listas
   * (fotos de una galería, preguntas) sin pintar doce campos vacíos: aparece
   * el siguiente hueco cuando rellenas el anterior.
   */
  mostrarSi?: string
  /** Función de pago: el editor la enseña con candado si el plan no la da. */
  pro?: 'animaciones' | 'programar'
}

/** Cuántas fotos admite una galería y cuántas preguntas un bloque de FAQ. */
export const MAX_FOTOS_GALERIA = 10
export const MAX_PREGUNTAS = 8

/**
 * Lo que se puede cambiar del ASPECTO de un botón, en todos los bloques que
 * se pintan como botón.
 *
 * Aquí no hay tamaño ni posición: eso lo decide el orden. Ver la nota de
 * ExtrasBoton en tipos.ts.
 */
const APARIENCIA_BOTON: CampoBloque[] = [
  {
    ruta: 'icono',
    etiqueta: 'Icono',
    tipo: 'icono',
    obligatorio: false,
    apariencia: true,
    ayuda: 'Si lo dejas vacío usamos el del tipo de bloque.',
  },
  {
    ruta: 'imagen',
    etiqueta: 'Miniatura',
    tipo: 'imagen',
    obligatorio: false,
    apariencia: true,
    ayuda: 'Una foto pequeña a la izquierda del texto. Sustituye al icono.',
  },
  {
    ruta: 'color',
    etiqueta: 'Color propio',
    tipo: 'color',
    obligatorio: false,
    apariencia: true,
    ayuda: 'Solo este botón. Vacío = el color de la página.',
  },
  {
    ruta: 'destacado',
    etiqueta: 'Destacar este botón',
    tipo: 'interruptor',
    obligatorio: false,
    apariencia: true,
    ayuda: 'Lo pinta grande y con color aunque no sea el primero. Úsalo con uno, no con cinco.',
  },
  {
    ruta: 'animacion',
    etiqueta: 'Animación',
    tipo: 'opciones',
    obligatorio: false,
    apariencia: true,
    pro: 'animaciones',
    opciones: [
      { valor: '', etiqueta: 'Sin animación' },
      { valor: 'pulso', etiqueta: 'Late suavemente' },
      { valor: 'brillo', etiqueta: 'Un brillo que lo cruza' },
      { valor: 'vaiven', etiqueta: 'Se balancea de vez en cuando' },
    ],
    ayuda: 'Para el botón que más te importa. Se para sola si el visitante pide menos movimiento.',
  },
]

/**
 * Programar: el bloque aparece y desaparece solo. Vale para cualquier bloque
 * (una oferta, un evento, el formulario de un sorteo).
 */
const PROGRAMACION: CampoBloque[] = [
  {
    ruta: 'programa.desde',
    etiqueta: 'Se ve a partir de',
    tipo: 'fecha',
    obligatorio: false,
    apariencia: true,
    pro: 'programar',
    ayuda: 'Vacío = desde ya.',
  },
  {
    ruta: 'programa.hasta',
    etiqueta: 'Deja de verse el',
    tipo: 'fecha',
    obligatorio: false,
    apariencia: true,
    pro: 'programar',
    ayuda: 'Vacío = siempre. Útil para ofertas y eventos.',
  },
]

const FOTOS_GALERIA: CampoBloque[] = Array.from({ length: MAX_FOTOS_GALERIA }, (_, i) => ({
  ruta: `imagenes.${i}.url`,
  etiqueta: `Foto ${i + 1}`,
  tipo: 'imagen' as const,
  obligatorio: i === 0,
  ...(i > 0 ? { mostrarSi: `imagenes.${i - 1}.url` } : {}),
}))

const PREGUNTAS_FAQ: CampoBloque[] = Array.from({ length: MAX_PREGUNTAS }, (_, i) => [
  {
    ruta: `preguntas.${i}.pregunta`,
    etiqueta: `Pregunta ${i + 1}`,
    tipo: 'texto' as const,
    obligatorio: i === 0,
    marcador: i === 0 ? '¿Hace falta cita?' : undefined,
    ...(i > 0 ? { mostrarSi: `preguntas.${i - 1}.pregunta` } : {}),
  },
  {
    ruta: `preguntas.${i}.respuesta`,
    etiqueta: `Respuesta ${i + 1}`,
    tipo: 'textarea' as const,
    obligatorio: false,
    mostrarSi: `preguntas.${i}.pregunta`,
  },
]).flat()

const DIAS_HORARIO: CampoBloque[] = DIAS_SEMANA.map((d) => ({
  ruta: `dias.${d}`,
  etiqueta: NOMBRES_DIA[d],
  tipo: 'texto' as const,
  obligatorio: false,
  marcador: d === 'dom' ? 'cerrado' : '9:00-14:00, 17:00-20:00',
}))

export const CAMPOS_POR_TIPO: Record<TipoBloque, CampoBloque[]> = {
  WHATSAPP: [
    { ruta: 'texto', etiqueta: 'Texto del botón', tipo: 'texto', obligatorio: true, marcador: 'Escríbenos por WhatsApp' },
    { ruta: 'telefono', etiqueta: 'Tu número', tipo: 'tel', obligatorio: true, ayuda: 'Con prefijo. Ejemplo: 34612345678' },
    {
      ruta: 'mensaje',
      etiqueta: 'Mensaje ya escrito',
      tipo: 'textarea',
      obligatorio: false,
      ayuda: 'Aparece escrito cuando te abren el chat. Sube la respuesta y te dice de dónde viene cada conversación.',
    },
    ...APARIENCIA_BOTON,
    ...PROGRAMACION,
  ],
  LLAMAR: [
    { ruta: 'texto', etiqueta: 'Texto del botón', tipo: 'texto', obligatorio: true, marcador: 'Llámanos' },
    { ruta: 'telefono', etiqueta: 'Tu teléfono', tipo: 'tel', obligatorio: true },
    ...APARIENCIA_BOTON,
    ...PROGRAMACION,
  ],
  UBICACION: [
    { ruta: 'texto', etiqueta: 'Texto del botón', tipo: 'texto', obligatorio: true, marcador: 'Cómo llegar' },
    { ruta: 'direccion', etiqueta: 'Dirección', tipo: 'texto', obligatorio: true, ayuda: 'Calle, número y ciudad.' },
    { ruta: 'urlMapa', etiqueta: 'Enlace de Google Maps', tipo: 'url', obligatorio: false, ayuda: 'Opcional. Si lo dejas vacío, buscamos la dirección en el mapa.' },
    ...APARIENCIA_BOTON,
    ...PROGRAMACION,
  ],
  ENLACE: [
    { ruta: 'texto', etiqueta: 'Texto del botón', tipo: 'texto', obligatorio: true },
    { ruta: 'url', etiqueta: 'A dónde lleva', tipo: 'url', obligatorio: true },
    { ruta: 'descripcion', etiqueta: 'Línea pequeña debajo', tipo: 'texto', obligatorio: false },
    ...APARIENCIA_BOTON,
    ...PROGRAMACION,
  ],
  FORMULARIO: [
    { ruta: 'texto', etiqueta: 'Título del formulario', tipo: 'texto', obligatorio: true, marcador: 'Déjanos tus datos' },
    { ruta: 'emailAvisos', etiqueta: 'Correo de avisos', tipo: 'email', obligatorio: true, ayuda: 'Aquí te llega cada persona que lo rellena.' },
    { ruta: 'textoExito', etiqueta: 'Mensaje al enviar', tipo: 'texto', obligatorio: false, marcador: '¡Gracias! Te escribimos enseguida.' },
    ...PROGRAMACION,
  ],
  REDES: [
    { ruta: 'redes.instagram', etiqueta: 'Instagram', tipo: 'usuario', obligatorio: false, ayuda: 'Solo el usuario, sin @' },
    { ruta: 'redes.tiktok', etiqueta: 'TikTok', tipo: 'usuario', obligatorio: false },
    { ruta: 'redes.facebook', etiqueta: 'Facebook', tipo: 'usuario', obligatorio: false },
    { ruta: 'redes.youtube', etiqueta: 'YouTube', tipo: 'usuario', obligatorio: false },
    { ruta: 'redes.linkedin', etiqueta: 'LinkedIn', tipo: 'usuario', obligatorio: false },
    { ruta: 'redes.x', etiqueta: 'X', tipo: 'usuario', obligatorio: false },
    { ruta: 'redes.web', etiqueta: 'Tu web', tipo: 'url', obligatorio: false },
  ],
  TEXTO: [
    { ruta: 'titulo', etiqueta: 'Título', tipo: 'texto', obligatorio: false },
    { ruta: 'texto', etiqueta: 'Texto', tipo: 'textarea', obligatorio: false },
    ...PROGRAMACION,
  ],
  IMAGEN: [
    { ruta: 'url', etiqueta: 'La imagen', tipo: 'imagen', obligatorio: true },
    { ruta: 'alt', etiqueta: 'Qué se ve en la imagen', tipo: 'texto', obligatorio: true, ayuda: 'Lo leen los buscadores y quien no puede ver la foto.' },
    { ruta: 'enlace', etiqueta: 'A dónde lleva al pulsarla', tipo: 'url', obligatorio: false },
    ...PROGRAMACION,
  ],
  VIDEO: [
    {
      ruta: 'url',
      etiqueta: 'Enlace del vídeo',
      tipo: 'url',
      obligatorio: true,
      ayuda: 'Pega el enlace de YouTube (también Shorts), TikTok o Vimeo.',
    },
    { ruta: 'titulo', etiqueta: 'Título encima (opcional)', tipo: 'texto', obligatorio: false },
    ...PROGRAMACION,
  ],
  GALERIA: [
    { ruta: 'titulo', etiqueta: 'Título encima (opcional)', tipo: 'texto', obligatorio: false, marcador: 'Nuestros trabajos' },
    ...FOTOS_GALERIA,
    ...PROGRAMACION,
  ],
  FAQ: [
    { ruta: 'titulo', etiqueta: 'Título (opcional)', tipo: 'texto', obligatorio: false, marcador: 'Preguntas frecuentes' },
    ...PREGUNTAS_FAQ,
    ...PROGRAMACION,
  ],
  HORARIO: [
    { ruta: 'titulo', etiqueta: 'Título (opcional)', tipo: 'texto', obligatorio: false, marcador: 'Horario' },
    ...DIAS_HORARIO,
    {
      ruta: 'canarias',
      etiqueta: 'Mi negocio está en Canarias',
      tipo: 'interruptor',
      obligatorio: false,
      ayuda: 'Para calcular «abierto ahora» con la hora de las islas.',
    },
  ],
  RESERVA: [
    { ruta: 'texto', etiqueta: 'Título', tipo: 'texto', obligatorio: true, marcador: 'Reserva tu cita' },
    {
      ruta: 'servicio',
      etiqueta: 'Qué se reserva',
      tipo: 'texto',
      obligatorio: true,
      marcador: 'Corte de pelo',
      ayuda: 'Es el título de la cita en el calendario del cliente y en el tuyo.',
    },
    {
      ruta: 'duracion',
      etiqueta: 'Cuánto dura cada cita',
      tipo: 'opciones',
      obligatorio: true,
      opciones: [
        { valor: '30', etiqueta: '30 minutos' },
        { valor: '15', etiqueta: '15 minutos' },
        { valor: '45', etiqueta: '45 minutos' },
        { valor: '60', etiqueta: '1 hora' },
        { valor: '90', etiqueta: '1 hora y media' },
        { valor: '120', etiqueta: '2 horas' },
      ],
    },
    ...DIAS_SEMANA.map((d) => ({
      ruta: `dias.${d}`,
      etiqueta: `Atiendes el ${NOMBRES_DIA[d].toLowerCase()}`,
      tipo: 'texto' as const,
      obligatorio: false,
      marcador: d === 'sab' || d === 'dom' ? 'cerrado' : '10:00-14:00, 16:00-19:00',
    })),
    {
      ruta: 'antelacion',
      etiqueta: 'Antelación mínima',
      tipo: 'opciones',
      obligatorio: true,
      opciones: [
        { valor: '2', etiqueta: '2 horas antes' },
        { valor: '1', etiqueta: '1 hora antes' },
        { valor: '4', etiqueta: '4 horas antes' },
        { valor: '12', etiqueta: '12 horas antes' },
        { valor: '24', etiqueta: 'Un día antes' },
        { valor: '48', etiqueta: 'Dos días antes' },
      ],
    },
    {
      ruta: 'diasVista',
      etiqueta: 'Se puede reservar hasta',
      tipo: 'opciones',
      obligatorio: true,
      opciones: [
        { valor: '30', etiqueta: 'Un mes vista' },
        { valor: '7', etiqueta: 'Una semana vista' },
        { valor: '14', etiqueta: 'Dos semanas vista' },
        { valor: '60', etiqueta: 'Dos meses vista' },
      ],
    },
    { ruta: 'direccion', etiqueta: 'Dónde es la cita', tipo: 'texto', obligatorio: false, marcador: 'Calle Mayor 3, La Laguna', ayuda: 'Sale en el calendario. Vacío si es por teléfono o videollamada.' },
    {
      ruta: 'emailAvisos',
      etiqueta: 'Avisarme en este correo',
      tipo: 'email',
      obligatorio: false,
      ayuda: 'Vacío = al correo de tu cuenta. Cada aviso trae el botón para meter la cita en tu Google Calendar.',
    },
    {
      ruta: 'canarias',
      etiqueta: 'Mi negocio está en Canarias',
      tipo: 'interruptor',
      obligatorio: false,
      ayuda: 'Las horas se dan con la hora de las islas.',
    },
    { ruta: 'textoExito', etiqueta: 'Mensaje al reservar', tipo: 'texto', obligatorio: false, marcador: '¡Reservado! Te esperamos.' },
    ...APARIENCIA_BOTON,
    ...PROGRAMACION,
  ],
  SEPARADOR: [
    { ruta: 'titulo', etiqueta: 'Título de la sección', tipo: 'texto', obligatorio: true, marcador: 'Reservas' },
  ],
}

const REDES_VALIDAS: RedSocial[] = ['instagram', 'tiktok', 'facebook', 'youtube', 'linkedin', 'x', 'web']
const ICONOS_VALIDOS = new Set(CLAVES_ICONO)

// ── Leer y escribir por ruta ─────────────────────────────────────────────────

export function leerRuta(config: Record<string, unknown>, ruta: string): string {
  const partes = ruta.split('.')
  let actual: unknown = config
  for (const parte of partes) {
    if (actual === null || typeof actual !== 'object') return ''
    actual = (actual as Record<string, unknown>)[parte]
  }
  if (typeof actual === 'string') return actual
  // Los interruptores se guardan como booleanos y el editor trabaja con
  // cadenas: 'si' es encendido y la cadena vacía, apagado.
  if (typeof actual === 'boolean') return actual ? 'si' : ''
  return ''
}

function escribirRuta(destino: Record<string, unknown>, ruta: string, valor: string): void {
  const partes = ruta.split('.')
  let actual = destino
  for (let i = 0; i < partes.length - 1; i++) {
    const p = partes[i]
    if (typeof actual[p] !== 'object' || actual[p] === null) actual[p] = {}
    actual = actual[p] as Record<string, unknown>
  }
  actual[partes[partes.length - 1]] = valor
}

// ── Validación y limpieza ────────────────────────────────────────────────────

export type ResultadoConfig =
  | { ok: true; config: Record<string, unknown> }
  | { ok: false; error: string; ruta?: string }

/**
 * Convierte lo que el usuario escribió en la config que guarda la base de
 * datos. Normaliza (teléfonos con prefijo, URLs con https, usuarios sin @) y
 * rechaza lo que no sirve.
 *
 * Se ejecuta en el SERVIDOR aunque el editor valide también en el cliente. La
 * del cliente es cortesía; esta es la que cuenta.
 */
export function normalizarConfig(
  tipo: TipoBloque,
  valores: Record<string, string>,
): ResultadoConfig {
  const config: Record<string, unknown> = {}

  for (const campo of CAMPOS_POR_TIPO[tipo]) {
    const crudo = valores[campo.ruta] ?? ''
    let limpio: string | null

    switch (campo.tipo) {
      case 'url':
        limpio = urlValida(crudo)
        if (crudo.trim() && !limpio) {
          return { ok: false, error: `«${campo.etiqueta}» no parece un enlace válido.`, ruta: campo.ruta }
        }
        break
      case 'tel':
        limpio = soloDigitos(crudo)
        if (crudo.trim() && !limpio) {
          return { ok: false, error: `«${campo.etiqueta}» no parece un teléfono válido.`, ruta: campo.ruta }
        }
        break
      case 'email':
        limpio = emailValido(crudo)
        if (crudo.trim() && !limpio) {
          return { ok: false, error: `«${campo.etiqueta}» no parece un correo válido.`, ruta: campo.ruta }
        }
        break
      case 'usuario':
        limpio = limpiarUsuario(crudo)
        break
      case 'color':
        limpio = crudo.trim() === '' ? null : crudo.trim()
        if (limpio && !colorValido(limpio)) {
          return { ok: false, error: `«${campo.etiqueta}» no es un color válido.`, ruta: campo.ruta }
        }
        break
      case 'icono':
        // Un icono que no existe no revienta nada: el botón sale con el suyo.
        limpio = ICONOS_VALIDOS.has(crudo.trim()) ? crudo.trim() : null
        break
      case 'imagen':
        limpio = urlValida(crudo)
        if (crudo.trim() && !limpio) {
          return { ok: false, error: `«${campo.etiqueta}» no parece una imagen válida.`, ruta: campo.ruta }
        }
        break
      case 'interruptor':
        // Se guarda como booleano, no como la cadena "true".
        if (crudo === 'si') {
          config[campo.ruta] = true
        }
        limpio = null
        break
      case 'fecha': {
        const fecha = crudo.trim() ? new Date(crudo.trim()) : null
        if (fecha && Number.isNaN(fecha.getTime())) {
          return { ok: false, error: `«${campo.etiqueta}» no es una fecha válida.`, ruta: campo.ruta }
        }
        limpio = fecha ? fecha.toISOString() : null
        break
      }
      case 'opciones':
        limpio = campo.opciones?.some((o) => o.valor === crudo && o.valor !== '') ? crudo : null
        break
      case 'textarea':
        limpio = textoLargo(crudo)
        break
      default:
        limpio = texto(crudo)
    }

    if (campo.obligatorio && !limpio) {
      return { ok: false, error: `Falta «${campo.etiqueta.toLowerCase()}».`, ruta: campo.ruta }
    }
    if (limpio) escribirRuta(config, campo.ruta, limpio)
  }

  // Reglas que miran el bloque entero, no un campo suelto.
  if (tipo === 'REDES') {
    const redes = (config.redes ?? {}) as Record<string, string>
    const hay = REDES_VALIDAS.some((r) => redes[r])
    if (!hay) return { ok: false, error: 'Pon al menos una red, o quita el bloque.' }
  }
  if (tipo === 'TEXTO' && !config.titulo && !config.texto) {
    return { ok: false, error: 'Escribe un título o un texto, o quita el bloque.' }
  }

  // Programación: que no termine antes de empezar.
  const programa = config.programa as { desde?: string; hasta?: string } | undefined
  if (programa?.desde && programa?.hasta && programa.hasta <= programa.desde) {
    return { ok: false, error: 'La fecha de fin tiene que ser posterior a la de inicio.', ruta: 'programa.hasta' }
  }

  // Las listas se escriben como objetos {"0": …, "1": …}: aquí pasan a arrays
  // de verdad y se quitan los huecos.
  if (tipo === 'GALERIA') {
    config.imagenes = aLista(config.imagenes).filter((f) => typeof f?.url === 'string' && f.url)
    if ((config.imagenes as unknown[]).length === 0) return { ok: false, error: 'Sube al menos una foto.' }
  }
  if (tipo === 'FAQ') {
    config.preguntas = aLista(config.preguntas).filter((p) => typeof p?.pregunta === 'string' && p.pregunta)
    if ((config.preguntas as unknown[]).length === 0) return { ok: false, error: 'Escribe al menos una pregunta.' }
  }
  if (tipo === 'VIDEO') {
    const video = reconocerVideo(String(config.url ?? ''))
    if (!video) {
      return {
        ok: false,
        error: 'Ese enlace no es de un vídeo de YouTube, TikTok o Vimeo que podamos poner.',
        ruta: 'url',
      }
    }
    Object.assign(config, video)
  }
  if (tipo === 'HORARIO') {
    const dias = (config.dias ?? {}) as Record<string, string>
    for (const d of DIAS_SEMANA) {
      if (dias[d] && leerTramos(dias[d]) === null) {
        return {
          ok: false,
          error: `No entendemos el horario del ${NOMBRES_DIA[d].toLowerCase()}. Escríbelo así: 9:00-14:00, 17:00-20:00 (o «cerrado»).`,
          ruta: `dias.${d}`,
        }
      }
    }
    config.dias = dias
  }
  if (tipo === 'RESERVA') {
    const dias = (config.dias ?? {}) as Record<string, string>
    for (const d of DIAS_SEMANA) {
      if (dias[d] && leerTramos(dias[d]) === null) {
        return {
          ok: false,
          error: `No entendemos las horas del ${NOMBRES_DIA[d].toLowerCase()}. Escríbelas así: 10:00-14:00, 16:00-19:00 (o «cerrado»).`,
          ruta: `dias.${d}`,
        }
      }
    }
    if (!DIAS_SEMANA.some((d) => (leerTramos(dias[d] ?? '') ?? []).length > 0)) {
      return { ok: false, error: 'Pon al menos un día con horas para que te puedan reservar.', ruta: 'dias.lun' }
    }
    config.dias = dias
  }

  return { ok: true, config }
}

function aLista(valor: unknown): Record<string, string>[] {
  if (Array.isArray(valor)) return valor as Record<string, string>[]
  if (valor && typeof valor === 'object') {
    return Object.keys(valor)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => (valor as Record<string, Record<string, string>>)[k])
  }
  return []
}

/**
 * Lo que el plan no da se quita de la config al guardar: animaciones y
 * programación. Si alguien baja de plan, lo ya guardado deja de aplicarse
 * también al pintar (ver Render y la consulta de la página pública).
 */
export function aplicarPlanABloque(
  config: Record<string, unknown>,
  limites: { animaciones: boolean; programar: boolean },
): Record<string, unknown> {
  const salida = { ...config }
  if (!limites.animaciones) delete salida.animacion
  if (!limites.programar) delete salida.programa
  return salida
}

/** Las dos columnas de programación, sacadas de la config. */
export function ventanaDe(config: Record<string, unknown>): {
  visibleDesde: Date | null
  visibleHasta: Date | null
} {
  const p = (config.programa ?? {}) as { desde?: string; hasta?: string }
  const fecha = (v?: string) => {
    const d = v ? new Date(v) : null
    return d && !Number.isNaN(d.getTime()) ? d : null
  }
  return { visibleDesde: fecha(p.desde), visibleHasta: fecha(p.hasta) }
}

/** Config de partida al añadir un bloque nuevo. Nunca queda medio roto. */
export function configInicial(tipo: TipoBloque): Record<string, unknown> {
  switch (tipo) {
    case 'WHATSAPP':
      return { texto: 'Escríbenos por WhatsApp', telefono: '', mensaje: 'Hola, os escribo desde vuestro enlace.' }
    case 'LLAMAR':
      return { texto: 'Llámanos', telefono: '' }
    case 'UBICACION':
      return { texto: 'Cómo llegar', direccion: '' }
    case 'ENLACE':
      return { texto: '', url: '' }
    case 'FORMULARIO':
      return {
        texto: 'Déjanos tus datos',
        campos: ['nombre', 'telefono'],
        emailAvisos: '',
        textoExito: '¡Gracias! Te escribimos enseguida.',
      }
    case 'REDES':
      return { redes: {} }
    case 'TEXTO':
      return { titulo: '', texto: '', alineacion: 'centro' }
    case 'IMAGEN':
      return { url: '', alt: '', formato: 'ancho' }
    case 'VIDEO':
      return { url: '', titulo: '' }
    case 'GALERIA':
      return { titulo: '', imagenes: [] }
    case 'FAQ':
      return { titulo: 'Preguntas frecuentes', preguntas: [] }
    case 'HORARIO':
      return {
        titulo: 'Horario',
        dias: { lun: '9:00-14:00, 17:00-20:00', mar: '9:00-14:00, 17:00-20:00', mie: '9:00-14:00, 17:00-20:00', jue: '9:00-14:00, 17:00-20:00', vie: '9:00-14:00, 17:00-20:00', sab: '10:00-14:00', dom: '' },
      }
    case 'RESERVA':
      return {
        texto: 'Reserva tu cita',
        servicio: 'Cita',
        duracion: '30',
        antelacion: '2',
        diasVista: '30',
        dias: { lun: '10:00-14:00, 16:00-19:00', mar: '10:00-14:00, 16:00-19:00', mie: '10:00-14:00, 16:00-19:00', jue: '10:00-14:00, 16:00-19:00', vie: '10:00-14:00', sab: '', dom: '' },
        textoExito: '¡Reservado! Te esperamos.',
      }
    case 'SEPARADOR':
      return { titulo: '' }
  }
}

/**
 * Campos internos que el editor no muestra pero hay que conservar al guardar:
 * la cabecera, el objetivo que dio origen al bloque, los campos del
 * formulario. Perderlos rompería el render o la atribución.
 */
const CLAVES_A_CONSERVAR = ['esCabecera', 'alineacion', 'objetivo', 'campos', 'formato', 'textoLegal']

export function conservarInternos(
  anterior: Record<string, unknown>,
  nueva: Record<string, unknown>,
): Record<string, unknown> {
  const salida = { ...nueva }
  for (const clave of CLAVES_A_CONSERVAR) {
    if (anterior[clave] !== undefined && salida[clave] === undefined) salida[clave] = anterior[clave]
  }
  return salida
}

// ── La jerarquía ─────────────────────────────────────────────────────────────

/**
 * La prioridad NO se edita: se deduce del orden.
 *
 * Entre los bloques de conversión (los que generan un contacto), el primero es
 * el CTA principal, los dos siguientes son secundarios y el resto van normales.
 * Texto, imagen y redes nunca compiten con un botón de contacto.
 *
 * Es la misma regla que aplica el generador del onboarding, y es deliberado que
 * no haya un selector de «tamaño»: si lo hubiera, la gente pondría todos los
 * botones grandes y no destacaría ninguno. Subir un botón ES ascenderlo.
 */
export function recalcularPrioridades(
  bloques: { tipo: TipoBloque; activo: boolean }[],
): (1 | 2 | 3)[] {
  let vistos = 0
  return bloques.map((b) => {
    if (!b.activo || !META_BLOQUES[b.tipo].esConversion) return 3
    vistos++
    if (vistos === 1) return 1
    if (vistos <= 3) return 2
    return 3
  })
}
