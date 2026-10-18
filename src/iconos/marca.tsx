/**
 * LA MARCA
 *
 * El símbolo son dos eslabones entrelazados: vectorizado del logotipo original
 * (marca-fuente/logo-original.png), no redibujado a ojo. Los huecos del
 * entrelazado son transparentes a propósito, así que dejan ver el fondo que
 * haya debajo, sea el crema de la web o el preset oscuro de la página de un
 * cliente.
 *
 * Va en línea y no como <img> por una razón concreta: en la página pública el
 * sello se pinta sobre dieciséis paletas distintas, varias oscuras, y necesita
 * heredar el color del texto. Un <img> no puede.
 *
 * Ojo con los `transform` de los trazados: vienen del vectorizado y colocan
 * cada pieza en su sitio. Si se quitan, los tres caminos se apilan en el origen
 * y el símbolo sale como una esquirla.
 */

type Props = {
  /** Lado en píxeles. El símbolo es ligeramente más alto que ancho. */
  tam?: number
  /**
   * Un solo color, heredado del texto (currentColor). Es lo que se usa sobre
   * fondos de cliente: con los colores de marca, el negro desaparece sobre un
   * preset oscuro.
   */
  mono?: boolean
  /** Para fondos oscuros manteniendo el naranja: el negro pasa a crema. */
  claro?: boolean
  className?: string
}

