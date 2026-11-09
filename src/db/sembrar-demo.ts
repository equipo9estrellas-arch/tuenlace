/**
 * Datos de muestra para ver el panel con algo dentro.
 *
 * Solo para desarrollo local. No se despliega y no se llama desde ningún sitio
 * del producto: se ejecuta a mano con `node --env-file=.env ...`.
 */
import { eq } from 'drizzle-orm'
import {
  blockClicks,
  blocks,
  conversions,
  db,
  memberships,
  organizations,
  pageViews,
  pages,
  pool,
  users,
} from '@/db'

const ORIGENES = ['instagram', 'instagram', 'instagram', 'directo', 'tiktok', 'google', 'qr']
const DISPOSITIVOS = ['movil', 'movil', 'movil', 'movil', 'escritorio', 'tablet']

async function main() {
  const correo = 'demo@ejemplo.test'
  const slug = 'barberia-demo'

  // Limpieza: el seed se vuelve a lanzar muchas veces.
  const viejas = await db.select().from(pages).where(eq(pages.slug, slug))
  for (const p of viejas) await db.delete(pages).where(eq(pages.id, p.id))
  const viejosUsuarios = await db.select().from(users).where(eq(users.email, correo))
  for (const u of viejosUsuarios) await db.delete(users).where(eq(users.id, u.id))

  const [org] = await db
    .insert(organizations)
    .values({ nombre: 'Barbería Demo', tipo: 'PERSONAL', plan: 'ESENCIAL' })
    .returning()
  const [usuario] = await db
    .insert(users)
    .values({ email: correo, nombre: 'Demo', emailVerificadoEn: new Date() })
    .returning()
  await db.insert(memberships).values({ userId: usuario.id, orgId: org.id, rol: 'PROPIETARIO' })

  const [pagina] = await db
    .insert(pages)
    .values({
      orgId: org.id,
      slug,
      estado: 'PUBLICADA',
      titulo: 'Barbería Demo',
      descripcion: 'Cortes y afeitado clásico en Santa Cruz. Sin cita, pero mejor con ella.',
      categoria: 'local',
      objetivos: ['whatsapp', 'cita', 'ubicacion'],
      publicadaEn: new Date(Date.now() - 60 * 86_400_000),
    })
    .returning()

  const creados = await db
    .insert(blocks)
    .values([
      {
        pageId: pagina.id,
        tipo: 'TEXTO',
        orden: 0,
        prioridad: 3,
        activo: true,
        config: { esCabecera: true, titulo: 'Barbería Demo', texto: 'Cortes y afeitado clásico.' },
      },
      {
        pageId: pagina.id,
        tipo: 'WHATSAPP',
        orden: 1,
        prioridad: 1,
        activo: true,
        config: { texto: 'Pide cita por WhatsApp', telefono: '34600000000', mensaje: 'Hola' },
      },
      {
        pageId: pagina.id,
        tipo: 'ENLACE',
        orden: 2,
        prioridad: 2,
        activo: true,
        config: { texto: 'Ver precios', url: 'https://ejemplo.test/precios' },
      },
      {
        pageId: pagina.id,
        tipo: 'UBICACION',
        orden: 3,
        prioridad: 2,
        activo: true,
        config: { texto: 'Cómo llegar', direccion: 'Calle Castillo 10, Santa Cruz' },
      },
    ])
    .returning()

  const conversion = creados.find((b) => b.tipo === 'WHATSAPP')!
  const visitas: (typeof pageViews.$inferInsert)[] = []
  const clics: (typeof blockClicks.$inferInsert)[] = []
  const contactos: (typeof conversions.$inferInsert)[] = []

  // 60 días con una tendencia al alza y el bajón del fin de semana, para que
  // la gráfica tenga forma de algo y no de ruido plano.
  for (let d = 59; d >= 0; d--) {
    const fecha = new Date(Date.now() - d * 86_400_000)
    const finde = [0, 6].includes(fecha.getDay())
    const base = 6 + Math.round((59 - d) * 0.45)
    const cuantas = Math.max(1, Math.round(base * (finde ? 0.45 : 1) + (d % 5) - 2))

    for (let i = 0; i < cuantas; i++) {
      const ts = new Date(fecha.getTime() - Math.random() * 20 * 3_600_000)
      visitas.push({
        pageId: pagina.id,
        ts,
        origen: ORIGENES[Math.floor(Math.random() * ORIGENES.length)],
        dispositivo: DISPOSITIVOS[Math.floor(Math.random() * DISPOSITIVOS.length)],
        // Una de cada tres visitas es alguien que vuelve: si cada visita
        // fuese una sesión nueva, "personas distintas" saldría igual que
        // "visitas" y la métrica no diría nada.
        sessionHash: `demo-${d}-${Math.floor(i / 1.5)}`,
      })

      if (Math.random() < 0.34) {
        const bloque = creados[1 + Math.floor(Math.random() * 3)]
        clics.push({
          pageId: pagina.id,
          blockId: bloque.id,
          ts,
          origen: 'instagram',
          sessionHash: `demo-${d}-${i}`,
        })
        if (bloque.id === conversion.id && Math.random() < 0.45) {
          contactos.push({
            pageId: pagina.id,
            ts,
            tipo: 'CONTACTO',
            origen: 'instagram',
            eventId: `demo-${d}-${i}`,
          })
        }
      }
    }
  }

  await db.insert(pageViews).values(visitas)
  await db.insert(blockClicks).values(clics)
  await db.insert(conversions).values(contactos)

  console.log(
    `Listo: ${visitas.length} visitas, ${clics.length} clics y ${contactos.length} contactos en /${slug}`,
  )
  console.log(`Usuario: ${correo} · organización ${org.id} · plan ${org.plan}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
