'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { normalizarSlug } from '@/lib/slug'

/**
 * El campo del hero.
 *
 * El usuario escribe el nombre de su negocio y ya está dentro del onboarding.
 * Reservar el nombre es un micro-compromiso: una vez que alguien lo ha escrito,
 * el abandono cae mucho. Pedir el email antes de dar nada a cambio es la razón
 * número uno de abandono en este tipo de productos.
 */
export function CampoHero() {
  const router = useRouter()
  const [valor, setValor] = useState('')

  function empezar() {
    const slug = normalizarSlug(valor)
    router.push(slug ? `/crear?slug=${encodeURIComponent(slug)}` : '/crear')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        empezar()
      }}
      className="flex flex-col gap-2.5 sm:flex-row"
    >
      <div className="flex flex-1 items-center rounded-[12px] border-2 border-[var(--color-borde)] bg-white px-3.5 focus-within:border-[var(--color-acento)]">
        <span className="select-none whitespace-nowrap text-[15px] text-[var(--color-tinta-40)]">
          tuenlace.es/
        </span>
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value.toLowerCase())}
          placeholder="tu negocio"
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="El nombre de tu enlace"
          className="h-[54px] min-w-0 flex-1 bg-transparent pl-0.5 text-[16px] font-semibold outline-none placeholder:font-normal placeholder:text-[var(--color-tinta-40)] focus:outline-none focus-visible:outline-none"
        />
      </div>
      <button
        type="submit"
        className="h-[54px] shrink-0 rounded-[12px] bg-[var(--color-acento)] px-6 text-[16px] font-semibold text-white"
      >
        Empezar
      </button>
    </form>
  )
}
