/**
 * Iconografía de TUENLACE.
 *
 * Un único set, SVG en línea, sin librería y sin petición extra. Nada de
 * emojis: un emoji lo dibuja el sistema operativo, así que la misma página se
 * ve distinta en iPhone, en Android y en Windows. Eso no es una marca.
 *
 * Reglas del set:
 *   · Lienzo 24×24, trazo de 1.6, extremos y uniones redondeados.
 *   · `currentColor` siempre: el color lo pone el contexto, nunca el icono.
 *   · Los logos de redes van rellenos (`fill`) porque así son sus marcas.
 */

type Props = {
  /** Tamaño en píxeles. Por defecto 20. */
  tam?: number
  className?: string
}

function Trazo({ tam = 20, className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  )
}

function Relleno({ tam = 20, className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  )
}

// ── Bloques ──────────────────────────────────────────────────────────────────

export function IconoWhatsapp(p: Props) {
  return (
    <Relleno {...p}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.004c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.004a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29Z" />
    </Relleno>
  )
}

export function IconoTelefono(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M21.5 16.9v2.8a1.9 1.9 0 0 1-2.07 1.9 18.8 18.8 0 0 1-8.2-2.92 18.5 18.5 0 0 1-5.7-5.7A18.8 18.8 0 0 1 2.6 4.75 1.9 1.9 0 0 1 4.5 2.68h2.8a1.9 1.9 0 0 1 1.9 1.63c.12.92.34 1.81.66 2.67a1.9 1.9 0 0 1-.43 2L8.22 10.2a15.2 15.2 0 0 0 5.7 5.7l1.22-1.2a1.9 1.9 0 0 1 2-.43c.86.32 1.75.54 2.67.66a1.9 1.9 0 0 1 1.63 1.93Z" />
    </Trazo>
  )
}

export function IconoUbicacion(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M19.5 10.2c0 5.4-7.5 11.3-7.5 11.3s-7.5-5.9-7.5-11.3a7.5 7.5 0 0 1 15 0Z" />
      <circle cx="12" cy="10" r="2.7" />
    </Trazo>
  )
}

export function IconoFormulario(p: Props) {
  return (
    <Trazo {...p}>
      <rect x="4" y="2.8" width="16" height="18.4" rx="2.4" />
      <path d="M8.2 8.4h7.6M8.2 12.4h7.6M8.2 16.4h4.4" />
    </Trazo>
  )
}

export function IconoEnlace(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M10 13.2a3.6 3.6 0 0 0 5.4.4l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1l-1.5 1.5" />
      <path d="M14 10.8a3.6 3.6 0 0 0-5.4-.4L6 13a3.6 3.6 0 0 0 5.1 5.1l1.5-1.5" />
    </Trazo>
  )
}

export function IconoRedes(p: Props) {
  return (
    <Trazo {...p}>
      <circle cx="17.5" cy="5.5" r="2.5" />
      <circle cx="6.5" cy="12" r="2.5" />
      <circle cx="17.5" cy="18.5" r="2.5" />
      <path d="M8.75 10.8 15.3 6.8M8.75 13.2l6.55 4" />
    </Trazo>
  )
}

export function IconoTexto(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M4.5 5.2h15M4.5 10.4h15M4.5 15.6h10.5M4.5 20.8h7" />
    </Trazo>
  )
}

export function IconoImagen(p: Props) {
  return (
    <Trazo {...p}>
      <rect x="3" y="4.4" width="18" height="15.2" rx="2.4" />
      <circle cx="8.6" cy="9.6" r="1.7" />
      <path d="m3.4 17.2 4.7-4.4a2 2 0 0 1 2.7 0l4 3.7a2 2 0 0 0 2.7 0l3.1-2.8" />
    </Trazo>
  )
}

export function IconoHorario(p: Props) {
  return (
    <Trazo {...p}>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 6.8V12l3.4 2" />
    </Trazo>
  )
}

// ── Categorías de negocio ────────────────────────────────────────────────────

export function IconoTienda(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M3.4 8.6 4.8 4.4a1.6 1.6 0 0 1 1.5-1.1h11.4a1.6 1.6 0 0 1 1.5 1.1l1.4 4.2" />
      <path d="M3.4 8.6a2.9 2.9 0 0 0 5.7 0 2.9 2.9 0 0 0 5.8 0 2.9 2.9 0 0 0 5.7 0" />
      <path d="M4.9 11.2v8a1.6 1.6 0 0 0 1.6 1.6h11a1.6 1.6 0 0 0 1.6-1.6v-8" />
    </Trazo>
  )
}

export function IconoRestaurante(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M6.6 2.8v7.4a2.6 2.6 0 0 0 5.2 0V2.8M9.2 10.8v10.4M6.6 2.8v4.6M11.8 2.8v4.6" />
      <path d="M17.6 2.8c-1.5 1-2.3 2.8-2.3 5.2 0 1.9.8 3 2.3 3.2v10" />
    </Trazo>
  )
}