export function SimboloMarca({ tam = 20, mono = false, claro = false, className }: Props) {
  const tinta = mono ? 'currentColor' : claro ? '#FAF8F5' : '#14120F'
  const acento = mono ? 'currentColor' : '#FF5D2E'

  return (
    <svg
      viewBox="0 0 339 332"
      width={tam}
      height={Math.round((tam * 332) / 339)}
      className={className}
      // En contenedores flex (el sello de la página pública lo es) un SVG sin
      // esto se comprime hasta desaparecer.
      style={{ flexShrink: 0 }}
      aria-hidden="true"
      focusable="false"
    >
      <path fill={tinta} transform="translate(165,119)" d="M0 0 C-1.5 5.8 -5 8.4 -9.2 12.6 C-10.1 13.5 -10.9 14.3 -11.8 15.2 C-13.5 16.9 -15.3 18.7 -17 20.4 C-19.7 23.1 -22.4 25.8 -25.1 28.5 C-26.8 30.2 -28.5 31.9 -30.2 33.6 C-31.8 35.2 -33.4 36.7 -35 38.3 C-40.2 43.1 -43.3 43.9 -50.3 44.8 C-63.5 47.2 -72 58.7 -81.2 67.9 C-82.6 69.3 -84.1 70.7 -85.6 72.2 C-86.3 72.9 -86.3 72.9 -89.8 76.4 C-90.4 77.1 -90.4 77.1 -93.6 80.2 C-104.1 91.8 -107.1 104.7 -106 120 C-101.9 137.7 -92.7 148.3 -76 155 C-61.1 158.7 -47.5 155.3 -35 147 C-30.6 143 -26.5 138.8 -22.4 134.6 C-15.8 127.8 -9.2 121.1 -2 115 C-1.3 114.3 -1.3 114.3 2 111 C6.7 111.9 10 113.3 14.2 115.3 C31.9 123 48 123.5 67 123 C67 129 63.7 130.7 59.5 134.8 C58.1 136.2 56.7 137.5 55.3 139 C52.6 141.5 49.9 143.9 47.2 146.3 C41.9 151 37 156 32 161 C25.8 167.2 19.6 173.2 13 179 C10.9 181.1 8.9 183.2 6.9 185.4 C-16.4 208.7 -51 217.2 -83.1 211.9 C-118 204.3 -143.9 182.4 -158.5 149.9 C-170.2 119.3 -166.4 83.5 -148.1 56.2 C-140.8 46.4 -132.3 37.9 -123.6 29.3 C-121.1 26.7 -118.5 24.2 -116 21.7 C-83.1 -11.1 -42.4 -27.2 0 0 Z" />
      <path fill={acento} transform="translate(302,25)" d="M0 0 C1.4 1.1 2.7 2.1 4.1 3.2 C29.4 27.7 39.9 61.6 34.8 96.2 C29.6 124.1 15.9 142.6 -4 162.2 C-5.5 163.8 -7 165.3 -8.6 166.8 C-15.2 173.4 -21.9 179.9 -29 186 C-30.2 187.2 -31.4 188.4 -32.7 189.6 C-50.6 203.8 -78.4 207.8 -100.2 202.3 C-106.1 200.5 -111.7 198.2 -117 195 C-117.3 193.7 -117.7 192.4 -118 191 C-114.7 187.2 -111.3 183.6 -107.7 180.1 C-106.6 179 -105.5 177.9 -104.4 176.8 C-102.1 174.6 -99.9 172.3 -97.6 170 C-94.1 166.6 -90.6 163.1 -87.2 159.7 C-85 157.5 -82.7 155.3 -80.5 153.1 C-79.5 152 -78.5 151 -77.4 149.9 C-72.2 144.8 -67.3 140.6 -61 137 C-58.6 134.8 -56.3 132.5 -54 130.1 C-50.3 126.3 -46.7 122.7 -42.7 119.2 C-29.4 107.6 -20.5 93.3 -22 75 C-25.3 58.4 -32.8 45.4 -48 37 C-65 30.6 -80.7 31.9 -96 42 C-100.2 45.9 -104.2 49.9 -108.1 54 C-111.9 57.9 -115.9 61.4 -120 65 C-123.1 68.1 -126.2 71.3 -129.3 74.5 C-132 77 -132 77 -136 78 C-138.8 76.6 -141.7 75.1 -144.5 73.6 C-161.1 65.9 -180.2 65.7 -198 68 C-198 62 -194.6 60.2 -190.3 56.1 C-188.9 54.7 -187.5 53.3 -186 51.8 C-185.3 51.2 -185.3 51.2 -182 48 C-181.1 47.1 -180.2 46.2 -179.3 45.3 C-176.7 42.7 -173.9 40.2 -171.1 37.7 C-166.4 33.4 -162.2 28.8 -158 24 C-155.6 21.8 -153.1 19.6 -150.7 17.5 C-147.8 14.8 -145.1 11.9 -142.5 9 C-104.6 -32.8 -43.1 -36 0 0 Z" />
      <path fill={tinta} transform="translate(217,123)" d="M0 0 C8.7 8.7 11.9 16.6 10 29 C6.8 36.8 2.7 41.9 -3.3 47.7 C-4.8 49.1 -6.2 50.5 -7.7 51.9 C-10.4 54.5 -13.1 57 -15.9 59.4 C-20.7 63.6 -25.1 68 -29.5 72.5 C-35.2 78.2 -40.9 83.7 -47 89 C-48.3 90.2 -49.5 91.4 -50.8 92.7 C-59.7 99.7 -68.7 101.5 -79.6 98.9 C-88.7 95 -92.9 89.3 -96 80 C-96.7 64.9 -91.7 57.7 -80.3 47.8 C-75.3 43.4 -70.7 38.7 -66 34 C-61.4 29.3 -56.8 24.7 -51.9 20.4 C-46 15.3 -40.7 9.5 -35.3 3.9 C-24.8 -5.6 -12.2 -7.7 0 0 Z" />
    </svg>
  )
}

/**
 * El logotipo completo (símbolo + «tuenlace.es»).
 *
 * Aquí sí es <img>: son 16 KB de trazado que no tienen por qué viajar dentro
 * del HTML de cada página, y el navegador lo cachea entre navegaciones.
 * La variante clara es para fondos oscuros.
 */
export function Marca({
  alto = 28,
  claro = false,
  className,
}: {
  alto?: number
  claro?: boolean
  className?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={claro ? '/marca/tuenlace-claro.svg' : '/marca/tuenlace.svg'}
      alt="tuenlace.es"
      width={Math.round((alto * 1696) / 332)}
      height={alto}
      className={className}
      style={{ height: alto, width: 'auto', flexShrink: 0 }}
    />
  )
}
