import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ACTUALIZADO, CONTACTO, DOCUMENTOS } from '@/lib/legal'

/**
 * Páginas legales. El texto y los datos del titular viven en src/lib/legal.ts
 * (TUENLACE es un servicio de Agencia 9 Estrellas y usa sus datos).
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ documento: string }>
}): Promise<Metadata> {
  const { documento } = await params
  const doc = DOCUMENTOS[documento]
  if (!doc) return { title: 'No encontrado' }
  return { title: doc.titulo, description: doc.descripcion, robots: { index: false, follow: true } }
}

export function generateStaticParams() {
  return Object.keys(DOCUMENTOS).map((documento) => ({ documento }))
}

const NOMBRES: Record<string, string> = {
  'aviso-legal': 'Aviso legal',
  privacidad: 'Privacidad',
  cookies: 'Cookies',
  condiciones: 'Condiciones',
}

export default async function PaginaLegal({ params }: { params: Promise<{ documento: string }> }) {
  const { documento } = await params
  const doc = DOCUMENTOS[documento]
  if (!doc) notFound()

  return (
    <main className="mx-auto w-full max-w-[720px] px-5 py-12">
      <Link href="/" className="text-[14px] font-medium text-[var(--color-tinta-40)] no-underline">
        ← TUENLACE
      </Link>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Textos legales">
        {Object.entries(NOMBRES).map(([clave, nombre]) => (
          <Link
            key={clave}
            href={`/legal/${clave}`}
            aria-current={clave === documento ? 'page' : undefined}
            className={`rounded-full px-3 py-1.5 text-[13px] font-semibold no-underline ${
              clave === documento
                ? 'bg-[var(--color-tinta)] text-white'
                : 'border border-[var(--color-borde)] bg-white text-[var(--color-tinta-60)]'
            }`}
          >
            {nombre}
          </Link>
        ))}
      </nav>

      <h1 className="mt-7 text-[30px] font-bold leading-tight tracking-[-0.02em]">{doc.titulo}</h1>
      <p className="mt-2 text-[14px] text-[var(--color-tinta-40)]">Última actualización: {ACTUALIZADO}</p>

      <div className="mt-8 flex flex-col gap-7">
        {doc.bloques.map((b, i) => (
          <section key={i}>
            {b.titulo && <h2 className="text-[18px] font-bold tracking-[-0.01em]">{b.titulo}</h2>}
            {b.parrafos?.map((p, j) => (
              <p key={j} className="mt-2.5 text-[15.5px] leading-[1.65] text-[var(--color-tinta-80)]">
                {p}
              </p>
            ))}
            {b.lista && (
              <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-5 text-[15.5px] leading-[1.6] text-[var(--color-tinta-80)]">
                {b.lista.map((l, j) => (
                  <li key={j}>{l}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-[var(--color-borde)] pt-6 text-[14px] text-[var(--color-tinta-60)]">
        ¿Dudas? Escríbenos a{' '}
        <a href={`mailto:${CONTACTO.email}`} className="font-semibold text-[var(--color-azul)]">
          {CONTACTO.email}
        </a>{' '}
        o llama al {CONTACTO.telefono}.
      </p>
    </main>
  )
}
