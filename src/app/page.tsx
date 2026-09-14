import Link from 'next/link'
import { CampoHero } from './CampoHero'

/**
 * Home para el negocio / particular.
 *
 * Estructura ordenada para conversión, no para impresionar
 * (blueprint bloque 3, punto 11.2). Cada sección hace un trabajo.
 *
 * El campo del hero es la decisión de conversión más importante de la página:
 * el usuario empieza el onboarding antes de decidir registrarse.
 */

export default function Home() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-5 py-5">
        <span className="text-[15.5px] font-bold tracking-[-0.01em]">TUENLACE</span>
        <nav className="flex items-center gap-5 text-[14.5px]">
          <Link href="/agencias" className="font-medium text-[var(--color-tinta-60)] hover:text-[var(--color-tinta)]">
            Para agencias
          </Link>
          <Link href="/entrar" className="font-medium text-[var(--color-tinta-60)] hover:text-[var(--color-tinta)]">
            Entrar
          </Link>
        </nav>
      </header>

      {/* 1 · Hero */}
      <section className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-10 text-center sm:pt-16">
        <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[46px]">
          Que Instagram te traiga clientes,
          <br className="hidden sm:block" /> no solo seguidores.
        </h1>
        <p className="mx-auto mt-5 max-w-[30rem] text-[17px] leading-[1.55] text-[var(--color-tinta-60)]">
          Una mini página con tu WhatsApp, tus citas, tu ubicación y tus reseñas. Lista en 5
          minutos, sin saber nada de tecnología.
        </p>

        <div className="mx-auto mt-8 max-w-[440px]">
          <CampoHero />
        </div>

        <p className="mt-3.5 text-[13.5px] text-[var(--color-tinta-40)]">
          Gratis para siempre. Sin tarjeta. Sin instalar nada.
        </p>
      </section>

      {/* 3 · El problema, en su idioma */}
      <section className="border-y border-[var(--color-borde)] bg-white">
        <div className="mx-auto w-full max-w-[620px] px-5 py-16">
          <h2 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">
            Te encuentran. Y se van.
          </h2>
          <p className="mt-4 text-[16.5px] leading-[1.6] text-[var(--color-tinta-80)]">
            Alguien ve tu Reel, entra en tu perfil, le interesa… y no sabe qué hacer. No encuentra
            tu teléfono. No sabe si abres los domingos. No sabe cómo pedir cita.
          </p>
          <p className="mt-4 text-[16.5px] font-medium leading-[1.6]">
            Se va. Y tú nunca te enteras de que estuvo ahí.
          </p>
        </div>
      </section>

      {/* 4 · La solución en 3 pasos */}
      <section className="mx-auto w-full max-w-[880px] px-5 py-16">
        <h2 className="text-center text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">
          Tres pasos. Cinco minutos.
        </h2>
        <ol className="mt-9 grid gap-5 sm:grid-cols-3">
          {[
            {
              n: '1',
              t: 'Nos cuentas qué haces y qué quieres conseguir',
              d: 'Seis preguntas. Sin formularios interminables.',
            },
            {
              n: '2',
              t: 'Te montamos la página',
              d: 'Con tus botones en el orden correcto, no en una lista.',
            },
            {
              n: '3',
              t: 'La pones en tu bio',
              d: 'Y empiezas a ver quién entra, de dónde viene y qué pulsa.',
            },
          ].map((paso) => (
            <li key={paso.n} className="rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-acento)] text-[14px] font-bold text-white">
                {paso.n}
              </span>
              <h3 className="mt-3.5 text-[16px] font-semibold leading-snug">{paso.t}</h3>
              <p className="mt-1.5 text-[14.5px] leading-[1.5] text-[var(--color-tinta-60)]">
                {paso.d}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* 6 · Comparativa honesta */}
      <section className="border-y border-[var(--color-borde)] bg-white">
        <div className="mx-auto w-full max-w-[720px] px-5 py-16">
          <h2 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">
            ¿Y por qué no Linktree?
          </h2>
          <p className="mt-3 text-[15.5px] leading-[1.55] text-[var(--color-tinta-60)]">
            Linktree lleva diez años y tiene muchas más plantillas e integraciones que nosotros.
            Esto es lo que sí hacemos distinto.
          </p>

          <div className="mt-7 overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse text-[14.5px]">
              <thead>
                <tr className="border-b-2 border-[var(--color-borde)] text-left">
                  <th className="py-2.5 font-medium text-[var(--color-tinta-40)]"> </th>
                  <th className="py-2.5 font-bold">TUENLACE</th>
                  <th className="py-2.5 font-medium text-[var(--color-tinta-60)]">Linktree</th>
                </tr>
              </thead>
              <tbody>
                {FILAS_COMPARATIVA.map((f) => (
                  <tr key={f[0]} className="border-b border-[var(--color-borde-suave)]">
                    <td className="py-2.5 pr-3 text-[var(--color-tinta-80)]">{f[0]}</td>
                    <td className="py-2.5 font-medium">{f[1]}</td>
                    <td className="py-2.5 text-[var(--color-tinta-60)]">{f[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 9 · Precios */}
      <section className="mx-auto w-full max-w-[980px] px-5 py-16">
        <h2 className="text-center text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">
          Precios claros, en euros
        </h2>
        <p className="mt-2.5 text-center text-[15px] text-[var(--color-tinta-60)]">
          Con factura española. Cancelas cuando quieras, en un clic.
        </p>

        <div className="mt-9 grid gap-4 sm:grid-cols-3">
          {PLANES.map((plan) => (
            <div
              key={plan.nombre}
              className={`rounded-[14px] border-2 bg-white p-6 ${
                plan.destacado ? 'border-[var(--color-acento)]' : 'border-[var(--color-borde)]'
              }`}
            >
              {plan.destacado && (
                <span className="mb-3 inline-block rounded-full bg-[var(--color-acento)] px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide text-white">
                  El más elegido
                </span>
              )}
              <h3 className="text-[17px] font-bold">{plan.nombre}</h3>
              <p className="mt-2.5">
                <span className="text-[30px] font-bold tracking-[-0.02em]">{plan.precio}</span>
                {plan.periodo && (
                  <span className="ml-1 text-[14px] text-[var(--color-tinta-40)]">{plan.periodo}</span>
                )}
              </p>
              {plan.nota && (
                <p className="mt-1 text-[13px] text-[var(--color-tinta-40)]">{plan.nota}</p>
              )}
              <ul className="mt-5 flex flex-col gap-2 text-[14.5px]">
                {plan.incluye.map((linea) => (
                  <li key={linea} className="flex gap-2">
                    <span className="text-[var(--color-exito)]">✓</span>
                    <span className="text-[var(--color-tinta-80)]">{linea}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-7 text-center text-[14.5px] text-[var(--color-tinta-60)]">
          ¿Gestionas clientes?{' '}
          <Link href="/agencias" className="font-semibold text-[var(--color-azul)]">
            Mira el plan para agencias
          </Link>
        </p>
      </section>

      {/* 13 · CTA final */}
      <section className="border-t border-[var(--color-borde)] bg-[var(--color-tinta)] px-5 py-16 text-center text-[var(--color-papel)]">
        <h2 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">
          Tu enlace, listo en cinco minutos
        </h2>
        <Link
          href="/crear"
          className="mt-7 inline-block rounded-[12px] bg-[var(--color-acento)] px-8 py-4 text-[16.5px] font-semibold text-white no-underline"
        >
          Crear mi enlace gratis
        </Link>
      </section>

      <footer className="mx-auto w-full max-w-[1080px] px-5 py-9 text-[13px] text-[var(--color-tinta-40)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} TUENLACE</span>
          <nav className="flex flex-wrap gap-5">
            <Link href="/legal/aviso-legal">Aviso legal</Link>
            <Link href="/legal/privacidad">Privacidad</Link>
            <Link href="/legal/cookies">Cookies</Link>
            <Link href="/agencias">Agencias</Link>
          </nav>
        </div>
      </footer>
    </>
  )
}

/**
 * Comparativa honesta. Las tres últimas filas son las que hacen creíbles a
 * las anteriores: una tabla donde ganas en todo no la cree nadie.
 */
const FILAS_COMPARATIVA: Array<[string, string, string]> = [
  ['Plan sin nuestra marca', '4,92 €/mes', '~13 €/mes'],
  ['WhatsApp con mensaje preparado', '✓', '—'],
  ['Sabes de qué red viene cada cliente', '✓', 'Solo en planes altos'],
  ['Reseñas de Google en tu página', '✓', '—'],
  ['Aviso de cookies incluido', '✓', '—'],
  ['Factura española con IVA', '✓', '—'],
  ['Soporte en español', '✓', '—'],
  ['Píxel de Meta', '✓', '✓ (plan de pago)'],
  ['Plantillas', '6 sectores', 'Muchas más ✓'],
  ['Integraciones', 'Empezando', 'Muchas más ✓'],
  ['Años en el mercado', '2026', '2016 ✓'],
]

const PLANES = [
  {
    nombre: 'Gratis',
    precio: '0 €',
    periodo: '',
    nota: 'Para siempre',
    destacado: false,
    incluye: [
      'Tu página en tuenlace.es/tunombre',
      'Hasta 10 bloques',
      'Código QR',
      '7 días de estadísticas',
    ],
  },
  {
    nombre: 'Esencial',
    precio: '4,92 €',
    periodo: '/mes',
    nota: '59 € al año · 6,99 € si pagas mes a mes',
    destacado: true,
    incluye: [
      'Sin nuestra marca',
      'Bloques ilimitados',
      '12 meses de estadísticas',
      'Formulario para recoger datos',
      'Reseñas de Google',
      'Píxel de Meta y Google Analytics',
    ],
  },
  {
    nombre: 'Negocio',
    precio: '10,75 €',
    periodo: '/mes',
    nota: '129 € al año · 14,99 € mes a mes',
    destacado: false,
    incluye: [
      'Todo lo de Esencial',
      'Hasta 3 páginas',
      'Medición real de tus anuncios',
      'Reservas y reseñas de Google',
      'Botón distinto según de dónde vengan',
      'Exportar tus contactos',
    ],
  },
]
