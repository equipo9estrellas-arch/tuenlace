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
import { META_BLOQUES, type RedSocial } from './tipos'
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
}

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
]

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
  ],
  LLAMAR: [
    { ruta: 'texto', etiqueta: 'Texto del botón', tipo: 'texto', obligatorio: true, marcador: 'Llámanos' },
    { ruta: 'telefono', etiqueta: 'Tu teléfono', tipo: 'tel', obligatorio: true },
    ...APARIENCIA_BOTON,
  ],
  UBICACION: [
    { ruta: 'texto', etiqueta: 'Texto del botón', tipo: 'texto', obligatorio: true, marcador: 'Cómo llegar' },
    { ruta: 'direccion', etiqueta: 'Dirección', tipo: 'texto', obligatorio: true, ayuda: 'Calle, número y ciudad.' },
    { ruta: 'urlMapa', etiqueta: 'Enlace de Google Maps', tipo: 'url', obligatorio: false, ayuda: 'Opcional. Si lo dejas vacío, buscamos la dirección en el mapa.' },
    ...APARIENCIA_BOTON,
  ],
  ENLACE: [
    { ruta: 'texto', etiqueta: 'Texto del botón', tipo: 'texto', obligatorio: true },
    { ruta: 'url', etiqueta: 'A dónde lleva', tipo: 'url', obligatorio: true },
    { ruta: 'descripcion', etiqueta: 'Línea pequeña debajo', tipo: 'texto', obligatorio: false },
    ...APARIENCIA_BOTON,
  ],
  FORMULARIO: [
    { ruta: 'texto', etiqueta: 'Título del formulario', tipo: 'texto', obligatorio: true, marcador: 'Déjanos tus datos' },
    { ruta: 'emailAvisos', etiqueta: 'Correo de avisos', tipo: 'email', obligatorio: true, ayuda: 'Aquí te llega cada persona que lo rellena.' },
    { ruta: 'textoExito', etiqueta: 'Mensaje al enviar', tipo: 'texto', obligatorio: false, marcador: '¡Gracias! Te escribimos enseguida.' },
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
  ],
  IMAGEN: [
    { ruta: 'url', etiqueta: 'La imagen', tipo: 'imagen', obligatorio: true },
    { ruta: 'alt', etiqueta: 'Qué se ve en la imagen', tipo: 'texto', obligatorio: true, ayuda: 'Lo leen los buscadores y quien no puede ver la foto.' },
    { ruta: 'enlace', etiqueta: 'A dónde lleva al pulsarla', tipo: 'url', obligatorio: false },
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

  return { ok: true, config }
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
