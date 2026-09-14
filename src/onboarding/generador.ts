/**
 * EL MOTOR DE GENERACIÓN
 *
 * Convierte las respuestas del onboarding en una página completa: bloques,
 * orden, jerarquía visual y textos.
 *
 * La decisión de diseño que importa: esto son REGLAS, no IA. La IA solo
 * redacta los textos, y solo si hay clave configurada. La estructura —que es
 * lo que hace que la página convierta— la decide código determinista,
 * auditable y gratis.
 *
 * Jerarquía de prioridad, derivada de la pantalla 3:
 *   1 → CTA principal: botón grande, con color de acento, arriba del todo
 *   2 → secundarios: tamaño normal, justo debajo
 *   3 → resto: al final
 */

import type { ClaveCanal, ClaveCategoria, ClaveObjetivo } from './definicion'
import { CATEGORIAS, OBJETIVOS_POR_CLAVE } from './definicion'
import type { Tema } from '@/db/schema'

export type RespuestasOnboarding = {
  slug: string
  categoria: ClaveCategoria
  descripcionNegocio: string
  /** EN ORDEN. El orden es la jerarquía. */
  objetivos: ClaveObjetivo[]
  canales: ClaveCanal[]
  /** Respuestas de la pantalla 6, con las claves de CampoRequerido */
  datos: Record<string, string>
}

export type BloqueGenerado = {
  tipo:
    | 'ENLACE'
    | 'WHATSAPP'
    | 'LLAMAR'
    | 'UBICACION'
    | 'REDES'
    | 'TEXTO'
    | 'IMAGEN'
    | 'FORMULARIO'
  orden: number
  prioridad: 1 | 2 | 3
  config: Record<string, unknown>
}

export type PaginaGenerada = {
  titulo: string
  descripcion: string
  tema: Tema
  bloques: BloqueGenerado[]
  /** Avisos accionables para la pantalla 9 */
  pendientes: string[]
}

// ── Presets de color por categoría ───────────────────────────────────────────
// Punto de partida razonable para que la página no nazca gris. El usuario
// puede cambiarlo en el editor en dos clics.

const TEMA_POR_CATEGORIA: Record<ClaveCategoria, Tema> = {
  local: { preset: 'claro', acento: '#FF5D2E', fuente: 'sistema', botones: 'redondeados' },
  restaurante: { preset: 'calido', acento: '#C2410C', fuente: 'serif', botones: 'redondeados' },
  profesional: { preset: 'tinta', acento: '#0B5FFF', fuente: 'grotesca', botones: 'rectos' },
  tienda: { preset: 'claro', acento: '#0F9D58', fuente: 'grotesca', botones: 'pildora' },
  marca: { preset: 'oscuro', acento: '#FF5D2E', fuente: 'grotesca', botones: 'pildora' },
  agencia: { preset: 'tinta', acento: '#0B5FFF', fuente: 'grotesca', botones: 'rectos' },
}

/** Prioridad según la posición elegida en la pantalla 3. */
function prioridadPorPosicion(indice: number): 1 | 2 | 3 {
  if (indice === 0) return 1
  if (indice <= 2) return 2
  return 3
}

