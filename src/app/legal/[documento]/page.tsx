import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

/**
 * Páginas legales.
 *
 * DELIBERADAMENTE VACÍAS DE TEXTO LEGAL.
 *
 * No soy abogado y no voy a poner aquí texto legal inventado que después
 * acabe publicado en producción. Un aviso legal genérico copiado de una
 * plantilla es peor que no tener ninguno: da falsa seguridad.
 *
 * Estas páginas son la estructura y las rutas, ya enlazadas desde el pie y
 * desde el banner de consentimiento. El contenido lo redacta el abogado, con
 * los datos reales de la sociedad, y se pega aquí.
 *
 * Qué hay que cubrir, como mínimo, para operar en España:
 *   · Aviso legal (LSSI-CE): titular, NIF, domicilio, contacto, registro
 *   · Política de privacidad (RGPD + LOPDGDD): responsable, finalidades,
 *     base jurídica, plazos, destinatarios, transferencias internacionales
 *     (Cloudflare, Railway, Stripe, Resend son estadounidenses), derechos
 *   · Política de cookies: las propias y las de terceros que active el usuario
 *   · Condiciones del servicio: planes, pagos, cancelación, uso aceptable,
 *     suspensión por abuso, responsabilidad sobre el contenido del usuario
 */

const DOCUMENTOS: Record<string, { titulo: string; descripcion: string }> = {
  'aviso-legal': {
    titulo: 'Aviso legal',
    descripcion: 'Titular del sitio e información exigida por la LSSI-CE.',
  },
  privacidad: {
    titulo: 'Política de privacidad',
    descripcion: 'Qué datos tratamos, para qué y qué derechos tienes.',
  },
  cookies: {
    titulo: 'Política de cookies',
    descripcion: 'Qué cookies usamos y cómo gestionarlas.',
  },
  condiciones: {
    titulo: 'Condiciones del servicio',
    descripcion: 'Reglas de uso, planes y cancelación.',
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ documento: string }>
}): Promise<Metadata> {
  const { documento } = await params
  const doc = DOCUMENTOS[documento]
  if (!doc) return { title: 'No encontrado' }
  return { title: doc.titulo, description: doc.descripcion }
}

export function generateStaticParams() {
  return Object.keys(DOCUMENTOS).map((documento) => ({ documento }))
}

export default async function PaginaLegal({
  params,
}: {
  params: Promise<{ documento: string }>
}) {
  const { documento } = await params
  const doc = DOCUMENTOS[documento]
  if (!doc) notFound()

  return (
    <main className="mx-auto w-full max-w-[680px] px-5 py-12">
      <Link href="/" className="text-[14px] font-medium text-[var(--color-tinta-40)] no-underline">
        ← TUENLACE
      </Link>

      <h1 className="mt-7 text-[30px] font-bold leading-tight tracking-[-0.02em]">{doc.titulo}</h1>
      <p className="mt-2.5 text-[16px] text-[var(--color-tinta-60)]">{doc.descripcion}</p>

      <div className="mt-8 rounded-[14px] border-2 border-dashed border-[var(--color-borde)] bg-white p-6">
        <p className="text-[15px] font-semibold">Pendiente de redacción legal</p>
        <p className="mt-2 text-[14.5px] leading-[1.6] text-[var(--color-tinta-60)]">
          Este texto lo tiene que redactar un abogado con los datos reales de la sociedad. No
          publiques TUENLACE sin él: operar en España sin aviso legal ni política de privacidad
          conformes es una infracción, y una plantilla genérica copiada de internet da falsa
          seguridad sin cubrir nada.
        </p>
      </div>
    </main>
  )
}
