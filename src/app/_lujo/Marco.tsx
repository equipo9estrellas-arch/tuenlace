import Link from 'next/link'
import { Marca } from '@/iconos'
import { CONTACTO } from '@/lib/legal'
import { FocoCeldas, Revelar } from './Revelar'

/** Envoltorio de la web pública premium: fondo, grano, reveals, cabecera y pie. */
export function Lujo({
  children,
  otroPublico,
}: {
  children: React.ReactNode
  /** El enlace al otro público: negocios ↔ agencias. */
  otroPublico: { href: string; texto: string }
}) {
  return (
    <div className="lujo l-anima">
      <noscript>
        <style>{`.l-anima [data-r],.l-anima [data-r] .l-palabra>span{opacity:1!important;transform:none!important}`}</style>
      </noscript>
      <Revelar />
      <FocoCeldas />

      <header className="l-envoltura relative z-10 flex items-center justify-between py-6">
        <Link href="/" aria-label="tuenlace.es, ir al inicio">
          <Marca alto={24} claro />
        </Link>
        <nav className="flex items-center gap-6 text-[14px]">
          <Link href={otroPublico.href} className="hidden text-[var(--l-tenue)] no-underline transition-colors hover:text-[var(--l-hueso)] sm:inline">
            {otroPublico.texto}
          </Link>
          <Link href="/entrar" className="text-[var(--l-tenue)] no-underline transition-colors hover:text-[var(--l-hueso)]">
            Entrar
          </Link>
          <Link href="/crear" className="l-boton l-boton-secundario !h-10 !px-5 !text-[14px]">
            Empezar
          </Link>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[var(--l-linea)]">
        <div className="l-envoltura flex flex-col gap-8 py-12 text-[13px] text-[var(--l-tenue)] md:flex-row md:items-end md:justify-between">
          <div>
            <Marca alto={20} claro />
            <p className="mt-4 max-w-[22rem] leading-[1.6]">
              TUENLACE es un servicio de{' '}
              <a href={CONTACTO.webAgencia} className="underline decoration-[var(--l-linea)] underline-offset-4">
                {CONTACTO.nombreComercial}
              </a>
              , desde Canarias.{' '}
              <a href={`mailto:${CONTACTO.email}`} className="underline decoration-[var(--l-linea)] underline-offset-4">
                {CONTACTO.email}
              </a>
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href={otroPublico.href} className="no-underline hover:text-[var(--l-hueso)]">{otroPublico.texto}</Link>
            <Link href="/legal/aviso-legal" className="no-underline hover:text-[var(--l-hueso)]">Aviso legal</Link>
            <Link href="/legal/privacidad" className="no-underline hover:text-[var(--l-hueso)]">Privacidad</Link>
            <Link href="/legal/cookies" className="no-underline hover:text-[var(--l-hueso)]">Cookies</Link>
            <Link href="/legal/condiciones" className="no-underline hover:text-[var(--l-hueso)]">Condiciones</Link>
            <span>© {new Date().getFullYear()}</span>
          </nav>
        </div>
      </footer>
    </div>
  )
}

/** La marquesina de canales. Son los orígenes que la analítica reconoce de verdad. */
export function Marquesina({ items }: { items: string[] }) {
  const pista = (oculta: boolean) => (
    <div className="l-marquesina-pista" aria-hidden={oculta || undefined}>
      {items.map((t) => (
        <span key={t} className="l-display flex items-center gap-14 whitespace-nowrap text-[clamp(2rem,4.6vw,3.6rem)]">
          {t}
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--l-brasa)]" />
        </span>
      ))}
    </div>
  )
  return (
    <div className="l-marquesina py-6">
      {pista(false)}
      {pista(true)}
    </div>
  )
}
