'use client'

import { useEffect } from 'react'

/**
 * Registro de clics.
 *
 * Se monta ENCIMA de enlaces <a> reales. Si este script no se ejecuta, los
 * botones siguen funcionando: solo se pierde la estadística. Nunca al revés.
 *
 * Usa sendBeacon para que el registro sobreviva a la navegación — con fetch
 * normal, el navegador cancela la petición al salir de la página y se pierden
 * justo los clics que más importan.
 */
export function Rastreador({
  paginaId,
  origen,
  fbclid,
}: {
  paginaId: string
  origen: string
  fbclid: string | null
}) {
  useEffect(() => {
    // El fbclid solo existe en la URL de llegada y se pierde al navegar dentro
    // de la página. Persistirlo es lo que más eleva la calidad de emparejamiento
    // de Meta en tráfico de anuncios.
    if (fbclid) {
      try {
        const valor = `fb.1.${Date.now()}.${fbclid}`
        document.cookie = `_fbc=${valor};path=/;max-age=7776000;SameSite=Lax`
      } catch {
        /* cookies bloqueadas: seguimos */
      }
    }

    function enviar(bloqueId: string, red?: string) {
      const cuerpo = JSON.stringify({ paginaId, bloqueId, origen, red })
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/t', new Blob([cuerpo], { type: 'application/json' }))
          return
        }
      } catch {
        /* cae al fetch */
      }
      void fetch('/api/t', {
        method: 'POST',
        body: cuerpo,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {})
    }

    function alPulsar(evento: MouseEvent) {
      const destino = (evento.target as HTMLElement | null)?.closest<HTMLElement>('[data-bloque]')
      if (!destino) return
      const bloqueId = destino.dataset.bloque
      if (!bloqueId) return
      enviar(bloqueId, destino.dataset.red)
    }

    document.addEventListener('click', alPulsar, { capture: true })
    return () => document.removeEventListener('click', alPulsar, { capture: true })
  }, [paginaId, origen, fbclid])

  return null
}
