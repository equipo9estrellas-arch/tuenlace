import Link from 'next/link'
import { listarRegistro } from '@/lib/admin-datos'
import { FECHA_HORA } from '../piezas'

export const metadata = { title: 'Registro' }

export default async function RegistroAdmin() {
  const filas = await listarRegistro()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">Registro</h1>
        <p className="mt-1 text-[14px] text-[var(--color-tinta-60)]">
          Todo lo que se ha hecho desde este panel, lo más reciente arriba. No se puede borrar desde la web.
        </p>
      </div>
      <div className="overflow-x-auto rounded-[14px] border border-[var(--color-borde)] bg-white">
        <table className="w-full min-w-[720px] text-left text-[13.5px]">
          <thead className="border-b border-[var(--color-borde)] bg-[var(--color-papel)] text-[12px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
            <tr>
              <th className="px-4 py-2.5">Cuándo</th>
              <th className="px-4 py-2.5">Quién</th>
              <th className="px-4 py-2.5">Qué</th>
              <th className="px-4 py-2.5">Sobre</th>
              <th className="px-4 py-2.5">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const org = f.objetivo.startsWith('org:') ? f.objetivo.slice(4) : null
              return (
                <tr key={f.id} className="border-b border-[var(--color-borde-suave)] align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-tinta-40)]">{FECHA_HORA.format(f.ts)}</td>
                  <td className="px-4 py-2.5">{f.adminEmail}</td>
                  <td className="px-4 py-2.5 font-semibold">{f.accion.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-2.5">
                    {org && f.accion !== 'borrar_cuenta' ? <Link href={`/admin/cuentas/${org}`}>{f.objetivo}</Link> : f.objetivo}
                  </td>
                  <td className="max-w-[360px] break-words px-4 py-2.5 text-[12.5px] text-[var(--color-tinta-60)]">
                    {f.detalle ? JSON.stringify(f.detalle) : ''}
                  </td>
                </tr>
              )
            })}
            {filas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[14.5px] text-[var(--color-tinta-60)]">
                  Todavía no hay nada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
