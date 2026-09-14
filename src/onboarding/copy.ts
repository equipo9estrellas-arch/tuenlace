/**
 * GENERACIÓN DE TEXTOS
 *
 * Dos caminos, en este orden:
 *   1. Reglas deterministas. Cubren el caso normal, son gratis e instantáneas.
 *   2. IA, solo si hay AI_API_KEY. Mejora el titular y la descripción.
 *
 * Si la IA falla o tarda, se devuelven las reglas. Nunca se bloquea el
 * onboarding por una llamada a un tercero: el objetivo son 3 minutos hasta
 * página publicada, y eso manda sobre la calidad del titular.
 *
 * Coste de referencia: menos de 0,003 $ por alta con los modelos baratos.
 */

import { capacidades, env } from '@/lib/env'
import type { ClaveCategoria, ClaveObjetivo } from './definicion'
import { CATEGORIAS, OBJETIVOS_POR_CLAVE } from './definicion'

export type TextosGenerados = {
  titulo: string
  descripcion: string
  botones: Partial<Record<ClaveObjetivo, string>>
  fuente: 'reglas' | 'ia'
}

const TIMEOUT_IA_MS = 9000

// ── Camino 1: reglas ─────────────────────────────────────────────────────────

function primeraMayuscula(texto: string): string {
  const t = texto.trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Extrae un titular corto de la frase que escribió el usuario. */
function tituloDesdeDescripcion(descripcion: string, slug: string): string {
  const limpio = descripcion.trim()
  if (!limpio) return primeraMayuscula(slug.replace(/-/g, ' '))

  // Nos quedamos con la parte antes de la primera coma o preposición larga.
  const corte = limpio.split(/,| en | para | especializad/i)[0].trim()
  const candidato = corte.length >= 4 && corte.length <= 42 ? corte : limpio.slice(0, 42)
  return primeraMayuscula(candidato)
}

function descripcionPorReglas(descripcion: string, categoria: ClaveCategoria): string {
  const limpio = descripcion.trim()
  if (limpio) return primeraMayuscula(limpio)

  const porDefecto: Record<ClaveCategoria, string> = {
    local: 'Estamos aquí para ayudarte. Escríbenos y te atendemos enseguida.',
    restaurante: 'Ven a comer con nosotros. Reserva tu mesa o echa un vistazo a la carta.',
    profesional: 'Cuéntame qué necesitas y te digo cómo puedo ayudarte.',
    tienda: 'Echa un vistazo a lo que tenemos. Si tienes dudas, escríbenos.',
    marca: 'Aquí tienes todo lo que hago, en un solo sitio.',
    agencia: 'Ayudamos a negocios a conseguir clientes. Cuéntanos el tuyo.',
  }
  return porDefecto[categoria]
}

/** Ajusta el texto de los botones al sector. "Ver la carta" solo en hostelería. */
function botonesPorReglas(
  categoria: ClaveCategoria,
  objetivos: ClaveObjetivo[],
): Partial<Record<ClaveObjetivo, string>> {
  const botones: Partial<Record<ClaveObjetivo, string>> = {}

  for (const clave of objetivos) {
    const base = OBJETIVOS_POR_CLAVE.get(clave)?.textoBoton ?? ''

    if (clave === 'catalogo') {
      botones.catalogo =
        categoria === 'restaurante'
          ? 'Ver la carta'
          : categoria === 'tienda'
            ? 'Ver el catálogo'
            : 'Ver mis servicios'
    } else if (clave === 'cita') {
      botones.cita = categoria === 'restaurante' ? 'Reservar mesa' : 'Pedir cita'
    } else if (clave === 'whatsapp') {
      botones.whatsapp = categoria === 'profesional' ? 'Escríbeme por WhatsApp' : 'Escríbenos por WhatsApp'
    } else if (clave === 'llamar') {
      botones.llamar = categoria === 'profesional' ? 'Llámame' : 'Llámanos'
    } else {
      botones[clave] = base
    }
  }
  return botones
}

export function textosPorReglas(
  slug: string,
  categoria: ClaveCategoria,
  descripcionNegocio: string,
  objetivos: ClaveObjetivo[],
): TextosGenerados {
  return {
    titulo: tituloDesdeDescripcion(descripcionNegocio, slug),
    descripcion: descripcionPorReglas(descripcionNegocio, categoria),
    botones: botonesPorReglas(categoria, objetivos),
    fuente: 'reglas',
  }
}

// ── Camino 2: IA ─────────────────────────────────────────────────────────────

function construirPrompt(
  categoria: ClaveCategoria,
  descripcionNegocio: string,
  objetivos: ClaveObjetivo[],
): string {
  const cat = CATEGORIAS.find((c) => c.clave === categoria)
  const objetivosTexto = objetivos
    .map((o, i) => `${i + 1}. ${OBJETIVOS_POR_CLAVE.get(o)?.etiqueta ?? o}`)
    .join('\n')

  return `Eres redactor de una página de enlaces para un negocio español. Escribe en español de España, tuteando, sin anglicismos y sin superlativos publicitarios.

NEGOCIO
Tipo: ${cat?.etiqueta ?? categoria}
Cómo se describe: "${descripcionNegocio}"

LO QUE QUIERE CONSEGUIR, por orden de importancia:
${objetivosTexto}

Devuelve SOLO un objeto JSON con esta forma exacta, sin texto alrededor:
{
  "titulo": "máximo 40 caracteres, el nombre o la esencia del negocio",
  "descripcion": "máximo 110 caracteres, una frase que diga qué gana quien entra",
  "botones": { "clave_del_objetivo": "texto del botón, máximo 22 caracteres" }
}

Reglas:
- Nada de "revolucionario", "el mejor", "líder", "impulsa tu negocio".
- Los textos de botón empiezan por verbo: "Pedir cita", "Ver la carta".
- Si el negocio menciona una ciudad, puedes usarla en la descripción.
- Las claves de "botones" deben ser exactamente: ${objetivos.join(', ')}`
}

type RespuestaIA = {
  titulo?: unknown
  descripcion?: unknown
  botones?: unknown
}

function recortar(valor: unknown, max: number): string | null {
  if (typeof valor !== 'string') return null
  const limpio = valor.trim().replace(/\s+/g, ' ')
  if (!limpio) return null
  return limpio.length > max ? `${limpio.slice(0, max - 1).trimEnd()}…` : limpio
}

async function textosPorIA(
  categoria: ClaveCategoria,
  descripcionNegocio: string,
  objetivos: ClaveObjetivo[],
): Promise<Partial<TextosGenerados> | null> {
  const control = new AbortController()
  const timeout = setTimeout(() => control.abort(), TIMEOUT_IA_MS)

  try {
    const respuesta = await fetch(env.aiApiUrl, {
      method: 'POST',
      signal: control.signal,
      headers: {
        Authorization: `Bearer ${env.aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.aiModel,
        messages: [{ role: 'user', content: construirPrompt(categoria, descripcionNegocio, objetivos) }],
        temperature: 0.6,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
    })

    if (!respuesta.ok) {
      console.warn('[copy] La IA devolvió', respuesta.status, '— usamos las reglas.')
      return null
    }

    const cuerpo = (await respuesta.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const contenido = cuerpo.choices?.[0]?.message?.content
    if (!contenido) return null

    const datos = JSON.parse(contenido) as RespuestaIA

    const botones: Partial<Record<ClaveObjetivo, string>> = {}
    if (datos.botones && typeof datos.botones === 'object') {
      for (const [clave, valor] of Object.entries(datos.botones as Record<string, unknown>)) {
        if (!objetivos.includes(clave as ClaveObjetivo)) continue
        const texto = recortar(valor, 22)
        if (texto) botones[clave as ClaveObjetivo] = texto
      }
    }

    return {
      titulo: recortar(datos.titulo, 40) ?? undefined,
      descripcion: recortar(datos.descripcion, 110) ?? undefined,
      botones,
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn('[copy] La IA tardó más de', TIMEOUT_IA_MS, 'ms — usamos las reglas.')
    } else {
      console.warn('[copy] Fallo llamando a la IA — usamos las reglas.', error)
    }
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// ── Punto de entrada ─────────────────────────────────────────────────────────

export async function generarTextos(
  slug: string,
  categoria: ClaveCategoria,
  descripcionNegocio: string,
  objetivos: ClaveObjetivo[],
): Promise<TextosGenerados> {
  const base = textosPorReglas(slug, categoria, descripcionNegocio, objetivos)

  if (!capacidades.ia || !descripcionNegocio.trim()) return base

  const mejora = await textosPorIA(categoria, descripcionNegocio, objetivos)
  if (!mejora) return base

  return {
    titulo: mejora.titulo ?? base.titulo,
    descripcion: mejora.descripcion ?? base.descripcion,
    botones: { ...base.botones, ...mejora.botones },
    fuente: 'ia',
  }
}
