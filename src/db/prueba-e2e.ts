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
import {
  CAMPOS_POR_TIPO,
  conservarInternos,
  leerRuta,
  normalizarConfig,
  recalcularPrioridades,
} from '@/bloques/campos'
import { createToken, sha256 } from '@/lib/ids-y-hash'
import { validarSlug } from '@/lib/slug'
import {
  ANCHOS,
  BOTONES,
  ESTILOS_BOTON,
  FONDOS,
  FUENTES,
  PRESETS,
  SEPARACIONES,
  TAMANOS_TEXTO,
  normalizarTema,
  textoSobre,
} from '@/bloques/tema'
import { CLAVES_ICONO } from '@/iconos/botones'
import { TIPOS_IMAGEN, firmarPeticion, formatoReal, hostDeR2 } from '@/lib/r2'
import { ICONO_BLOQUE, ICONO_CATEGORIA, LOGO_RED } from '@/iconos/mapas'
import { TIPOS_BLOQUE } from '@/bloques/registro'
import { NOMBRES_REDES } from '@/bloques/tipos'
import { CATEGORIAS } from '@/onboarding/definicion'

let fallos = 0
let pasos = 0

/** Lee un fichero del proyecto, con la ruta relativa a src/. */
async function leerFuente(ruta: string): Promise<string> {
  const fs = await import('node:fs/promises')
  return fs.readFile(new URL(`../${ruta}`, import.meta.url), 'utf8')
}

