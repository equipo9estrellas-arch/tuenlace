'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, inArray } from 'drizzle-orm'
import { blocks, db, pages } from '@/db'
import { exigirSesion } from '@/lib/session'
import { esTipoBloque, LIMITE_BLOQUES_GRATIS, type TipoBloque } from '@/bloques/registro'
import {
  configInicial,
  conservarInternos,
  normalizarConfig,
  recalcularPrioridades,
} from '@/bloques/campos'
import { normalizarTema } from '@/bloques/tema'
import { texto as limpiarTexto, textoLargo } from '@/lib/normalizar'

export type Resultado = { ok: true } | { ok: false; error: string; bloqueId?: string }

/**
 * TODA acción del editor pasa por aquí.
 *
 * Comprobar que la página es de la organización de la sesión no es una
 * formalidad: en un producto que vende a agencias, una fuga entre inquilinos
 * es el final del producto. El id de página viaja desde el navegador, así que
 * se trata como lo que es —entrada del usuario— y se valida contra orgId en
 * cada llamada, no una vez al cargar.
 */
async function paginaDeLaSesion(pageId: string) {
  const sesion = await exigirSesion()
  const filas = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.orgId, sesion.orgId)))
    .limit(1)
  if (!filas[0]) throw new Error('SIN_ACCESO')
  return { sesion, pagina: filas[0] }
}

function limite(plan: string): number {
  return plan === 'GRATIS' ? LIMITE_BLOQUES_GRATIS : 200
}

// ── Guardar todo de una vez ──────────────────────────────────────────────────

export type BloqueEnviado = {
  id: string
  orden: number
  activo: boolean
  valores: Record<string, string>
}

/**
 * Guarda orden, visibilidad y contenido de todos los bloques en una sola
 * operación, dentro de una transacción.
 *
 * De una sola vez y no campo a campo por dos razones: el usuario reordena y
 * edita en la misma sesión mental, y si la conexión se cae a mitad —que en la
 * calle pasa— no quiero una página con la mitad de los cambios aplicados.
 */
export async function guardarBloques(
  pageId: string,
  enviados: BloqueEnviado[],
): Promise<Resultado> {
  const { pagina } = await paginaDeLaSesion(pageId)

  const actuales = await db.select().from(blocks).where(eq(blocks.pageId, pagina.id))
  const porId = new Map(actuales.map((b) => [b.id, b]))

  // Nadie edita un bloque que no es de esta página.
  for (const e of enviados) {
    if (!porId.has(e.id)) return { ok: false, error: 'Ese bloque ya no existe. Recarga la página.' }
  }

  const ordenados = [...enviados].sort((a, b) => a.orden - b.orden)
  const prioridades = recalcularPrioridades(
    ordenados.map((e) => ({ tipo: porId.get(e.id)!.tipo as TipoBloque, activo: e.activo })),
  )

  const aGuardar: { id: string; config: Record<string, unknown>; orden: number; activo: boolean; prioridad: 1 | 2 | 3 }[] = []

  for (const [i, e] of ordenados.entries()) {
    const anterior = porId.get(e.id)!
    const tipo = anterior.tipo as TipoBloque

    // Un bloque apagado no se valida: el usuario puede querer esconderlo
    // precisamente porque le falta un dato. Se guarda tal cual y ya lo
    // arreglará cuando lo vuelva a encender.
    if (!e.activo) {
      aGuardar.push({ id: e.id, config: anterior.config, orden: i, activo: false, prioridad: 3 })
      continue
    }

    const resultado = normalizarConfig(tipo, e.valores)
    if (!resultado.ok) return { ok: false, error: resultado.error, bloqueId: e.id }

    aGuardar.push({
      id: e.id,
      config: conservarInternos(anterior.config, resultado.config),
      orden: i,
      activo: true,
      prioridad: prioridades[i],
    })
  }

  await db.transaction(async (tx) => {
    for (const b of aGuardar) {
      await tx
        .update(blocks)
        .set({
          config: b.config,
          orden: b.orden,
          activo: b.activo,
          prioridad: b.prioridad,
          actualizadoEn: new Date(),
        })
        .where(eq(blocks.id, b.id))
    }
  })

  revalidatePath(`/${pagina.slug}`)
  revalidatePath('/panel/editor')
  return { ok: true }
}

// ── Añadir ───────────────────────────────────────────────────────────────────

export async function crearBloque(pageId: string, tipo: string): Promise<Resultado> {
  const { sesion, pagina } = await paginaDeLaSesion(pageId)

  if (!esTipoBloque(tipo)) return { ok: false, error: 'Ese tipo de bloque no existe.' }

  const actuales = await db.select({ id: blocks.id, orden: blocks.orden }).from(blocks).where(eq(blocks.pageId, pagina.id))

  if (actuales.length >= limite(sesion.plan)) {
    return {
      ok: false,
      error: `El plan gratuito llega hasta ${LIMITE_BLOQUES_GRATIS} bloques. Quita uno o pasa a Esencial.`,
    }
  }

  const siguiente = actuales.reduce((max, b) => Math.max(max, b.orden), -1) + 1

  await db.insert(blocks).values({
    pageId: pagina.id,
    tipo,
    orden: siguiente,
    // Nace apagado: si se publicara vacío, el visitante vería un botón que no
    // lleva a ningún sitio mientras el dueño lo rellena.
    activo: false,
    prioridad: 3,
    config: configInicial(tipo),
  })

  revalidatePath(`/${pagina.slug}`)
  revalidatePath('/panel/editor')
  return { ok: true }
}

// ── Borrar ───────────────────────────────────────────────────────────────────

