import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'TUENLACE — Todo tu negocio, en un enlace',
    template: '%s · TUENLACE',
  },
  description:
    'Una mini página con tu WhatsApp, tus citas, tu ubicación y tus reseñas. Lista en 5 minutos.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://tuenlace.es'),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAF8F5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
