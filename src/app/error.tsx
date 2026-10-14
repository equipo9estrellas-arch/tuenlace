'use client'

import { useEffect } from 'react'

/**
 * Sin este fichero, cualquier error de renderizado —incluido el SIN_SESION que
 * lanza exigirSesion()— mostraba la pantalla de error genérica de Next.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[error]', error)
  }, [error])

  // exigirSesion lanza cuando no hay sesión válida: ahí lo correcto no es un
  // error, es mandar a entrar.
  const sinSesion = error.message === 'SIN_SESION'

  useEffect(() => {
    if (sinSesion) window.location.href = '/entrar'
  }, [sinSesion])

  if (sinSesion) return null

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[22px] font-bold tracking-[-0.02em]">Algo ha fallado</h1>
      <p className="mt-2 max-w-[36ch] text-[15.5px] leading-relaxed text-[var(--color-tinta-60)]">
        No hemos podido cargar esta página. Vuelve a intentarlo; si sigue sin funcionar,
        escríbenos.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-7 rounded-[12px] bg-[var(--color-acento)] px-6 py-3.5 text-[16px] font-semibold text-white"
      >
        Reintentar
      </button>
    </main>
  )
}
