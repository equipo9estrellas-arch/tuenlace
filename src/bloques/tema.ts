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
export type FondoTema = 'liso' | 'sutil' | 'degradado' | 'gradiente' | 'patron' | 'imagen' | 'video'
export type PatronFondo = 'puntos' | 'rejilla' | 'diagonales' | 'ondas'
export type SombraBoton = 'ninguna' | 'suave' | 'marcada'
export type IconoBotonPos = 'izquierda' | 'derecha' | 'oculto'
export type CabeceraTema = 'clasica' | 'portada' | 'logo'
export type AvatarTam = 'pequeno' | 'normal' | 'grande'
export type RedesPosicion = 'orden' | 'arriba' | 'abajo'
export type RedesEstilo = 'tarjeta' | 'acento' | 'marca' | 'limpio'
export type EntradaTema = 'ninguna' | 'aparecer' | 'subir' | 'escalonado'
export type HoverTema = 'elevar' | 'crecer' | 'iluminar' | 'ninguno'
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

  // ── Colores libres. Vacío = los de la paleta. ──
  colorFondo: string
  colorTexto: string
  colorBoton: string
  colorBotonTexto: string

  // ── Fondos ──
  /** fondo === 'gradiente' */
  gradienteDesde: string
  gradienteHasta: string
  gradienteAngulo: number
  /** fondo === 'patron' */
  patron: PatronFondo
  /** Foto de fondo desenfocada */
  fondoDesenfoque: boolean
  /** fondo === 'video' (plan con `disenoAvanzado`) */
  fondoVideoUrl: string

  /** Fuente solo para los títulos. Vacío = la de la pareja elegida. */
  fuenteTitulo: FuenteTema | ''

  // ── Botones a medida ──
  /** Radio en px. -1 = el de la forma elegida en `botones`. */
  radio: number
  sombra: SombraBoton
  /** Grosor del borde, 0–3 px */
  bordeBoton: number
  iconoBoton: IconoBotonPos

  // ── Cabecera ──
  cabecera: CabeceraTema
  avatarTam: AvatarTam
  redesPosicion: RedesPosicion
  redesEstilo: RedesEstilo

  // ── Efectos (plan con `disenoAvanzado`) ──
  entrada: EntradaTema
  efectoHover: HoverTema
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
  colorFondo: '',
  colorTexto: '',
  colorBoton: '',
  colorBotonTexto: '',
  gradienteDesde: '',
  gradienteHasta: '',
  gradienteAngulo: 160,
  patron: 'puntos',
  fondoDesenfoque: false,
  fondoVideoUrl: '',
  fuenteTitulo: '',
  radio: -1,
  sombra: 'suave',
  bordeBoton: 1,
  iconoBoton: 'izquierda',
  cabecera: 'clasica',
  avatarTam: 'normal',
  redesPosicion: 'orden',
  redesEstilo: 'tarjeta',
  entrada: 'ninguna',
  efectoHover: 'elevar',
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
  { clave: 'degradado', etiqueta: 'Degradado suave', pista: 'Se aclara de arriba abajo.' },
  { clave: 'gradiente', etiqueta: 'Degradado a tu gusto', pista: 'Dos colores tuyos y el ángulo que quieras.' },
  { clave: 'patron', etiqueta: 'Patrón', pista: 'Un dibujo discreto: puntos, rejilla, rayas u ondas.' },
  { clave: 'imagen', etiqueta: 'Foto', pista: 'Tu foto de fondo, con un velo para que el texto se lea.' },
  { clave: 'video', etiqueta: 'Vídeo', pista: 'Un vídeo corto en bucle, sin sonido, detrás de todo.' },
]

export const PATRONES: OpcionTema<PatronFondo>[] = [
  { clave: 'puntos', etiqueta: 'Puntos' },
  { clave: 'rejilla', etiqueta: 'Rejilla' },
  { clave: 'diagonales', etiqueta: 'Rayas' },
  { clave: 'ondas', etiqueta: 'Ondas' },
]

export const SOMBRAS: OpcionTema<SombraBoton>[] = [
  { clave: 'ninguna', etiqueta: 'Sin sombra' },
  { clave: 'suave', etiqueta: 'Suave' },
  { clave: 'marcada', etiqueta: 'Marcada' },
]

export const ICONOS_POS: OpcionTema<IconoBotonPos>[] = [
  { clave: 'izquierda', etiqueta: 'A la izquierda' },
  { clave: 'derecha', etiqueta: 'A la derecha' },
  { clave: 'oculto', etiqueta: 'Sin iconos' },
]

