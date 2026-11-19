import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { PLANES, precioEnEuros } from '@/lib/planes'
import { CONTACTO } from '@/lib/legal'
import { Lujo, Marquesina } from '../_lujo/Marco'
import { Palabras } from '../_lujo/Palabras'

const AGENCIA = PLANES.AGENCIA
const PRECIO = precioEnEuros(AGENCIA.precioMensualCentimos)
const POR_CLIENTE = precioEnEuros(Math.ceil(AGENCIA.precioMensualCentimos / AGENCIA.limites.paginas))

export const metadata: Metadata = {
  title: 'Para agencias',
  description: `Monta la página de hasta ${AGENCIA.limites.paginas} clientes desde un solo panel y cóbrasela al precio que tú decidas. ${PRECIO} + IGIC al mes.`,
}

export const viewport: Viewport = { themeColor: '#0b0a09' }

/**
 * Landing de agencias. Mensaje distinto al de la home: nunca mezclar los dos
 * públicos. Todo lo que dice sale de PLANES.AGENCIA y existe en el código.
 * Diseño en docs/DESIGN-web.md.
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
    <Lujo otroPublico={{ href: '/', texto: 'Para negocios' }}>
      {/* 1 · Hero tipográfico */}
      <section className="l-envoltura relative pb-[var(--l-seccion)] pt-12 lg:pt-20">
        <div className="l-glow -left-56 top-10 h-[620px] w-[620px]" aria-hidden />
        <p className="l-kicker" data-r>
          Para agencias y freelances
        </p>
        <h1 className="l-display relative mt-7 max-w-[13ch] text-[clamp(3rem,9.5vw,7.6rem)]" data-r="palabras">
          <Palabras texto="Las páginas de tus clientes, en un solo panel." cursiva={['clientes']} />
        </h1>
        <div className="relative mt-12 grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <p className="max-w-[34rem] text-[18px] leading-[1.6] text-[var(--l-tenue)]" data-r>
            Monta hasta {AGENCIA.limites.paginas} páginas, una por cliente, con WhatsApp, formulario,
            pipeline y píxel de Meta. Y cóbraselas al precio que tú decidas.
          </p>
          <div data-r style={{ ['--d' as string]: '0.1s' }}>
            <a href={cta.href} className="l-boton l-boton-principal">
              {cta.texto} <span aria-hidden>→</span>
            </a>
            <p className="mt-3 text-[13px] text-[var(--l-tenue)]">
              {PRECIO} + IGIC al mes. Con factura española.
            </p>
          </div>
        </div>
      </section>

      {/* 2 · Las dos preguntas, a sangre completa */}
      <section className="border-y border-[var(--l-linea)] bg-[var(--l-elevado)]">
        <div className="l-envoltura l-seccion">
          <p className="l-kicker" data-r>
            Dos preguntas incómodas
          </p>
          <div className="mt-10 flex flex-col gap-10">
            <h2 className="l-display max-w-[20ch] text-[clamp(2.4rem,6.4vw,5.4rem)]" data-r="palabras">
              <Palabras texto="¿Dónde montas hoy la página de enlaces de tus clientes?" />
            </h2>
            <h2 className="l-display max-w-[20ch] text-[clamp(2.4rem,6.4vw,5.4rem)] text-[var(--l-tenue)]" data-r="palabras">
              <Palabras texto="¿Y cómo le demuestras que Instagram le trae negocio?" cursiva={['negocio']} />
            </h2>
          </div>
          <p className="mt-14 max-w-[36rem] text-[18px] leading-[1.65]" data-r>
            Cada página guarda quién escribe, desde qué canal y cuánto acaba pagando. Eso es lo que le
            enseñas en la reunión de cada mes.
          </p>
        </div>
        <div className="border-t border-[var(--l-linea)]">
          <Marquesina items={['Una cuenta', `${AGENCIA.limites.paginas} páginas`, 'Un solo panel', 'Sus contactos, por separado', 'Tu precio']} />
        </div>
      </section>

      {/* 3 · Ventajas, en bento */}
      <section className="l-envoltura l-seccion">
        <div className="grid gap-4 md:grid-cols-6">
          <article className="l-celda p-8 md:col-span-4 md:p-10" data-r>
            <p className="l-kicker">Por cliente</p>
            <h3 className="l-display mt-5 max-w-[18ch] text-[clamp(2rem,4vw,3.2rem)]">
              Una página que convierte, <em>para cada uno.</em>
            </h3>
            <p className="mt-5 max-w-[32rem] text-[16px] leading-[1.6] text-[var(--l-tenue)]">
              Todo lo de Esencial en cada página: WhatsApp con el mensaje escrito, formulario,
              horario, galería, vídeo y diseño a su medida.
            </p>
          </article>
          <article className="l-celda flex flex-col justify-between p-8 md:col-span-2" data-r style={{ ['--d' as string]: '0.1s' }}>
            <p className="l-kicker">Las cuentas</p>
            <p className="mt-6">
              <span className="l-display block text-[4.6rem] leading-none">{PRECIO}</span>
              <span className="mt-3 block text-[14px] text-[var(--l-tenue)]">
                + IGIC al mes por hasta {AGENCIA.limites.paginas} clientes. Menos de {POR_CLIENTE} por
                cliente.
              </span>
            </p>
          </article>
          <article className="l-celda p-8 md:col-span-3" data-r>
            <p className="l-kicker">Resultados</p>
            <h3 className="mt-4 text-[20px] font-semibold leading-snug tracking-[-0.015em]">Le demuestras lo que le trae</h3>
            <p className="mt-2.5 text-[15px] leading-[1.6] text-[var(--l-tenue)]">
              Contactos, clientes y euros por canal de cada página, por separado. Sabes si Instagram,
              el QR o TikTok le traen negocio.
            </p>
          </article>
          <article className="l-celda p-8 md:col-span-3" data-r style={{ ['--d' as string]: '0.08s' }}>
            <p className="l-kicker">Medición</p>
            <h3 className="mt-4 text-[20px] font-semibold leading-snug tracking-[-0.015em]">El píxel, bien puesto</h3>
            <p className="mt-2.5 text-[15px] leading-[1.6] text-[var(--l-tenue)]">
              Píxel de Meta y Google Analytics en cada página, con el aviso de cookies ya resuelto para
              la normativa española.
            </p>
          </article>
        </div>

        <div className="mt-20 grid gap-12 md:grid-cols-[0.8fr_1.2fr]">
          <h2 className="l-display text-[clamp(2.4rem,5vw,4rem)]" data-r="palabras">
            <Palabras texto="El margen es tuyo." cursiva={['tuyo']} />
          </h2>
          <div data-r>
            <ul className="flex flex-col">
              {AGENCIA.incluye.map((linea) => (
                <li key={linea} className="flex gap-4 border-t border-[var(--l-linea)] py-5 text-[16.5px] last:border-b">
                  <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--l-brasa)]" />
                  {linea}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[14px] leading-[1.6] text-[var(--l-tenue)]">
              Inclúyelo en tu cuota o cóbralo aparte. Sin permanencia y sin coste de alta. Las páginas
              llevan el sello «Creado con TUENLACE».
            </p>
          </div>
        </div>
      </section>

      {/* 4 · Cierre */}
      <section className="relative overflow-hidden border-t border-[var(--l-linea)]">
        <div className="l-glow left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2" aria-hidden />
        <div className="l-envoltura l-seccion relative text-center">
          <h2 className="l-display mx-auto max-w-[13ch] text-[clamp(3rem,9vw,7.5rem)]" data-r="palabras">
            <Palabras texto="Empieza con tu primer cliente." cursiva={['primer']} />
          </h2>
          <p className="mx-auto mt-8 max-w-[32rem] text-[16px] leading-[1.6] text-[var(--l-tenue)]" data-r>
            {aLaVenta
              ? 'Pruébalo 15 días gratis con tu primera página y activa Agencia cuando sumes las de tus clientes.'
              : 'Lo abrimos muy pronto.'}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3" data-r>
            <a href={cta.href} className="l-boton l-boton-principal">
              {cta.texto} <span aria-hidden>→</span>
            </a>
            <Link href="/" className="l-boton l-boton-secundario">
              Tengo un solo negocio
            </Link>
          </div>
        </div>
      </section>
    </Lujo>
  )
}
