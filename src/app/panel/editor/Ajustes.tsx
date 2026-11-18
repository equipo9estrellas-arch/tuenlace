'use client'

import {
  MAX_SEO_DESCRIPCION,
  MAX_SEO_TITULO,
  limitesDe,
  planDe,
  precioEnEuros,
  siguientePlan,
} from '@/lib/planes'
import { IconoBien, IconoOjo } from '@/iconos'

/**
 * La pestaña de ajustes.
 *
 * Aquí viven las dos palancas que separan de verdad el plan gratuito del de
 * pago. Hasta ahora `mostrarMarca` e `indexable` existían en la base de datos
 * y nadie podía tocarlas: la home vendía «quitar la marca» y no había forma
 * humana de quitarla.
 *
 * Cuando una palanca no está en el plan, NO se esconde: se enseña apagada y
 * con el precio al lado. Un candado visible vende; una opción que no existe,
 * no. Y el servidor la rechaza igual aunque alguien fuerce el formulario.
 */

export type AjustesEstado = {
  mostrarMarca: boolean
  indexable: boolean
  pixelMeta: string
  ga4: string
  seoTitulo: string
  seoDescripcion: string
}

export function Ajustes({
  estado,
  plan,
  slug,
  onCambiar,
}: {
  estado: AjustesEstado
  plan: string
  slug: string
  onCambiar: (parcial: Partial<AjustesEstado>) => void
}) {
  const limites = limitesDe(plan)
  const actual = planDe(plan)
  const siguiente = siguientePlan(plan)

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      <Palanca
        icono={<IconoOjo tam={19} />}
        titulo="Dejar que Google encuentre tu página"
        explicacion={`Permite que tuenlace.es/${slug} salga en los buscadores. Tarda semanas en aparecer y solo merece la pena si tu página tiene contenido de verdad.`}
        encendida={estado.indexable}
        permitida={limites.indexar}
        plan={siguiente}
        onCambiar={(v) => onCambiar({ indexable: v })}
      />

      <Grupo
        titulo="Medir tus anuncios"
        explicacion="Pega tus IDs y tu página carga el píxel de Meta y Google Analytics. Solo se activan cuando el visitante acepta las cookies: el aviso ya viene puesto y cumple la normativa."
        permitida={limites.seguimiento}
        plan={siguiente}
      >
        <CampoTexto
          etiqueta="ID del píxel de Meta"
          ayuda="Solo números. Lo ves en el Administrador de eventos de Meta."
          valor={estado.pixelMeta}
          marcador="123456789012345"
          inputMode="numeric"
          deshabilitado={!limites.seguimiento}
          onCambiar={(v) => onCambiar({ pixelMeta: v })}
        />
        <CampoTexto
          etiqueta="ID de Google Analytics 4"
          ayuda="Empieza por G-. Lo ves en Administrar → Flujos de datos."
          valor={estado.ga4}
          marcador="G-AB12CD34EF"
          deshabilitado={!limites.seguimiento}
          onCambiar={(v) => onCambiar({ ga4: v.toUpperCase() })}
        />
      </Grupo>

      <Grupo
        titulo="Cómo se ve en Google y en WhatsApp"
        explicacion="Por defecto usamos el título y la frase de tu página. Aquí puedes escribir otros pensados para buscadores y para cuando alguien comparte tu enlace."
        permitida={limites.seo}
        plan={siguiente}
      >
        <CampoTexto
          etiqueta="Título"
          valor={estado.seoTitulo}
          marcador="Barbería en Santa Cruz · Cita por WhatsApp"
          maximo={MAX_SEO_TITULO}
          deshabilitado={!limites.seo}
          onCambiar={(v) => onCambiar({ seoTitulo: v })}
        />
        <CampoTexto
          etiqueta="Descripción"
          valor={estado.seoDescripcion}
          marcador="Cortes, barba y afeitado clásico. Pide cita en un toque."
          maximo={MAX_SEO_DESCRIPCION}
          deshabilitado={!limites.seo}
          onCambiar={(v) => onCambiar({ seoDescripcion: v })}
        />
      </Grupo>

      <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
        <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
          Tu plan
        </h2>
        <p className="mt-2 text-[17px] font-bold">{actual.nombre}</p>
        <ul className="mt-3 flex flex-col gap-2 text-[14.5px]">
          <Dato nombre="Bloques" valor={limites.bloques >= 200 ? 'Sin límite' : String(limites.bloques)} />
          <Dato
            nombre="Estadísticas que guardamos"
            valor={limites.diasDeDatos >= 365 ? `${Math.round(limites.diasDeDatos / 30)} meses` : `${limites.diasDeDatos} días`}
          />
          <Dato nombre="Salir en Google" valor={limites.indexar ? 'Sí' : 'No'} />
        </ul>

        {siguiente && (
          <a
            href="/panel/plan"
            className="mt-4 inline-flex items-center justify-center rounded-[10px] bg-[var(--color-acento)] px-5 py-3 text-[15px] font-semibold text-white no-underline"
          >
            Pasar a {siguiente.nombre} por {precioEnEuros(siguiente.precioMensualCentimos)} + IGIC al mes
          </a>
        )}
      </section>
    </div>
  )
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <li className="flex items-center justify-between border-b border-[var(--color-borde-suave)] pb-2 last:border-0">
      <span className="text-[var(--color-tinta-60)]">{nombre}</span>
      <span className="font-semibold">{valor}</span>
    </li>
  )
}

