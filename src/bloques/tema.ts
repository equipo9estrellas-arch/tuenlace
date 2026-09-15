/**
 * El catálogo de personalización visual y su normalizador.
 *
 * Por qué existe el normalizador: el tema vive en una columna `jsonb`. En la
 * base de datos hay páginas guardadas con los valores antiguos ('sistema',
 * 'grotesca', 'serif') y no vamos a migrarlas con un UPDATE masivo que puede
 * fallar a medias. Se traducen al leer. Cualquier valor que no reconozcamos
 * cae en el valor por defecto en vez de romper la página del cliente.
 */

export type PresetTema =
  | 'claro'
  | 'nieve'
  | 'oscuro'
  | 'noche'
  | 'calido'
  | 'menta'
  | 'tinta'
  | 'arena'
  | 'rosa'

export type FuenteTema = 'moderna' | 'editorial' | 'clasica' | 'tecnica' | 'amable'
export type BotonesTema = 'redondeados' | 'suaves' | 'rectos' | 'pildora'
export type FondoTema = 'liso' | 'sutil' | 'degradado'

export type Tema = {
  preset: PresetTema
  acento: string
  fuente: FuenteTema
  botones: BotonesTema
  fondo: FondoTema
  avatarForma: 'circulo' | 'cuadrado'
}

export const TEMA_POR_DEFECTO: Tema = {
  preset: 'claro',
  acento: '#FF5D2E',
  fuente: 'moderna',
  botones: 'redondeados',
  fondo: 'sutil',
  avatarForma: 'circulo',
}

export type OpcionTema<T extends string> = {
  clave: T
  etiqueta: string
  /** Lo que el cliente ve en el selector, sin jerga de diseñador */
  pista?: string
  /** Muestra de color para pintar el botón del selector */
  muestra?: { fondo: string; texto: string; borde: string }
}

export const PRESETS: OpcionTema<PresetTema>[] = [
  {
    clave: 'claro',
    etiqueta: 'Papel',
    pista: 'Blanco cálido. El más neutro.',
    muestra: { fondo: '#faf8f5', texto: '#14120f', borde: '#e6e0d6' },
  },
  {
    clave: 'nieve',
    etiqueta: 'Nieve',
    pista: 'Blanco puro y frío.',
    muestra: { fondo: '#ffffff', texto: '#0d0f12', borde: '#e3e6ea' },
  },
  {
    clave: 'arena',
    etiqueta: 'Arena',
    pista: 'Tostado suave.',
    muestra: { fondo: '#f6f2e9', texto: '#201c13', borde: '#e4dcc9' },
  },
  {
    clave: 'calido',
    etiqueta: 'Terracota',
    pista: 'Cálido. Hostelería y belleza.',
    muestra: { fondo: '#fdf5ec', texto: '#2b1a0e', borde: '#ecdcc7' },
  },
  {
    clave: 'menta',
    etiqueta: 'Menta',
    pista: 'Verde muy claro. Salud y bienestar.',
    muestra: { fondo: '#f1f7f3', texto: '#10241a', borde: '#d8e7de' },
  },
  {
    clave: 'rosa',
    etiqueta: 'Rosa',
    pista: 'Suave. Estética y moda.',
    muestra: { fondo: '#fdf3f4', texto: '#2a1418', borde: '#f0dade' },
  },
  {
    clave: 'tinta',
    etiqueta: 'Acero',
    pista: 'Gris frío. Profesional.',
    muestra: { fondo: '#f4f6f8', texto: '#0f1319', borde: '#e0e4ea' },
  },
  {
    clave: 'oscuro',
    etiqueta: 'Carbón',
    pista: 'Fondo oscuro cálido.',
    muestra: { fondo: '#131210', texto: '#f7f4ef', borde: '#332e26' },
  },
  {
    clave: 'noche',
    etiqueta: 'Noche',
    pista: 'Azul muy oscuro.',
    muestra: { fondo: '#0c1017', texto: '#eef2f7', borde: '#232c39' },
  },
]

export const FUENTES: OpcionTema<FuenteTema>[] = [
  { clave: 'moderna', etiqueta: 'Moderna', pista: 'Limpia y legible. La opción segura.' },
  { clave: 'editorial', etiqueta: 'Editorial', pista: 'Titulares con serif. Elegante.' },
  { clave: 'clasica', etiqueta: 'Clásica', pista: 'Serif en todo. Con carácter.' },
  { clave: 'tecnica', etiqueta: 'Técnica', pista: 'Geométrica. Marcas jóvenes.' },
  { clave: 'amable', etiqueta: 'Amable', pista: 'Redondeada y cercana.' },
]