export const CABECERAS: OpcionTema<CabeceraTema>[] = [
  { clave: 'clasica', etiqueta: 'Clásica', pista: 'Logo, título y frase, centrados.' },
  { clave: 'portada', etiqueta: 'Portada grande', pista: 'Tu portada de borde a borde, con el logo encima. Necesita portada.' },
  { clave: 'logo', etiqueta: 'Solo el logo', pista: 'Tu logo grande en lugar del título escrito. Para logos con el nombre dentro.' },
]

export const AVATAR_TAMS: OpcionTema<AvatarTam>[] = [
  { clave: 'pequeno', etiqueta: 'Pequeño' },
  { clave: 'normal', etiqueta: 'Normal' },
  { clave: 'grande', etiqueta: 'Grande' },
]

export const REDES_POSICIONES: OpcionTema<RedesPosicion>[] = [
  { clave: 'orden', etiqueta: 'Donde esté el bloque' },
  { clave: 'arriba', etiqueta: 'Arriba, bajo el título' },
  { clave: 'abajo', etiqueta: 'Abajo del todo' },
]

export const REDES_ESTILOS: OpcionTema<RedesEstilo>[] = [
  { clave: 'tarjeta', etiqueta: 'Botón blanco' },
  { clave: 'acento', etiqueta: 'Tu color' },
  { clave: 'marca', etiqueta: 'Color de cada red' },
  { clave: 'limpio', etiqueta: 'Solo el icono' },
]

export const ENTRADAS: OpcionTema<EntradaTema>[] = [
  { clave: 'ninguna', etiqueta: 'Sin animación' },
  { clave: 'aparecer', etiqueta: 'Aparece' },
  { clave: 'subir', etiqueta: 'Sube' },
  { clave: 'escalonado', etiqueta: 'Uno detrás de otro' },
]

export const HOVERS: OpcionTema<HoverTema>[] = [
  { clave: 'elevar', etiqueta: 'Se eleva' },
  { clave: 'crecer', etiqueta: 'Crece' },
  { clave: 'iluminar', etiqueta: 'Se ilumina' },
  { clave: 'ninguno', etiqueta: 'Nada' },
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
  const fondoVideoUrl = urlHttps(t.fondoVideoUrl)
  let fondo = enumerado<FondoTema>(t.fondo, FONDOS_VALIDOS, TEMA_POR_DEFECTO.fondo)
  // Un fondo de foto sin foto deja la página en blanco y el cliente no entiende
  // por qué. Se cae al halo, que es el valor por defecto. Igual con el vídeo.
  if (fondo === 'imagen' && !fondoImagenUrl) fondo = 'sutil'
  if (fondo === 'video' && !fondoVideoUrl) fondo = 'sutil'

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
    colorFondo: hex(t.colorFondo),
    colorTexto: hex(t.colorTexto),
    colorBoton: hex(t.colorBoton),
    colorBotonTexto: hex(t.colorBotonTexto),
    gradienteDesde: hex(t.gradienteDesde),
    gradienteHasta: hex(t.gradienteHasta),
    gradienteAngulo: entre(t.gradienteAngulo, 0, 360, TEMA_POR_DEFECTO.gradienteAngulo),
    patron: enumerado<PatronFondo>(t.patron, valores(PATRONES), TEMA_POR_DEFECTO.patron),
    fondoDesenfoque: t.fondoDesenfoque === true,
    fondoVideoUrl,
    fuenteTitulo:
      typeof t.fuenteTitulo === 'string' && FUENTES_VALIDAS.has(t.fuenteTitulo)
        ? (t.fuenteTitulo as FuenteTema)
        : '',
    radio: Number(t.radio) === -1 || t.radio === undefined ? -1 : entre(t.radio, 0, 40, -1),
    sombra: enumerado<SombraBoton>(t.sombra, valores(SOMBRAS), TEMA_POR_DEFECTO.sombra),
    bordeBoton: entre(t.bordeBoton, 0, 3, TEMA_POR_DEFECTO.bordeBoton),
    iconoBoton: enumerado<IconoBotonPos>(t.iconoBoton, valores(ICONOS_POS), TEMA_POR_DEFECTO.iconoBoton),
    cabecera: enumerado<CabeceraTema>(t.cabecera, valores(CABECERAS), TEMA_POR_DEFECTO.cabecera),
    avatarTam: enumerado<AvatarTam>(t.avatarTam, valores(AVATAR_TAMS), TEMA_POR_DEFECTO.avatarTam),
    redesPosicion: enumerado<RedesPosicion>(t.redesPosicion, valores(REDES_POSICIONES), TEMA_POR_DEFECTO.redesPosicion),
    redesEstilo: enumerado<RedesEstilo>(t.redesEstilo, valores(REDES_ESTILOS), TEMA_POR_DEFECTO.redesEstilo),
    entrada: enumerado<EntradaTema>(t.entrada, valores(ENTRADAS), TEMA_POR_DEFECTO.entrada),
    efectoHover: enumerado<HoverTema>(t.efectoHover, valores(HOVERS), TEMA_POR_DEFECTO.efectoHover),
  }
}

