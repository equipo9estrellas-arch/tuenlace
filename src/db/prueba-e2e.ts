/**
 * Prueba de extremo a extremo del flujo completo, sin navegador.
 *
 *   npx tsx src/db/prueba-e2e.ts
 *
 * Recorre exactamente el mismo código que el producto: onboarding →
 * generación de textos → enlace mágico → verificación → publicación.
 * Si esto pasa, el camino crítico funciona.
 */

import { and, eq } from 'drizzle-orm'
import { db, blocks, loginTokens, pages, pool, users } from './index'
import { solicitarAcceso, verificarToken, asegurarOrganizacion } from '@/lib/auth'
import { publicarDesdeOnboarding } from '@/lib/publicar'
import { textosPorReglas } from '@/onboarding/copy'
import { generarPagina } from '@/onboarding/generador'
import { OBJETIVOS, camposQueFaltan } from '@/onboarding/definicion'
import { createToken, sha256 } from '@/lib/ids-y-hash'
import { validarSlug } from '@/lib/slug'

let fallos = 0
let pasos = 0

function comprobar(descripcion: string, condicion: boolean, detalle?: string) {
  pasos++
  if (condicion) {
    console.log(`  ✓ ${descripcion}`)
  } else {
    fallos++
    console.log(`  ✗ ${descripcion}${detalle ? ` — ${detalle}` : ''}`)
  }
}