export const BOTONES: OpcionTema<BotonesTema>[] = [
  { clave: 'redondeados', etiqueta: 'Redondeados' },
  { clave: 'suaves', etiqueta: 'Muy redondeados' },
  { clave: 'pildora', etiqueta: 'Pastilla' },
  { clave: 'rectos', etiqueta: 'Rectos' },
]

export const FONDOS: OpcionTema<FondoTema>[] = [
  { clave: 'sutil', etiqueta: 'Halo de color', pista: 'Un reflejo suave de tu color arriba.' },
  { clave: 'liso', etiqueta: 'Liso', pista: 'Un solo color plano.' },
  { clave: 'degradado', etiqueta: 'Degradado', pista: 'Se aclara de arriba abajo.' },
]

/**
 * Paleta de acentos sugeridos. Todos pasan contraste AA sobre texto blanco,
 * que es como se usan: fondo del botón principal con la etiqueta en blanco.
 */
export const ACENTOS: { valor: string; nombre: string }[] = [
  { valor: '#FF5D2E', nombre: 'Naranja' },
  { valor: '#E0342B', nombre: 'Rojo' },
  { valor: '#C2185B', nombre: 'Frambuesa' },
  { valor: '#7B3FF2', nombre: 'Violeta' },
  { valor: '#0B5FFF', nombre: 'Azul' },
  { valor: '#0E7C7B', nombre: 'Verde azulado' },
  { valor: '#1B8A4B', nombre: 'Verde' },
  { valor: '#A8761B', nombre: 'Mostaza' },
  { valor: '#8A5A3B', nombre: 'Marrón' },
  { valor: '#22201C', nombre: 'Negro' },
]

// ── Normalización ────────────────────────────────────────────────────────────

const PRESETS_VALIDOS = new Set<string>(PRESETS.map((p) => p.clave))
const FUENTES_VALIDAS = new Set<string>(FUENTES.map((f) => f.clave))
const BOTONES_VALIDOS = new Set<string>(BOTONES.map((b) => b.clave))
const FONDOS_VALIDOS = new Set<string>(FONDOS.map((f) => f.clave))

/** Valores que existieron antes del rediseño y siguen guardados en producción. */
const FUENTES_ANTIGUAS: Record<string, FuenteTema> = {
  sistema: 'moderna',
  grotesca: 'moderna',
  serif: 'clasica',
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export function colorValido(valor: string): boolean {
  return HEX.test(valor.trim())
}

export function normalizarTema(bruto: unknown): Tema {
  const t = (bruto ?? {}) as Partial<Record<keyof Tema, unknown>>

  const preset = typeof t.preset === 'string' && PRESETS_VALIDOS.has(t.preset) ? t.preset : null
  const fuenteBruta = typeof t.fuente === 'string' ? t.fuente : ''
  const fuente = FUENTES_VALIDAS.has(fuenteBruta)
    ? (fuenteBruta as FuenteTema)
    : (FUENTES_ANTIGUAS[fuenteBruta] ?? null)
  const botones = typeof t.botones === 'string' && BOTONES_VALIDOS.has(t.botones) ? t.botones : null
  const fondo = typeof t.fondo === 'string' && FONDOS_VALIDOS.has(t.fondo) ? t.fondo : null
  const acento = typeof t.acento === 'string' && colorValido(t.acento) ? t.acento.trim() : null

  return {
    preset: (preset as PresetTema) ?? TEMA_POR_DEFECTO.preset,
    acento: acento ?? TEMA_POR_DEFECTO.acento,
    fuente: fuente ?? TEMA_POR_DEFECTO.fuente,
    botones: (botones as BotonesTema) ?? TEMA_POR_DEFECTO.botones,
    fondo: (fondo as FondoTema) ?? TEMA_POR_DEFECTO.fondo,
    avatarForma: t.avatarForma === 'cuadrado' ? 'cuadrado' : 'circulo',
  }
}

/**
 * Sobre un acento dado, ¿el texto del botón va en blanco o en negro?
 *
 * Luminancia relativa de la WCAG. Un mostaza claro con letra blanca es
 * ilegible al sol, y este es justo el sitio donde importa: el botón principal.
 */
export function textoSobre(acento: string): '#ffffff' | '#14120f' {
  const hex = acento.trim().replace('#', '')
  const largo =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex
  if (largo.length !== 6) return '#ffffff'

  const canal = (i: number) => {
    const v = parseInt(largo.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }

  const luminancia = 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4)
  // 3.0 es el mínimo de la WCAG AA para texto grande y para componentes de
  // interfaz, que es lo que es el botón principal: 17,5 px en seminegrita.
  const contrasteBlanco = 1.05 / (luminancia + 0.05)
  return contrasteBlanco >= 3 ? '#ffffff' : '#14120f'
}
