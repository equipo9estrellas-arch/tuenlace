import { NextResponse } from 'next/server'
import { and, eq, gt } from 'drizzle-orm'
import { db, sessions } from '@/db'
import {
  NOMBRE_ESTADO,
  detalleCuenta,
  listarCuentas,
  listarDenuncias,
  listarPaginas,
  listarRegistro,
  metricas,
  type EstadoCuenta,
} from '@/lib/admin-datos'
import * as ops from '@/lib/admin-ops'
import { registrar } from '@/lib/admin'
import { env } from '@/lib/env'
import { autorizar, cabecerasCors, type Modulo, type Nivel } from '@/lib/gestionalo'
import { firmarFicha, firmarSesion, leerFicha, ponerCookieSesion } from '@/lib/session'
import { PLANES, type ClavePlan } from '@/lib/planes'

const PLANES_ELEGIBLES: ClavePlan[] = ['ESENCIAL', 'AGENCIA']

/**
 * API de TUENLACE para Gestiona-lo. Ver src/lib/gestionalo.ts y
 * docs/GESTIONALO.md (el contrato completo, con ejemplos).
 *
 * Todas las respuestas son JSON: { ok: true, datos } o { ok: false, error }.
 */

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ ruta: string[] }> }

const SEGUNDOS_ENLACE_ENTRAR = 120

function json(peticion: Request, cuerpo: unknown, status = 200) {
  return NextResponse.json(cuerpo, {
    status,
    headers: { ...cabecerasCors(peticion), 'Cache-Control': 'no-store' },
  })
}

function error(peticion: Request, mensaje: string, status = 400) {
  return json(peticion, { ok: false, error: mensaje }, status)
}

async function exigir(peticion: Request, modulo: Modulo, nivel: Nivel) {
  const a = await autorizar(peticion, modulo, nivel)
  return a.ok ? { actor: a.actor, fallo: null } : { actor: null, fallo: error(peticion, a.error, a.status) }
}

function resultado(peticion: Request, r: ops.Resultado<unknown>) {
  if (r.ok) return json(peticion, { ok: true, datos: r.datos ?? null })
  return error(peticion, r.error, r.codigo ?? 400)
}

