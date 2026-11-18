import { NOMBRE_ESTADO, type EstadoCuenta } from '@/lib/admin-datos'

export const FECHA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
export const FECHA_HORA = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Atlantic/Canary',
})

const COLOR_ESTADO: Record<EstadoCuenta, string> = {
  PAGO: 'bg-[#EAF7EF] text-[var(--color-exito)]',
  CORTESIA: 'bg-[#EEF2FB] text-[var(--color-azul)]',
  PRUEBA: 'bg-[#FFF6E5] text-[#8A5A00]',
  CADUCADA: 'bg-[var(--color-borde-suave)] text-[var(--color-tinta-60)]',
}

export function ChipEstado({ estado }: { estado: EstadoCuenta }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-wide ${COLOR_ESTADO[estado]}`}>
      {NOMBRE_ESTADO[estado]}
    </span>
  )
}

const COLOR_PAGINA: Record<string, string> = {
  PUBLICADA: 'bg-[#EAF7EF] text-[var(--color-exito)]',
  BORRADOR: 'bg-[var(--color-borde-suave)] text-[var(--color-tinta-60)]',
  SUSPENDIDA: 'bg-[#FDF3F2] text-[var(--color-alerta)]',
}

export function ChipPagina({ estado }: { estado: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-wide ${COLOR_PAGINA[estado] ?? ''}`}>
      {estado === 'PUBLICADA' ? 'Publicada' : estado === 'SUSPENDIDA' ? 'Suspendida' : 'Borrador'}
    </span>
  )
}

export function Cifra({ nombre, valor, nota }: { nombre: string; valor: string | number; nota?: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--color-borde)] bg-white p-4">
      <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">{nombre}</p>
      <p className="mt-1 text-[26px] font-bold tabular-nums tracking-[-0.02em]">{valor}</p>
      {nota && <p className="mt-0.5 text-[12.5px] text-[var(--color-tinta-40)]">{nota}</p>}
    </div>
  )
}

export function Caja({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
      <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">{titulo}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export const BOTON =
  'rounded-[10px] border border-[var(--color-borde)] bg-white px-3.5 py-2 text-[13.5px] font-semibold text-[var(--color-tinta)] hover:bg-[var(--color-papel)]'
export const BOTON_PELIGRO =
  'rounded-[10px] bg-[var(--color-alerta)] px-3.5 py-2 text-[13.5px] font-semibold text-white'
export const CAMPO =
  'rounded-[10px] border border-[var(--color-borde)] bg-white px-3 py-2 text-[14px] outline-none focus:border-[var(--color-tinta-60)]'