function Palanca({
  icono,
  titulo,
  explicacion,
  encendida,
  permitida,
  plan,
  onCambiar,
}: {
  icono: React.ReactNode
  titulo: string
  explicacion: string
  encendida: boolean
  permitida: boolean
  plan: { nombre: string; precioMensualCentimos: number } | null
  onCambiar: (v: boolean) => void
}) {
  return (
    <section
      className={`rounded-[14px] border bg-white p-5 ${
        permitida ? 'border-[var(--color-borde)]' : 'border-[var(--color-borde-suave)]'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={`mt-0.5 shrink-0 ${
            permitida ? 'text-[var(--color-tinta-80)]' : 'text-[var(--color-tinta-40)]'
          }`}
        >
          {icono}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold leading-snug">{titulo}</h2>
          <p className="mt-1 text-[14px] leading-[1.5] text-[var(--color-tinta-60)]">
            {explicacion}
          </p>

          {!permitida && plan && (
            <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-borde-suave)] px-3 py-1.5 text-[13px] font-semibold">
              <IconoBien tam={14} />
              Incluido en {plan.nombre}, {precioEnEuros(plan.precioMensualCentimos)} + IGIC al mes
            </p>
          )}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={encendida}
          aria-label={titulo}
          disabled={!permitida}
          onClick={() => onCambiar(!encendida)}
          className={`mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            encendida ? 'bg-[var(--color-exito)]' : 'bg-[var(--color-borde)]'
          }`}
        >
          <span
            className={`block h-[21px] w-[21px] rounded-full bg-white shadow-sm transition-transform ${
              encendida ? 'translate-x-[24px]' : 'translate-x-[3px]'
            }`}
          />
        </button>
      </div>
    </section>
  )
}

function Grupo({
  titulo,
  explicacion,
  permitida,
  plan,
  children,
}: {
  titulo: string
  explicacion: string
  permitida: boolean
  plan: { nombre: string; precioMensualCentimos: number } | null
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
      <h2 className="text-[16px] font-bold leading-snug">{titulo}</h2>
      <p className="mt-1 text-[14px] leading-[1.5] text-[var(--color-tinta-60)]">{explicacion}</p>
      {!permitida && plan && (
        <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-borde-suave)] px-3 py-1.5 text-[13px] font-semibold">
          <IconoBien tam={14} />
          Incluido en {plan.nombre}, {precioEnEuros(plan.precioMensualCentimos)} + IGIC al mes
        </p>
      )}
      <div className={`mt-4 flex flex-col gap-3.5 ${permitida ? '' : 'opacity-50'}`}>{children}</div>
    </section>
  )
}

function CampoTexto({
  etiqueta,
  ayuda,
  valor,
  marcador,
  maximo,
  inputMode,
  deshabilitado,
  onCambiar,
}: {
  etiqueta: string
  ayuda?: string
  valor: string
  marcador?: string
  maximo?: number
  inputMode?: 'numeric'
  deshabilitado: boolean
  onCambiar: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[13.5px] font-semibold text-[var(--color-tinta-80)]">
        {etiqueta}
        {maximo && (
          <span className="text-[12px] font-normal text-[var(--color-tinta-40)] tabular-nums">
            {valor.length}/{maximo}
          </span>
        )}
      </span>
      <input
        value={valor}
        placeholder={marcador}
        maxLength={maximo}
        inputMode={inputMode}
        disabled={deshabilitado}
        spellCheck={false}
        onChange={(e) => onCambiar(e.target.value)}
        className="mt-1.5 w-full rounded-[10px] border border-[var(--color-borde)] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[var(--color-tinta-40)] disabled:cursor-not-allowed"
      />
      {ayuda && <span className="mt-1 block text-[12.5px] text-[var(--color-tinta-40)]">{ayuda}</span>}
    </label>
  )
}