function urlValida(valor: string | undefined): string | null {
  if (!valor) return null
  const limpio = valor.trim()
  if (!limpio) return null
  const conProtocolo = /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`
  try {
    const u = new URL(conProtocolo)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

function soloDigitos(valor: string | undefined): string | null {
  if (!valor) return null
  const d = valor.replace(/\D/g, '')
  if (d.length < 9) return null
  // Número español sin prefijo
  if (d.length === 9 && /^[6789]/.test(d)) return `34${d}`
  return d
}

function limpiarUsuario(valor: string | undefined): string | null {
  if (!valor) return null
  const u = valor.trim().replace(/^@/, '').replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '')
  return u || null
}

/**
 * Mensaje pretecleado de WhatsApp.
 *
 * Detalle que parece menor y no lo es: que el cliente abra WhatsApp con el
 * mensaje ya escrito sube la conversión frente a un chat en blanco, y además
 * permite atribuir de dónde viene cada conversación.
 */
function mensajeWhatsappPorDefecto(categoria: ClaveCategoria, objetivos: ClaveObjetivo[]): string {
  if (categoria === 'restaurante') return 'Hola, os escribo desde vuestro enlace. Quería reservar mesa.'
  if (objetivos.includes('cita')) return 'Hola, os escribo desde vuestro enlace. Quería pedir cita.'
  if (categoria === 'tienda') return 'Hola, os escribo desde vuestro enlace. Tengo una consulta sobre un producto.'
  return 'Hola, os escribo desde vuestro enlace. Quería más información.'
}

/**
 * Genera la página completa a partir de las respuestas.
 * El copy que entra por `textos` viene de copy.ts (IA o reglas).
 */
export function generarPagina(
  r: RespuestasOnboarding,
  textos: { titulo: string; descripcion: string; botones: Partial<Record<ClaveObjetivo, string>> },
): PaginaGenerada {
  const categoria = CATEGORIAS.find((c) => c.clave === r.categoria) ?? CATEGORIAS[0]
  const bloques: BloqueGenerado[] = []
  const pendientes: string[] = []
  let orden = 0

  // 1 · Cabecera: titular y descripción. Siempre primero.
  bloques.push({
    tipo: 'TEXTO',
    orden: orden++,
    prioridad: 3,
    config: { titulo: textos.titulo, texto: textos.descripcion, alineacion: 'centro', esCabecera: true },
  })

  // 2 · Los objetivos, EN EL ORDEN ELEGIDO. Aquí está la conversión.
  r.objetivos.forEach((claveObjetivo, indice) => {
    const objetivo = OBJETIVOS_POR_CLAVE.get(claveObjetivo)
    if (!objetivo) return

    const prioridad = prioridadPorPosicion(indice)
    const texto = textos.botones[claveObjetivo] ?? objetivo.textoBoton

    switch (claveObjetivo) {
      case 'whatsapp': {
        const telefono = soloDigitos(r.datos.telefonoWhatsapp)
        if (!telefono) {
          pendientes.push('Añade tu número de WhatsApp para que el botón funcione.')
          return
        }
        bloques.push({
          tipo: 'WHATSAPP',
          orden: orden++,
          prioridad,
          config: {
            texto,
            telefono,
            mensaje: r.datos.mensajeWhatsapp?.trim() || mensajeWhatsappPorDefecto(r.categoria, r.objetivos),
          },
        })
        break
      }

      case 'llamar': {
        const telefono = soloDigitos(r.datos.telefono) ?? soloDigitos(r.datos.telefonoWhatsapp)
        if (!telefono) {
          pendientes.push('Añade tu teléfono para que el botón de llamada funcione.')
          return
        }
        bloques.push({
          tipo: 'LLAMAR',
          orden: orden++,
          prioridad,
          config: { texto, telefono },
        })
        break
      }

      case 'ubicacion': {
        const direccion = r.datos.direccion?.trim()
        if (!direccion) {
          pendientes.push('Añade tu dirección para mostrar el mapa.')
          return
        }
        bloques.push({
          tipo: 'UBICACION',
          orden: orden++,
          prioridad,
          config: { texto, direccion },
        })
        break
      }

      case 'redes': {
        const redes: Record<string, string> = {}
        const ig = limpiarUsuario(r.datos.instagram)
        const tk = limpiarUsuario(r.datos.tiktok)
        if (ig) redes.instagram = ig
        if (tk) redes.tiktok = tk
        if (Object.keys(redes).length === 0) {
          pendientes.push('Añade tus redes sociales.')
          return
        }
        bloques.push({ tipo: 'REDES', orden: orden++, prioridad, config: { redes } })
        break
      }

      case 'datos': {
        bloques.push({
          tipo: 'FORMULARIO',
          orden: orden++,
          prioridad,
          config: {
            texto,
            campos: ['nombre', 'telefono'],
            emailAvisos: r.datos.emailAvisos?.trim() ?? '',
            textoExito: '¡Gracias! Te escribimos enseguida.',
          },
        })
        break
      }

      case 'cita':
      case 'catalogo':
      case 'comprar': {
        const clave =
          claveObjetivo === 'cita' ? 'urlReservas' : claveObjetivo === 'catalogo' ? 'urlCatalogo' : 'urlTienda'
        const url = urlValida(r.datos[clave])
        if (!url) {
          pendientes.push(
            claveObjetivo === 'cita'
              ? 'Conecta tu sistema de reservas o te damos un calendario.'
              : claveObjetivo === 'catalogo'
                ? 'Sube tu carta o catálogo, o pega su enlace.'
                : 'Añade el enlace a tu tienda.',
          )
          return
        }
        bloques.push({
          tipo: 'ENLACE',
          orden: orden++,
          prioridad,
          config: { texto, url, objetivo: claveObjetivo },
        })
        break
      }
    }
  })

  // 3 · Redes al pie si no estaban entre los objetivos elegidos.
  //     Se espera verlas; su ausencia se nota.
  const yaHayRedes = bloques.some((b) => b.tipo === 'REDES')
  if (!yaHayRedes) {
    const redes: Record<string, string> = {}
    const ig = limpiarUsuario(r.datos.instagram)
    const tk = limpiarUsuario(r.datos.tiktok)
    if (ig) redes.instagram = ig
    if (tk) redes.tiktok = tk
    if (Object.keys(redes).length > 0) {
      bloques.push({ tipo: 'REDES', orden: orden++, prioridad: 3, config: { redes } })
    }
  }

  // 4 · Consecuencias de la pantalla 4: cada canal marcado hace algo.
  if (r.canales.includes('google')) {
    pendientes.push('Conecta tu ficha de Google para mostrar tus reseñas.')
  }
  if (r.canales.includes('ads')) {
    pendientes.push('Configura el píxel de Meta para medir tus anuncios de verdad.')
  }
  if (r.canales.length >= 2) {
    pendientes.push('Puedes enseñar un botón distinto según de dónde venga cada persona.')
  }

  return {
    titulo: textos.titulo,
    descripcion: textos.descripcion,
    tema: TEMA_POR_CATEGORIA[r.categoria] ?? TEMA_POR_CATEGORIA.local,
    bloques,
    pendientes,
  }
}

/** Los canales elegidos determinan qué UTM sugerimos al compartir. */
export function utmSugeridas(canales: ClaveCanal[], slug: string, base: string): Record<string, string> {
  const mapa: Record<string, string> = {}
  for (const canal of canales) {
    const utm =
      canal === 'tarjetas' ? 'tarjeta' : canal === 'ads' ? 'ads' : canal
    mapa[canal] = `${base}/${slug}?utm_source=${utm}&utm_medium=bio`
  }
  return mapa
}
