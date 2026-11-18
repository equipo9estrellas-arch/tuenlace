/**
 * Quién está detrás de TUENLACE y los textos legales.
 *
 * TUENLACE es un servicio de Agencia 9 Estrellas: el titular, el correo y el
 * teléfono son los suyos (los mismos que en 9estrellas.com y en el emisor de
 * facturas de Gestiona-lo). Si cambian, se cambian AQUÍ y solo aquí.
 *
 * Los textos están redactados con los datos reales y con lo que el código
 * hace de verdad (qué cookies pone, qué guarda, a quién se lo pasa). No son
 * asesoramiento jurídico: conviene que los revise un abogado antes de crecer.
 */

export const CONTACTO = {
  razonSocial: 'Grupo Empresarial Publistar SLU',
  cif: 'B93935278',
  domicilio: 'Calle Lepanto, 9, 38360 El Sauzal, Santa Cruz de Tenerife',
  nombreComercial: 'Agencia 9 Estrellas',
  email: 'agencia@9estrellas.com',
  telefono: '+34 686 083 963',
  webAgencia: 'https://9estrellas.com',
  web: 'https://tuenlace.es',
  jurisdiccion: 'Santa Cruz de Tenerife',
} as const

export const ACTUALIZADO = '18 de noviembre de 2026'

export type Bloque = { titulo?: string; parrafos?: string[]; lista?: string[] }
export type Documento = { titulo: string; descripcion: string; bloques: Bloque[] }

const C = CONTACTO

const IDENTIFICACION: Bloque = {
  titulo: 'Quiénes somos',
  lista: [
    `Titular: ${C.razonSocial}`,
    `CIF: ${C.cif}`,
    `Domicilio: ${C.domicilio}`,
    `Nombre comercial: TUENLACE, un servicio de ${C.nombreComercial}`,
    `Correo: ${C.email}`,
    `Teléfono: ${C.telefono}`,
    `Web: ${C.web}`,
  ],
}

