/**
 * El catálogo de personalización visual y su normalizador.
 *
 * Por qué existe el normalizador: el tema vive en una columna `jsonb`. En la
 * base de datos hay páginas guardadas con versiones anteriores del tema y no
 * vamos a migrarlas con un UPDATE masivo que puede fallar a medias. Se traducen
 * al leer. Cualquier valor que no reconozcamos cae en el valor por defecto en
 * vez de romper la página del cliente.
 *
 * Regla que sostiene todo esto: el cliente elige el AMBIENTE (paleta, voz
 * tipográfica, forma), no cada píxel. Puede elegir entre dieciséis paletas
 * completas, pero no puede poner el texto gris claro sobre fondo blanco, porque
 * las combinaciones las decidimos nosotros. Un editor libre convierte peor.
 */

export type PresetTema =
  | 'claro'
  | 'nieve'
  | 'crema'
  | 'arena'
  | 'calido'
  | 'melocoton'
  | 'rosa'
  | 'lavanda'
  | 'menta'
  | 'oceano'
  | 'tinta'
  | 'grafito'
  | 'oscuro'
  | 'noche'
  | 'bosque'
  | 'vino'

export type FuenteTema =
  | 'moderna'
  | 'editorial'
  | 'clasica'
  | 'tecnica'
  | 'amable'
  | 'elegante'
  | 'suave'
  | 'geometrica'
  | 'cercana'
  | 'redonda'
  | 'titular'
  | 'legible'
  | 'popular'
  | 'poppins'
  | 'manuscrita'
  | 'robusta'
  | 'minimal'
  | 'caracter'

export type BotonesTema = 'redondeados' | 'suaves' | 'rectos' | 'pildora'
export type EstiloBoton = 'relleno' | 'contorno' | 'cristal' | 'duro'
export type FondoTema = 'liso' | 'sutil' | 'degradado' | 'imagen'
export type TamanoTexto = 'compacto' | 'normal' | 'grande'
export type AnchoPagina = 'estrecho' | 'normal' | 'ancho'
export type Separacion = 'justa' | 'normal' | 'amplia'
export type AvatarForma = 'circulo' | 'redondeado' | 'cuadrado'

export type Tema = {
  preset: PresetTema
  acento: string
  fuente: FuenteTema
  botones: BotonesTema
  estiloBoton: EstiloBoton
  fondo: FondoTema
  /** Solo si fondo === 'imagen' */
  fondoImagenUrl: string
  /** Cuánto se cubre la imagen de fondo con el color de la paleta: 0–90 */
  fondoVelo: number
  /** La imagen se queda quieta al hacer scroll */
  fondoFijo: boolean
  tamanoTexto: TamanoTexto
  ancho: AnchoPagina
  separacion: Separacion
  avatarForma: AvatarForma
}

export const TEMA_POR_DEFECTO: Tema = {
  preset: 'claro',
  acento: '#FF5D2E',
  fuente: 'moderna',
  botones: 'redondeados',
  estiloBoton: 'relleno',
  fondo: 'sutil',
  fondoImagenUrl: '',
  fondoVelo: 55,
  fondoFijo: true,
  tamanoTexto: 'normal',
  ancho: 'normal',
  separacion: 'normal',
  avatarForma: 'circulo',
}

export type OpcionTema<T extends string> = {
  clave: T
  etiqueta: string
  /** Lo que el cliente ve en el selector, sin jerga de diseñador */
  pista?: string
  /** Muestra para pintar el botón del selector */
  muestra?: { fondo: string; texto: string; borde: string }
  /** Familia con la que pintar el nombre en el selector de tipografías */
  familia?: string
}

// ── Paletas ──────────────────────────────────────────────────────────────────
//
// Cada una es una decisión completa: fondo, texto, tarjeta y borde elegidos
// juntos. El cliente no combina un fondo de una con el texto de otra, porque
// así es como se acaba con gris claro sobre blanco.

