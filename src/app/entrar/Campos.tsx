/** Piezas comunes de las pantallas de acceso. */

export const CAMPO =
  'h-[56px] w-full rounded-[12px] border-2 border-[var(--color-borde)] bg-white px-4 text-[16.5px] outline-none focus:border-[var(--color-acento)]'
export const BOTON =
  'h-[56px] w-full rounded-[12px] bg-[var(--color-acento)] text-[16.5px] font-semibold text-white'

export function Aviso({ tono, children }: { tono: 'error' | 'bien'; children: React.ReactNode }) {
  return (
    <p
      className={`mt-5 rounded-[10px] border px-3.5 py-2.5 text-[14px] ${
        tono === 'error'
          ? 'border-[#F5C6C2] bg-[#FDF0EF] text-[var(--color-alerta)]'
          : 'border-[#BFE6CD] bg-[#F1FAF4] text-[var(--color-exito)]'
      }`}
    >
      {children}
    </p>
  )
}
