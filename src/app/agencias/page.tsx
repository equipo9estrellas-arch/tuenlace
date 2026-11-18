import type { Metadata } from 'next'
import Link from 'next/link'
import { Marca } from '@/iconos'
import { PLANES, precioEnEuros } from '@/lib/planes'
import { CONTACTO } from '@/lib/legal'

const AGENCIA = PLANES.AGENCIA
const PRECIO = precioEnEuros(AGENCIA.precioMensualCentimos)
const POR_CLIENTE = precioEnEuros(Math.ceil(AGENCIA.precioMensualCentimos / AGENCIA.limites.paginas))

export const metadata: Metadata = {
  title: 'Para agencias',
  description: `Monta la página de hasta ${AGENCIA.limites.paginas} clientes desde un solo panel y cóbrasela al precio que tú decidas. ${PRECIO} al mes, IGIC incluido.`,
}

/**
 * Landing de agencias.
 *
 * Mensaje distinto al de la home: nunca mezclar los dos públicos en una
 * misma página. Todo lo que dice sale de PLANES.AGENCIA y tiene que existir:
 * mientras el plan no esté a la venta (disponible: false), el botón pide
 * acceso anticipado por correo en vez de mandar a darse de alta.
 */
export default function PaginaAgencias() {
  const aLaVenta = AGENCIA.disponible
  const cta = aLaVenta
    ? { href: '/crear', texto: 'Probar 15 días gratis' }
    : {
        href: `mailto:${CONTACTO.email}?subject=${encodeURIComponent('Acceso anticipado al plan Agencia de TUENLACE')}`,
        texto: 'Quiero acceso anticipado',
      }

  return (
    <>
      <header className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-5 py-5">
        <Link href="/" aria-label="tuenlace.es, ir al inicio">
          <Marca alto={26} />
        </Link>
        <nav className="flex items-center gap-5 text-[14.5px]">
          <Link href="/" className="font-medium text-[var(--color-tinta-60)] hover:text-[var(--color-tinta)]">
            Para negocios
          </Link>
          <Link href="/entrar" className="font-medium text-[var(--color-tinta-60)] hover:text-[var(--color-tinta)]">
            Entrar
          </Link>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-[720px] px-5 pb-14 pt-10 text-center sm:pt-16">
        <span className="inline-block rounded-full border border-[var(--color-borde)] bg-white px-3 py-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-[var(--color-tinta-60)]">
          Para agencias y freelances
        </span>
        <h1 className="mt-5 text-[34px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[44px]">
          Las páginas de tus clientes,
          <br className="hidden sm:block" /> en un solo panel.
        </h1>
        <p className="mx-auto mt-5 max-w-[34rem] text-[17px] leading-[1.55] text-[var(--color-tinta-60)]">
          Monta hasta {AGENCIA.limites.paginas} páginas, una por cliente, con WhatsApp, formulario,
          pipeline y píxel de Meta. Y cóbraselas al precio que tú decidas.
        </p>
        <a
          href={cta.href}
          className="mt-8 inline-block rounded-[12px] bg-[var(--color-tinta)] px-7 py-4 text-[16.5px] font-semibold text-white no-underline"
        >
          {cta.texto}
        </a>
        <p className="mt-3.5 text-[13.5px] text-[var(--color-tinta-40)]">
          {PRECIO} al mes, IGIC incluido. Con factura española.
          {aLaVenta
            ? ' Pruébalo 15 días gratis con tu primera página y activa Agencia cuando sumes las de tus clientes.'
            : ' Lo abrimos muy pronto.'}
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
            Cada página guarda quién escribe, desde qué canal y cuánto acaba pagando. Eso es lo que
            le enseñas.
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
            <strong>
              {PRECIO} al mes por hasta {AGENCIA.limites.paginas} clientes.
            </strong>{' '}
            Menos de <strong>{POR_CLIENTE} por cliente</strong>. Inclúyelo en tu cuota o cóbralo
            aparte al precio que quieras: el margen es tuyo.
          </p>
          <p className="mt-3 text-[14.5px] text-[var(--color-tinta-60)]">
            Sin permanencia y sin coste de alta. Las páginas llevan el sello «Creado con TUENLACE».
          </p>
        </div>

        <ul className="mx-auto mt-10 flex max-w-[560px] flex-col gap-2 text-[15px]">
          {AGENCIA.incluye.map((linea) => (
            <li key={linea} className="flex gap-2">
              <span className="shrink-0 text-[var(--color-exito)]">✓</span>
              <span className="text-[var(--color-tinta-80)]">{linea}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-[var(--color-borde)] bg-white px-5 py-12 text-center">
        <p className="text-[16px] text-[var(--color-tinta-60)]">¿Tienes un solo negocio?</p>
        <Link
          href="/"
          className="mt-3 inline-block rounded-[12px] border-2 border-[var(--color-borde)] px-6 py-3 text-[15.5px] font-semibold text-[var(--color-tinta)] no-underline"
        >
          Ver TUENLACE para negocios
        </Link>
      </section>

      <footer className="mx-auto flex w-full max-w-[1080px] flex-wrap justify-between gap-4 border-t border-[var(--color-borde)] px-5 py-8 text-[13px] text-[var(--color-tinta-40)]">
        <span>
          © {new Date().getFullYear()} TUENLACE, un servicio de {CONTACTO.nombreComercial}
        </span>
        <nav className="flex flex-wrap gap-5">
          <Link href="/legal/aviso-legal">Aviso legal</Link>
          <Link href="/legal/privacidad">Privacidad</Link>
          <Link href="/legal/cookies">Cookies</Link>
          <Link href="/legal/condiciones">Condiciones</Link>
        </nav>
      </footer>
    </>
  )
}

const VENTAJAS = [
  {
    titulo: 'Una página que convierte, por cliente',
    texto:
      'Todo lo de Esencial en cada una: WhatsApp con el mensaje escrito, formulario, horario, galería, vídeo y diseño a su medida.',
  },
  {
    titulo: 'Le demuestras lo que le trae',
    texto:
      'Contactos, clientes y euros por canal de cada página, por separado. Sabes si Instagram, el QR o TikTok le traen negocio.',
  },
  {
    titulo: 'El píxel, bien puesto',
    texto:
      'Píxel de Meta y Google Analytics en cada página, con el aviso de cookies ya resuelto para la normativa española.',
  },
]