export const DOCUMENTOS: Record<string, Documento> = {
  'aviso-legal': {
    titulo: 'Aviso legal',
    descripcion: 'Titular del sitio e información exigida por la LSSI-CE.',
    bloques: [
      {
        parrafos: [
          'En cumplimiento de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE), estos son los datos del titular de tuenlace.es.',
        ],
      },
      IDENTIFICACION,
      {
        titulo: 'Objeto',
        parrafos: [
          'TUENLACE es un servicio en línea para crear una página de enlaces y contacto para negocios (tuenlace.es/tunombre), recoger contactos y medir de qué canal llegan. Usar el sitio supone aceptar este aviso legal; contratar el servicio, además, las Condiciones del servicio.',
        ],
      },
      {
        titulo: 'Condiciones de uso',
        parrafos: [
          'Te comprometes a usar el sitio de forma lícita y a no: publicar contenido ilegal, engañoso, que suplante a otra persona o empresa, o que infrinja derechos de terceros; intentar acceder a cuentas o datos ajenos; introducir programas dañinos ni sobrecargar el servicio.',
          'Cualquiera puede denunciar una página desde el enlace «Denunciar» que aparece en ella. Podemos suspender las páginas que incumplan estas normas.',
        ],
      },
      {
        titulo: 'Propiedad intelectual',
        parrafos: [
          'El diseño, el código, la marca TUENLACE y los textos del sitio son del titular o se usan con licencia. El contenido que cada usuario sube a su página (textos, fotos, logos, vídeos) es suyo y es responsable de tener derecho a usarlo.',
        ],
      },
      {
        titulo: 'Responsabilidad',
        parrafos: [
          'Las páginas de los usuarios las crean y gestionan ellos. No respondemos del contenido que publican ni de los enlaces a sitios de terceros que incluyan, aunque actuaremos con diligencia cuando tengamos conocimiento de algo ilícito.',
          'Ponemos los medios razonables para que el servicio funcione sin interrupciones, pero no podemos garantizarlo en todo momento.',
        ],
      },
      {
        titulo: 'Legislación y jurisdicción',
        parrafos: [
          `Se aplica la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales de ${C.jurisdiccion}, salvo que la ley reconozca a un consumidor el derecho a acudir a los de su domicilio.`,
        ],
      },
    ],
  },

  privacidad: {
    titulo: 'Política de privacidad',
    descripcion: 'Qué datos tratamos, para qué y qué derechos tienes.',
    bloques: [
      {
        titulo: 'Responsable del tratamiento',
        lista: [
          `${C.razonSocial} (CIF ${C.cif})`,
          `Domicilio: ${C.domicilio}`,
          `Correo para cualquier asunto de privacidad: ${C.email}`,
          `Teléfono: ${C.telefono}`,
        ],
      },
      {
        titulo: 'Dos papeles distintos',
        parrafos: [
          'Somos responsables de los datos de quienes tienen una cuenta en TUENLACE (los clientes del servicio).',
          'De los datos de quien visita la página de un negocio o le deja sus datos en su formulario, el responsable es ese negocio. TUENLACE solo los trata por su cuenta, como encargado del tratamiento, para que el servicio funcione.',
        ],
      },
      {
        titulo: 'Datos de los clientes del servicio',
        lista: [
          'Cuenta: correo electrónico, nombre del negocio y, si lo indicas, tu nombre.',
          'Contenido de tu página: textos, imágenes, enlaces, horario, datos de contacto que publiques.',
          'Facturación: la gestiona Stripe. Nosotros no vemos ni guardamos los datos de tu tarjeta; solo el identificador de cliente y de suscripción.',
          'Acceso: una cookie de sesión y la fecha de tu último acceso.',
        ],
        parrafos: [
          'Los usamos para darte el servicio y cobrarlo (ejecución del contrato), para cumplir obligaciones fiscales y contables (obligación legal) y para escribirte sobre tu cuenta y el servicio (interés legítimo). No los vendemos ni los usamos para publicidad de terceros.',
        ],
      },
      {
        titulo: 'Datos de los visitantes de las páginas',
        lista: [
          'Estadísticas de visitas y clics: canal de llegada, tipo de dispositivo, país y ciudad aproximados. Sin cookies y sin guardar la dirección IP: se usa un identificador que cambia cada día.',
          'Formularios de contacto: los datos que el visitante escribe, para que el negocio le responda.',
          'Consentimiento de cookies: la decisión que toma el visitante, con una huella cifrada de la IP (no la IP) como prueba.',
          'Píxel de Meta y Google Analytics: solo si el negocio los activa y solo después de que el visitante lo acepte en el aviso de cookies.',
        ],
      },
      {
        titulo: 'Cuánto tiempo los guardamos',
        lista: [
          'Datos de la cuenta y de tu página: mientras la cuenta exista. Si se borra, se borran con ella.',
          'Datos de facturación: el plazo que exige la ley fiscal y mercantil.',
          'Contactos recogidos por una página: hasta que el negocio los borre o se borre su cuenta.',
        ],
      },
      {
        titulo: 'Con quién los compartimos',
        parrafos: [
          'Solo con los proveedores que necesitamos para dar el servicio, con contrato de encargo del tratamiento:',
        ],
        lista: [
          'Railway (EE. UU.): servidores y base de datos de la aplicación.',
          'Cloudflare (EE. UU.): red de entrega y almacenamiento de las imágenes.',
          'Stripe (EE. UU. e Irlanda): cobros y facturas.',
          'Resend (EE. UU.): envío de los correos de acceso y avisos.',
          'Raiola Networks (España): alojamiento de algunas páginas.',
          'Asesores fiscales y contables, cuando sea necesario.',
        ],
      },
      {
        titulo: 'Transferencias internacionales',
        parrafos: [
          'Algunos de estos proveedores están en Estados Unidos. Las transferencias se hacen con las garantías del Reglamento General de Protección de Datos: el Marco de Privacidad de Datos UE-EE. UU. cuando el proveedor está adherido, o cláusulas contractuales tipo aprobadas por la Comisión Europea.',
        ],
      },
      {
        titulo: 'Tus derechos',
        parrafos: [
          `Puedes pedir acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad de tus datos escribiendo a ${C.email} con el asunto «Protección de datos». Respondemos en un plazo máximo de un mes.`,
          'Si eres visitante de la página de un negocio, dirígete primero a ese negocio: es el responsable de tus datos. Si nos escribes a nosotros, se lo trasladaremos.',
          'Si crees que no hemos atendido bien tu petición, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).',
        ],
      },
      {
        titulo: 'Seguridad',
        parrafos: [
          'Las conexiones van cifradas, las contraseñas y los enlaces de acceso no se guardan en claro (solo una huella cifrada) y el acceso a los datos está limitado a quien lo necesita para dar el servicio.',
        ],
      },
    ],
  },

  cookies: {
    titulo: 'Política de cookies',
    descripcion: 'Qué cookies usamos y cómo gestionarlas.',
    bloques: [
      {
        titulo: 'En tuenlace.es y en tu panel',
        parrafos: ['Solo usamos cookies técnicas, necesarias para que funcione el servicio. No necesitan consentimiento.'],
        lista: [
          'te_sesion: mantiene tu sesión abierta. Dura hasta 30 días o hasta que cierras la sesión.',
          'te_admin: solo para el equipo de TUENLACE, al revisar una cuenta para dar soporte. Dura lo que dure su sesión.',
        ],
      },
      {
        titulo: 'En las páginas de los negocios (tuenlace.es/nombre)',
        lista: [
          'te_consent: recuerda si aceptaste o rechazaste las cookies de esa página, para no volver a preguntarte. Dura 6 meses. Técnica.',
          'Las estadísticas propias de TUENLACE no usan cookies.',
          'Si el negocio activa el píxel de Meta o Google Analytics, y solo si los aceptas en el aviso, esos servicios ponen sus propias cookies (por ejemplo _fbp, _fbc, _ga) con la duración que fija cada uno en su política. _fbc dura 90 días.',
        ],
      },
      {
        titulo: 'Cómo cambiar tu decisión',
        parrafos: [
          'Al pie de cada página tienes el enlace «Cookies», que vuelve a abrir el aviso para que cambies lo que elegiste. También puedes borrar las cookies desde la configuración de tu navegador.',
        ],
      },
    ],
  },

  condiciones: {
    titulo: 'Condiciones del servicio',
    descripcion: 'Qué contratas, cuánto cuesta, cómo se cancela y qué no se puede hacer.',
    bloques: [
      IDENTIFICACION,
      {
        titulo: 'El servicio',
        parrafos: [
          'TUENLACE te permite crear una página en tuenlace.es/tunombre con botones de contacto, formulario, horario y otros bloques, recoger los contactos que llegan, seguirlos hasta que son clientes y ver de qué canal vienen. Está pensado para negocios y profesionales.',
        ],
      },
      {
        titulo: 'Prueba gratis',
        parrafos: [
          'Al darte de alta tienes 15 días de prueba con todo lo del plan Esencial, sin dar ninguna tarjeta. Si al terminar no activas un plan, tu página deja de verse, pero no se borra nada: vuelve tal cual en cuanto lo actives.',
        ],
      },
      {
        titulo: 'Planes, precios y pago',
        parrafos: [
          'Los precios son mensuales y a ellos se les suma el IGIC que corresponda (7 % en Canarias). Se cobran por adelantado con tarjeta a través de Stripe y la suscripción se renueva sola cada mes hasta que la canceles. Las facturas las tienes en tu panel, en «Tu plan».',
          'Si cambiamos un precio, te avisaremos por correo con al menos 30 días de antelación; podrás cancelar antes de que se aplique.',
        ],
      },
      {
        titulo: 'Cancelación',
        parrafos: [
          'Puedes darte de baja cuando quieras desde «Tu plan», sin permanencia. Mantienes el plan hasta el final del mes que ya has pagado; después tu página deja de verse. No hay devoluciones de meses ya empezados.',
          `Si contratas como consumidor (para un uso ajeno a tu actividad profesional), puedes desistir en los 14 días naturales siguientes al primer pago escribiendo a ${C.email}, y te devolvemos ese pago.`,
        ],
      },
      {
        titulo: 'Plan Agencia y reventa',
        parrafos: [
          'Con el plan Agencia puedes crear y gestionar las páginas de tus clientes y cobrarles por ello lo que acuerdes con ellos. Tú eres el titular de la cuenta y quien responde ante nosotros del uso de todas sus páginas.',
          'Frente a tus clientes, eres tú quien decide sobre sus páginas y sus datos. Debes informarles de que su página está alojada en TUENLACE y respetar estas condiciones en todas ellas.',
        ],
      },
      {
        titulo: 'Sello «Creado con TUENLACE»',
        parrafos: ['Todas las páginas, en todos los planes, muestran al pie el sello «Creado con TUENLACE». No se puede quitar ni ocultar.'],
      },
      {
        titulo: 'Tu contenido y uso aceptable',
        parrafos: [
          'Eres responsable de lo que publicas y de tener derecho a usarlo. No se permite: contenido ilegal; engaños, estafas o páginas que suplanten a otra persona o empresa; contenido sexual explícito, violento o que incite al odio; venta de productos o servicios prohibidos; recoger datos personales con engaño; ni enlaces a programas dañinos.',
          'Si una página incumple estas normas o recibe denuncias fundadas, podemos suspenderla, avisándote del motivo en tu panel. Si el incumplimiento es grave o se repite, podemos cerrar la cuenta.',
        ],
      },
      {
        titulo: 'Los datos de tus visitantes',
        parrafos: [
          'De los datos que recoge tu página (contactos del formulario, estadísticas), tú eres el responsable y TUENLACE el encargado del tratamiento: los tratamos solo para darte el servicio, siguiendo tus instrucciones, con confidencialidad y con proveedores que ofrecen las mismas garantías. Mientras tengas un plan activo puedes exportarlos a Excel, y si nos pides que los borremos, los borramos. Tienes el detalle en la Política de privacidad.',
          'Si activas el píxel de Meta o Google Analytics, eres responsable de ese uso. El aviso de cookies de tu página no los carga hasta que el visitante los acepta.',
        ],
      },
      {
        titulo: 'Disponibilidad y responsabilidad',
        parrafos: [
          'Ponemos los medios razonables para que el servicio funcione siempre, pero puede haber interrupciones por mantenimiento o por causas ajenas. Nuestra responsabilidad se limita, como máximo, a lo que hayas pagado en los últimos 12 meses, salvo en los casos en que la ley no permita limitarla.',
        ],
      },
      {
        titulo: 'Cambios en estas condiciones',
        parrafos: ['Si cambiamos algo importante, te lo diremos por correo antes de que se aplique.'],
      },
      {
        titulo: 'Legislación y jurisdicción',
        parrafos: [
          `Se aplica la legislación española. Las partes se someten a los juzgados y tribunales de ${C.jurisdiccion}, salvo que seas consumidor, en cuyo caso podrás acudir a los de tu domicilio.`,
        ],
      },
    ],
  },
}
