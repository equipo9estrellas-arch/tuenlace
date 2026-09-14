/**
 * Validación y normalización de slugs.
 *
 * Este módulo es PURO a propósito: no importa la base de datos ni nada de
 * servidor, porque lo usan también componentes de cliente (el campo del hero).
 * Las comprobaciones contra la base de datos viven en slug-db.ts.
 */

/**
 * Palabras que no pueden ser un slug de usuario porque son (o serán) rutas
 * del propio producto. Reservarlas ANTES de abrir el registro es obligatorio:
 * recuperarlas después significa quitarle la URL a un cliente.
 */
export const RESERVADAS = new Set([
  'admin', 'administrador', 'api', 'app', 'agencias', 'agencia', 'ayuda', 'about',
  'blog', 'buscar', 'cuenta', 'contacto', 'cookies', 'crear', 'demo', 'docs',
  'entrar', 'empresa', 'equipo', 'estado', 'faq', 'favicon', 'funciones',
  'guia', 'hola', 'inicio', 'legal', 'login', 'logout', 'manifest', 'nuevo',
  'onboarding', 'opensearch', 'panel', 'partners', 'plantillas', 'precios',
  'prensa', 'privacidad', 'publico', 'qr', 'recursos', 'registro',
  'robots', 'salir', 'settings', 'sitemap', 'soporte', 'status', 'support',
  'terminos', 'tuenlace', 'usuario', 'usuarios', 'www', 'aviso-legal',
  'herramientas', 'comparativa', 'alternativa-a-linktree', 'denunciar',
  'condiciones', '_next', 'static', 'assets', 'images', 'img', 'css', 'js', 'fonts',
])

const PATRON = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/

export type ResultadoSlug = { valido: true; slug: string } | { valido: false; motivo: string }

/**
 * Normaliza lo que escribe el usuario: quita acentos, pasa a minúsculas,
 * convierte espacios en guiones. "Peluquería Marta" → "peluqueria-marta".
 */
export function normalizarSlug(entrada: string): string {
  return entrada
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
}

export function validarSlug(entrada: string): ResultadoSlug {
  const slug = normalizarSlug(entrada)

  if (slug.length < 3) return { valido: false, motivo: 'Necesita al menos 3 letras.' }
  if (slug.length > 30) return { valido: false, motivo: 'Como mucho 30 caracteres.' }
  if (!PATRON.test(slug)) return { valido: false, motivo: 'Solo letras, números y guiones.' }
  if (RESERVADAS.has(slug)) return { valido: false, motivo: 'Ese nombre está reservado.' }

  return { valido: true, slug }
}

/** Candidatos a sugerir cuando el slug está ocupado. El filtrado por
 *  disponibilidad se hace en slug-db.ts. */
export function candidatosSlug(base: string): string[] {
  const raiz = normalizarSlug(base).slice(0, 24)
  return [`${raiz}tf`, `${raiz}-es`, `${raiz}oficial`, `${raiz}1`, `hola${raiz}`, `${raiz}-canarias`]
}