async function cuerpoDe(peticion: Request): Promise<Record<string, unknown>> {
  try {
    const c = await peticion.json()
    return c && typeof c === 'object' ? (c as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const txt = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))

export async function OPTIONS(peticion: Request) {
  return new NextResponse(null, { status: 204, headers: cabecerasCors(peticion) })
}

// ── Lecturas ─────────────────────────────────────────────────────────────────

export async function GET(peticion: Request, { params }: Ctx) {
  const ruta = (await params).ruta
  const url = new URL(peticion.url)
  const q = url.searchParams.get('q')?.trim() || undefined

  // El enlace de «entrar como»: lo abre el navegador, sin token de la central.
  if (ruta[0] === 'entrar' && ruta.length === 1) return entrar(peticion, url)

  if (ruta[0] === 'catalogo' && ruta.length === 1) {
    const { fallo } = await exigir(peticion, 'resumen', 'ver')
    if (fallo) return fallo
    return json(peticion, {
      ok: true,
      datos: {
        // Solo los planes que existen para el cliente: Esencial y Agencia.
        // No hay plan gratis; 'GRATIS' es el estado «sin plan» y solo se usa
        // para retirar un plan puesto a mano (claveSinPlan).
        planes: PLANES_ELEGIBLES.map((c) => ({
          clave: c,
          nombre: PLANES[c].nombre,
          precioMensualCentimos: PLANES[c].precioMensualCentimos,
          paginas: PLANES[c].limites.paginas,
          aLaVenta: PLANES[c].disponible,
        })),
        claveSinPlan: 'GRATIS',
        estadosCuenta: NOMBRE_ESTADO,
        appUrl: env.appUrl,
      },
    })
  }

  if (ruta[0] === 'resumen' && ruta.length === 1) {
    const { fallo } = await exigir(peticion, 'resumen', 'ver')
    if (fallo) return fallo
    return json(peticion, { ok: true, datos: await metricas() })
  }

  if (ruta[0] === 'cuentas') {
    const { fallo } = await exigir(peticion, 'cuentas', 'ver')
    if (fallo) return fallo
    if (ruta.length === 1) {
      const pedido = url.searchParams.get('estado') as EstadoCuenta | null
      const estado = pedido && pedido in NOMBRE_ESTADO ? pedido : undefined
      return json(peticion, { ok: true, datos: await listarCuentas({ q, estado }) })
    }
    if (ruta.length === 2) {
      const d = await detalleCuenta(ruta[1])
      return d ? json(peticion, { ok: true, datos: d }) : error(peticion, 'Esa cuenta no existe.', 404)
    }
  }

  if (ruta[0] === 'paginas' && ruta.length === 1) {
    const { fallo } = await exigir(peticion, 'paginas', 'ver')
    if (fallo) return fallo
    const f = url.searchParams.get('estado')
    const estado = f === 'PUBLICADA' || f === 'SUSPENDIDA' || f === 'BORRADOR' ? f : undefined
    return json(peticion, {
      ok: true,
      datos: await listarPaginas({ q, estado, revision: url.searchParams.get('revision') === '1' }),
    })
  }

  if (ruta[0] === 'denuncias' && ruta.length === 1) {
    const { fallo } = await exigir(peticion, 'denuncias', 'ver')
    if (fallo) return fallo
    return json(peticion, { ok: true, datos: await listarDenuncias(url.searchParams.get('ver') !== 'resueltas') })
  }

  if (ruta[0] === 'registro' && ruta.length === 1) {
    const { fallo } = await exigir(peticion, 'registro', 'ver')
    if (fallo) return fallo
    return json(peticion, { ok: true, datos: await listarRegistro() })
  }

  return error(peticion, 'No existe esa ruta.', 404)
}

// ── Acciones ─────────────────────────────────────────────────────────────────

export async function POST(peticion: Request, { params }: Ctx) {
  const [recurso, id, accion, ...resto] = (await params).ruta
  if (!id || !accion || resto.length) return error(peticion, 'No existe esa ruta.', 404)
  const c = await cuerpoDe(peticion)

  if (recurso === 'cuentas') {
    const nivel: Nivel = accion === 'borrar' ? 'admin' : 'editar'
    const { actor, fallo } = await exigir(peticion, 'cuentas', nivel)
    if (fallo) return fallo
    switch (accion) {
      case 'plan':
        return resultado(peticion, await ops.cambiarPlan(actor!, id, txt(c.plan)))
      case 'prueba':
        return resultado(peticion, await ops.fijarPrueba(actor!, id, c.dias))
      case 'nombre':
        return resultado(peticion, await ops.renombrarCuenta(actor!, id, txt(c.nombre)))
      case 'borrar':
        return resultado(peticion, await ops.borrarCuenta(actor!, id, txt(c.confirmacion)))
    }
  }

  if (recurso === 'usuarios') {
    const nivel: Nivel = accion === 'entrar' ? 'admin' : 'editar'
    const { actor, fallo } = await exigir(peticion, 'cuentas', nivel)
    if (fallo) return fallo
    switch (accion) {
      case 'email':
        return resultado(peticion, await ops.cambiarEmail(actor!, id, txt(c.email)))
      case 'cerrar-sesiones':
        return resultado(peticion, await ops.cerrarSesionesDe(actor!, id))
      case 'entrar': {
        const r = await ops.abrirSesionComo(actor!, id)
        if (!r.ok || !r.datos) return resultado(peticion, r)
        // No se devuelve la sesión: se devuelve un enlace de un solo uso que
        // caduca en dos minutos y que, al abrirlo, deja la cookie en tuenlace.es.
        const t = await firmarFicha({ uso: 'entrar', sid: r.datos.sessionId }, SEGUNDOS_ENLACE_ENTRAR)
        return json(peticion, {
          ok: true,
          datos: {
            url: `${env.appUrl}/api/gestionalo/entrar?t=${encodeURIComponent(t)}`,
            caducaEnSegundos: SEGUNDOS_ENLACE_ENTRAR,
            sesionHasta: r.datos.expiraEn,
            email: r.datos.email,
          },
        })
      }
    }
  }

  if (recurso === 'paginas') {
    const { actor, fallo } = await exigir(peticion, 'paginas', 'editar')
    if (fallo) return fallo
    if (accion === 'suspender') return resultado(peticion, await ops.suspenderPagina(actor!, id, txt(c.motivo)))
    if (accion === 'restaurar') return resultado(peticion, await ops.restaurarPagina(actor!, id))
  }

  if (recurso === 'denuncias' && accion === 'resolver') {
    const { actor, fallo } = await exigir(peticion, 'denuncias', 'editar')
    if (fallo) return fallo
    return resultado(peticion, await ops.resolverDenuncia(actor!, id, txt(c.decision), txt(c.nota)))
  }

  return error(peticion, 'No existe esa ruta.', 404)
}

// ── Entrar como (el enlace) ──────────────────────────────────────────────────

async function entrar(peticion: Request, url: URL) {
  const pantalla = (titulo: string) =>
    new NextResponse(
      `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${titulo}</title><body style="font:16px/1.5 -apple-system,sans-serif;padding:40px 20px;text-align:center;color:#14120F;background:#FAF8F5"><h1 style="font-size:20px">${titulo}</h1><p>Vuelve a Gestiona-lo y pulsa otra vez «Entrar como».</p></body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
    )

  const ficha = await leerFicha(url.searchParams.get('t') ?? '')
  if (!ficha || ficha.uso !== 'entrar' || typeof ficha.sid !== 'string') return pantalla('Este enlace no vale o ha caducado')
  const sid = ficha.sid

  const [sesion] = await db
    .select({ userId: sessions.userId, expiraEn: sessions.expiraEn, email: sessions.suplantadoEmail })
    .from(sessions)
    .where(and(eq(sessions.id, sid), gt(sessions.expiraEn, new Date())))
    .limit(1)
  if (!sesion) return pantalla('Este enlace no vale o ha caducado')
  // Un solo uso: si se reenvía o se filtra, el segundo clic no entra.
  if (await ops.enlaceYaUsado(sid)) return pantalla('Este enlace ya se ha usado')

  await registrar(
    { userId: null, email: sesion.email ?? 'desconocido', origen: 'gestiona-lo' },
    'entrar_como_usado',
    `sesion:${sid}`,
  )
  await ponerCookieSesion(await firmarSesion(sid, sesion.userId, sesion.expiraEn), sesion.expiraEn)
  return NextResponse.redirect(new URL('/panel', env.appUrl), 303)
}
