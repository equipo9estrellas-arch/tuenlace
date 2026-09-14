'use client'

import { useEffect, useState } from 'react'

/**
 * Compartir: copiar el enlace y descargar el QR.
 *
 * La métrica de activación no es "ha creado la página", es "la ha puesto
 * donde la gente la va a ver". Por eso las instrucciones de Instagram están
 * aquí y no escondidas en la ayuda.
 */
export function Compartir({ url, slug }: { url: string; slug: string }) {
  const [copiado, setCopiado] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [verPasos, setVerPasos] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch(`/api/qr?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { dataUrl?: string } | null) => {
        if (vivo && d?.dataUrl) setQr(d.dataUrl)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [slug])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* el navegador puede bloquearlo; el usuario siempre puede seleccionar */
    }
  }

  return (
    <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
      <h2 className="text-[16px] font-bold">Comparte tu enlace</h2>

      <div className="mt-3.5 flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="h-11 min-w-0 flex-1 rounded-[10px] border border-[var(--color-borde)] bg-[var(--color-papel)] px-3 text-[14px]"
        />
        <button
          type="button"
          onClick={copiar}
          className="h-11 shrink-0 rounded-[10px] bg-[var(--color-tinta)] px-4 text-[14px] font-semibold text-white"
        >
          {copiado ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>

      {qr && (
        <div className="mt-4 flex items-center gap-4 border-t border-[var(--color-borde-suave)] pt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`Código QR de ${url}`} width={84} height={84} className="rounded-[8px]" />
          <div>
            <p className="text-[14.5px] font-medium">Tu código QR</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[var(--color-tinta-60)]">
              Para el escaparate, la carta o tus tarjetas.
            </p>
            <a
              href={qr}
              download={`qr-${slug}.png`}
              className="mt-1.5 inline-block text-[13.5px] font-semibold text-[var(--color-azul)]"
            >
              Descargar
            </a>
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-[var(--color-borde-suave)] pt-4">
        <button
          type="button"
          onClick={() => setVerPasos((v) => !v)}
          className="flex w-full items-center justify-between text-left text-[14.5px] font-semibold"
        >
          Ponerlo en mi Instagram
          <span className="text-[var(--color-tinta-40)]">{verPasos ? '−' : '+'}</span>
        </button>

        {verPasos && (
          <ol className="mt-3 flex flex-col gap-2 text-[14px] leading-[1.5] text-[var(--color-tinta-80)]">
            <li>1. Abre Instagram y entra en tu perfil.</li>
            <li>2. Pulsa «Editar perfil».</li>
            <li>3. Pulsa «Enlaces» y luego «Añadir enlace externo».</li>
            <li>
              4. Pega <strong className="text-[var(--color-tinta)]">{url}</strong> y ponle un título
              como «Reserva aquí».
            </li>
            <li>5. Guarda. Ya está.</li>
          </ol>
        )}
      </div>
    </section>
  )
}
