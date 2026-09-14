export const TIPOS_BLOQUE = [
  'ENLACE',
  'WHATSAPP',
  'LLAMAR',
  'UBICACION',
  'REDES',
  'TEXTO',
  'IMAGEN',
  'FORMULARIO',
] as const

export type TipoBloque = (typeof TIPOS_BLOQUE)[number]

export function esTipoBloque(valor: string): valor is TipoBloque {
  return (TIPOS_BLOQUE as readonly string[]).includes(valor)
}

/** Límite de bloques del plan gratuito. Ver blueprint bloque 2, punto 5.4. */
export const LIMITE_BLOQUES_GRATIS = 10
