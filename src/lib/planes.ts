/**
 * LOS PLANES, EN UN SOLO SITIO
 *
 * Antes de este fichero, los planes vivían repartidos en cuatro: el precio en
 * la home, el límite de bloques en `bloques/registro.ts`, los días de datos en
 * `panel/page.tsx` y el resto en ninguno. No coincidían. La home vendía
 * «quitar la marca» y en el código no había forma de quitarla.
 *
 * Regla que impone este fichero: **lo que se cobra y lo que se aplica salen de
 * la misma línea**. `incluye` es lo que la home promete; `limites` es lo que el
 * servidor hace cumplir. Si algo está en `incluye` y no tiene su efecto en
 * `limites`, es publicidad engañosa y el test de la sección 10 lo cantará.
 *
 * Por eso no hay aquí ni una sola función que todavía no exista: reseñas de
 * Google, píxel de Meta, exportación o multipágina entrarán cuando estén
 * construidas, no antes.
 */

export type ClavePlan = 'GRATIS' | 'ESENCIAL' | 'NEGOCIO' | 'AGENCIA'

/**
 * Lo que el servidor hace cumplir. Cada campo tiene que tener su comprobación
 * en código; si no, no pinta nada aquí.
 */
export type LimitesPlan = {
  /** Bloques por página */
  bloques: number
  /** Páginas por organización */
  paginas: number
  /** Cuántos días de analítica se pueden consultar */
  diasDeDatos: number
  /**
   * Puede esconder el sello «Creado con TUENLACE». Hoy en NINGÚN plan: el
   * sello va siempre (decisión de 18-11-2026). Se deja el campo para el día
   * que exista una marca blanca de agencia.
   */
  quitarMarca: boolean
  /** Puede pedir que Google indexe su página */
  indexar: boolean
  /**
   * Pipeline de ventas: mover contactos de etapa, apuntar importes, notas,
   * añadir contactos a mano y ver los euros por canal. Sin él, los contactos
   * se ven pero no se gestionan.
   */
  pipeline: boolean
  /** Píxel de Meta y Google Analytics en su página (tras el consentimiento) */
  seguimiento: boolean
  /** Bloques que aparecen y desaparecen solos en unas fechas */
  programar: boolean
  /** Animación en un botón destacado (pulso, brillo) */
  animaciones: boolean
  /** Título y descripción propios para Google y para compartir */
  seo: boolean
  /** Descargar los contactos en CSV */
  exportar: boolean
  /** QR con los colores y el logo del negocio */
  qrPersonalizado: boolean
  /** Plantillas de diseño, vídeo de fondo y efectos de entrada y al pulsar */
  disenoAvanzado: boolean
}

const SIN_EXTRAS = {
  pipeline: false,
  seguimiento: false,
  programar: false,
  animaciones: false,
  seo: false,
  exportar: false,
  qrPersonalizado: false,
  disenoAvanzado: false,
} as const

const CON_EXTRAS = {
  pipeline: true,
  seguimiento: true,
  programar: true,
  animaciones: true,
  seo: true,
  exportar: true,
  qrPersonalizado: true,
  disenoAvanzado: true,
} as const

export type Plan = {
  clave: ClavePlan
  nombre: string
  /**
   * Céntimos al mes, IGIC incluido. En céntimos a propósito: los euros en coma
   * flotante acaban facturando 6,989999999 € y nadie sabe por qué.
   */
  precioMensualCentimos: number
  /** Una línea que explica para quién es, no qué incluye. */
  paraQuien: string
  /** Lo que la home promete. Todo esto tiene que existir HOY. */
  incluye: string[]
  limites: LimitesPlan
  /**
   * Si está a false, el plan no se enseña ni se puede comprar. Sirve para
   * tener el escalón escrito y listo sin venderlo antes de tiempo.
   */
  disponible: boolean
}

