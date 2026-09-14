'use client'

import { useEffect, useState } from 'react'

/**
 * BANNER DE CONSENTIMIENTO
 *
 * Un negocio español que pone un píxel de Meta en su Linktree sin banner de
 * consentimiento está incumpliendo la normativa y no lo sabe. TUENLACE es la
 * única de la categoría que lo resuelve de fábrica.
 *
 * La arquitectura correcta, y no hay atajo:
 *     CMP → señal de consentimiento → puerta que decide si se disparan
 *     el píxel de navegador y la Conversions API.
 *
 * La CAPI NO esquiva el consentimiento: enviar datos personales desde el
 * servidor es el mismo tratamiento que enviarlos desde el navegador.
 *
 * Sin decisión o con rechazo: solo analítica propia agregada, sin cookies
 * ni identificador persistente. No sale nada hacia terceros.
 */

const CLAVE = 'te_consent'

type Decision = { analitica: boolean; marketing: boolean; ts: number }

export function BannerConsentimiento({ paginaId }: { paginaId: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE)
      if (!guardado) {
        setVisible(true)
        return
      }
      const decision = JSON.parse(guardado) as Decision
      // Se vuelve a preguntar cada 6 meses.
      if (Date.now() - decision.ts > 182 * 24 * 60 * 60 * 1000) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  function decidir(marketing: boolean) {
    const decision: Decision = { analitica: true, marketing, ts: Date.now() }
    try {
      localStorage.setItem(CLAVE, JSON.stringify(decision))
    } catch {
      /* almacenamiento bloqueado */
    }

    // Registro del consentimiento: prueba de cumplimiento.
    void fetch('/api/consentimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paginaId, analitica: true, marketing }),
      keepalive: true,
    }).catch(() => {})

    if (marketing) {
      window.dispatchEvent(new CustomEvent('te:consentimiento', { detail: decision }))
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookies"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[500px] rounded-[14px] border p-4 shadow-lg"
      style={{ background: 'var(--p-tarjeta)', borderColor: 'var(--p-borde)' }}
    >
      <p className="text-[13.5px] leading-[1.5]" style={{ color: 'var(--p-texto)' }}>
        Usamos cookies para saber qué botones se pulsan. Si aceptas, también podremos medir los
        anuncios. Tú eliges.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => decidir(true)}
          className="h-11 flex-1 rounded-[10px] text-[14.5px] font-semibold"
          style={{ background: 'var(--p-acento)', color: 'var(--p-acento-texto)' }}
        >
          Aceptar
        </button>
        <button
          type="button"
          onClick={() => decidir(false)}
          className="h-11 flex-1 rounded-[10px] border text-[14.5px] font-semibold"
          style={{ borderColor: 'var(--p-borde)', color: 'var(--p-texto)' }}
        >
          Solo lo básico
        </button>
      </div>
    </div>
  )
}
