import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Para agencias',
  description:
    'Monta y gestiona los enlaces de hasta 25 clientes desde un panel. Con tu marca, sus dominios y un informe mensual que lleva tu logo.',
}

/**
 * Landing de agencias.
 *
 * Mensaje distinto al de la home: nunca mezclar los dos públicos en una
 * misma página. Un mensaje para dos públicos no convierte a ninguno.
 *
 * Se abre en el mes 9, con el plan Agencia y el tracking server-side listos.
 * Hasta entonces, capta lista de espera: vender el plan sin el diferenciador
 * técnico es vender una promesa vacía a tu propio gremio.
 */
export default function PaginaAgencias() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-5 py-5">
        <Link href="/" className="text-[15.5px] font-bold no-underline tracking-[-0.01em]">
          TUENLACE
        </Link>
        <Link href="/entrar" className="text-[14.5px] font-medium text-[var(--color-tinta-60)]">
          Entrar
        </Link>
      </header>

      <section className="mx-auto w-full max-w-[720px] px-5 pb-14 pt-10 text-center sm:pt-16">
        <span className="inline-block rounded-full border border-[var(--color-borde)] bg-white px-3 py-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-[var(--color-tinta-60)]">
          Para agencias y freelances
        </span>
        <h1 className="mt-5 text-[34px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[44px]">
          Las páginas de tus clientes.
          <br className="hidden sm:block" /> Tu marca. Tus datos.
        </h1>
        <p className="mx-auto mt-5 max-w-[34rem] text-[17px] leading-[1.55] text-[var(--color-tinta-60)]">
          Monta y gestiona los enlaces de hasta 25 clientes desde un panel, con el tracking que tus
          campañas de Meta necesitan. Y con un informe mensual que lleva tu logo.
        </p>
        <Link
          href="/entrar"
          className="mt-8 inline-block rounded-[12px] bg-[var(--color-tinta)] px-7 py-4 text-[16.5px] font-semibold text-white no-underline"
        >
          Quiero acceso anticipado
        </Link>
        <p className="mt-3.5 text-[13.5px] text-[var(--color-tinta-40)]">
          79 €/mes. En euros, con factura española.
        </p>
      </section>

      <section className="border-y border-[var(--color-borde)] bg-white">
        <div className="mx-auto w-full max-w-[640px] px-5 py-16">
          <h2 className="text-[27px] font-bold leading-[1.2] tracking-[-0.02em]">
            Dos preguntas incómodas
          </h2>
          <div className="mt-6 flex flex-col gap-5 text-[16.5px] leading-[1.6]">
            <p className="border-l-3 border-[var(--color-acento)] pl-4">
              ¿Dónde montas hoy la página de enlaces de tus clientes?
            </p>
            <p className="border-l-3 border-[var(--color-acento)] pl-4">
              ¿Y cómo le demuestras a un cliente que Instagram le trae negocio?
            </p>
          </div>
          <p className="mt-6 text-[16px] leading-[1.6] text-[var(--color-tinta-60)]">
            Si la segunda te incomoda, es exactamente el problema que resolvemos.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[900px] px-5 py-16">
        <div className="grid gap-5 sm:grid-cols-3">
          {VENTAJAS.map((v) => (
            <div key={v.titulo} className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
              <h3 className="text-[16.5px] font-bold leading-snug">{v.titulo}</h3>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-[var(--color-tinta-60)]">{v.texto}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[14px] border-2 border-[var(--color-tinta)] bg-white p-7 text-center">
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">Las cuentas</h2>
          <p className="mt-3 text-[17px] leading-[1.6]">
            <strong>79 € al mes por 25 clientes.</strong> Son <strong>3,16 € por cliente</strong>.
            Inclúyelo en tu cuota o revéndelo a 9 €. Es margen, no gasto.
          </p>
          <p className="mt-3 text-[14.5px] text-[var(--color-tinta-60)]">
            Linktree te cobra unos 15 $ por cliente, en dólares y sin factura española. Y no tiene
            marca blanca a ningún precio self-serve.
          </p>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-[1080px] border-t border-[var(--color-borde)] px-5 py-8 text-[13px] text-[var(--color-tinta-40)]">
        <Link href="/">← Volver a TUENLACE</Link>
      </footer>
    </>
  )
}

const VENTAJAS = [
  {
    titulo: 'Dejas de dar explicaciones',
    texto:
      'Cada fin de mes le enseñas al cliente un informe con tu logo que dice cuántos contactos le trajo Instagram. No impresiones: contactos.',
  },
  {
    titulo: 'Dejas de regalar tu marca',
    texto:
      'Las páginas de tus clientes ya no llevan el logo de una empresa australiana. Llevan el tuyo, o el de ellos.',
  },
  {
    titulo: 'El tracking funciona de verdad',
    texto:
      'Eventos enviados desde el servidor a la Conversions API de Meta, deduplicados y con el consentimiento bien resuelto.',
  },
]
