'use client'

import { useEffect } from 'react'
import { leerDecision } from './consentimiento'

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] }
    _fbq?: unknown
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * PÍXEL DE META Y GOOGLE ANALYTICS (plan Esencial)
 *
 * Nada se carga hasta que el visitante decide en el banner:
 *   · píxel de Meta → consentimiento de MARKETING
 *   · Google Analytics → consentimiento de ANALÍTICA
 * Si ya decidió en otra visita, se respeta esa decisión. Si rechaza, no sale
 * ni una petición hacia Meta ni hacia Google.
 *
 * Eventos que se mandan, los que una agencia necesita para optimizar campañas:
 *   · PageView / page_view al cargar
 *   · Contact / contact al pulsar WhatsApp o Llamar
 *   · Lead / generate_lead al volver del formulario con ?enviado=1
 */
export function Seguimiento({
  pixelMeta,
  ga4,
  leadEnviado,
}: {
  pixelMeta: string
  ga4: string
  leadEnviado: boolean
}) {
  useEffect(() => {
    if (!pixelMeta && !ga4) return
    let metaCargado = false
    let gaCargado = false

    function cargarMeta() {
      if (metaCargado || !pixelMeta) return
      metaCargado = true
      // El snippet oficial de Meta, sin el <noscript>: sin JS no hay
      // consentimiento que dar, así que tampoco hay píxel.
      const f = window
      if (!f.fbq) {
        const n = function (...args: unknown[]) {
          if (n.callMethod) (n.callMethod as (...a: unknown[]) => void)(...args)
          else n.queue!.push(args)
        } as NonNullable<Window['fbq']> & { push?: unknown; loaded?: boolean; version?: string }
        f.fbq = n
        if (!f._fbq) f._fbq = n
        n.push = n
        n.loaded = true
        n.version = '2.0'
        n.queue = []
        const s = document.createElement('script')
        s.async = true
        s.src = 'https://connect.facebook.net/en_US/fbevents.js'
        document.head.appendChild(s)
      }
      f.fbq!('init', pixelMeta)
      f.fbq!('track', 'PageView')
      if (leadEnviado) f.fbq!('track', 'Lead')
    }

    function cargarGa() {
      if (gaCargado || !ga4) return
      gaCargado = true
      window.dataLayer = window.dataLayer || []
      window.gtag = function (...args: unknown[]) {
        // gtag exige el objeto `arguments`, no un array: así lo lee dataLayer.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments)
        void args
      }
      window.gtag('js', new Date())
      window.gtag('config', ga4, { anonymize_ip: true })
      if (leadEnviado) window.gtag('event', 'generate_lead')
      const s = document.createElement('script')
      s.async = true
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}`
      document.head.appendChild(s)
    }

    function aplicar(decision: { analitica?: boolean; marketing?: boolean } | null) {
      if (decision?.marketing) cargarMeta()
      if (decision?.analitica) cargarGa()
    }

    aplicar(leerDecision())
    const alConsentir = (e: Event) => aplicar((e as CustomEvent).detail)
    window.addEventListener('te:consentimiento', alConsentir)

    function alPulsar(e: MouseEvent) {
      const destino = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tipo]')
      const tipo = destino?.dataset.tipo
      if (tipo !== 'WHATSAPP' && tipo !== 'LLAMAR') return
      if (metaCargado) window.fbq?.('track', 'Contact', { content_name: tipo === 'WHATSAPP' ? 'WhatsApp' : 'Llamada' })
      if (gaCargado) window.gtag?.('event', 'contact', { method: tipo === 'WHATSAPP' ? 'whatsapp' : 'telefono' })
    }
    document.addEventListener('click', alPulsar, { capture: true })

    return () => {
      window.removeEventListener('te:consentimiento', alConsentir)
      document.removeEventListener('click', alPulsar, { capture: true })
    }
  }, [pixelMeta, ga4, leadEnviado])

  return null
}