export const PRESETS: OpcionTema<PresetTema>[] = [
  { clave: 'claro', etiqueta: 'Papel', pista: 'Blanco cálido. El más neutro.', muestra: { fondo: '#faf8f5', texto: '#14120f', borde: '#e6e0d6' } },
  { clave: 'nieve', etiqueta: 'Nieve', pista: 'Blanco puro y frío.', muestra: { fondo: '#ffffff', texto: '#0d0f12', borde: '#e3e6ea' } },
  { clave: 'crema', etiqueta: 'Crema', pista: 'Marfil suave.', muestra: { fondo: '#fbf7ee', texto: '#1f1c14', borde: '#ece3d2' } },
  { clave: 'arena', etiqueta: 'Arena', pista: 'Tostado.', muestra: { fondo: '#f6f2e9', texto: '#201c13', borde: '#e4dcc9' } },
  { clave: 'calido', etiqueta: 'Terracota', pista: 'Hostelería y belleza.', muestra: { fondo: '#fdf5ec', texto: '#2b1a0e', borde: '#ecdcc7' } },
  { clave: 'melocoton', etiqueta: 'Melocotón', pista: 'Cálido y luminoso.', muestra: { fondo: '#fff4ee', texto: '#2e1a12', borde: '#f5ddd0' } },
  { clave: 'rosa', etiqueta: 'Rosa', pista: 'Estética y moda.', muestra: { fondo: '#fdf3f4', texto: '#2a1418', borde: '#f0dade' } },
  { clave: 'lavanda', etiqueta: 'Lavanda', pista: 'Suave y tranquilo.', muestra: { fondo: '#f7f4fd', texto: '#1c1630', borde: '#e4ddf5' } },
  { clave: 'menta', etiqueta: 'Menta', pista: 'Salud y bienestar.', muestra: { fondo: '#f1f7f3', texto: '#10241a', borde: '#d8e7de' } },
  { clave: 'oceano', etiqueta: 'Océano', pista: 'Azul claro y limpio.', muestra: { fondo: '#f0f6fb', texto: '#0c1c28', borde: '#d6e6f2' } },
  { clave: 'tinta', etiqueta: 'Acero', pista: 'Gris frío. Profesional.', muestra: { fondo: '#f4f6f8', texto: '#0f1319', borde: '#e0e4ea' } },
  { clave: 'grafito', etiqueta: 'Grafito', pista: 'Gris medio oscuro.', muestra: { fondo: '#26282c', texto: '#f2f3f5', borde: '#3c3f45' } },
  { clave: 'oscuro', etiqueta: 'Carbón', pista: 'Oscuro cálido.', muestra: { fondo: '#131210', texto: '#f7f4ef', borde: '#332e26' } },
  { clave: 'noche', etiqueta: 'Noche', pista: 'Azul muy oscuro.', muestra: { fondo: '#0c1017', texto: '#eef2f7', borde: '#232c39' } },
  { clave: 'bosque', etiqueta: 'Bosque', pista: 'Verde profundo.', muestra: { fondo: '#0e1a14', texto: '#eaf3ed', borde: '#20342a' } },
  { clave: 'vino', etiqueta: 'Vino', pista: 'Granate oscuro.', muestra: { fondo: '#1a0e12', texto: '#f6ecee', borde: '#352026' } },
]

/** Paletas de fondo oscuro. El editor las usa para avisar del contraste. */
export const PRESETS_OSCUROS: PresetTema[] = ['grafito', 'oscuro', 'noche', 'bosque', 'vino']

// ── Tipografías ──────────────────────────────────────────────────────────────
//
// No son "fuentes", son PAREJAS: qué familia lleva el titular y cuál el texto
// corrido, con su peso y su interletrado. Es lo que separa una página que
// parece diseñada de una con una fuente bonita mal usada.