export const PLANES: Record<ClavePlan, Plan> = {
  /**
   * NO es un plan que se venda ni que se pueda elegir: desde noviembre de 2026
   * no hay plan gratis. Es el estado de una cuenta sin plan de pago y con la
   * prueba terminada (o de un plan desconocido). Su página no se publica; ver
   * planEfectivo(). Sus límites son el fallo seguro: no regalan nada.
   */
  GRATIS: {
    clave: 'GRATIS',
    nombre: 'Sin plan',
    precioMensualCentimos: 0,
    paraQuien: 'La prueba ha terminado y todavía no hay plan.',
    incluye: [],
    limites: {
      bloques: 200,
      paginas: 1,
      diasDeDatos: 30,
      quitarMarca: false,
      indexar: false,
      ...SIN_EXTRAS,
    },
    disponible: false,
  },

  ESENCIAL: {
    clave: 'ESENCIAL',
    nombre: 'Esencial',
    precioMensualCentimos: 699,
    paraQuien: 'Todo lo que necesita un negocio para convertir sus redes en clientes.',
    incluye: [
      'Tu página en tuenlace.es/tunombre, con bloques sin límite',
      'Diseño a tu medida: tus colores, fondos con foto, degradado o patrón, fuentes, botones y cabecera',
      'Vídeo, galería de fotos, preguntas frecuentes y horario con «abierto ahora»',
      'Botón de WhatsApp con el mensaje ya escrito y formulario de contacto',
      'Pipeline de ventas: sigue cada contacto hasta que es cliente',
      'Cuánto dinero te trae cada canal',
      'Píxel de Meta y Google Analytics, con el aviso de cookies resuelto',
      'Botones con animación y enlaces que se programan por fechas',
      'Título y descripción propios para Google y para WhatsApp',
      'Exportar tus contactos a Excel',
      'QR con tus colores y tu logo',
      'Plantillas de diseño por sector, vídeo de fondo y efectos',
      'Que Google pueda encontrar tu página',
      '12 meses de estadísticas',
    ],
    limites: {
      bloques: 200,
      paginas: 1,
      diasDeDatos: 365,
      quitarMarca: false,
      indexar: true,
      ...CON_EXTRAS,
    },
    disponible: true,
  },

  // Escrito y listo, pero NO se vende: lo que lo separaría de Esencial
  // —varias páginas, exportar contactos, medición de anuncios— no está
  // construido. Poner disponible: true el día que lo esté.
  NEGOCIO: {
    clave: 'NEGOCIO',
    nombre: 'Negocio',
    precioMensualCentimos: 1499,
    paraQuien: 'Para quien gestiona varias páginas.',
    incluye: ['Todo lo de Esencial', 'Hasta 3 páginas'],
    limites: {
      bloques: 200,
      paginas: 3,
      diasDeDatos: 1095,
      quitarMarca: false,
      indexar: true,
      ...CON_EXTRAS,
    },
    disponible: false,
  },

  /**
   * Para agencias: paga la agencia y revende a sus clientes al precio que
   * quiera. Sin marca blanca: el sello «Creado con TUENLACE» sigue en todas
   * las páginas. Varias páginas por cuenta: ver lib/paginas.ts.
   */
  AGENCIA: {
    clave: 'AGENCIA',
    nombre: 'Agencia',
    precioMensualCentimos: 1499,
    paraQuien: 'Para agencias que montan y gestionan la página de sus clientes.',
    incluye: [
      'Todo lo de Esencial en cada página',
      'Hasta 25 páginas, una por cliente',
      'Todas desde el mismo panel, con sus contactos y estadísticas por separado',
      'Se las cobras a tus clientes al precio que tú decidas',
    ],
    limites: {
      bloques: 200,
      paginas: 25,
      diasDeDatos: 365,
      quitarMarca: false,
      indexar: true,
      ...CON_EXTRAS,
    },
    disponible: true,
  },
}

/** Días de prueba desde el alta. Sin tarjeta y con todo lo de Esencial. */
export const DIAS_PRUEBA = 15

