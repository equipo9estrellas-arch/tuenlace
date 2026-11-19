'use client'

import { useEffect } from 'react'

/**
 * Motor de reveals de la web pública. Marca con .l-visto cada [data-r] que
 * entra en pantalla. La clase .l-anima la pone el servidor; si no hay JS, el
 * <noscript> de la página deja todo visible.
 */
export function Revelar() {
  useEffect(() => {
    const elementos = Array.from(document.querySelectorAll<HTMLElement>('.lujo [data-r]'))
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elementos.forEach((el) => el.classList.add('l-visto'))
      return
    }
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add('l-visto')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    elementos.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return null
}

/** Foco de luz que sigue al cursor dentro de las celdas .l-celda. */
export function FocoCeldas() {
  useEffect(() => {
    if (!matchMedia('(hover: hover)').matches) return
    let pendiente: { el: HTMLElement; x: number; y: number } | null = null
    let frame = 0
    const mover = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('.l-celda')
      if (!el) return
      const r = el.getBoundingClientRect()
      pendiente = { el, x: e.clientX - r.left, y: e.clientY - r.top }
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0
          if (!pendiente) return
          pendiente.el.style.setProperty('--mx', `${pendiente.x}px`)
          pendiente.el.style.setProperty('--my', `${pendiente.y}px`)
        })
    }
    document.addEventListener('pointermove', mover, { passive: true })
    return () => {
      document.removeEventListener('pointermove', mover)
      cancelAnimationFrame(frame)
    }
  }, [])
  return null
}
