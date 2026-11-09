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
  /** Puede esconder el sello «Creado con TUENLACE» */
  quitarMarca: boolean
  /** Puede pedir que Google indexe su página */
  indexar: boolean
}

export type Plan = {
  clave: ClavePlan
  nombre: string
  /**
   * Céntimos al mes, IVA incluido. En céntimos a propósito: los euros en coma
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
  GRATIS: {
    clave: 'GRATIS',
    nombre: 'Gratis',
    precioMensualCentimos: 0,
    paraQuien: 'Para empezar y ver si esto te sirve.',
    incluye: [
      'Tu página en tuenlace.es/tunombre',
      'Hasta 10 bloques',
      'Código QR para el escaparate',
      'Botón de WhatsApp con el mensaje ya escrito',
      'Formulario para recoger datos de quien te escribe',
      '7 días de estadísticas',
    ],
    limites: {
      bloques: 10,
      paginas: 1,
      diasDeDatos: 7,
      quitarMarca: false,
      indexar: false,
    },
    disponible: true,
  },

  ESENCIAL: {
    clave: 'ESENCIAL',
    nombre: 'Esencial',
    precioMensualCentimos: 699,
    paraQuien: 'Para un negocio que ya manda gente a su enlace.',
    incluye: [
      'Todo lo del plan gratuito',
      'Bloques sin límite',
      'Quitar «Creado con TUENLACE» de tu página',
      'Que Google pueda encontrar tu página',
      '12 meses de estadísticas, no 7 días',
    ],
    limites: {
      bloques: 200,
      paginas: 1,
      diasDeDatos: 365,
      quitarMarca: true,
      indexar: true,
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
      quitarMarca: true,
      indexar: true,
    },
    disponible: false,
  },

  AGENCIA: {
    clave: 'AGENCIA',
    nombre: 'Agencia',
    precioMensualCentimos: 4900,
    paraQuien: 'Para agencias con cartera de clientes.',
    incluye: ['Todo lo de Negocio', 'Páginas sin límite'],
    limites: {
      bloques: 200,
      paginas: 100,
      diasDeDatos: 1095,
      quitarMarca: true,
      indexar: true,
    },
    disponible: false,
  },
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
}

/** Al guardar: rechaza lo que el plan no permite. */
export function validarAjustes(
  pedidos: AjustesDePlan,
  plan: string,
): { ok: true; ajustes: AjustesDePlan } | { ok: false; error: string } {
  const limites = limitesDe(plan)
  const nombre = siguientePlan(plan)?.nombre ?? 'de pago'

  if (!limites.quitarMarca && !pedidos.mostrarMarca) {
    return { ok: false, error: `Quitar la marca es del plan ${nombre}.` }
  }
  if (!limites.indexar && pedidos.indexable) {
    return { ok: false, error: `Salir en Google es del plan ${nombre}.` }
  }
  return { ok: true, ajustes: aplicarPlanAAjustes(pedidos, plan) }
}

/**
 * Al renderizar: recorta lo guardado a lo que el plan de HOY permite.
 *
 * El tipo de vuelta reemplaza los dos campos en vez de conservarlos: esta
 * función existe precisamente para cambiarlos, y con `: T` TypeScript seguía
 * creyendo que un `false` de entrada sale `false`.
 */
export function aplicarPlanAAjustes<T extends AjustesDePlan>(
  ajustes: T,
  plan: string,
): Omit<T, keyof AjustesDePlan> & AjustesDePlan {
  const limites = limitesDe(plan)
  return {
    ...ajustes,
    mostrarMarca: limites.quitarMarca ? Boolean(ajustes.mostrarMarca) : true,
    indexable: limites.indexar ? Boolean(ajustes.indexable) : false,
  }
}
