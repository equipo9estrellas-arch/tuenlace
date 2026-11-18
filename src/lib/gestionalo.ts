import { createHash } from 'node:crypto'
import { env } from './env'
import type { Actor } from './admin'

/**
 * GESTIONA-LO
 *
 * TUENLACE es una app más de la central de Grupo Publistar (Gestiona-lo, en
 * Supabase). Su panel de superadmin vive allí y llama a /api/gestionalo/* con
 * el token del login de la central (`Authorization: Bearer <access_token>`).
 *
 * Aquí no se guarda ni se reparte ningún permiso: se le pregunta a la propia
 * central con su función `gp_puede('tuenlace', módulo, nivel)`, llamada CON EL
 * TOKEN DEL USUARIO. Así:
 *   · un token falso o caducado lo rechaza Supabase, no código nuestro;
 *   · los roles y módulos se gestionan donde los demás (gp_roles, gp_accesos);
 *   · el superadmin de la central lo es aquí sin configurar nada más;
 *   · la verificación en dos pasos de la central también se aplica.
 */

export type Nivel = 'ver' | 'editar' | 'admin'
export const APP_ID = 'tuenlace'
export const MODULOS = ['resumen', 'cuentas', 'paginas', 'denuncias', 'registro'] as const
export type Modulo = (typeof MODULOS)[number]

const TIEMPO_MAX_MS = 6000
const CACHE_MS = 30_000
const MAX_CACHE = 2000

type Usuario = { id: string; email: string }
const cacheUsuario = new Map<string, { usuario: Usuario; hasta: number }>()
const cachePermiso = new Map<string, { ok: boolean; hasta: number }>()

function huella(token: string): string {
  return createHash('sha256').update(token).digest('base64url')
}

function recortar<T>(mapa: Map<string, T>) {
  if (mapa.size > MAX_CACHE) mapa.clear()
}

async function llamar(ruta: string, token: string, cuerpo?: unknown): Promise<Response> {
  return fetch(`${env.gestionaloSupabaseUrl}${ruta}`, {
    method: cuerpo === undefined ? 'GET' : 'POST',
    headers: {
      apikey: env.gestionaloSupabaseKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(TIEMPO_MAX_MS),
    cache: 'no-store',
  })
}

export type Autorizacion =
  | { ok: true; actor: Actor }
  | { ok: false; status: 401 | 403 | 503; error: string }

export function tokenDe(peticion: Request): string | null {
  const cabecera = peticion.headers.get('authorization') ?? ''
  const m = cabecera.match(/^Bearer\s+(\S+)$/i)
  return m ? m[1] : null
}

export async function autorizar(peticion: Request, modulo: Modulo, nivel: Nivel): Promise<Autorizacion> {
  if (!env.gestionaloSupabaseUrl || !env.gestionaloSupabaseKey) {
    return { ok: false, status: 503, error: 'La conexión con Gestiona-lo no está configurada en TUENLACE.' }
  }
  const token = tokenDe(peticion)
  if (!token) return { ok: false, status: 401, error: 'Falta el token de Gestiona-lo.' }
  const h = huella(token)
  const ahora = Date.now()

  // ¿Quién es? (y de paso, ¿el token vale?)
  const enCacheUsuario = cacheUsuario.get(h)
  let usuario = enCacheUsuario && enCacheUsuario.hasta > ahora ? enCacheUsuario.usuario : null
  if (!usuario) {
    try {
      const r = await llamar('/auth/v1/user', token)
      if (r.status === 401 || r.status === 403) return { ok: false, status: 401, error: 'La sesión de Gestiona-lo ha caducado.' }
      if (!r.ok) return { ok: false, status: 503, error: 'Gestiona-lo no responde.' }
      const u = (await r.json()) as { id?: string; email?: string }
      if (!u.id || !u.email) return { ok: false, status: 401, error: 'Token de Gestiona-lo no válido.' }
      usuario = { id: u.id, email: u.email.toLowerCase() }
      recortar(cacheUsuario)
      cacheUsuario.set(h, { usuario, hasta: ahora + CACHE_MS })
    } catch {
      return { ok: false, status: 503, error: 'Gestiona-lo no responde.' }
    }
  }

  // ¿Puede? Lo decide la central.
  const clave = `${h}|${modulo}|${nivel}`
  const enCache = cachePermiso.get(clave)
  let puede = enCache && enCache.hasta > ahora ? enCache.ok : null
  if (puede === null) {
    try {
      const r = await llamar('/rest/v1/rpc/gp_puede', token, { p_app: APP_ID, p_modulo: modulo, p_nivel: nivel })
      if (r.status === 401) return { ok: false, status: 401, error: 'La sesión de Gestiona-lo ha caducado.' }
      // 403 de la central = verificación en dos pasos pendiente (gp_pre_request).
      if (r.status === 403) return { ok: false, status: 403, error: 'Completa la verificación en dos pasos en Gestiona-lo.' }
      if (!r.ok) return { ok: false, status: 503, error: 'Gestiona-lo no responde.' }
      puede = (await r.json()) === true
      recortar(cachePermiso)
      cachePermiso.set(clave, { ok: puede, hasta: ahora + CACHE_MS })
    } catch {
      return { ok: false, status: 503, error: 'Gestiona-lo no responde.' }
    }
  }
  if (!puede) return { ok: false, status: 403, error: 'No tienes permiso para esto en TUENLACE.' }

  return { ok: true, actor: { userId: null, email: usuario.email, origen: 'gestiona-lo' } }
}

/** Cabeceras CORS para la web de Gestiona-lo (solo los orígenes configurados). */
export function cabecerasCors(peticion: Request): Record<string, string> {
  const origen = peticion.headers.get('origin')
  if (!origen || !env.gestionaloOrigenes.includes(origen)) return {}
  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}
