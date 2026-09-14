/**
 * EL ONBOARDING CONVERSACIONAL
 *
 * Principio de diseño (blueprint bloque 2, punto 6.2):
 *   Cada pregunta tiene que decidir algo concreto en la página generada.
 *   Si una respuesta no cambia el resultado, la pregunta sobra.
 *
 * Y el corolario que nos separa de los competidores:
 *   Ellos usan IA para escribir una biografía bonita.
 *   Nosotros usamos las preguntas para decidir la ESTRUCTURA DE CONVERSIÓN.
 *   El copy es lo de menos: lo importante es qué botón va arriba.
 *
 * Objetivo temporal: menos de 3 minutos hasta página publicada.
 */

// ── Pantalla 1 · ¿Quién eres? ────────────────────────────────────────────────

export type ClaveCategoria =
  | 'local'
  | 'restaurante'
  | 'profesional'
  | 'tienda'
  | 'marca'
  | 'agencia'

export type Categoria = {
  clave: ClaveCategoria
  etiqueta: string
  ejemplos: string
  icono: string
  /** Plantilla visual y estructura base */
  plantilla: string
  /** Sugerencias de objetivo preseleccionadas en la pantalla 3 */
  objetivosSugeridos: ClaveObjetivo[]
  /** Texto fantasma de la pantalla 2 */
  ejemploDescripcion: string
}

export const CATEGORIAS: Categoria[] = [
  {
    clave: 'local',
    etiqueta: 'Negocio con local',
    ejemplos: 'peluquería, clínica, taller, gimnasio',
    icono: '🏪',
    plantilla: 'servicios',
    objetivosSugeridos: ['whatsapp', 'cita', 'ubicacion'],
    ejemploDescripcion: 'Peluquería de barrio en La Laguna, especialistas en color y mechas',
  },
  {
    clave: 'restaurante',
    etiqueta: 'Restaurante, bar o cafetería',
    ejemplos: '',
    icono: '🍽️',
    plantilla: 'hosteleria',
    objetivosSugeridos: ['catalogo', 'cita', 'ubicacion'],
    ejemploDescripcion: 'Cocina canaria de mercado en Santa Cruz, con terraza y menú del día',
  },
  {
    clave: 'profesional',
    etiqueta: 'Profesional o autónomo',
    ejemplos: 'abogada, fotógrafo, entrenador, consultor',
    icono: '💼',
    plantilla: 'profesional',
    objetivosSugeridos: ['cita', 'whatsapp', 'catalogo'],
    ejemploDescripcion: 'Abogada especializada en derecho laboral en Tenerife',
  },
  {
    clave: 'tienda',
    etiqueta: 'Tienda online',
    ejemplos: '',
    icono: '🛍️',
    plantilla: 'comercio',
    objetivosSugeridos: ['catalogo', 'whatsapp', 'comprar'],
    ejemploDescripcion: 'Tienda de ropa sostenible hecha en Canarias, envíos a toda España',
  },
  {
    clave: 'marca',
    etiqueta: 'Marca personal o creador',
    ejemplos: '',
    icono: '✨',
    plantilla: 'creador',
    objetivosSugeridos: ['redes', 'datos', 'catalogo'],
    ejemploDescripcion: 'Hablo de fotografía de paisaje y viajo por las islas',
  },
  {
    clave: 'agencia',
    etiqueta: 'Agencia',
    ejemplos: 'gestiono varios clientes',
    icono: '🏢',
    plantilla: 'servicios',
    objetivosSugeridos: ['cita', 'whatsapp', 'catalogo'],
    ejemploDescripcion: 'Agencia de marketing digital en Tenerife para negocios locales',
  },
]

// ── Pantalla 3 · La pregunta que lo decide todo ──────────────────────────────

export type ClaveObjetivo =
  | 'whatsapp'
  | 'cita'
  | 'llamar'
  | 'catalogo'
  | 'datos'
  | 'comprar'
  | 'ubicacion'
  | 'redes'

export type Objetivo = {
  clave: ClaveObjetivo
  etiqueta: string
  /** Texto por defecto del botón cuando es el CTA principal */
  textoBoton: string
  /** Tipo de bloque que genera */
  bloque: 'WHATSAPP' | 'LLAMAR' | 'UBICACION' | 'REDES' | 'ENLACE' | 'FORMULARIO'
  /** Qué datos hay que pedir en la pantalla 6 si se elige */
  pide: CampoRequerido[]
}

export type CampoRequerido = {
  clave: string
  etiqueta: string
  tipo: 'texto' | 'tel' | 'email' | 'url' | 'textarea'
  ayuda?: string
  obligatorio: boolean
}