export const FUENTES: OpcionTema<FuenteTema>[] = [
  { clave: 'moderna', etiqueta: 'Moderna', pista: 'Limpia y legible. La opción segura.', familia: "'Inter Variable', sans-serif" },
  { clave: 'editorial', etiqueta: 'Editorial', pista: 'Titulares con serif fina.', familia: "'Instrument Serif', serif" },
  { clave: 'elegante', etiqueta: 'Elegante', pista: 'Alta costura, joyería, bodas.', familia: "'Playfair Display Variable', serif" },
  { clave: 'clasica', etiqueta: 'Clásica', pista: 'Serif con carácter.', familia: "'Fraunces Variable', serif" },
  { clave: 'suave', etiqueta: 'Suave', pista: 'Serif de display y sans limpia.', familia: "'DM Serif Display', serif" },
  { clave: 'legible', etiqueta: 'Legible', pista: 'Serif cómoda para textos largos.', familia: "'Lora Variable', serif" },
  { clave: 'robusta', etiqueta: 'Robusta', pista: 'Serif con cuerpo. Talleres, obra.', familia: "'Bitter Variable', serif" },
  { clave: 'tecnica', etiqueta: 'Técnica', pista: 'Geométrica. Marcas jóvenes.', familia: "'Space Grotesk Variable', sans-serif" },
  { clave: 'geometrica', etiqueta: 'Geométrica', pista: 'Círculos perfectos. Muy limpia.', familia: "'Outfit Variable', sans-serif" },
  { clave: 'minimal', etiqueta: 'Minimal', pista: 'Neutra y compacta.', familia: "'Manrope Variable', sans-serif" },
  { clave: 'cercana', etiqueta: 'Cercana', pista: 'Amable sin ser infantil.', familia: "'Figtree Variable', sans-serif" },
  { clave: 'amable', etiqueta: 'Amable', pista: 'Redondeada y cálida.', familia: "'Plus Jakarta Sans Variable', sans-serif" },
  { clave: 'redonda', etiqueta: 'Redonda', pista: 'Muy suave. Infantil, mascotas.', familia: "'Nunito Variable', sans-serif" },
  { clave: 'popular', etiqueta: 'Popular', pista: 'La de siempre. Nunca desentona.', familia: "'Montserrat Variable', sans-serif" },
  { clave: 'poppins', etiqueta: 'Redondeada', pista: 'Geométrica y muy usada.', familia: "'Poppins', sans-serif" },
  { clave: 'titular', etiqueta: 'Impacto', pista: 'Titulares muy pesados. Gimnasios.', familia: "'Archivo Black', sans-serif" },
  { clave: 'caracter', etiqueta: 'Carácter', pista: 'Rara a propósito. Creativos.', familia: "'Bricolage Grotesque Variable', sans-serif" },
  { clave: 'manuscrita', etiqueta: 'Manuscrita', pista: 'Escrita a mano. Pastelería, flores.', familia: "'Caveat Variable', cursive" },
]

export const BOTONES: OpcionTema<BotonesTema>[] = [
  { clave: 'redondeados', etiqueta: 'Redondeados' },
  { clave: 'suaves', etiqueta: 'Muy redondeados' },
  { clave: 'pildora', etiqueta: 'Pastilla' },
  { clave: 'rectos', etiqueta: 'Rectos' },
]

export const ESTILOS_BOTON: OpcionTema<EstiloBoton>[] = [
  { clave: 'relleno', etiqueta: 'Relleno', pista: 'Tarjeta blanca con sombra suave.' },
  { clave: 'contorno', etiqueta: 'Contorno', pista: 'Sin relleno, solo el borde. Muy limpio.' },
  { clave: 'cristal', etiqueta: 'Cristal', pista: 'Translúcido. Luce sobre foto de fondo.' },
  { clave: 'duro', etiqueta: 'Sombra dura', pista: 'Borde grueso y sombra marcada.' },
]

