'use server'

import { z } from 'zod'
import { solicitarAcceso, type ContextoOnboarding } from '@/lib/auth'
import { validarSlug } from '@/lib/slug'
import { slugDisponible } from '@/lib/slug-db'
import { generarTextos } from '@/onboarding/copy'
import {
  CANALES,
  CATEGORIAS,
  MAX_OBJETIVOS,
  OBJETIVOS,
  camposQueFaltan,
} from '@/onboarding/definicion'
import type { ClaveCanal, ClaveCategoria, ClaveObjetivo } from '@/onboarding/definicion'

const clavesCategoria = CATEGORIAS.map((c) => c.clave) as [ClaveCategoria, ...ClaveCategoria[]]
const clavesObjetivo = OBJETIVOS.map((o) => o.clave) as [ClaveObjetivo, ...ClaveObjetivo[]]
const clavesCanal = CANALES.map((c) => c.clave) as [ClaveCanal, ...ClaveCanal[]]

const Esquema = z.object({
  slug: z.string().min(3).max(30),
  categoria: z.enum(clavesCategoria),
  descripcionNegocio: z.string().max(160),
  objetivos: z.array(z.enum(clavesObjetivo)).min(1).max(MAX_OBJETIVOS),
  canales: z.array(z.enum(clavesCanal)).max(6),
  datos: z.record(z.string(), z.string().max(300)),
  email: z.string().email(),
})

export type ResultadoCrear =
  | { ok: true; email: string }
  | { ok: false; error: string; campo?: string }

/**
 * Cierre del onboarding.
 *
 * No creamos la página todavía: mandamos un enlace mágico con TODO el contexto
 * dentro. La página se materializa cuando el usuario verifica su correo.
 *
 * Por qué así: verificar el email antes de publicar corta el grueso del abuso
 * automatizado. En una plataforma de páginas públicas con enlaces salientes
 * eso es un riesgo existencial, no un detalle — una sola página de phishing
 * puede tumbar el dominio entero. (Blueprint bloque 3, punto 8.9.)
 */
export async function crearEnlace(entrada: unknown): Promise<ResultadoCrear> {
  const parseado = Esquema.safeParse(entrada)
  if (!parseado.success) {
    const primero = parseado.error.issues[0]
    return { ok: false, error: 'Falta algún dato.', campo: primero?.path.join('.') }
  }

  const datos = parseado.data

  const validacion = validarSlug(datos.slug)
  if (!validacion.valido) {
    return { ok: false, error: validacion.motivo, campo: 'slug' }
  }
  if (!(await slugDisponible(validacion.slug))) {
    return { ok: false, error: 'Ese enlace lo acaban de coger. Prueba con otro.', campo: 'slug' }
  }

  // La misma comprobación que hace la pantalla 6, aquí otra vez. No es
  // duplicidad: el cliente valida para no hacer perder el tiempo, el servidor
  // valida porque es el único sitio donde la validación cuenta. Y comparten
  // definición, así que no pueden divergir.
  const faltan = camposQueFaltan(datos.objetivos, datos.datos)
  if (faltan.length > 0) {
    return {
      ok: false,
      error: `Falta ${faltan[0].etiqueta.toLowerCase()}.`,
      campo: faltan[0].clave,
    }
  }

  // Los textos se generan AQUÍ, antes de mandar el correo: así, al verificar,
  // la página aparece de inmediato y el usuario no espera a nada.
  const textos = await generarTextos(
    validacion.slug,
    datos.categoria,
    datos.descripcionNegocio,
    datos.objetivos,
  )

  const contexto: ContextoOnboarding = {
    slug: validacion.slug,
    titulo: textos.titulo,
    categoria: datos.categoria,
    sector: null,
    descripcionNegocio: datos.descripcionNegocio,
    objetivos: datos.objetivos,
    canales: datos.canales,
    datos: {
      ...datos.datos,
      __descripcion: textos.descripcion,
      __botones: JSON.stringify(textos.botones),
    },
  }

  const envio = await solicitarAcceso(datos.email, contexto)
  if (!envio.ok) {
    return { ok: false, error: envio.error ?? 'No hemos podido enviar el correo.', campo: 'email' }
  }

  return { ok: true, email: datos.email }
}

/** Comprobación del slug desde el cliente (pantalla 0). */
export async function comprobarSlug(entrada: string) {
  const validacion = validarSlug(entrada)
  if (!validacion.valido) return { estado: 'invalido' as const, motivo: validacion.motivo }
  const libre = await slugDisponible(validacion.slug)
  return libre
    ? { estado: 'libre' as const, slug: validacion.slug }
    : { estado: 'ocupado' as const, slug: validacion.slug }
}
