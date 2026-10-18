import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const runtime = 'nodejs'
export const alt = 'tuenlace.es — Todo tu negocio, en un enlace'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Tarjeta de vista previa de la web comercial.
 *
 * No existía ninguna: compartir tuenlace.es por WhatsApp salía como un enlace
 * pelado, en un producto cuyo propio argumento es que la vista previa importa.
 */
export default async function Imagen() {
  const logo = await readFile(join(process.cwd(), 'public/marca/tuenlace.png'))
  const src = `data:image/png;base64,${logo.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#FAF8F5',
          padding: '90px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={520} height={102} />
        <div
          style={{
            marginTop: 54,
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: '#14120F',
            lineHeight: 1.1,
          }}
        >
          Todo tu negocio, en un enlace.
        </div>
        <div style={{ marginTop: 26, fontSize: 32, color: '#5A544C' }}>
          Que Instagram te traiga clientes, no solo seguidores.
        </div>
        <div style={{ marginTop: 'auto', height: 12, background: '#FF5D2E', width: 170 }} />
      </div>
    ),
    size,
  )
}
