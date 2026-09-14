/**
 * LA FRASE
 *
 * "Todos dan gráficos. Nosotros damos la frase." (blueprint bloque 3, 6.4)
 *
 * Lo primero que se ve al entrar en el panel no es un gráfico: es una
 * recomendación accionable. Y el 80% de las recomendaciones útiles son
 * reglas deterministas, no IA.
 *
 * Convertir la analítica en una acción de un clic es lo que hace que el
 * usuario vuelva al panel. Y volver al panel es lo que evita que se dé
 * de baja.
 */

import type { ResumenPagina } from './analitica'

export type Recomendacion = {
  clave: string
  tono: 'bien' | 'aviso' | 'info'
  texto: string
  /** Acción de un clic, si la hay */
  accion?: { etiqueta: string; tipo: 'subir_bloque' | 'ocultar_bloque' | 'ir_a'; valor: string }
}

type Entrada = {
  resumen: ResumenPagina
  diasPublicada: number
  tieneWhatsapp: boolean
  bloquesTotales: number
  plan: 'GRATIS' | 'ESENCIAL' | 'NEGOCIO' | 'AGENCIA'
}

export function calcularRecomendaciones(e: Entrada): Recomendacion[] {
  const { resumen } = e
  const recs: Recomendacion[] = []

  // ── Caso página nueva sin datos ────────────────────────────────────────────
  if (resumen.visitas === 0) {
    recs.push({
      clave: 'sin-visitas',
      tono: 'info',
      texto:
        e.diasPublicada < 2
          ? 'Tu página está publicada. Ponla en la bio de tu Instagram y en 24 horas ya tendrás datos aquí.'
          : 'Todavía no ha entrado nadie. Lo más probable es que el enlace no esté aún en tu bio.',
      accion: { etiqueta: 'Cómo ponerlo', tipo: 'ir_a', valor: '/panel/compartir' },
    })
    return recs
  }

  // ── Origen dominante ───────────────────────────────────────────────────────
  const principal = resumen.porOrigen[0]
  if (principal && resumen.visitas >= 20) {
    const porcentaje = Math.round((principal.total / resumen.visitas) * 100)
    if (porcentaje >= 45 && principal.origen !== 'directo') {
      const mejorBloque = resumen.porBloque[0]
      recs.push({
        clave: 'origen-dominante',
        tono: 'bien',
        texto: mejorBloque
          ? `El ${porcentaje}% de tu gente entra desde ${nombreOrigen(principal.origen)} y lo que más pulsa es "${mejorBloque.texto}". Funciona.`
          : `El ${porcentaje}% de tu gente entra desde ${nombreOrigen(principal.origen)}.`,
      })
    }
  }

  // ── Bloques muertos ────────────────────────────────────────────────────────
  if (resumen.visitas >= 40) {
    const conClics = new Set(resumen.porBloque.map((b) => b.blockId))
    const muertos = resumen.porBloque.filter((b) => b.clics === 0).length
    if (muertos > 0 || conClics.size < e.bloquesTotales - 2) {
      const candidato = resumen.porBloque.at(-1)
      if (candidato && candidato.clics <= 1) {
        recs.push({
          clave: 'bloque-muerto',
          tono: 'aviso',
          texto: `Tu botón "${candidato.texto}" no lo pulsa casi nadie. Considera bajarlo o quitarlo: cuantos menos botones, más se pulsa el importante.`,
          accion: { etiqueta: 'Ocultarlo', tipo: 'ocultar_bloque', valor: candidato.blockId },
        })
      }
    }
  }

  // ── El botón principal no es el más pulsado ────────────────────────────────
  const masPulsado = resumen.porBloque[0]
  if (masPulsado && resumen.clics >= 15) {
    recs.push({
      clave: 'reordenar',
      tono: 'info',
      texto: `"${masPulsado.texto}" es lo que más se pulsa. Si no está arriba del todo, súbelo: el primer botón se lleva la mayoría de los clics.`,
      accion: { etiqueta: 'Subirlo al primer puesto', tipo: 'subir_bloque', valor: masPulsado.blockId },
    })
  }

  // ── CTR bajo ───────────────────────────────────────────────────────────────
  if (resumen.visitas >= 50 && resumen.ctr < 15) {
    recs.push({
      clave: 'ctr-bajo',
      tono: 'aviso',
      texto: `De cada 100 personas que entran, solo ${Math.round(resumen.ctr)} pulsan algo. Suele pasar cuando hay demasiadas opciones o el primer botón no queda claro.`,
    })
  } else if (resumen.visitas >= 50 && resumen.ctr > 45) {
    recs.push({
      clave: 'ctr-alto',
      tono: 'bien',
      texto: `De cada 100 personas que entran, ${Math.round(resumen.ctr)} pulsan algo. Eso está muy por encima de lo normal.`,
    })
  }

  // ── Falta WhatsApp, en España ──────────────────────────────────────────────
  if (!e.tieneWhatsapp && resumen.visitas >= 30) {
    recs.push({
      clave: 'sin-whatsapp',
      tono: 'info',
      texto:
        'No tienes botón de WhatsApp. En España es el sitio al que más gente quiere ir desde un perfil: casi todo el mundo lo usa a diario.',
      accion: { etiqueta: 'Añadir WhatsApp', tipo: 'ir_a', valor: '/panel' },
    })
  }

  // ── Mucho móvil (siempre) ──────────────────────────────────────────────────
  const movil = resumen.porDispositivo.find((d) => d.dispositivo === 'movil')
  if (movil && resumen.visitas >= 30) {
    const pct = Math.round((movil.total / resumen.visitas) * 100)
    if (pct >= 85) {
      recs.push({
        clave: 'movil',
        tono: 'info',
        texto: `El ${pct}% entra desde el móvil. Revisa tu página en el móvil, no en el ordenador.`,
      })
    }
  }

  // ── Límite de datos del plan gratuito ──────────────────────────────────────
  if (e.plan === 'GRATIS' && resumen.visitas >= 100) {
    recs.push({
      clave: 'limite-datos',
      tono: 'info',
      texto:
        'Solo guardamos 7 días de datos en el plan gratuito. Con Esencial guardas 12 meses y puedes ver qué mes te funcionó mejor.',
      accion: { etiqueta: 'Ver planes', tipo: 'ir_a', valor: '/panel/plan' },
    })
  }

  return recs.slice(0, 3)
}

function nombreOrigen(clave: string): string {
  const nombres: Record<string, string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    facebook: 'Facebook',
    google: 'Google',
    youtube: 'YouTube',
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp',
    qr: 'el QR',
    tarjeta: 'tus tarjetas',
    ads: 'tus anuncios',
    directo: 'enlace directo',
    x: 'X',
    otro: 'otras webs',
  }
  return nombres[clave] ?? clave
}