/** Todos los .ts y .tsx bajo src/, en rutas relativas a src/. */
async function ficherosDeCodigo(): Promise<string[]> {
  const fs = await import('node:fs/promises')
  const raiz = new URL('../', import.meta.url)
  const salida: string[] = []
  async function recorrer(prefijo: string) {
    const dir = new URL(prefijo, raiz)
    for (const entrada of await fs.readdir(dir, { withFileTypes: true })) {
      if (entrada.isDirectory()) await recorrer(`${prefijo}${entrada.name}/`)
      else if (/\.tsx?$/.test(entrada.name)) salida.push(`${prefijo}${entrada.name}`)
    }
  }
  await recorrer('')
  return salida
}

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

  console.log('\n━━━ 8. El editor del panel ━━━')

  // La jerarquía no se edita: se deduce del orden. Es la misma promesa del
  // producto que aplica el generador, así que se comprueba igual de fuerte.
  const prio = recalcularPrioridades([
    { tipo: 'WHATSAPP', activo: true },
    { tipo: 'TEXTO', activo: true },
    { tipo: 'LLAMAR', activo: true },
    { tipo: 'UBICACION', activo: true },
    { tipo: 'ENLACE', activo: true },
    { tipo: 'REDES', activo: true },
  ])
  comprobar(
    'el primer bloque de conversión es el principal',
    prio[0] === 1,
    String(prio[0]),
  )
  comprobar('texto y redes nunca compiten con un botón', prio[1] === 3 && prio[5] === 3)
  comprobar('el segundo y el tercero son secundarios', prio[2] === 2 && prio[3] === 2)
  comprobar('a partir del cuarto, normales', prio[4] === 3)

  const prioApagado = recalcularPrioridades([
    { tipo: 'WHATSAPP', activo: false },
    { tipo: 'LLAMAR', activo: true },
  ])
  comprobar(
    'un bloque oculto no se lleva la prioridad principal',
    prioApagado[0] === 3 && prioApagado[1] === 1,
  )

  // Normalización: lo que el editor acepta tiene que quedar utilizable.
  const waEditor = normalizarConfig('WHATSAPP', {
    texto: 'Escríbenos',
    telefono: '612 34 56 78',
    mensaje: 'Hola',
  })
  comprobar(
    'el editor normaliza el teléfono igual que el onboarding',
    waEditor.ok && waEditor.config.telefono === '34612345678',
    waEditor.ok ? String(waEditor.config.telefono) : waEditor.error,
  )

  const enlace = normalizarConfig('ENLACE', { texto: 'Ver carta', url: 'ejemplo.test/carta' })
  comprobar(
    'el editor completa el https que falta',
    enlace.ok && String(enlace.config.url).startsWith('https://'),
  )

  comprobar(
    'rechaza un enlace que no lo es',
    normalizarConfig('ENLACE', { texto: 'Ver', url: 'no es una url' }).ok === false,
  )
  comprobar(
    'exige el texto del botón',
    normalizarConfig('LLAMAR', { texto: '', telefono: '612345678' }).ok === false,
  )
  comprobar(
    'un bloque de redes vacío no se guarda',
    normalizarConfig('REDES', {}).ok === false,
  )
  comprobar(
    'con una red basta',
    normalizarConfig('REDES', { 'redes.instagram': '@nueveestrellas' }).ok === true,
  )
  const redes = normalizarConfig('REDES', { 'redes.instagram': '@nueveestrellas' })
  comprobar(
    'la arroba se quita al guardar',
    redes.ok && (redes.config.redes as Record<string, string>).instagram === 'nueveestrellas',
  )
  comprobar(
    'un bloque de texto sin título ni texto no se guarda',
    normalizarConfig('TEXTO', { titulo: '', texto: '' }).ok === false,
  )

  // Los campos internos no se pierden al editar: si se perdieran, la cabecera
  // dejaría de serlo y el bloque perdería la atribución de su objetivo.
  const conservados = conservarInternos(
    { esCabecera: true, objetivo: 'cita', campos: ['nombre'], texto: 'viejo' },
    { texto: 'nuevo' },
  )
  comprobar(
    'editar un bloque no le quita sus campos internos',
    conservados.esCabecera === true &&
      conservados.objetivo === 'cita' &&
      Array.isArray(conservados.campos) &&
      conservados.texto === 'nuevo',
  )

  // Y el cierre del círculo: todo bloque que el generador produce tiene que
  // poder abrirse en el editor y volver a guardarse sin perder nada.
  comprobar(
    'todo bloque generado se puede reeditar sin romperse',
    generada.bloques.every((b) => {
      const valores: Record<string, string> = {}
      for (const campo of CAMPOS_POR_TIPO[b.tipo]) {
        valores[campo.ruta] = leerRuta(b.config, campo.ruta)
      }
      const r = normalizarConfig(b.tipo, valores)
      if (!r.ok) return false
      const final = conservarInternos(b.config, r.config)
      // La cabecera es el único bloque sin campos obligatorios; el resto tiene
      // que conservar su texto.
      return b.config.esCabecera ? true : Boolean(final.texto ?? final.url ?? final.redes)
    }),
  )


  // ── 9 · Marca, tema y almacenamiento ──────────────────────────────────────
  //
  // Lo que se rediseñó: el tema pasó de 4 campos a 6 y cambiaron los valores
  // de `fuente`. En producción hay páginas guardadas con los antiguos. Si el
  // normalizador se rompe, esas páginas se quedan sin paleta y sin que nadie
  // vea un error en ningún log.
  console.log('\n9 · Marca, tema y almacenamiento')

  const temaAntiguo = normalizarTema({
    preset: 'calido',
    acento: '#C2410C',
    fuente: 'serif',
    botones: 'redondeados',
  })
  comprobar(
    'un tema guardado antes del rediseño se sigue leyendo',
    temaAntiguo.preset === 'calido' &&
      temaAntiguo.fuente === 'clasica' &&
      temaAntiguo.fondo === 'sutil' &&
      temaAntiguo.avatarForma === 'circulo',
    JSON.stringify(temaAntiguo),
  )

  comprobar(
    'las fuentes antiguas se traducen a las nuevas',
    normalizarTema({ fuente: 'sistema' }).fuente === 'moderna' &&
      normalizarTema({ fuente: 'grotesca' }).fuente === 'moderna',
  )

  const temaBasura = normalizarTema({
    preset: 'arcoiris',
    acento: 'javascript:alert(1)',
    fuente: 'comic',
    botones: 'triangulares',
    fondo: '../../etc/passwd',
  })
  comprobar(
    'un tema con valores inventados cae en los valores por defecto',
    temaBasura.preset === 'claro' &&
      temaBasura.acento === '#FF5D2E' &&
      temaBasura.fuente === 'moderna' &&
      temaBasura.botones === 'redondeados',
    JSON.stringify(temaBasura),
  )

  comprobar('normalizarTema aguanta null', normalizarTema(null).preset === 'claro')

  // Contraste del botón principal: es el único sitio donde un color mal
  // elegido deja el texto ilegible al sol, que es donde se usa esto.
  comprobar(
    'el texto del botón principal se adapta al color elegido',
    textoSobre('#14120F') === '#ffffff' &&
      textoSobre('#FFE066') === '#14120f' &&
      textoSobre('#FF5D2E') === '#ffffff',
    `${textoSobre('#14120F')} / ${textoSobre('#FFE066')} / ${textoSobre('#FF5D2E')}`,
  )

  // Todas las opciones que ofrece el editor tienen que existir en el CSS.
  // Si no, el cliente elige algo que no cambia nada y cree que está roto.
  const css = await leerFuente('app/globals.css')
  const faltanPresets = PRESETS.filter(
    (p) => p.clave !== 'claro' && !css.includes(`data-preset='${p.clave}'`),
  ).map((p) => p.clave)
  comprobar(
    'todas las paletas del editor están definidas en el CSS',
    faltanPresets.length === 0,
    faltanPresets.join(', '),
  )
  comprobar(
    'todas las tipografías del editor están definidas en el CSS',
    FUENTES.every((f) => css.includes(`data-fuente='${f.clave}'`)),
  )
  comprobar(
    'todas las formas de botón del editor existen en el CSS',
    BOTONES.every((b) => b.clave === 'redondeados' || css.includes(`data-botones='${b.clave}'`)),
  )
  comprobar(
    'todos los acabados de fondo existen en el CSS',
    FONDOS.every((f) => f.clave === 'liso' || css.includes(`data-fondo='${f.clave}'`)),
  )

  // Ni un emoji en lo que ve el cliente: los dibuja el sistema operativo, así
  // que la misma página se vería distinta en cada móvil.
  const conEmoji: string[] = []
  for (const ruta of await ficherosDeCodigo()) {
    if (ruta.includes('prueba-e2e')) continue
    // Emoji de verdad: los que el sistema operativo dibuja a color. El símbolo
    // de copyright o una marca de verificación tipográfica no lo son.
    if (/\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u.test(await leerFuente(ruta)))
      conEmoji.push(ruta)
  }
  comprobar('no queda ni un emoji en el código del producto', conEmoji.length === 0, conEmoji.join(', '))

  // Cada cosa que el editor puede pintar tiene su icono. Un hueco aquí es un
  // botón vacío en la pantalla de añadir bloque.
  comprobar(
    'todos los tipos de bloque tienen icono',
    TIPOS_BLOQUE.every((t) => typeof ICONO_BLOQUE[t] === 'function'),
  )
  comprobar(
    'todas las categorías tienen icono',
    CATEGORIAS.every((c) => typeof ICONO_CATEGORIA[c.clave] === 'function'),
  )
  comprobar(
    'todas las redes tienen logo',
    Object.keys(NOMBRES_REDES).every(
      (r) => typeof LOGO_RED[r as keyof typeof LOGO_RED] === 'function',
    ),
  )

  // La firma de R2 está escrita a mano. Se comprueba contra el vector oficial
  // de AWS (aws-sig-v4-test-suite, caso get-vanilla): si esto deja de
  // coincidir, ninguna subida funcionará y el error de Cloudflare no dirá
  // por qué.
  const firma = firmarPeticion({
    metodo: 'GET',
    host: 'example.amazonaws.com',
    ruta: '/',
    cuerpoHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    accessKeyId: 'AKIDEXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1',
    servicio: 'service',
    fecha: new Date('2015-08-30T12:36:00Z'),
  })
  comprobar(
    'la firma SigV4 coincide con el vector oficial de AWS',
    firma.cabeceras.Authorization ===
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31',
    firma.cabeceras.Authorization,
  )

  // El tipo MIME lo pone el navegador; lo que manda son los bytes.
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1])
  const webp = new TextEncoder().encode('RIFF$   WEBP')
  const noImagen = new TextEncoder().encode('<?php system($_GET[0]); ?>')
  comprobar(
    'se reconoce una imagen de verdad por sus bytes',
    formatoReal(png) === 'image/png' &&
      formatoReal(jpg) === 'image/jpeg' &&
      formatoReal(webp) === 'image/webp',
    `${formatoReal(png)} / ${formatoReal(jpg)} / ${formatoReal(webp)}`,
  )
  comprobar('un fichero que no es imagen se rechaza', formatoReal(noImagen) === null)
  comprobar(
    'el SVG no está entre los formatos aceptados',
    !Object.keys(TIPOS_IMAGEN).includes('image/svg+xml'),
  )


  comprobar(
    'todos los acabados de botón existen en el CSS',
    ESTILOS_BOTON.every((e) => e.clave === 'relleno' || css.includes(`data-estilo='${e.clave}'`)),
  )
  comprobar(
    'todos los tamaños de texto existen en el CSS',
    TAMANOS_TEXTO.every((t) => t.clave === 'normal' || css.includes(`data-tam='${t.clave}'`)),
  )
  comprobar(
    'todos los anchos de página existen en el CSS',
    ANCHOS.every((a) => a.clave === 'normal' || css.includes(`data-ancho='${a.clave}'`)),
  )
  comprobar(
    'todas las separaciones existen en el CSS',
    SEPARACIONES.every((s) => s.clave === 'normal' || css.includes(`data-separacion='${s.clave}'`)),
  )

  // El tema nuevo sobre uno guardado con la versión anterior: los campos que
  // no existían tienen que nacer con su valor por defecto, no como undefined,
  // porque acaban escritos tal cual en un atributo del HTML.
  const temaV2 = normalizarTema({
    preset: 'oscuro',
    acento: '#7B3FF2',
    fuente: 'tecnica',
    botones: 'pildora',
    fondo: 'sutil',
    avatarForma: 'cuadrado',
  })
  comprobar(
    'un tema de la versión anterior gana los campos nuevos',
    temaV2.estiloBoton === 'relleno' &&
      temaV2.tamanoTexto === 'normal' &&
      temaV2.ancho === 'normal' &&
      temaV2.separacion === 'normal' &&
      temaV2.fondoImagenUrl === '' &&
      temaV2.preset === 'oscuro',
    JSON.stringify(temaV2),
  )

  // Un fondo de foto sin foto dejaría la página en blanco.
  comprobar(
    'el fondo de foto sin foto vuelve al halo',
    normalizarTema({ fondo: 'imagen', fondoImagenUrl: '' }).fondo === 'sutil',
  )
  comprobar(
    'una imagen de fondo por http se descarta',
    normalizarTema({ fondo: 'imagen', fondoImagenUrl: 'http://x.test/a.jpg' }).fondoImagenUrl === '',
  )
  comprobar(
    'el velo se recorta al rango permitido',
    normalizarTema({ fondoVelo: 500 }).fondoVelo === 90 &&
      normalizarTema({ fondoVelo: -20 }).fondoVelo === 0,
  )

  // Apariencia por botón: lo que llega del navegador se valida igual que todo.
  const botonBonito = normalizarConfig('ENLACE', {
    texto: 'Reservar',
    url: 'reservas.test/x',
    icono: 'calendario',
    color: '#0B5FFF',
    destacado: 'si',
  })
  comprobar(
    'un botón puede tener icono, color y destacado propios',
    botonBonito.ok === true &&
      botonBonito.config.icono === 'calendario' &&
      botonBonito.config.color === '#0B5FFF' &&
      botonBonito.config.destacado === true &&
      botonBonito.config.url === 'https://reservas.test/x',
    JSON.stringify(botonBonito),
  )

  const iconoInventado = normalizarConfig('ENLACE', {
    texto: 'Ver',
    url: 'https://x.test',
    icono: '../../../etc/passwd',
  })
  comprobar(
    'un icono que no existe se descarta sin romper el botón',
    iconoInventado.ok === true && iconoInventado.config.icono === undefined,
  )

  const colorMalo = normalizarConfig('ENLACE', {
    texto: 'Ver',
    url: 'https://x.test',
    color: 'red; background: url(x)',
  })
  comprobar('un color inválido se rechaza al guardar', colorMalo.ok === false)

  comprobar(
    'un botón sin destacar no guarda la clave',
    (() => {
      const r = normalizarConfig('ENLACE', { texto: 'Ver', url: 'https://x.test', destacado: '' })
      return r.ok === true && r.config.destacado === undefined
    })(),
  )

  // El editor lee booleanos como cadenas; si esto se rompe, el interruptor
  // aparece apagado cada vez que se abre el bloque.
  comprobar(
    'el editor lee un interruptor guardado como booleano',
    leerRuta({ destacado: true }, 'destacado') === 'si' &&
      leerRuta({ destacado: false }, 'destacado') === '',
  )

  comprobar(
    'todos los iconos elegibles tienen clave única',
    new Set(CLAVES_ICONO).size === CLAVES_ICONO.length && CLAVES_ICONO.length >= 20,
  )

  // Un bucket con jurisdicción europea vive en otro endpoint. Llamar al
  // genérico devuelve AccessDenied, indistinguible de un token sin permisos.
  comprobar(
    'un bucket con jurisdicción EU usa su propio endpoint',
    hostDeR2('abc123', 'eu') === 'abc123.eu.r2.cloudflarestorage.com' &&
      hostDeR2('abc123', 'EU ') === 'abc123.eu.r2.cloudflarestorage.com' &&
      hostDeR2('abc123', '') === 'abc123.r2.cloudflarestorage.com' &&
      hostDeR2('abc123', 'cualquier-cosa') === 'abc123.r2.cloudflarestorage.com',
    `${hostDeR2('abc123', 'eu')} / ${hostDeR2('abc123', '')}`,
  )

  // Lo que sale de una cámara de iPhone.
  const heic = new Uint8Array(24)
  heic.set(new TextEncoder().encode('ftypheic'), 4)
  comprobar(
    'una foto HEIC de iPhone se reconoce para poder explicarlo',
    formatoReal(heic) === 'image/heic' && !TIPOS_IMAGEN['image/heic'],
  )

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