function valores<T extends string>(opciones: OpcionTema<T>[]): Set<string> {
  return new Set(opciones.map((o) => o.clave))
}

function hex(valor: unknown): string {
  return typeof valor === 'string' && colorValido(valor) ? valor.trim() : ''
}

function entre(valor: unknown, min: number, max: number, porDefecto: number): number {
  const n = Number(valor)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : porDefecto
}

/**
 * Lo que el plan de HOY no da se recorta: vídeo de fondo y efectos. Al
 * guardar y al pintar, para que una baja no deje nada de pago funcionando.
 */
export function aplicarPlanATema(tema: Tema, disenoAvanzado: boolean): Tema {
  if (disenoAvanzado) return tema
  return {
    ...tema,
    fondo: tema.fondo === 'video' ? 'sutil' : tema.fondo,
    entrada: 'ninguna',
    efectoHover: 'elevar',
  }
}

/** Contraste WCAG entre dos colores hex: 1 (nada) a 21 (negro sobre blanco). */
export function contraste(a: string, b: string): number {
  const lum = (color: string) => {
    let h = color.trim().replace('#', '')
    if (h.length === 3) h = h.split('').map((c) => c + c).join('')
    if (h.length !== 6) return 0
    const canal = (i: number) => {
      const v = parseInt(h.slice(i, i + 2), 16) / 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4)
  }
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/**
 * Los atributos y variables CSS de un tema, para la página pública y para la
 * vista previa del editor. Un único sitio: si cada uno los montara por su
 * cuenta, la vista previa acabaría enseñando algo distinto de lo publicado.
 */
export function atributosTema(tema: Tema): {
  datos: Record<string, string>
  estilo: Record<string, string>
} {
  const acento = colorValido(tema.acento) ? tema.acento : TEMA_POR_DEFECTO.acento
  const datos: Record<string, string> = {
    'data-preset': tema.preset,
    'data-botones': tema.botones,
    'data-estilo': tema.estiloBoton,
    'data-fuente': tema.fuente,
    'data-fondo': tema.fondo,
    'data-fondo-fijo': tema.fondoFijo ? 'si' : 'no',
    'data-tam': tema.tamanoTexto,
    'data-ancho': tema.ancho,
    'data-separacion': tema.separacion,
    'data-sombra': tema.sombra,
    'data-icono': tema.iconoBoton,
    'data-cabecera': tema.cabecera,
    'data-redes': tema.redesEstilo,
    'data-entrada': tema.entrada,
    'data-hover': tema.efectoHover,
  }
  if (tema.fuenteTitulo) datos['data-fuente-titulo'] = tema.fuenteTitulo
  if (tema.fondo === 'patron') datos['data-patron'] = tema.patron
  if (tema.fondo === 'imagen' && tema.fondoDesenfoque) datos['data-desenfoque'] = 'si'

  const estilo: Record<string, string> = {
    '--p-acento': acento,
    '--p-acento-texto': textoSobre(acento),
    '--p-borde-boton': `${tema.bordeBoton}px`,
    '--p-avatar': tema.avatarTam === 'pequeno' ? '80px' : tema.avatarTam === 'grande' ? '136px' : '104px',
  }
  if (tema.radio >= 0) estilo['--p-radio'] = `${tema.radio}px`

  // Colores libres: pisan los de la paleta. Los derivados (texto suave,
  // bordes, segundo fondo) se mezclan a partir de ellos para que todo siga
  // casando sin pedir siete colores.
  if (tema.colorFondo) {
    estilo['--p-fondo'] = tema.colorFondo
    estilo['--p-fondo-2'] = `color-mix(in oklab, ${tema.colorFondo} 90%, var(--p-texto))`
  }
  if (tema.colorTexto) {
    estilo['--p-texto'] = tema.colorTexto
    estilo['--p-texto-suave'] = `color-mix(in oklab, ${tema.colorTexto} 70%, var(--p-fondo))`
  }
  if (tema.colorFondo || tema.colorTexto) {
    estilo['--p-borde'] = 'color-mix(in oklab, var(--p-texto) 14%, var(--p-fondo))'
  }
  if (tema.colorBoton) estilo['--p-tarjeta'] = tema.colorBoton
  if (tema.colorBotonTexto) estilo['--p-boton-texto'] = tema.colorBotonTexto

  if (tema.fondo === 'gradiente') {
    estilo['--p-grad-desde'] = tema.gradienteDesde || acento
    estilo['--p-grad-hasta'] = tema.gradienteHasta || 'var(--p-fondo)'
    estilo['--p-grad-angulo'] = `${tema.gradienteAngulo}deg`
  }
  if (tema.fondo === 'imagen' && tema.fondoImagenUrl) {
    // La URL ya viene validada como https; aun así se escapan comillas y
    // paréntesis, que es lo único que podría romper el url() del CSS.
    estilo['--p-fondo-img'] = `url("${tema.fondoImagenUrl.replace(/["()\\]/g, '')}")`
  }
  if (tema.fondo === 'imagen' || tema.fondo === 'video') estilo['--p-velo'] = String(tema.fondoVelo)

  return { datos, estilo }
}

// ── Plantillas (plan con `disenoAvanzado`) ───────────────────────────────────
//
// Diseños completos por sector. Solo combinan opciones del propio tema: no hay
// nada aquí que no se pueda hacer a mano. Lo que se vende es el atajo.

export type Plantilla = { clave: string; nombre: string; para: string; tema: Partial<Tema> }

export const PLANTILLAS: Plantilla[] = [
  {
    clave: 'barberia',
    nombre: 'Barbería',
    para: 'Barberías y peluquerías de hombre',
    tema: { preset: 'oscuro', acento: '#C2410C', fuente: 'robusta', fuenteTitulo: 'titular', botones: 'rectos', estiloBoton: 'duro', fondo: 'patron', patron: 'diagonales', sombra: 'marcada', iconoBoton: 'izquierda', redesEstilo: 'acento', cabecera: 'clasica' },
  },
  {
    clave: 'belleza',
    nombre: 'Estética',
    para: 'Centros de estética, uñas, pestañas',
    tema: { preset: 'rosa', acento: '#C2185B', fuente: 'elegante', fuenteTitulo: '', botones: 'pildora', estiloBoton: 'relleno', fondo: 'gradiente', gradienteDesde: '#FCE4EC', gradienteHasta: '#FFF8F6', gradienteAngulo: 170, sombra: 'suave', redesEstilo: 'limpio' },
  },
  {
    clave: 'restaurante',
    nombre: 'Restaurante',
    para: 'Restaurantes, bares y cafeterías',
    tema: { preset: 'crema', acento: '#A8761B', fuente: 'editorial', botones: 'suaves', estiloBoton: 'contorno', fondo: 'patron', patron: 'puntos', sombra: 'ninguna', bordeBoton: 2, cabecera: 'portada', redesEstilo: 'tarjeta' },
  },
  {
    clave: 'clinica',
    nombre: 'Clínica',
    para: 'Clínicas, fisioterapia, dentistas',
    tema: { preset: 'nieve', acento: '#0284C7', fuente: 'minimal', botones: 'redondeados', estiloBoton: 'relleno', fondo: 'sutil', sombra: 'suave', iconoBoton: 'izquierda', redesEstilo: 'limpio' },
  },
  {
    clave: 'gimnasio',
    nombre: 'Gimnasio',
    para: 'Gimnasios, entrenadores, deporte',
    tema: { preset: 'noche', acento: '#E0342B', fuente: 'tecnica', fuenteTitulo: 'titular', botones: 'rectos', estiloBoton: 'relleno', fondo: 'gradiente', gradienteDesde: '#1a0b0b', gradienteHasta: '#0c1017', gradienteAngulo: 200, sombra: 'marcada', redesEstilo: 'acento' },
  },
  {
    clave: 'inmobiliaria',
    nombre: 'Inmobiliaria',
    para: 'Inmobiliarias y reformas',
    tema: { preset: 'tinta', acento: '#22201C', fuente: 'moderna', fuenteTitulo: 'elegante', botones: 'rectos', estiloBoton: 'contorno', fondo: 'liso', sombra: 'ninguna', bordeBoton: 1, cabecera: 'portada', redesEstilo: 'limpio' },
  },
  {
    clave: 'creativo',
    nombre: 'Creativo',
    para: 'Fotógrafos, diseñadores, estudios',
    tema: { preset: 'lavanda', acento: '#7B3FF2', fuente: 'caracter', botones: 'pildora', estiloBoton: 'cristal', fondo: 'gradiente', gradienteDesde: '#E9DDFF', gradienteHasta: '#FFE8D6', gradienteAngulo: 135, sombra: 'suave', redesEstilo: 'marca', entrada: 'escalonado', efectoHover: 'crecer' },
  },
  {
    clave: 'natural',
    nombre: 'Natural',
    para: 'Herbolarios, yoga, productos ecológicos',
    tema: { preset: 'menta', acento: '#1B8A4B', fuente: 'cercana', fuenteTitulo: 'legible', botones: 'suaves', estiloBoton: 'relleno', fondo: 'patron', patron: 'ondas', sombra: 'suave', redesEstilo: 'tarjeta', entrada: 'subir' },
  },
]

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
