import type { SerieDia } from '@/lib/analitica'

/**
 * La gráfica de visitas por día.
 *
 * SVG generado en el servidor: ni una línea de JavaScript en el navegador y
 * ninguna librería de gráficos. Un panel que tarda en pintar porque descarga
 * 300 kB de Chart.js para dibujar treinta puntos es exactamente el tipo de
 * cosa que hace que un producto parezca lento.
 *
 * Lo que se dibuja son las VISITAS. Los clics irían en una segunda línea, y
 * dos líneas en un espacio de 90 píxeles de alto no se leen: se eligió la que
 * contesta la pregunta de «¿está entrando gente?».
 */
export function Grafica({ serie }: { serie: SerieDia[] }) {
  const maximo = Math.max(...serie.map((d) => d.visitas), 1)
  const total = serie.reduce((s, d) => s + d.visitas, 0)

  // Sin una sola visita no hay curva que enseñar, y una línea plana en cero
  // ocupa sitio para no decir nada.
  if (total === 0) return null

  const ANCHO = 100
  const ALTO = 30
  const paso = serie.length > 1 ? ANCHO / (serie.length - 1) : ANCHO

  const puntos = serie.map((d, i) => {
    const x = i * paso
    const y = ALTO - (d.visitas / maximo) * (ALTO - 2) - 1
    return { x, y, ...d }
  })

  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const area = `${linea} L${ANCHO},${ALTO} L0,${ALTO} Z`

  const primero = serie[0]
  const ultimo = serie[serie.length - 1]
  const mejor = puntos.reduce((a, b) => (b.visitas > a.visitas ? b : a))

  return (
    <figure className="mt-5">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        preserveAspectRatio="none"
        className="h-[90px] w-full"
        role="img"
        aria-label={`Visitas por día: ${total} en total, con un máximo de ${maximo} el ${formatear(mejor.dia)}.`}
      >
        <defs>
          <linearGradient id="te-grafica" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-acento)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-acento)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill="url(#te-grafica)" />
        <path
          d={linea}
          fill="none"
          stroke="var(--color-acento)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <figcaption className="mt-1.5 flex items-center justify-between text-[12px] text-[var(--color-tinta-40)]">
        <span>{formatear(primero.dia)}</span>
        <span>
          Máximo: {maximo} {maximo === 1 ? 'visita' : 'visitas'} el {formatear(mejor.dia)}
        </span>
        <span>{formatear(ultimo.dia)}</span>
      </figcaption>
    </figure>
  )
}

const FORMATO = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })

/** 'YYYY-MM-DD' → '9 nov'. Se parsea como mediodía UTC para que la zona no reste un día. */
function formatear(dia: string): string {
  return FORMATO.format(new Date(`${dia}T12:00:00Z`))
}