async function main() {
  const sufijo = Math.random().toString(36).slice(2, 7)
  const slug = `peluqueria-marta-${sufijo}`
  const email = `prueba-${sufijo}@ejemplo.test`

  console.log('\n━━━ 1. Validación de slugs ━━━')
  comprobar('acepta un slug normal', validarSlug('mipeluqueria').valido)
  comprobar('normaliza acentos', validarSlug('Peluquería Marta').valido)
  comprobar(
    'convierte "Peluquería Marta" en "peluqueria-marta"',
    (validarSlug('Peluquería Marta') as { slug: string }).slug === 'peluqueria-marta',
  )
  comprobar('rechaza palabras reservadas', !validarSlug('panel').valido)
  comprobar('rechaza slugs muy cortos', !validarSlug('ab').valido)

  console.log('\n━━━ 2. Generación de textos por reglas ━━━')
  const textos = textosPorReglas(
    slug,
    'local',
    'Peluquería de barrio en La Laguna, especialistas en color y mechas',
    ['whatsapp', 'cita', 'ubicacion'],
  )
  comprobar('genera un titular', textos.titulo.length > 0, textos.titulo)
  comprobar('genera una descripción', textos.descripcion.length > 0)
  comprobar('usa "Pedir cita" y no "Reservar mesa"', textos.botones.cita === 'Pedir cita')

  const textosResto = textosPorReglas(slug, 'restaurante', 'Cocina canaria en Santa Cruz', [
    'cita',
    'catalogo',
  ])
  comprobar('en restaurante dice "Reservar mesa"', textosResto.botones.cita === 'Reservar mesa')
  comprobar('en restaurante dice "Ver la carta"', textosResto.botones.catalogo === 'Ver la carta')

  console.log('\n━━━ 3. El motor de generación: la jerarquía de conversión ━━━')
  const generada = generarPagina(
    {
      slug,
      categoria: 'local',
      descripcionNegocio: 'Peluquería de barrio en La Laguna',
      objetivos: ['whatsapp', 'cita', 'ubicacion'],
      canales: ['instagram', 'qr'],
      datos: {
        telefonoWhatsapp: '612345678',
        urlReservas: 'booksy.com/marta',
        direccion: 'Calle Herradores 12, La Laguna',
      },
    },
    textos,
  )

  const cabecera = generada.bloques[0]
  comprobar('la cabecera va primero', cabecera?.tipo === 'TEXTO')

  const primerCta = generada.bloques.find((b) => b.prioridad === 1)
  comprobar(
    'el primer objetivo elegido es el CTA principal (prioridad 1)',
    primerCta?.tipo === 'WHATSAPP',
    `era ${primerCta?.tipo}`,
  )

  const secundarios = generada.bloques.filter((b) => b.prioridad === 2)
  comprobar('los otros dos objetivos son secundarios', secundarios.length === 2)

  const wa = generada.bloques.find((b) => b.tipo === 'WHATSAPP')
  comprobar(
    'el teléfono español se normaliza con prefijo 34',
    (wa?.config.telefono as string) === '34612345678',
    String(wa?.config.telefono),
  )
  // Con un botón "Pedir cita" propio, el WhatsApp genérico NO debe repetir esa
  // intención: serían dos botones que abren la misma conversación.
  comprobar(
    'el WhatsApp genérico no duplica la intención del botón de cita',
    !String(wa?.config.mensaje).toLowerCase().includes('cita'),
    String(wa?.config.mensaje),
  )
  const soloWhatsapp = generarPagina(
    {
      slug: `${slug}-wa`,
      categoria: 'restaurante',
      descripcionNegocio: 'Bar sin reservas',
      objetivos: ['whatsapp'],
      canales: [],
      datos: { telefonoWhatsapp: '612345678' },
    },
    textos,
  )
  comprobar(
    'un restaurante sin botón de reserva sí pretecleaba "reservar mesa"',
    String(soloWhatsapp.bloques.find((b) => b.tipo === 'WHATSAPP')?.config.mensaje)
      .toLowerCase()
      .includes('reservar mesa'),
  )

  const enlaceCita = generada.bloques.find((b) => b.tipo === 'ENLACE')
  comprobar(
    'la URL sin protocolo se completa con https',
    String(enlaceCita?.config.url).startsWith('https://'),
    String(enlaceCita?.config.url),
  )

  console.log('\n━━━ 4. El orden elegido cambia la página ━━━')
  const alReves = generarPagina(
    {
      slug: `${slug}-2`,
      categoria: 'local',
      descripcionNegocio: 'Peluquería de barrio',
      objetivos: ['ubicacion', 'whatsapp'],
      canales: [],
      datos: { telefonoWhatsapp: '612345678', direccion: 'Calle Herradores 12' },
    },
    textos,
  )
  const ctaAlReves = alReves.bloques.find((b) => b.prioridad === 1)
  comprobar(
    'si el usuario pone Ubicación primero, el CTA principal es Ubicación',
    ctaAlReves?.tipo === 'UBICACION',
    `era ${ctaAlReves?.tipo}`,
  )

  console.log('\n━━━ 5. Datos incompletos generan avisos, no errores ━━━')
  const incompleta = generarPagina(
    {
      slug: `${slug}-3`,
      categoria: 'local',
      descripcionNegocio: 'Sin datos',
      objetivos: ['whatsapp', 'cita'],
      canales: ['ads'],
      datos: {},
    },
    textos,
  )
  comprobar('no revienta sin datos', incompleta.bloques.length >= 1)
  comprobar('avisa de lo que falta', incompleta.pendientes.length >= 2)
  comprobar(
    'quien marca "anuncios" recibe el aviso del píxel',
    incompleta.pendientes.some((p) => p.toLowerCase().includes('píxel')),
  )

  console.log('\n━━━ 5b. NINGÚN objetivo elegido puede desaparecer ━━━')
  //
  // El fallo que nos comió el primer test real: el usuario elegía tres
  // objetivos y en la página salía uno. Dos causas, las dos cubiertas aquí.
  //
  // Causa A · la pantalla 6 dejaba pasar un enlace vacío y el generador,
  //           al no encontrarlo, borraba el objetivo entero sin avisar.
  // Causa B · la pantalla 3 llegaba con tres objetivos premarcados y el cupo
  //           lleno, así que pulsar los que querías los DESmarcaba.
  //
  // La regla, y esta prueba la vigila: TODO objetivo elegido produce un botón,
  // o el onboarding no te deja publicar.

  const sinEnlaces = generarPagina(
    {
      slug: `${slug}-4`,
      categoria: 'local',
      descripcionNegocio: 'Peluquería sin sistema de reservas',
      objetivos: ['whatsapp', 'cita', 'ubicacion'],
      canales: [],
      datos: {
        telefonoWhatsapp: '612345678',
        direccion: 'Calle Herradores 12, La Laguna',
        // urlReservas a propósito vacío: es el caso de Diego.
      },
    },
    textos,
  )
  const accionables = sinEnlaces.bloques.filter((b) => b.tipo !== 'TEXTO')
  comprobar(
    'tres objetivos elegidos → tres botones, aunque falte el enlace de reservas',
    accionables.length === 3,
    `salieron ${accionables.length}: ${accionables.map((b) => b.tipo).join(', ')}`,
  )
  const citaPorRespaldo = sinEnlaces.bloques.find(
    (b) => (b.config as { objetivo?: string }).objetivo === 'cita',
  )
  comprobar(
    'el botón de cita existe y sale por WhatsApp',
    citaPorRespaldo?.tipo === 'WHATSAPP',
    `era ${citaPorRespaldo?.tipo ?? 'ninguno'}`,
  )
  comprobar(
    'su mensaje pretecleado habla de pedir cita',
    String(citaPorRespaldo?.config.mensaje).toLowerCase().includes('cita'),
    String(citaPorRespaldo?.config.mensaje),
  )
  comprobar(
    'el respaldo conserva la prioridad de la posición elegida (2.º → prioridad 2)',
    citaPorRespaldo?.prioridad === 2,
    String(citaPorRespaldo?.prioridad),
  )
  comprobar(
    'se avisa de cómo arreglarlo',
    sinEnlaces.pendientes.some((p) => p.toLowerCase().includes('reservas')),
    sinEnlaces.pendientes.join(' · '),
  )

  // Respaldo por teléfono cuando no hay WhatsApp.
  const porTelefono = generarPagina(
    {
      slug: `${slug}-5`,
      categoria: 'restaurante',
      descripcionNegocio: 'Bar de barrio sin web',
      objetivos: ['catalogo', 'llamar'],
      canales: [],
      datos: { telefono: '922334455' },
    },
    textos,
  )
  const catalogoPorTelefono = porTelefono.bloques.find(
    (b) => (b.config as { objetivo?: string }).objetivo === 'catalogo',
  )
  comprobar(
    'sin WhatsApp, el botón de carta cae al teléfono',
    catalogoPorTelefono?.tipo === 'LLAMAR',
    `era ${catalogoPorTelefono?.tipo ?? 'ninguno'}`,
  )
  comprobar(
    'y el texto no miente al visitante: no dice "Ver la carta"',
    !String(catalogoPorTelefono?.config.texto).toLowerCase().includes('ver la carta'),
    String(catalogoPorTelefono?.config.texto),
  )

  // Nunca dos formularios en la misma página.
  const dosFormularios = generarPagina(
    {
      slug: `${slug}-6`,
      categoria: 'marca',
      descripcionNegocio: 'Creadora sin teléfono público',
      objetivos: ['cita', 'datos'],
      canales: [],
      datos: { emailAvisos: 'hola@ejemplo.test' },
    },
    textos,
  )
  comprobar(
    'no se generan dos formularios en la misma página',
    dosFormularios.bloques.filter((b) => b.tipo === 'FORMULARIO').length === 1,
  )

  console.log('\n━━━ 5c. La pantalla 6 pide exactamente lo que el generador necesita ━━━')
  comprobar(
    'sin ningún canal de contacto, el enlace de reservas deja de ser opcional',
    camposQueFaltan(['cita'], {}).some((c) => c.clave === 'urlReservas'),
  )
  comprobar(
    'con WhatsApp escrito, el enlace de reservas vuelve a ser opcional',
    !camposQueFaltan(['whatsapp', 'cita'], { telefonoWhatsapp: '612345678' }).some(
      (c) => c.clave === 'urlReservas',
    ),
  )
  comprobar(
    'quien elige "Seguirme en redes" tiene que dar al menos una red',
    camposQueFaltan(['redes'], {}).length > 0,
  )
  comprobar(
    'con Instagram basta: TikTok no se exige',
    camposQueFaltan(['redes'], { instagram: 'nuevepuntoestrellas' }).length === 0,
  )
  comprobar(
    'nada de lo que la pantalla 6 deja pasar hace desaparecer un objetivo',
    (() => {
      // Para cada objetivo, unos datos que la pantalla 6 aceptaría como
      // completos tienen que producir su bloque. Sin excepciones.
      const minimos: Record<string, Record<string, string>> = {
        whatsapp: { telefonoWhatsapp: '612345678' },
        llamar: { telefono: '612345678' },
        ubicacion: { direccion: 'Calle Herradores 12' },
        datos: { emailAvisos: 'hola@ejemplo.test' },
        redes: { instagram: 'nueve' },
        cita: { urlReservas: 'booksy.com/x' },
        catalogo: { urlCatalogo: 'ejemplo.test/carta' },
        comprar: { urlTienda: 'ejemplo.test/tienda' },
      }
      return OBJETIVOS.every((o) => {
        const datos = minimos[o.clave]
        if (camposQueFaltan([o.clave], datos).length > 0) return false
        const pagina = generarPagina(
          {
            slug: `${slug}-${o.clave}`,
            categoria: 'local',
            descripcionNegocio: 'Prueba',
            objetivos: [o.clave],
            canales: [],
            datos,
          },
          textos,
        )
        return pagina.bloques.some((b) => b.tipo !== 'TEXTO')
      })
    })(),
  )

  console.log('\n━━━ 6. Enlace mágico y publicación (contra la base de datos) ━━━')
  const solicitud = await solicitarAcceso(email, {
    slug,
    titulo: textos.titulo,
    categoria: 'local',
    sector: null,
    descripcionNegocio: 'Peluquería de barrio en La Laguna',
    objetivos: ['whatsapp', 'cita', 'ubicacion'],
    canales: ['instagram', 'qr'],
    datos: {
      telefonoWhatsapp: '612345678',
      urlReservas: 'booksy.com/marta',
      direccion: 'Calle Herradores 12, La Laguna',
      __descripcion: textos.descripcion,
      __botones: JSON.stringify(textos.botones),
    },
  })
  comprobar('se solicita el acceso sin error', solicitud.ok, solicitud.error)

  const [usuario] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  comprobar('se crea el usuario', Boolean(usuario))

  // En producción el token solo existe en el correo. Aquí generamos uno
  // equivalente para poder verificar el resto del camino.
  const tokenClaro = createToken()
  const [tokenFila] = await db.select().from(loginTokens).where(eq(loginTokens.userId, usuario.id)).limit(1)
  await db
    .update(loginTokens)
    .set({ tokenHash: sha256(tokenClaro) })
    .where(eq(loginTokens.id, tokenFila.id))

  const verificado = await verificarToken(tokenClaro)
  comprobar('el token se verifica', verificado.ok)
  comprobar('el token trae el contexto del onboarding', verificado.ok && verificado.contexto !== null)

  const reuso = await verificarToken(tokenClaro)
  comprobar('el token NO se puede reutilizar', !reuso.ok)

  if (!verificado.ok || !verificado.contexto) throw new Error('Sin contexto, no se puede seguir')

  const orgId = await asegurarOrganizacion(verificado.userId, verificado.contexto.titulo)
  comprobar('se crea la organización', Boolean(orgId))

  const publicada = await publicarDesdeOnboarding(orgId, verificado.contexto)
  comprobar('la página se publica', publicada.slug === slug, publicada.slug)
  comprobar('se insertan los bloques', publicada.bloques >= 4, String(publicada.bloques))

  const [enBase] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1)
  comprobar('la página está en la base de datos', Boolean(enBase))
  comprobar('está publicada', enBase?.estado === 'PUBLICADA')
  comprobar('NO es indexable al nacer', enBase?.ajustes.indexable === false)
  comprobar('muestra la marca (plan gratuito)', enBase?.ajustes.mostrarMarca === true)

  const bloquesEnBase = await db.select().from(blocks).where(eq(blocks.pageId, enBase.id))
  comprobar('los bloques se guardan', bloquesEnBase.length === publicada.bloques)
  const ctaGuardado = bloquesEnBase.find((b) => b.prioridad === 1)
  comprobar('la prioridad del CTA persiste', ctaGuardado?.tipo === 'WHATSAPP')

  console.log('\n━━━ 7. Aislamiento entre inquilinos ━━━')
  const otras = await db
    .select()
    .from(pages)
    .where(and(eq(pages.orgId, orgId), eq(pages.slug, slug)))
  comprobar('la consulta por orgId devuelve solo lo de esa organización', otras.length === 1)

  console.log(
    `\n${fallos === 0 ? '✅' : '❌'}  ${pasos - fallos}/${pasos} comprobaciones correctas\n`,
  )
  if (fallos > 0) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error('\n💥 La prueba ha fallado:', error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
