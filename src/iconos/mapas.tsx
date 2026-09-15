/**
 * De una clave de dominio al icono que le corresponde.
 *
 * Vive aparte de `definicion.ts` y `tipos.ts` a propósito: esos ficheros los
 * importa también el generador, que corre en el servidor y en los tests, y no
 * tiene por qué arrastrar JSX.
 */

import type { ClaveCategoria } from '@/onboarding/definicion'
import type { TipoBloque } from '@/bloques/registro'
import type { RedSocial } from '@/bloques/tipos'
import {
  IconoBelleza,
  IconoComercio,
  IconoEnlace,
  IconoFormulario,
  IconoImagen,
  IconoOficina,
  IconoRedes,
  IconoRestaurante,
  IconoServicios,
  IconoTelefono,
  IconoTexto,
  IconoTienda,
  IconoUbicacion,
  IconoWhatsapp,
  LogoFacebook,
  LogoInstagram,
  LogoLinkedin,
  LogoTiktok,
  LogoWeb,
  LogoX,
  LogoYoutube,
} from './index'

type Icono = (p: { tam?: number; className?: string }) => React.JSX.Element

export const ICONO_BLOQUE: Record<TipoBloque, Icono> = {
  WHATSAPP: IconoWhatsapp,
  LLAMAR: IconoTelefono,
  UBICACION: IconoUbicacion,
  FORMULARIO: IconoFormulario,
  ENLACE: IconoEnlace,
  REDES: IconoRedes,
  TEXTO: IconoTexto,
  IMAGEN: IconoImagen,
}

export const ICONO_CATEGORIA: Record<ClaveCategoria, Icono> = {
  local: IconoTienda,
  restaurante: IconoRestaurante,
  profesional: IconoServicios,
  tienda: IconoComercio,
  marca: IconoBelleza,
  agencia: IconoOficina,
}

export const LOGO_RED: Record<RedSocial, Icono> = {
  instagram: LogoInstagram,
  tiktok: LogoTiktok,
  facebook: LogoFacebook,
  youtube: LogoYoutube,
  linkedin: LogoLinkedin,
  x: LogoX,
  web: LogoWeb,
}
