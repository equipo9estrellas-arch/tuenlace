'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { normalizarSlug } from '@/lib/slug'

/**
 * Hero interactivo: el campo para reservar el nombre y el teléfono con una
 * página de ejemplo. Lo que escribes aparece en la barra del teléfono (el
 * detalle de gracia de la página).
 */
export function HeroCampo({ onSlug }: { onSlug?: (s: string) => void }) {
  const router = useRouter()
  const [valor, setValor] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const slug = normalizarSlug(valor)
        router.push(slug ? `/crear?slug=${encodeURIComponent(slug)}` : '/crear')
      }}
      className="flex w-full max-w-[480px] flex-col gap-2.5 sm:flex-row"
    >
      <label className="flex h-[54px] shrink-0 items-center sm:flex-1 rounded-full border border-[rgba(242,237,228,0.18)] bg-[rgba(242,237,228,0.04)] pl-5 pr-3 transition-colors focus-within:border-[var(--l-brasa)]">
        <span className="select-none whitespace-nowrap text-[15px] text-[var(--l-tenue)]">tuenlace.es/</span>
        <input
          value={valor}
          onChange={(e) => {
            const v = e.target.value.toLowerCase()
            setValor(v)
            onSlug?.(normalizarSlug(v))
          }}
          placeholder="tu-negocio"
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="El nombre de tu enlace"
          className="h-full min-w-0 flex-1 bg-transparent pl-0.5 text-[16px] font-semibold text-[var(--l-hueso)] outline-none placeholder:font-normal placeholder:text-[rgba(242,237,228,0.35)]"
        />
      </label>
      <button type="submit" className="l-boton l-boton-principal">
        Empezar
        <span aria-hidden>→</span>
      </button>
    </form>
  )
}

/** Inclinación con el puntero: damping exponencial, independiente de los Hz. */
function useInclinacion() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!matchMedia('(hover: hover)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let objX = 0
    let objY = 0
    let x = 0
    let y = 0
    let previo = performance.now()
    let frame = 0
    const damp = (a: number, b: number, l: number, dt: number) => b + (a - b) * Math.exp(-l * dt)
    const mover = (e: PointerEvent) => {
      objY = (e.clientX / innerWidth - 0.5) * 14
      objX = -(e.clientY / innerHeight - 0.5) * 10
    }
    const bucle = (ahora: number) => {
      const dt = Math.min((ahora - previo) / 1000, 0.05)
      previo = ahora
      x = damp(x, objX, 6, dt)
      y = damp(y, objY, 6, dt)
      el.style.setProperty('--rx', `${x.toFixed(2)}deg`)
      el.style.setProperty('--ry', `${y.toFixed(2)}deg`)
      frame = requestAnimationFrame(bucle)
    }
    addEventListener('pointermove', mover, { passive: true })
    frame = requestAnimationFrame(bucle)
    const visibilidad = () => {
      cancelAnimationFrame(frame)
      if (!document.hidden) {
        previo = performance.now()
        frame = requestAnimationFrame(bucle)
      }
    }
    document.addEventListener('visibilitychange', visibilidad)
    return () => {
      removeEventListener('pointermove', mover)
      document.removeEventListener('visibilitychange', visibilidad)
      cancelAnimationFrame(frame)
    }
  }, [])
  return ref
}

