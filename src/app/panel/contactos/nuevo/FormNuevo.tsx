'use client'

import { useActionState } from 'react'
import { ETAPAS, ORIGENES_MANUALES, nombreOrigen } from '@/lib/crm-etapas'
import { crearContacto } from '../acciones'

const CAMPO =
  'mt-1.5 w-full rounded-[10px] border border-[var(--color-borde)] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[var(--color-tinta-40)]'
const ETIQUETA = 'text-[13px] font-semibold text-[var(--color-tinta-60)]'

export function FormNuevo() {
  const [resultado, enviar, pendiente] = useActionState(crearContacto, null)

  return (
    <form action={enviar} className="flex flex-col gap-4 rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className={ETIQUETA}>Nombre</span>
          <input name="nombre" autoComplete="off" maxLength={200} className={CAMPO} autoFocus />
        </label>
        <label>
          <span className={ETIQUETA}>Teléfono</span>
          <input name="telefono" type="tel" autoComplete="off" maxLength={200} className={CAMPO} />
        </label>
        <label>
          <span className={ETIQUETA}>Correo</span>
          <input name="email" type="email" autoComplete="off" maxLength={200} className={CAMPO} />
        </label>
        <label>
          <span className={ETIQUETA}>Por dónde llegó</span>
          <select name="origen" defaultValue="whatsapp" className={CAMPO}>
            {ORIGENES_MANUALES.map((o) => (
              <option key={o} value={o}>
                {nombreOrigen(o)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={ETIQUETA}>Etapa</span>
          <select name="etapa" defaultValue="NUEVO" className={CAMPO}>
            {ETAPAS.map((e) => (
              <option key={e.clave} value={e.clave}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className={ETIQUETA}>Nota (opcional)</span>
          <textarea name="mensaje" rows={3} maxLength={2000} placeholder="Qué quiere, cuándo escribió…" className={CAMPO} />
        </label>
      </div>

      {resultado && !resultado.ok && (
        <p className="text-[14px] font-medium text-[var(--color-alerta)]">{resultado.error}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-[10px] bg-[var(--color-acento)] px-5 py-2.5 text-[15px] font-semibold text-white disabled:opacity-60"
        >
          {pendiente ? 'Guardando…' : 'Guardar contacto'}
        </button>
      </div>
    </form>
  )
}