export const OBJETIVOS: Objetivo[] = [
  {
    clave: 'whatsapp',
    etiqueta: 'Escribirme por WhatsApp',
    textoBoton: 'Escríbeme por WhatsApp',
    bloque: 'WHATSAPP',
    pide: [
      {
        clave: 'telefonoWhatsapp',
        etiqueta: 'Tu número de WhatsApp',
        tipo: 'tel',
        ayuda: 'Con prefijo. Ejemplo: 34612345678',
        obligatorio: true,
      },
      {
        clave: 'mensajeWhatsapp',
        etiqueta: '¿Qué quieres que ponga el mensaje cuando te escriban?',
        tipo: 'texto',
        ayuda: 'Se escribe solo. Así sabes de dónde viene cada conversación.',
        obligatorio: false,
      },
    ],
  },
  {
    clave: 'cita',
    etiqueta: 'Pedir cita o reservar',
    textoBoton: 'Pedir cita',
    bloque: 'ENLACE',
    pide: [
      {
        clave: 'urlReservas',
        etiqueta: '¿Tienes ya un sistema de reservas?',
        tipo: 'url',
        ayuda: 'Pega el enlace. Si no tienes, déjalo vacío y lo resolvemos luego.',
        obligatorio: false,
      },
    ],
  },
  {
    clave: 'llamar',
    etiqueta: 'Llamarme',
    textoBoton: 'Llámanos',
    bloque: 'LLAMAR',
    pide: [
      { clave: 'telefono', etiqueta: 'Tu teléfono', tipo: 'tel', obligatorio: true },
    ],
  },
  {
    clave: 'catalogo',
    etiqueta: 'Ver mis servicios o mi carta',
    textoBoton: 'Ver la carta',
    bloque: 'ENLACE',
    pide: [
      {
        clave: 'urlCatalogo',
        etiqueta: 'Enlace a tu carta, catálogo o lista de servicios',
        tipo: 'url',
        ayuda: 'Puede ser un PDF, tu web o un enlace de Google Drive.',
        obligatorio: false,
      },
    ],
  },
  {
    clave: 'datos',
    etiqueta: 'Dejarme sus datos',
    textoBoton: 'Déjame tus datos',
    bloque: 'FORMULARIO',
    pide: [
      {
        clave: 'emailAvisos',
        etiqueta: '¿A qué correo te avisamos cuando alguien te escriba?',
        tipo: 'email',
        obligatorio: true,
      },
    ],
  },
  {
    clave: 'comprar',
    etiqueta: 'Comprar algo',
    textoBoton: 'Comprar',
    bloque: 'ENLACE',
    pide: [
      { clave: 'urlTienda', etiqueta: 'Enlace a tu tienda', tipo: 'url', obligatorio: false },
    ],
  },
  {
    clave: 'ubicacion',
    etiqueta: 'Saber dónde estoy',
    textoBoton: 'Cómo llegar',
    bloque: 'UBICACION',
    pide: [
      {
        clave: 'direccion',
        etiqueta: 'Tu dirección',
        tipo: 'texto',
        ayuda: 'Calle, número y ciudad.',
        obligatorio: true,
      },
    ],
  },
  {
    clave: 'redes',
    etiqueta: 'Seguirme en redes',
    textoBoton: 'Sígueme',
    bloque: 'REDES',
    pide: [
      { clave: 'instagram', etiqueta: 'Tu Instagram', tipo: 'texto', ayuda: 'Solo el usuario, sin @', obligatorio: false },
      { clave: 'tiktok', etiqueta: 'Tu TikTok', tipo: 'texto', ayuda: 'Solo el usuario, sin @', obligatorio: false },
    ],
  },
]

export const OBJETIVOS_POR_CLAVE = new Map(OBJETIVOS.map((o) => [o.clave, o]))

export const MAX_OBJETIVOS = 3

// ── Pantalla 4 · ¿Dónde vas a poner el enlace? ───────────────────────────────

export type ClaveCanal = 'instagram' | 'tiktok' | 'google' | 'qr' | 'tarjetas' | 'ads'

export type Canal = {
  clave: ClaveCanal
  etiqueta: string
  /** Qué dispara al marcarlo. Cada casilla hace algo concreto. */
  consecuencia: string
  utmSource?: string
}

export const CANALES: Canal[] = [
  {
    clave: 'instagram',
    etiqueta: 'En la bio de Instagram',
    consecuencia: 'Te damos las instrucciones para ponerlo, paso a paso.',
    utmSource: 'instagram',
  },
  {
    clave: 'tiktok',
    etiqueta: 'En la bio de TikTok',
    consecuencia: 'Te damos las instrucciones para ponerlo.',
    utmSource: 'tiktok',
  },
  {
    clave: 'google',
    etiqueta: 'En mi ficha de Google',
    consecuencia: 'Añadimos tus reseñas de Google a la página.',
    utmSource: 'google',
  },
  {
    clave: 'qr',
    etiqueta: 'En un QR en el local o en la carta',
    consecuencia: 'Generamos el QR y un PDF listo para imprimir.',
    utmSource: 'qr',
  },
  {
    clave: 'tarjetas',
    etiqueta: 'En tarjetas de visita o flyers',
    consecuencia: 'Te damos el QR en vectorial para tu diseñador.',
    utmSource: 'tarjeta',
  },
  {
    clave: 'ads',
    etiqueta: 'En anuncios de pago (Meta, Google)',
    consecuencia: 'Activamos la medición de conversiones y los píxeles.',
    utmSource: 'ads',
  },
]

export const CANALES_POR_CLAVE = new Map(CANALES.map((c) => [c.clave, c]))

// ── Preguntas que NO hacemos ─────────────────────────────────────────────────
//
//  "¿Qué colores quieres?"        → se derivan del logo o de la foto
//  "¿Qué plantilla prefieres?"    → elegir sin contenido dentro es imposible
//  "¿Qué tipografía?"             → a nadie le importa hasta que ve la página
//  "¿Cuál es tu público?"         → pregunta de consultor, no cambia nada
//  "¿Cuántos seguidores tienes?"  → no cambia nada y da mala sensación
//
//  Todo eso se toca después, en el editor. El onboarding tiene un solo
//  objetivo: llegar a una página publicada.