export const FONDOS: OpcionTema<FondoTema>[] = [
  { clave: 'sutil', etiqueta: 'Halo de color', pista: 'Un reflejo suave de tu color arriba.' },
  { clave: 'liso', etiqueta: 'Liso', pista: 'Un solo color plano.' },
  { clave: 'degradado', etiqueta: 'Degradado', pista: 'Se aclara de arriba abajo.' },
  { clave: 'imagen', etiqueta: 'Foto', pista: 'Tu foto de fondo, con un velo para que el texto se lea.' },
]

export const TAMANOS_TEXTO: OpcionTema<TamanoTexto>[] = [
  { clave: 'compacto', etiqueta: 'Compacto', pista: 'Cabe más en la primera pantalla.' },
  { clave: 'normal', etiqueta: 'Normal' },
  { clave: 'grande', etiqueta: 'Grande', pista: 'Más fácil de leer para gente mayor.' },
]

export const ANCHOS: OpcionTema<AnchoPagina>[] = [
  { clave: 'estrecho', etiqueta: 'Estrecho', pista: 'Columna fina, estilo móvil.' },
  { clave: 'normal', etiqueta: 'Normal' },
  { clave: 'ancho', etiqueta: 'Ancho', pista: 'Aprovecha la pantalla del ordenador.' },
]

export const SEPARACIONES: OpcionTema<Separacion>[] = [
  { clave: 'justa', etiqueta: 'Junta' },
  { clave: 'normal', etiqueta: 'Normal' },
  { clave: 'amplia', etiqueta: 'Separada' },
]

export const AVATAR_FORMAS: OpcionTema<AvatarForma>[] = [
  { clave: 'circulo', etiqueta: 'Redondo' },
  { clave: 'redondeado', etiqueta: 'Esquinas suaves' },
  { clave: 'cuadrado', etiqueta: 'Cuadrado' },
]

/**
 * Paleta de acentos sugeridos. Se usan como fondo del botón principal, así que
 * el editor calcula el color del texto con textoSobre() en vez de suponer.
 */
export const ACENTOS: { valor: string; nombre: string }[] = [
  { valor: '#FF5D2E', nombre: 'Naranja' },
  { valor: '#E0342B', nombre: 'Rojo' },
  { valor: '#C2185B', nombre: 'Frambuesa' },
  { valor: '#B5179E', nombre: 'Magenta' },
  { valor: '#7B3FF2', nombre: 'Violeta' },
  { valor: '#4257F5', nombre: 'Índigo' },
  { valor: '#0B5FFF', nombre: 'Azul' },
  { valor: '#0284C7', nombre: 'Azul cielo' },
  { valor: '#0E7C7B', nombre: 'Verde azulado' },
  { valor: '#1B8A4B', nombre: 'Verde' },
  { valor: '#5C8A1B', nombre: 'Oliva' },
  { valor: '#A8761B', nombre: 'Mostaza' },
  { valor: '#C2410C', nombre: 'Teja' },
  { valor: '#8A5A3B', nombre: 'Marrón' },
  { valor: '#6B7280', nombre: 'Gris' },
  { valor: '#22201C', nombre: 'Negro' },
]

// ── Normalización ────────────────────────────────────────────────────────────

const PRESETS_VALIDOS = new Set<string>(PRESETS.map((p) => p.clave))
const FUENTES_VALIDAS = new Set<string>(FUENTES.map((f) => f.clave))
const BOTONES_VALIDOS = new Set<string>(BOTONES.map((b) => b.clave))
const ESTILOS_VALIDOS = new Set<string>(ESTILOS_BOTON.map((e) => e.clave))
const FONDOS_VALIDOS = new Set<string>(FONDOS.map((f) => f.clave))
const TAMANOS_VALIDOS = new Set<string>(TAMANOS_TEXTO.map((t) => t.clave))
const ANCHOS_VALIDOS = new Set<string>(ANCHOS.map((a) => a.clave))
const SEPARACIONES_VALIDAS = new Set<string>(SEPARACIONES.map((s) => s.clave))
const FORMAS_VALIDAS = new Set<string>(AVATAR_FORMAS.map((f) => f.clave))