export async function borrarBloque(pageId: string, bloqueId: string): Promise<Resultado> {
  const { pagina } = await paginaDeLaSesion(pageId)

  const filas = await db
    .select({ id: blocks.id, config: blocks.config })
    .from(blocks)
    .where(and(eq(blocks.id, bloqueId), eq(blocks.pageId, pagina.id)))
    .limit(1)

  if (!filas[0]) return { ok: false, error: 'Ese bloque ya no existe.' }
  if ((filas[0].config as { esCabecera?: boolean }).esCabecera) {
    return { ok: false, error: 'La cabecera no se puede borrar. Si quieres, vacíala.' }
  }

  await db.delete(blocks).where(and(eq(blocks.id, bloqueId), eq(blocks.pageId, pagina.id)))

  // Cerrar el hueco de orden que deja: si no, el siguiente bloque nuevo se
  // colocaría en una posición que ya existe.
  const resto = await db
    .select({ id: blocks.id, orden: blocks.orden })
    .from(blocks)
    .where(eq(blocks.pageId, pagina.id))
  const ordenados = resto.sort((a, b) => a.orden - b.orden)
  await db.transaction(async (tx) => {
    for (const [i, b] of ordenados.entries()) {
      if (b.orden !== i) await tx.update(blocks).set({ orden: i }).where(eq(blocks.id, b.id))
    }
  })

  revalidatePath(`/${pagina.slug}`)
  revalidatePath('/panel/editor')
  return { ok: true }
}

// ── Cabecera de la página ────────────────────────────────────────────────────

export async function guardarCabecera(
  pageId: string,
  titulo: string,
  descripcion: string,
): Promise<Resultado> {
  const { pagina } = await paginaDeLaSesion(pageId)

  const t = limpiarTexto(titulo, 80)
  if (!t) return { ok: false, error: 'El título no puede quedar vacío.' }
  const d = textoLargo(descripcion, 200) ?? ''

  await db.update(pages).set({ titulo: t, descripcion: d, actualizadoEn: new Date() }).where(eq(pages.id, pagina.id))

  // La cabecera vive en dos sitios: la fila de la página (metadatos, Open
  // Graph) y el bloque TEXTO que se pinta arriba. Si solo se actualizara uno,
  // la vista previa de WhatsApp diría una cosa y la página otra.
  const cabeceras = await db.select().from(blocks).where(eq(blocks.pageId, pagina.id))
  const cabecera = cabeceras.find((b) => (b.config as { esCabecera?: boolean }).esCabecera)
  if (cabecera) {
    await db
      .update(blocks)
      .set({ config: { ...cabecera.config, titulo: t, texto: d }, actualizadoEn: new Date() })
      .where(eq(blocks.id, cabecera.id))
  }

  revalidatePath(`/${pagina.slug}`)
  revalidatePath('/panel/editor')
  return { ok: true }
}

// ── Marca: logo, portada y tema ──────────────────────────────────────────────

export type MarcaEnviada = {
  avatarUrl: string
  portadaUrl: string
  etiqueta: string
  tema: unknown
}

/**
 * Guarda la personalización visual de la página.
 *
 * El tema pasa por normalizarTema() antes de tocar la base de datos: llega del
 * navegador, así que un preset inventado escribiría un `data-preset` cualquiera
 * en el HTML. No es una inyección —React escapa el atributo— pero sí dejaría la
 * página sin paleta y sin que nadie entienda por qué.
 *
 * Las URLs de imagen solo se aceptan si son https. Un `javascript:` en un
 * atributo src no ejecuta nada, pero un http:// sí rompe el candado del
 * navegador en una página que por lo demás va cifrada.
 */
export async function guardarMarca(pageId: string, enviada: MarcaEnviada): Promise<Resultado> {
  const { pagina } = await paginaDeLaSesion(pageId)

  const avatar = urlDeImagen(enviada.avatarUrl)
  if (avatar === false) return { ok: false, error: 'La dirección del logo no es válida.' }
  const portada = urlDeImagen(enviada.portadaUrl)
  if (portada === false) return { ok: false, error: 'La dirección de la portada no es válida.' }

  const tema = normalizarTema(enviada.tema)
  const etiqueta = limpiarTexto(enviada.etiqueta, 48) ?? ''

  await db
    .update(pages)
    .set({ avatarUrl: avatar, portadaUrl: portada, tema, actualizadoEn: new Date() })
    .where(eq(pages.id, pagina.id))

  // La etiqueta vive en el bloque de cabecera, no en la fila de la página:
  // es contenido, no identidad.
  const todos = await db.select().from(blocks).where(eq(blocks.pageId, pagina.id))
  const cabecera = todos.find((b) => (b.config as { esCabecera?: boolean }).esCabecera)
  if (cabecera) {
    await db
      .update(blocks)
      .set({ config: { ...cabecera.config, etiqueta }, actualizadoEn: new Date() })
      .where(eq(blocks.id, cabecera.id))
  }

  revalidatePath(`/${pagina.slug}`)
  revalidatePath('/panel/editor')
  return { ok: true }
}

/** null = sin imagen · false = dirección inválida · string = válida */
function urlDeImagen(valor: string): string | null | false {
  const v = valor.trim()
  if (v === '') return null
  if (v.length > 500) return false
  try {
    const u = new URL(v)
    return u.protocol === 'https:' ? u.toString() : false
  } catch {
    return false
  }
}

// ── Utilidad para las pruebas y el panel ─────────────────────────────────────

export async function bloquesDe(pageId: string) {
  const { pagina } = await paginaDeLaSesion(pageId)
  return db.select().from(blocks).where(inArray(blocks.pageId, [pagina.id]))
}