/**
 * El plan con el que funciona una cuenta AHORA.
 *
 *  · Con plan de pago: ese plan.
 *  · Sin plan de pago y en prueba: Esencial, entero.
 *  · Sin plan de pago y con la prueba acabada: 'GRATIS', que significa «sin
 *    plan»: su página no se publica.
 *
 * Es lo que hay que usar en todas partes en vez de organizations.plan a
 * secas. La sesión y la página pública ya lo hacen.
 */
export function planEfectivo(plan: string, pruebaHasta: Date | null, ahora = new Date()): ClavePlan {
  if (esDePago(plan)) return planDe(plan).clave
  if (pruebaHasta && pruebaHasta.getTime() > ahora.getTime()) return 'ESENCIAL'
  return 'GRATIS'
}

/** Días que le quedan de prueba (redondeando hacia arriba), o 0. */
export function diasDePrueba(pruebaHasta: Date | null, ahora = new Date()): number {
  if (!pruebaHasta) return 0
  return Math.max(0, Math.ceil((pruebaHasta.getTime() - ahora.getTime()) / 86_400_000))
}

/** El orden en el que se enseñan. */
export const ORDEN_PLANES: ClavePlan[] = ['GRATIS', 'ESENCIAL', 'NEGOCIO', 'AGENCIA']

export const PLANES_A_LA_VENTA: Plan[] = ORDEN_PLANES.map((c) => PLANES[c]).filter(
  (p) => p.disponible,
)

/** Los planes de pago que se pueden comprar hoy. */
export const PLANES_DE_PAGO: Plan[] = PLANES_A_LA_VENTA.filter(
  (p) => p.precioMensualCentimos > 0,
)

/**
 * Los límites de una organización.
 *
 * Acepta cualquier cadena porque el plan viaja desde la sesión y desde la base
 * de datos; un valor que no reconozcamos cae en el plan gratuito, que es el
 * fallo seguro: nunca regala funciones de pago.
 */
export function limitesDe(plan: string): LimitesPlan {
  return (PLANES[plan as ClavePlan] ?? PLANES.GRATIS).limites
}

export function planDe(plan: string): Plan {
  return PLANES[plan as ClavePlan] ?? PLANES.GRATIS
}

export function esDePago(plan: string): boolean {
  return planDe(plan).precioMensualCentimos > 0
}

/** «6,99 €» — coma decimal y espacio antes del símbolo, como manda el español. */
export function precioEnEuros(centimos: number): string {
  return `${(centimos / 100).toFixed(2).replace('.', ',')} €`
}

/**
 * El plan al que se invita a subir desde uno dado, si hay alguno a la venta.
 * Devuelve null cuando ya está en el tope de lo que se vende.
 */
export function siguientePlan(plan: string): Plan | null {
  const i = ORDEN_PLANES.indexOf(planDe(plan).clave)
  for (const clave of ORDEN_PLANES.slice(i + 1)) {
    // Agencia no es «el siguiente» de un negocio: es otro público (varias
    // páginas de clientes). Se ofrece donde toca (Tus páginas, Tu plan), no
    // como subida en cada aviso del panel.
    if (clave === 'AGENCIA') continue
    if (PLANES[clave].disponible) return PLANES[clave]
  }
  return null
}

// ── La política de los ajustes que dependen del plan ─────────────────────────
//
// Las dos funciones de abajo son la MISMA regla aplicada en dos momentos:
// al guardar (para no dejar escribir lo que el plan no da) y al renderizar
// (para que una preferencia escrita cuando sí se daba deje de aplicarse tras
// una baja). Viven juntas aquí para que no puedan separarse: tenerlas en el
// editor y en la página pública por separado es como «quitar la marca» acabó
// vendiéndose sin existir.

export type AjustesDePlan = {
  mostrarMarca: boolean
  indexable: boolean
  /** ID del píxel de Meta (solo dígitos). Plan con `seguimiento`. */
  pixelMeta?: string
  /** ID de medición de Google Analytics 4 (G-XXXX). Plan con `seguimiento`. */
  ga4?: string
  /** Título propio para Google y al compartir. Plan con `seo`. */
  seoTitulo?: string
  /** Descripción propia para Google y al compartir. Plan con `seo`. */
  seoDescripcion?: string
}