/** Valores que existieron en versiones anteriores y siguen en producción. */
const FUENTES_ANTIGUAS: Record<string, FuenteTema> = {
  sistema: 'moderna',
  grotesca: 'moderna',
  serif: 'clasica',
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export function colorValido(valor: string): boolean {
  return HEX.test(valor.trim())
}

function enumerado<T extends string>(valor: unknown, validos: Set<string>, porDefecto: T): T {
  return typeof valor === 'string' && validos.has(valor) ? (valor as T) : porDefecto
}

/** https obligatorio: un http:// rompe el candado de una página cifrada. */
export function urlHttps(valor: unknown): string {
  if (typeof valor !== 'string') return ''
  const v = valor.trim()
  if (v === '' || v.length > 500) return ''
  try {
    const u = new URL(v)
    return u.protocol === 'https:' ? u.toString() : ''
  } catch {
    return ''
  }
}

export function normalizarTema(bruto: unknown): Tema {
  const t = (bruto ?? {}) as Record<string, unknown>

  const fuenteBruta = typeof t.fuente === 'string' ? t.fuente : ''
  const fuente = FUENTES_VALIDAS.has(fuenteBruta)
    ? (fuenteBruta as FuenteTema)
    : (FUENTES_ANTIGUAS[fuenteBruta] ?? TEMA_POR_DEFECTO.fuente)

  const velo = Number(t.fondoVelo)
  const fondoImagenUrl = urlHttps(t.fondoImagenUrl)
  let fondo = enumerado<FondoTema>(t.fondo, FONDOS_VALIDOS, TEMA_POR_DEFECTO.fondo)
  // Un fondo de foto sin foto deja la página en blanco y el cliente no entiende
  // por qué. Se cae al halo, que es el valor por defecto.
  if (fondo === 'imagen' && !fondoImagenUrl) fondo = 'sutil'

  return {
    preset: enumerado<PresetTema>(t.preset, PRESETS_VALIDOS, TEMA_POR_DEFECTO.preset),
    acento:
      typeof t.acento === 'string' && colorValido(t.acento)
        ? t.acento.trim()
        : TEMA_POR_DEFECTO.acento,
    fuente,
    botones: enumerado<BotonesTema>(t.botones, BOTONES_VALIDOS, TEMA_POR_DEFECTO.botones),
    estiloBoton: enumerado<EstiloBoton>(t.estiloBoton, ESTILOS_VALIDOS, TEMA_POR_DEFECTO.estiloBoton),
    fondo,
    fondoImagenUrl,
    fondoVelo: Number.isFinite(velo) ? Math.min(90, Math.max(0, Math.round(velo))) : TEMA_POR_DEFECTO.fondoVelo,
    fondoFijo: t.fondoFijo !== false,
    tamanoTexto: enumerado<TamanoTexto>(t.tamanoTexto, TAMANOS_VALIDOS, TEMA_POR_DEFECTO.tamanoTexto),
    ancho: enumerado<AnchoPagina>(t.ancho, ANCHOS_VALIDOS, TEMA_POR_DEFECTO.ancho),
    separacion: enumerado<Separacion>(t.separacion, SEPARACIONES_VALIDAS, TEMA_POR_DEFECTO.separacion),
    avatarForma: enumerado<AvatarForma>(t.avatarForma, FORMAS_VALIDAS, TEMA_POR_DEFECTO.avatarForma),
  }
}

/**
 * Sobre un color dado, ¿el texto va en blanco o en negro?
 *
 * Luminancia relativa de la WCAG. Un mostaza claro con letra blanca es
 * ilegible al sol, y este es justo el sitio donde importa: el botón principal.
 */
export function textoSobre(color: string): '#ffffff' | '#14120f' {
  const hex = color.trim().replace('#', '')
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
