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
import { limpiarUsuario, soloDigitos, urlValida } from '@/lib/normalizar'

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

/**
 * Mensaje pretecleado de WhatsApp.
 *
 * Detalle que parece menor y no lo es: que el cliente abra WhatsApp con el
 * mensaje ya escrito sube la conversión frente a un chat en blanco, y además
 * permite atribuir de dónde viene cada conversación.
 */
function mensajeWhatsappPorDefecto(categoria: ClaveCategoria, objetivos: ClaveObjetivo[]): string {
  // Si "cita" o "comprar" están entre los objetivos, ya tienen su propio botón
  // con su propio mensaje. Repetir aquí esa intención deja al visitante con dos
  // botones que abren la misma conversación: el de arriba se lleva el clic y el
  // de abajo no sirve para nada.
  if (categoria === 'restaurante' && !objetivos.includes('cita')) {
    return 'Hola, os escribo desde vuestro enlace. Quería reservar mesa.'
  }
  if (categoria === 'tienda' && !objetivos.includes('comprar')) {
    return 'Hola, os escribo desde vuestro enlace. Tengo una consulta sobre un producto.'
  }
  return 'Hola, os escribo desde vuestro enlace. Quería más información.'
}

// ── Respaldo: un objetivo elegido NUNCA desaparece ───────────────────────────
//
// Antes, si alguien elegía "Pedir cita" y no tenía sistema de reservas, el
// botón simplemente no se creaba y el aviso se iba a una lista que nadie lee.
// El usuario pedía tres botones y le salía uno. Inaceptable: es justo la
// promesa del producto.
//
// Ahora el botón se construye igual, apuntando al mejor canal que tengamos.
// Un "Pedir cita" que abre WhatsApp con el mensaje escrito convierte más que
// media agenda de reservas, y el icono de WhatsApp le dice al visitante a
// dónde va antes de pulsar. La pantalla 6 avisa de esto mientras se rellena.

type Respaldo =
  | { tipo: 'WHATSAPP'; telefono: string }
  | { tipo: 'LLAMAR'; telefono: string }
  | { tipo: 'FORMULARIO'; emailAvisos: string }

function respaldoDisponible(datos: Record<string, string>): Respaldo | null {
  const wa = soloDigitos(datos.telefonoWhatsapp)
  if (wa) return { tipo: 'WHATSAPP', telefono: wa }
  const tel = soloDigitos(datos.telefono)
  if (tel) return { tipo: 'LLAMAR', telefono: tel }
  const correo = datos.emailAvisos?.trim()
  if (correo) return { tipo: 'FORMULARIO', emailAvisos: correo }
  return null
}

/**
 * El texto del botón cuando va por respaldo.
 *
 * "Pedir cita" se mantiene: escribir por WhatsApp ES pedir cita. "Ver la
 * carta" no se puede mantener, porque no hay carta que ver; el botón mentiría
 * al visitante y eso se paga en rebote.
 */
function textoDeRespaldo(
  objetivo: ClaveObjetivo,
  categoria: ClaveCategoria,
  textoOriginal: string,
): string {
  if (objetivo === 'cita') return textoOriginal
  if (objetivo === 'catalogo') {
    return categoria === 'restaurante'
      ? 'Pregúntanos por la carta'
      : categoria === 'tienda'
        ? 'Pregúntanos por el catálogo'
        : 'Pregúntanos por nuestros servicios'
  }
  return 'Pregúntanos cómo comprar'
}

function mensajeDeRespaldo(objetivo: ClaveObjetivo, categoria: ClaveCategoria): string {
  if (objetivo === 'cita') {
    return categoria === 'restaurante'
      ? 'Hola, os escribo desde vuestro enlace. Quería reservar mesa.'
      : 'Hola, os escribo desde vuestro enlace. Quería pedir cita.'
  }
  if (objetivo === 'catalogo') {
    return categoria === 'restaurante'
      ? 'Hola, os escribo desde vuestro enlace. ¿Me podéis pasar la carta?'
      : 'Hola, os escribo desde vuestro enlace. ¿Qué servicios tenéis?'
  }
  return 'Hola, os escribo desde vuestro enlace. Quería comprar.'
}