export function Hero({ nota }: { nota: string }) {
  const [slug, setSlug] = useState('')
  const telefono = useInclinacion()

  return (
    <div className="grid items-center gap-16 lg:grid-cols-[1.15fr_1fr]">
      <div>
        <p className="l-kicker" data-r style={{ ['--d' as string]: '0.05s' }}>
          Para negocios que viven de sus redes
        </p>
        <h1 className="l-display mt-6 text-[clamp(2.9rem,8.4vw,6.4rem)]" data-r="palabras">
          {/* El componente de palabras no puede usarse aquí (cliente); se parte a mano. */}
          {['Que', 'Instagram', 'te', 'traiga'].map((p, i) => (
            <span key={p}>
              <span className="l-palabra" style={{ ['--i' as string]: i }}>
                <span>{p}</span>
              </span>{' '}
            </span>
          ))}
          <span className="l-palabra" style={{ ['--i' as string]: 4 }}>
            <span>
              <em>clientes,</em>
            </span>
          </span>{' '}
          {['no', 'solo', 'seguidores.'].map((p, i) => (
            <span key={p}>
              <span className="l-palabra" style={{ ['--i' as string]: 5 + i }}>
                <span className="text-[var(--l-tenue)]">{p}</span>
              </span>{' '}
            </span>
          ))}
        </h1>
        <p
          className="mt-8 max-w-[31rem] text-[17.5px] leading-[1.6] text-[var(--l-tenue)]"
          data-r
          style={{ ['--d' as string]: '0.45s' }}
        >
          Una página con tu WhatsApp, tu horario, tu ubicación y tu formulario, que además te dice
          de dónde viene cada cliente. Lista en cinco minutos.
        </p>
        <div className="mt-10" data-r style={{ ['--d' as string]: '0.6s' }}>
          <HeroCampo onSlug={setSlug} />
          <p className="mt-4 text-[13.5px] text-[var(--l-tenue)]">{nota}</p>
        </div>
      </div>

      <div className="relative flex justify-center" data-r style={{ ['--d' as string]: '0.3s' }}>
        <div className="l-glow -right-24 -top-20 h-[520px] w-[520px]" aria-hidden />
        <div ref={telefono} className="l-telefono" aria-label="Ejemplo de una página hecha con TUENLACE" role="img">
          <div className="l-pantalla">
            <PaginaEjemplo slug={slug} />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * La página de ejemplo del teléfono. Es una ilustración del producto, no un
 * cliente: va marcada como «Ejemplo» y no lleva cifras.
 */
function PaginaEjemplo({ slug }: { slug: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-1.5 bg-[#ece5db] px-4 pb-2.5 pt-4 text-[11px] text-[#6d655b]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2f9e62]" />
        <span className="truncate font-medium">tuenlace.es/{slug || 'tu-negocio'}</span>
      </div>
      <div className="flex flex-1 flex-col items-center px-5 pt-7 text-center">
        <span className="mb-4 rounded-full border border-[#d9cfc2] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[#8a8174]">
          Ejemplo
        </span>
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#1b1814] font-[family-name:var(--l-display)] text-[34px] italic text-[#f6f1ea]">
          {(slug || 'tu negocio').charAt(0).toUpperCase()}
        </div>
        <p className="mt-3.5 text-[19px] font-bold tracking-[-0.02em]">Tu negocio</p>
        <p className="mt-1 text-[12.5px] text-[#6d655b]">Lo que haces, en una frase.</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e3f1e8] px-2.5 py-1 text-[11px] font-semibold text-[#1f7a4a]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2f9e62]" /> Abierto ahora
        </p>
        <div className="mt-6 flex w-full flex-col gap-2.5">
          <span className="rounded-[14px] bg-[#1f9d55] py-3.5 text-[13.5px] font-semibold text-white">
            Escríbenos por WhatsApp
          </span>
          <span className="rounded-[14px] bg-[#1b1814] py-3.5 text-[13.5px] font-semibold text-[#f6f1ea]">
            Pide cita
          </span>
          <span className="rounded-[14px] border border-[#d9cfc2] py-3.5 text-[13.5px] font-semibold">
            Cómo llegar
          </span>
          <span className="rounded-[14px] border border-[#d9cfc2] py-3.5 text-[13.5px] font-semibold">
            Mira nuestro trabajo
          </span>
        </div>
        <p className="mt-auto pb-5 pt-4 text-[10px] text-[#8a8174]">Creado con TUENLACE</p>
      </div>
    </div>
  )
}
