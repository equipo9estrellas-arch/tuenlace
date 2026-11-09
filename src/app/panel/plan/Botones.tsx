'use client'

import { useState, useTransition } from 'react'
import { irAPagar, irAlPortal } from './acciones'

/**
 * Los dos botones que salen de la aplicación hacia Stripe.
 *
 * Son clientes por una razón concreta: la acción redirige fuera, así que si
 * algo falla el usuario se queda en la misma página sin saber por qué. Aquí se
 * recoge el error y se enseña. `redirect()` de Next lanza una excepción propia
 * para navegar, y por eso la acción solo devuelve objeto cuando algo va mal.
 */

export function BotonPlan({ plan, nombre }: { plan: string; nombre: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()

  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            setError(null)
            const r = await irAPagar(plan)
            if (r?.error) setError(r.error)
          })
        }
        className="w-full rounded-[10px] bg-[var(--color-acento)] py-3 text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {pendiente ? 'Abriendo el pago…' : `Pasar a ${nombre}`}
      </button>
      {error && <p className="mt-2 text-[13.5px] text-[var(--color-alerta)]">{error}</p>}
    </div>
  )
}

export function BotonPortal() {
  const [error, setError] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()

  return (
    <div>
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            setError(null)
            const r = await irAlPortal()
            if (r?.error) setError(r.error)
          })
        }
        className="rounded-[10px] border-2 border-[var(--color-borde)] px-4 py-2.5 text-[14.5px] font-semibold disabled:opacity-60"
      >
        {pendiente ? 'Abriendo…' : 'Gestionar la suscripción'}
      </button>
      {error && <p className="mt-2 text-[13.5px] text-[var(--color-alerta)]">{error}</p>}
    </div>
  )
}
