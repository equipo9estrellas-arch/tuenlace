'use client'

import { useEffect, useState } from 'react'

/**
 * Compartir: copiar el enlace y descargar el QR.
 *
 * La métrica de activación no es "ha creado la página", es "la ha puesto
 * donde la gente la va a ver". Por eso las instrucciones de Instagram están
 * aquí y no escondidas en la ayuda.
 */
export function Compartir({
  url,
  slug,
  qrPro = false,
  acento = '#14120F',
  hayLogo = false,
}: {
  url: string
  slug: string
  /** El plan da QR con color y logo. */
  qrPro?: boolean
  acento?: string
  hayLogo?: boolean
}) {
  const [copiado, setCopiado] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [verPasos, setVerPasos] = useState(false)
  const [color, setColor] = useState(qrPro ? acento : '')
  const [conLogo, setConLogo] = useState(qrPro && hayLogo)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    const p = new URLSearchParams({ slug })
    if (qrPro && color) p.set('color', color)
    if (qrPro && conLogo) p.set('logo', '1')
    // Un poco de espera: el selector de color dispara un cambio por píxel.
    const t = setTimeout(() => {
      fetch(`/api/qr?${p}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { dataUrl?: string; svg?: string; color?: string } | null) => {
          if (!vivo || !d) return
          if (d.svg) {
            setQr(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(d.svg)}`)
            setAviso(
              color && d.color && d.color.toLowerCase() !== color.toLowerCase()
                ? 'Ese color es demasiado claro para que lo lea un móvil: usamos negro.'
                : null,
            )
          } else if (d.dataUrl) setQr(d.dataUrl)
        })
        .catch(() => {})
    }, 250)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [slug, qrPro, color, conLogo])

  /** El SVG se pasa a PNG de 1200 px aquí: es lo que espera una imprenta o Canva. */
  async function descargar() {
    if (!qr) return
    if (qr.startsWith('data:image/png')) {
      enlaceDescarga(qr)
      return
    }
    const img = new Image()
    img.src = qr
    await img.decode()
    const lienzo = document.createElement('canvas')
    lienzo.width = lienzo.height = 1200
    const ctx = lienzo.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 1200, 1200)
    ctx.drawImage(img, 0, 0, 1200, 1200)
    enlaceDescarga(lienzo.toDataURL('image/png'))
  }

  function enlaceDescarga(href: string) {
    const a = document.createElement('a')
    a.href = href
    a.download = `qr-${slug}.png`
    a.click()
  }

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
            <button
              type="button"
              onClick={descargar}
              className="mt-1.5 inline-block text-[13.5px] font-semibold text-[var(--color-azul)]"
            >
              Descargar en PNG
            </button>
          </div>
        </div>
      )}

      {qrPro && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[10px] bg-[var(--color-papel)] px-3 py-2.5 text-[13.5px]">
          <label className="flex items-center gap-2 font-medium">
            <input
              type="color"
              value={color || '#14120F'}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded-[6px] border border-[var(--color-borde)] bg-white p-0.5"
            />
            Color
          </label>
          {hayLogo ? (
            <label className="flex items-center gap-2 font-medium">
              <input type="checkbox" checked={conLogo} onChange={(e) => setConLogo(e.target.checked)} />
              Con mi logo en el centro
            </label>
          ) : (
            <span className="text-[var(--color-tinta-40)]">Sube tu logo en Mi página para ponerlo en el QR.</span>
          )}
          {aviso && <span className="w-full text-[12.5px] text-[var(--color-alerta)]">{aviso}</span>}
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