/** Cómo se lo contamos en la pantalla 9. Concreto y accionable, no un reproche. */
function avisoDeRespaldo(objetivo: ClaveObjetivo, respaldo: Respaldo): string {
  const canal =
    respaldo.tipo === 'WHATSAPP' ? 'WhatsApp' : respaldo.tipo === 'LLAMAR' ? 'tu teléfono' : 'tu formulario'
  const que =
    objetivo === 'cita'
      ? 'Tu botón de citas va por ' + canal
      : objetivo === 'catalogo'
        ? 'Tu botón de carta o servicios va por ' + canal
        : 'Tu botón de compra va por ' + canal
  const arreglo =
    objetivo === 'cita'
      ? 'Pega el enlace de tu sistema de reservas y pasará a reservar solo.'
      : objetivo === 'catalogo'
        ? 'Sube tu carta o catálogo y el botón la abrirá directamente.'
        : 'Añade el enlace de tu tienda y el botón llevará a comprar.'
  return `${que}. ${arreglo}`
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
        // Dos formularios en una página no los rellena nadie. Si ya hay uno
        // (puesto por un respaldo anterior), se sube su prioridad y basta.
        const existente = bloques.find((b) => b.tipo === 'FORMULARIO')
        if (existente) {
          existente.prioridad = Math.min(existente.prioridad, prioridad) as 1 | 2 | 3
          ;(existente.config as Record<string, unknown>).texto = texto
          break
        }
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
        if (url) {
          bloques.push({
            tipo: 'ENLACE',
            orden: orden++,
            prioridad,
            config: { texto, url, objetivo: claveObjetivo },
          })
          break
        }

        // Sin enlace propio: el botón se construye igual, por el mejor canal
        // disponible. La pantalla 6 ya avisó de que iba a pasar esto.
        const respaldo = respaldoDisponible(r.datos)
        if (!respaldo) {
          pendientes.push(
            claveObjetivo === 'cita'
              ? 'Conecta tu sistema de reservas o te damos un calendario.'
              : claveObjetivo === 'catalogo'
                ? 'Sube tu carta o catálogo, o pega su enlace.'
                : 'Añade el enlace a tu tienda.',
          )
          return
        }

        const textoRespaldo = textoDeRespaldo(claveObjetivo, r.categoria, texto)

        if (respaldo.tipo === 'WHATSAPP') {
          bloques.push({
            tipo: 'WHATSAPP',
            orden: orden++,
            prioridad,
            config: {
              texto: textoRespaldo,
              telefono: respaldo.telefono,
              mensaje: mensajeDeRespaldo(claveObjetivo, r.categoria),
              objetivo: claveObjetivo,
            },
          })
        } else if (respaldo.tipo === 'LLAMAR') {
          bloques.push({
            tipo: 'LLAMAR',
            orden: orden++,
            prioridad,
            config: { texto: textoRespaldo, telefono: respaldo.telefono, objetivo: claveObjetivo },
          })
        } else {
          const existente = bloques.find((b) => b.tipo === 'FORMULARIO')
          if (existente) {
            existente.prioridad = Math.min(existente.prioridad, prioridad) as 1 | 2 | 3
          } else {
            bloques.push({
              tipo: 'FORMULARIO',
              orden: orden++,
              prioridad,
              config: {
                texto: textoRespaldo,
                campos: ['nombre', 'telefono'],
                emailAvisos: respaldo.emailAvisos,
                textoExito: '¡Gracias! Te escribimos enseguida.',
                objetivo: claveObjetivo,
              },
            })
          }
        }

        pendientes.push(avisoDeRespaldo(claveObjetivo, respaldo))
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
