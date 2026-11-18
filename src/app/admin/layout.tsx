import type { Metadata } from 'next'
import Link from 'next/link'
import { eq, sql } from 'drizzle-orm'
import { db, reports } from '@/db'
import { Marca } from '@/iconos'
import { exigirSuperadmin } from '@/lib/admin'
import { NavAdmin } from './NavAdmin'

export const metadata: Metadata = {
  title: { default: 'Superadmin', template: '%s · Superadmin' },
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const admin = await exigirSuperadmin()
  const [abiertas] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reports)
    .where(eq(reports.estado, 'ABIERTA'))

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-[var(--color-borde)] bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" aria-label="Superadmin">
              <Marca alto={20} />
            </Link>
            <span className="rounded-full bg-[var(--color-tinta)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              Superadmin
            </span>
          </div>
          <NavAdmin denuncias={abiertas?.n ?? 0} />
          <div className="ml-auto flex items-center gap-3 text-[13px] text-[var(--color-tinta-60)]">
            <span className="hidden sm:inline">{admin.email}</span>
            <Link href="/panel" className="font-semibold text-[var(--color-tinta)] no-underline">
              Mi panel
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] px-5 py-7">{children}</main>
    </div>
  )
}
