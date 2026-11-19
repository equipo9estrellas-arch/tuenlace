import { Fragment } from 'react'

/** Parte un titular en palabras para el reveal palabra a palabra. */
export function Palabras({ texto, cursiva = [] }: { texto: string; cursiva?: string[] }) {
  const palabras = texto.split(' ')
  return (
    <>
      {palabras.map((p, i) => {
        const limpia = p.replace(/[.,;:¿?¡!]/g, '')
        const contenido = cursiva.includes(limpia) ? <em>{p}</em> : p
        return (
          <Fragment key={i}>
            <span className="l-palabra" style={{ ['--i' as string]: i }}>
              <span>{contenido}</span>
            </span>
            {i < palabras.length - 1 ? ' ' : null}
          </Fragment>
        )
      })}
    </>
  )
}
