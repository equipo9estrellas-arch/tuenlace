import type { Viewport } from 'next'
import Link from 'next/link'
import { PLANES, PLANES_A_LA_VENTA, precioEnEuros } from '@/lib/planes'
import { ETAPAS } from '@/lib/crm-etapas'
import { Lujo, Marquesina } from './_lujo/Marco'
import { Hero } from './_lujo/Hero'
import { Palabras } from './_lujo/Palabras'

export const viewport: Viewport = { themeColor: '#0b0a09' }

/**
 * Home para negocios. Diseño en docs/DESIGN-web.md.
 *
 * REGLA: todo lo que dice esta página existe hoy en el código. Ni
 * testimonios, ni logos de clientes, ni cifras de uso: todavía no hay datos
 * reales que enseñar. Los precios salen de PLANES.
 */
export default function Home() {
  return (
    <Lujo otroPublico={{ href: '/agencias', texto: 'Para agencias' }}>
      {/* 1 · Hero */}
      <section className="l-envoltura relative pb-[var(--l-seccion)] pt-10 lg:pt-16">
        <Hero nota="15 días gratis con todo incluido. Sin tarjeta y sin instalar nada." />
      </section>

      {/* 2 · El problema, a sangre completa */}
      <section className="relative border-y border-[var(--l-linea)] bg-[var(--l-elevado)]">
        <div className="l-envoltura l-seccion">
          <p className="l-kicker" data-r>
            Lo que pasa hoy
          </p>
          <h2 className="l-display mt-8 max-w-[14ch] text-[clamp(3rem,9vw,7.6rem)]" data-r="palabras">
            <Palabras texto="Te encuentran. Y se van." cursiva={['van']} />
          </h2>
          <div className="mt-14 grid gap-10 md:grid-cols-[1fr_1fr] md:gap-20">
            <p className="text-[18px] leading-[1.65] text-[var(--l-tenue)]" data-r>
              Alguien ve tu reel, entra en tu perfil y le interesa. Pero no encuentra tu teléfono, no
              sabe si abres el domingo ni cómo pedir cita.
            </p>
            <p className="text-[18px] leading-[1.65]" data-r style={{ ['--d' as string]: '0.12s' }}>
              Se va, y tú nunca te enteras de que estuvo ahí. TUENLACE convierte esa visita en un
              mensaje, una cita o una llamada, y te dice de qué red vino.
            </p>
          </div>
        </div>
        <div className="border-t border-[var(--l-linea)]">
          <Marquesina items={['Instagram', 'TikTok', 'El QR del escaparate', 'Google', 'Facebook', 'Tu tarjeta', 'YouTube']} />
        </div>
      </section>

      {/* 3 · Cómo funciona: listado editorial, no tarjetas */}
      <section className="l-envoltura l-seccion">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="l-kicker" data-r>
              Cómo funciona
            </p>
            <h2 className="l-display mt-6 text-[clamp(2.2rem,4.8vw,3.9rem)]" data-r="palabras">
              <Palabras texto="Tres pasos. Cinco minutos." cursiva={['Cinco']} />
            </h2>
          </div>
          <ol className="flex flex-col">
            {PASOS.map((paso, i) => (
              <li
                key={paso.t}
                className="grid grid-cols-[4.5rem_1fr] gap-4 border-t border-[var(--l-linea)] py-9 last:border-b"
                data-r
                style={{ ['--d' as string]: `${i * 0.1}s` }}
              >
                <span className="l-display text-[2.2rem] text-[var(--l-brasa)]">0{i + 1}</span>
                <div>
                  <h3 className="text-[21px] font-semibold tracking-[-0.02em]">{paso.t}</h3>
                  <p className="mt-2 max-w-[32rem] text-[16px] leading-[1.6] text-[var(--l-tenue)]">{paso.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4 · Qué tiene: bento de tamaños desiguales */}
      <section className="l-envoltura pb-[var(--l-seccion)]">
        <p className="l-kicker" data-r>
          Qué tiene
        </p>
        <h2 className="l-display mt-6 max-w-[18ch] text-[clamp(2.2rem,4.8vw,3.9rem)]" data-r="palabras">
          <Palabras texto="No es una lista de enlaces. Es tu mostrador." cursiva={['mostrador']} />
        </h2>

        <div className="mt-14 grid gap-4 md:grid-cols-6">
          {/* WhatsApp: grande */}
          <article className="l-celda p-8 md:col-span-4 md:row-span-2 md:p-10" data-r>
            <p className="l-kicker">WhatsApp</p>
            <h3 className="l-display mt-5 max-w-[16ch] text-[clamp(1.8rem,3.2vw,2.6rem)]">
              Se abre con el mensaje <em>ya escrito.</em>
            </h3>
            <p className="mt-5 max-w-[30rem] text-[16px] leading-[1.6] text-[var(--l-tenue)]">
              El cliente solo pulsa enviar. Y el mensaje dice de dónde viene, así que sabes si lo trajo
              Instagram o el QR del escaparate sin preguntar.
            </p>
            <div className="mt-10 flex max-w-[22rem] flex-col gap-2.5" aria-hidden>
              <span className="self-end rounded-[18px] rounded-br-[6px] bg-[#1f6e45] px-4 py-3 text-[14px] leading-snug text-[#eafff2]">
                Hola, os escribo desde Instagram. ¿Tenéis hueco el sábado?
              </span>
              <span className="self-end text-[11px] text-[var(--l-tenue)]">Mensaje preparado por tu página</span>
            </div>
          </article>

          {/* CRM: alta */}
          <article className="l-celda p-8 md:col-span-2 md:row-span-2" data-r style={{ ['--d' as string]: '0.1s' }}>
            <p className="l-kicker">Mini CRM</p>
            <h3 className="mt-5 text-[22px] font-semibold leading-tight tracking-[-0.02em]">
              De contacto a cliente, y cuánto te pagó.
            </h3>
            <p className="mt-3 text-[15px] leading-[1.6] text-[var(--l-tenue)]">
              Quien escribe en tu formulario entra en tu panel. Lo mueves por etapas y ves cuánto
              dinero te trae cada red.
            </p>
            <ol className="mt-8 flex flex-col gap-2" aria-label="Etapas del pipeline">
              {ETAPAS.filter((e) => e.clave !== 'PERDIDO').map((e, i) => (
                <li
                  key={e.clave}
                  className="flex items-center gap-3 rounded-[14px] border border-[var(--l-linea)] px-4 py-3 text-[14px]"
                  style={{ marginLeft: `${i * 10}px` }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                  {e.nombre}
                </li>
              ))}
            </ol>
          </article>

          {CELDAS.map((c, i) => (
            <article
              key={c.titulo}
              className={`l-celda p-7 ${c.ancho}`}
              data-r
              style={{ ['--d' as string]: `${(i % 3) * 0.08}s` }}
            >
              <p className="l-kicker">{c.kicker}</p>
              <h3 className="mt-4 text-[19px] font-semibold leading-snug tracking-[-0.015em]">{c.titulo}</h3>
              <p className="mt-2.5 text-[14.5px] leading-[1.6] text-[var(--l-tenue)]">{c.texto}</p>
            </article>
          ))}
        </div>

        <p className="mt-10 max-w-[40rem] text-[14px] leading-[1.6] text-[var(--l-tenue)]" data-r>
          Lo que todavía no tenemos: catálogo de integraciones, tienda de productos digitales ni diez
          años de plantillas. Estamos empezando y preferimos decirlo.
        </p>
      </section>

      {/* 5 · Precios */}
      <section className="border-t border-[var(--l-linea)] bg-[var(--l-elevado)]">
        <div className="l-envoltura l-seccion">
          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="l-kicker" data-r>
                Precios
              </p>
              <h2 className="l-display mt-6 text-[clamp(2.2rem,4.8vw,3.9rem)]" data-r="palabras">
                <Palabras texto="Claros, en euros y sin permanencia." cursiva={['euros']} />
              </h2>
              <p className="mt-6 max-w-[26rem] text-[16px] leading-[1.6] text-[var(--l-tenue)]" data-r>
                Pruébalo 15 días gratis, sin tarjeta. Después, precio mensual más IGIC, con factura
                española. Cancelas en un clic.
              </p>
            </div>
            <div className="flex flex-col">
              {PLANES_A_LA_VENTA.map((plan, i) => (
                <div
                  key={plan.clave}
                  className="l-precio grid gap-6 py-10 last:border-b last:border-[var(--l-linea)] md:grid-cols-[1fr_auto]"
                  data-r
                  style={{ ['--d' as string]: `${i * 0.1}s` }}
                >
                  <div>
                    <h3 className="text-[22px] font-semibold tracking-[-0.02em]">{plan.nombre}</h3>
                    <p className="mt-2 max-w-[28rem] text-[15px] leading-[1.6] text-[var(--l-tenue)]">{plan.paraQuien}</p>
                    <ul className="mt-5 flex flex-col gap-1.5 text-[14.5px]">
                      {plan.incluye.slice(0, plan.clave === 'ESENCIAL' ? 6 : 4).map((linea) => (
                        <li key={linea} className="flex gap-3">
                          <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-[var(--l-brasa)]" />
                          <span>{linea}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col items-start gap-5 md:items-end md:text-right">
                    <p>
                      <span className="l-display text-[3.4rem] leading-none">{precioEnEuros(plan.precioMensualCentimos)}</span>
                      <span className="mt-2 block text-[13px] text-[var(--l-tenue)]">+ IGIC al mes</span>
                    </p>
                    <Link
                      href={plan.clave === 'AGENCIA' ? '/agencias' : '/crear'}
                      className={`l-boton ${plan.clave === 'ESENCIAL' ? 'l-boton-principal' : 'l-boton-secundario'}`}
                    >
                      {plan.clave === 'AGENCIA' ? 'Ver el plan Agencia' : 'Probar 15 días gratis'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6 · Cierre */}
      <section className="relative overflow-hidden">
        <div className="l-glow left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2" aria-hidden />
        <div className="l-envoltura l-seccion relative text-center">
          <h2 className="l-display mx-auto max-w-[12ch] text-[clamp(2.8rem,8vw,6.8rem)]" data-r="palabras">
            <Palabras texto="Tu enlace, listo en cinco minutos." cursiva={['cinco']} />
          </h2>
          <div className="mt-12 flex flex-wrap justify-center gap-3" data-r>
            <Link href="/crear" className="l-boton l-boton-principal">
              Pruébalo 15 días gratis <span aria-hidden>→</span>
            </Link>
            <Link href="/agencias" className="l-boton l-boton-secundario">
              Llevo varios negocios
            </Link>
          </div>
          <p className="mt-5 text-[13px] text-[var(--l-tenue)]" data-r>
            Desde {precioEnEuros(PLANES.ESENCIAL.precioMensualCentimos)} + IGIC al mes después de la prueba.
          </p>
        </div>
      </section>
    </Lujo>
  )
}

const PASOS = [
  { t: 'Nos cuentas qué haces y qué quieres conseguir', d: 'Seis preguntas sobre tu negocio. Sin formularios interminables.' },
  { t: 'Te montamos la página', d: 'Con el botón que más te interesa arriba y todo en el orden correcto, no en una lista.' },
  { t: 'La pones en tu bio', d: 'Y empiezas a ver quién entra, de dónde viene y qué pulsa.' },
]

/**
 * REGLA DE ESTA LISTA: solo entra lo que está construido y funcionando hoy.
 * Antes de añadir una celda: búscala en el código.
 */
const CELDAS = [
  {
    kicker: 'Origen',
    titulo: 'Sabes por dónde llegan, sin cookies',
    texto: 'Instagram, TikTok, Google, el QR o tu tarjeta. Medición propia y anónima: no hace falta consentimiento para contar visitas.',
    ancho: 'md:col-span-3',
  },
  {
    kicker: 'Horario',
    titulo: '«Abierto ahora», solo',
    texto: 'Pones tu horario una vez y la página dice si estás abierto y a qué hora cierras. Con la hora de Canarias si estás en las islas.',
    ancho: 'md:col-span-3',
  },
  {
    kicker: 'Diseño',
    titulo: 'Que se parezca a tu negocio',
    texto: 'Tus colores, fondo con foto, degradado o patrón, fuentes, botones y cabecera. Y vídeo, galería y preguntas frecuentes.',
    ancho: 'md:col-span-2',
  },
  {
    kicker: 'Publicidad',
    titulo: 'Píxel de Meta y Analytics, con las cookies resueltas',
    texto: 'Pegas tus IDs y listo. El aviso de cookies viene hecho para la normativa española.',
    ancho: 'md:col-span-2',
  },
  {
    kicker: 'Escaparate',
    titulo: 'QR con tus colores y tu logo',
    texto: 'En PNG, listo para imprimir. Mismo enlace, y sus visitas se cuentan aparte.',
    ancho: 'md:col-span-2',
  },
]