export function IconoServicios(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M14.2 6.3a3.9 3.9 0 0 0 5.1 5.1l-7.3 7.3a2.6 2.6 0 0 1-3.7-3.7Z" />
      <path d="m7.2 4.4 2.4 2.4M4.6 7l2.4 2.4" />
    </Trazo>
  )
}

export function IconoComercio(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M5.4 7.4h13.2l-1 12.2a1.6 1.6 0 0 1-1.6 1.5H8a1.6 1.6 0 0 1-1.6-1.5Z" />
      <path d="M8.8 10V6.4a3.2 3.2 0 0 1 6.4 0V10" />
    </Trazo>
  )
}

export function IconoBelleza(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M12 2.6 13.9 8l5.5 1.9-5.5 1.9L12 17.2 10.1 11.8 4.6 9.9 10.1 8Z" />
      <path d="M18.2 16.4l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" />
    </Trazo>
  )
}

export function IconoOficina(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M4.2 21.2V4.8a1.6 1.6 0 0 1 1.6-1.6h8.4a1.6 1.6 0 0 1 1.6 1.6v16.4" />
      <path d="M15.8 9.6h2.4a1.6 1.6 0 0 1 1.6 1.6v10M2.6 21.2h18.8" />
      <path d="M7.8 7.4h1.2M11 7.4h1.2M7.8 11.4h1.2M11 11.4h1.2M7.8 15.4h4.4v5.8H7.8Z" />
    </Trazo>
  )
}

// ── Interfaz ─────────────────────────────────────────────────────────────────

export function IconoBien(p: Props) {
  return (
    <Trazo {...p} >
      <circle cx="12" cy="12" r="9.2" />
      <path d="m8 12.2 2.8 2.8L16 9.4" />
    </Trazo>
  )
}

export function IconoAviso(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M10.6 3.6 2.4 17.6a1.6 1.6 0 0 0 1.4 2.4h16.4a1.6 1.6 0 0 0 1.4-2.4L13.4 3.6a1.6 1.6 0 0 0-2.8 0Z" />
      <path d="M12 9.2v4M12 16.6h.01" />
    </Trazo>
  )
}

export function IconoIdea(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M9.2 18.4h5.6M10 21.2h4" />
      <path d="M12 2.8a6.2 6.2 0 0 0-3.6 11.2c.6.45.98 1.1 1.05 1.8l.07.6h4.96l.07-.6c.07-.7.45-1.35 1.05-1.8A6.2 6.2 0 0 0 12 2.8Z" />
    </Trazo>
  )
}

export function IconoPendiente(p: Props) {
  return (
    <Trazo {...p}>
      <circle cx="12" cy="12" r="9.2" strokeDasharray="2.6 3.2" />
    </Trazo>
  )
}

export function IconoPublicado(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M21.4 3.2 10.8 13.8M21.4 3.2l-6.8 18.2-3.8-7.6-7.6-3.8Z" />
    </Trazo>
  )
}

export function IconoSubir(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M12 16.4V4.2M7.4 8.8 12 4.2l4.6 4.6" />
      <path d="M3.6 16.4v2.8a1.6 1.6 0 0 0 1.6 1.6h13.6a1.6 1.6 0 0 0 1.6-1.6v-2.8" />
    </Trazo>
  )
}

export function IconoArribaChica(p: Props) {
  return (
    <Trazo {...p}>
      <path d="m6.4 14.6 5.6-5.6 5.6 5.6" />
    </Trazo>
  )
}

export function IconoAbajoChica(p: Props) {
  return (
    <Trazo {...p}>
      <path d="m6.4 9.4 5.6 5.6 5.6-5.6" />
    </Trazo>
  )
}

export function IconoPapelera(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M3.8 6.2h16.4M8.4 6.2V4.6A1.6 1.6 0 0 1 10 3h4a1.6 1.6 0 0 1 1.6 1.6v1.6" />
      <path d="M18.4 6.2v13.2a1.6 1.6 0 0 1-1.6 1.6H7.2a1.6 1.6 0 0 1-1.6-1.6V6.2M10 10.6v6M14 10.6v6" />
    </Trazo>
  )
}

export function IconoMas(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M12 5v14M5 12h14" />
    </Trazo>
  )
}

export function IconoOjo(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M2.2 12S5.8 5.2 12 5.2 21.8 12 21.8 12 18.2 18.8 12 18.8 2.2 12 2.2 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </Trazo>
  )
}

export function IconoMarca(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M11.4 3.3 3.9 7.1v5.4c0 4.3 3.2 8.3 7.5 9.2 4.3-.9 7.5-4.9 7.5-9.2V7.1l-7.5-3.8Z" />
      <path d="M8.8 12.2 11 14.4l4.2-4.4" />
    </Trazo>
  )
}

