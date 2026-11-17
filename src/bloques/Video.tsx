'use client'

import { useState } from 'react'
import { urlReproductor, urlVerFuera } from './medios'
import type { ProveedorVideo } from './tipos'

const NOMBRE: Record<ProveedorVideo, string> = { youtube: 'YouTube', tiktok: 'TikTok', vimeo: 'Vimeo' }

/**
 * Vídeo en "fachada": hasta que se pulsa no se carga nada de YouTube ni de
 * TikTok. La página sigue abriendo rápido dentro de Instagram y no llama a
 * terceros (ni les pasa la IP del visitante) si nadie quiere ver el vídeo.
 *
 * Sin JavaScript es un enlace normal al vídeo.
 */
export function Video({
  proveedor,
  idVideo,
  vertical,
  titulo,
  bloqueId,
}: {
  proveedor: ProveedorVideo
  idVideo: string
  vertical?: boolean
  titulo?: string
  bloqueId: string
}) {
  const [reproduciendo, setReproduciendo] = useState(false)
  const miniatura = proveedor === 'youtube' ? `https://i.ytimg.com/vi/${idVideo}/hqdefault.jpg` : null

  if (reproduciendo) {
    return (
      <div className="te-video" data-vertical={vertical ? 'si' : 'no'}>
        <iframe
          src={urlReproductor(proveedor, idVideo)}
          title={titulo || `Vídeo de ${NOMBRE[proveedor]}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <a
      href={urlVerFuera(proveedor, idVideo)}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      data-bloque={bloqueId}
      className="te-video"
      data-vertical={vertical ? 'si' : 'no'}
      aria-label={titulo ? `Ver vídeo: ${titulo}` : 'Ver vídeo'}
      onClick={(e) => {
        e.preventDefault()
        setReproduciendo(true)
      }}
    >
      {miniatura && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={miniatura}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
      <span className="te-video-play" aria-hidden>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13l10.5-6.5z" />
        </svg>
      </span>
      <span className="te-video-marca">{NOMBRE[proveedor]}</span>
    </a>
  )
}
