import type { Metadata } from 'next'
import { normalizarSlug } from '@/lib/slug'
import { Onboarding } from './Onboarding'

export const metadata: Metadata = {
  title: 'Crea tu enlace',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function PaginaCrear({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}) {
  const { slug } = await searchParams
  // El campo del hero de la home trae el slug ya escrito: el usuario empieza
  // el onboarding antes de decidir registrarse.
  return <Onboarding slugInicial={slug ? normalizarSlug(slug) : ''} />
}