// ── Logos de redes ───────────────────────────────────────────────────────────

export function LogoInstagram(p: Props) {
  return (
    <Relleno {...p}>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.73 3.73 0 0 1-1.38-.9 3.73 3.73 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07Zm0 2.12c-3.15 0-3.52.01-4.76.07-1.15.05-1.77.24-2.19.4-.55.22-.94.47-1.35.88-.41.41-.66.8-.88 1.35-.16.42-.35 1.04-.4 2.19-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.05 1.15.24 1.77.4 2.19.22.55.47.94.88 1.35.41.41.8.66 1.35.88.42.16 1.04.35 2.19.4 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c1.15-.05 1.77-.24 2.19-.4.55-.22.94-.47 1.35-.88.41-.41.66-.8.88-1.35.16-.42.35-1.04.4-2.19.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.05-1.15-.24-1.77-.4-2.19a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.42-.16-1.04-.35-2.19-.4-1.24-.06-1.61-.07-4.76-.07Zm0 3.6a6.12 6.12 0 1 1 0 12.24 6.12 6.12 0 0 1 0-12.24Zm0 2.12a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7.79-2.36a1.43 1.43 0 1 1-2.86 0 1.43 1.43 0 0 1 2.86 0Z" />
    </Relleno>
  )
}

export function LogoTiktok(p: Props) {
  return (
    <Relleno {...p}>
      <path d="M16.6 2h-3.3v13.36a2.72 2.72 0 0 1-2.72 2.66 2.7 2.7 0 0 1 0-5.4c.28 0 .55.05.8.12V9.38a6.14 6.14 0 0 0-.8-.05A6.02 6.02 0 0 0 4.6 15.3 6 6 0 0 0 10.55 22a6.01 6.01 0 0 0 6.05-5.98V9.1a7.4 7.4 0 0 0 4.32 1.38V7.15a4.32 4.32 0 0 1-4.32-4.32V2Z" />
    </Relleno>
  )
}

export function LogoFacebook(p: Props) {
  return (
    <Relleno {...p}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.77-3.91 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.9h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </Relleno>
  )
}

export function LogoYoutube(p: Props) {
  return (
    <Relleno {...p}>
      <path d="M21.58 7.19a2.5 2.5 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42A2.5 2.5 0 0 0 2.42 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.5 2.5 0 0 0 1.77-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.42-4.81ZM9.98 15V9l5.2 3-5.2 3Z" />
    </Relleno>
  )
}

export function LogoLinkedin(p: Props) {
  return (
    <Relleno {...p}>
      <path d="M20.45 2H3.55A1.53 1.53 0 0 0 2 3.51v16.98A1.53 1.53 0 0 0 3.55 22h16.9A1.54 1.54 0 0 0 22 20.49V3.51A1.54 1.54 0 0 0 20.45 2ZM8.02 18.94h-2.9v-8.87h2.9v8.87ZM6.57 8.85a1.69 1.69 0 1 1 0-3.38 1.69 1.69 0 0 1 0 3.38Zm12.38 10.09h-2.9v-4.32c0-1.03-.02-2.35-1.44-2.35-1.44 0-1.66 1.12-1.66 2.28v4.39h-2.9v-8.87h2.78v1.21h.04a3.05 3.05 0 0 1 2.74-1.5c2.93 0 3.47 1.93 3.47 4.44v4.72Z" />
    </Relleno>
  )
}

export function LogoX(p: Props) {
  return (
    <Relleno {...p}>
      <path d="M17.53 3h3.06l-6.69 7.64L21.75 21h-6.16l-4.83-6.3L5.24 21H2.18l7.15-8.17L2.5 3h6.32l4.36 5.77L17.53 3Zm-1.07 16.17h1.69L7.6 4.74H5.79l10.67 14.43Z" />
    </Relleno>
  )
}

export function LogoWeb(p: Props) {
  return (
    <Trazo {...p}>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M2.8 12h18.4" />
      <path d="M12 2.8a14 14 0 0 1 0 18.4 14 14 0 0 1 0-18.4Z" />
    </Trazo>
  )
}

export function IconoCorreo(p: Props) {
  return (
    <Trazo {...p}>
      <rect x="2.8" y="4.6" width="18.4" height="14.8" rx="2.4" />
      <path d="m3.4 6.6 7.4 5.4a2 2 0 0 0 2.4 0l7.4-5.4" />
    </Trazo>
  )
}

export function IconoAtras(p: Props) {
  return (
    <Trazo {...p}>
      <path d="M19.4 12H4.6M10.2 6.4 4.6 12l5.6 5.6" />
    </Trazo>
  )
}
