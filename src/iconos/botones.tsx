/**
 * Los iconos que el dueño de la página puede elegir para cada botón.
 *
 * Lista cerrada a propósito. Una librería entera convierte el editor en un
 * catálogo de tres mil dibujos y el resultado en una página con ocho estilos
 * distintos. Veinticuatro iconos del mismo set cubren lo que hace un negocio
 * local y garantizan que la página siga pareciendo una sola cosa.
 */

import {
  IconoCalendario,
  IconoCamara,
  IconoCarrito,
  IconoCarta,
  IconoChat,
  IconoCoche,
  IconoCorazon,
  IconoCorreo,
  IconoDescarga,
  IconoEnlace,
  IconoEntrada,
  IconoEstrella,
  IconoEuro,
  IconoFormulario,
  IconoHorario,
  IconoImagen,
  IconoInfo,
  IconoMancuerna,
  IconoMusica,
  IconoPersona,
  IconoRegalo,
  IconoServicios,
  IconoTaza,
  IconoTelefono,
  IconoTienda,
  IconoTijeras,
  IconoUbicacion,
  IconoWhatsapp,
} from './index'

type Icono = (p: { tam?: number; className?: string }) => React.JSX.Element

export const ICONOS_BOTON: { clave: string; nombre: string; Icono: Icono }[] = [
  { clave: 'enlace', nombre: 'Enlace', Icono: IconoEnlace },
  { clave: 'calendario', nombre: 'Calendario', Icono: IconoCalendario },
  { clave: 'carta', nombre: 'Carta o menú', Icono: IconoCarta },
  { clave: 'carrito', nombre: 'Carrito', Icono: IconoCarrito },
  { clave: 'euro', nombre: 'Precio', Icono: IconoEuro },
  { clave: 'entrada', nombre: 'Entrada', Icono: IconoEntrada },
  { clave: 'regalo', nombre: 'Regalo', Icono: IconoRegalo },
  { clave: 'estrella', nombre: 'Estrella', Icono: IconoEstrella },
  { clave: 'corazon', nombre: 'Corazón', Icono: IconoCorazon },
  { clave: 'chat', nombre: 'Mensaje', Icono: IconoChat },
  { clave: 'whatsapp', nombre: 'WhatsApp', Icono: IconoWhatsapp },
  { clave: 'telefono', nombre: 'Teléfono', Icono: IconoTelefono },
  { clave: 'correo', nombre: 'Correo', Icono: IconoCorreo },
  { clave: 'ubicacion', nombre: 'Ubicación', Icono: IconoUbicacion },
  { clave: 'horario', nombre: 'Horario', Icono: IconoHorario },
  { clave: 'persona', nombre: 'Persona', Icono: IconoPersona },
  { clave: 'formulario', nombre: 'Formulario', Icono: IconoFormulario },
  { clave: 'tienda', nombre: 'Tienda', Icono: IconoTienda },
  { clave: 'servicios', nombre: 'Servicios', Icono: IconoServicios },
  { clave: 'tijeras', nombre: 'Peluquería', Icono: IconoTijeras },
  { clave: 'mancuerna', nombre: 'Gimnasio', Icono: IconoMancuerna },
  { clave: 'taza', nombre: 'Cafetería', Icono: IconoTaza },
  { clave: 'coche', nombre: 'Coche', Icono: IconoCoche },
  { clave: 'camara', nombre: 'Fotos', Icono: IconoCamara },
  { clave: 'imagen', nombre: 'Galería', Icono: IconoImagen },
  { clave: 'musica', nombre: 'Música', Icono: IconoMusica },
  { clave: 'descarga', nombre: 'Descarga', Icono: IconoDescarga },
  { clave: 'info', nombre: 'Información', Icono: IconoInfo },
]

const POR_CLAVE = new Map(ICONOS_BOTON.map((i) => [i.clave, i.Icono]))

export function iconoDeBoton(clave: unknown): Icono | null {
  return typeof clave === 'string' ? (POR_CLAVE.get(clave) ?? null) : null
}

export const CLAVES_ICONO = ICONOS_BOTON.map((i) => i.clave)