export const PATRON_PIXEL = /^\d{10,20}$/
export const PATRON_GA4 = /^G-[A-Z0-9]{4,16}$/
export const MAX_SEO_TITULO = 70
export const MAX_SEO_DESCRIPCION = 160

/** Al guardar: rechaza lo que el plan no permite. */
export function validarAjustes(
  pedidos: AjustesDePlan,
  plan: string,
): { ok: true; ajustes: AjustesDePlan } | { ok: false; error: string } {
  const limites = limitesDe(plan)
  const nombre = siguientePlan(plan)?.nombre ?? 'de pago'

  // El sello ya no se puede quitar en ningún plan: lo que llegue se ignora y
  // aplicarPlanAAjustes lo deja en true. No es un error que enseñar a nadie
  // que tenía la opción guardada de antes.
  if (!limites.indexar && pedidos.indexable) {
    return { ok: false, error: `Salir en Google es del plan ${nombre}.` }
  }

  const pixelMeta = (pedidos.pixelMeta ?? '').replace(/\s/g, '')
  const ga4 = (pedidos.ga4 ?? '').trim().toUpperCase()
  if ((pixelMeta || ga4) && !limites.seguimiento) {
    return { ok: false, error: `El píxel de Meta y Google Analytics son del plan ${nombre}.` }
  }
  if (pixelMeta && !PATRON_PIXEL.test(pixelMeta)) {
    return { ok: false, error: 'El ID del píxel de Meta son solo números (lo ves en el Administrador de eventos).' }
  }
  if (ga4 && !PATRON_GA4.test(ga4)) {
    return { ok: false, error: 'El ID de Google Analytics empieza por G-, por ejemplo G-AB12CD34EF.' }
  }

  const seoTitulo = (pedidos.seoTitulo ?? '').trim().slice(0, MAX_SEO_TITULO)
  const seoDescripcion = (pedidos.seoDescripcion ?? '').trim().slice(0, MAX_SEO_DESCRIPCION)
  if ((seoTitulo || seoDescripcion) && !limites.seo) {
    return { ok: false, error: `El título y la descripción propios son del plan ${nombre}.` }
  }

  return {
    ok: true,
    ajustes: aplicarPlanAAjustes({ ...pedidos, pixelMeta, ga4, seoTitulo, seoDescripcion }, plan),
  }
}

/**
 * Al renderizar: recorta lo guardado a lo que el plan de HOY permite.
 *
 * El tipo de vuelta reemplaza los campos en vez de conservarlos: esta función
 * existe precisamente para cambiarlos, y con `: T` TypeScript seguía creyendo
 * que un `false` de entrada sale `false`.
 */
export function aplicarPlanAAjustes<T extends AjustesDePlan>(
  ajustes: T,
  plan: string,
): Omit<T, keyof AjustesDePlan> & Required<AjustesDePlan> {
  const limites = limitesDe(plan)
  const texto = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    ...ajustes,
    mostrarMarca: limites.quitarMarca ? Boolean(ajustes.mostrarMarca) : true,
    indexable: limites.indexar ? Boolean(ajustes.indexable) : false,
    pixelMeta: limites.seguimiento && PATRON_PIXEL.test(texto(ajustes.pixelMeta)) ? texto(ajustes.pixelMeta) : '',
    ga4: limites.seguimiento && PATRON_GA4.test(texto(ajustes.ga4)) ? texto(ajustes.ga4) : '',
    seoTitulo: limites.seo ? texto(ajustes.seoTitulo).slice(0, MAX_SEO_TITULO) : '',
    seoDescripcion: limites.seo ? texto(ajustes.seoDescripcion).slice(0, MAX_SEO_DESCRIPCION) : '',
  }
}
