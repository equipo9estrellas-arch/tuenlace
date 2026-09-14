# TUENLACE

Convierte el tráfico de redes sociales en clientes medibles.

Este repositorio es el MVP descrito en el blueprint (bloques 1-4). El objetivo
del producto, en una frase:

> Una persona reclama su URL, responde seis preguntas, obtiene una página
> publicada que funciona de verdad, la pone en su Instagram, ve que recibe
> visitas y clics, y quiere quitar nuestro logo y medir de dónde vienen.

---

## Arranque rápido

```bash
# 1. Dependencias
npm install

# 2. Configuración
cp .env.example .env
#    Rellena DATABASE_URL y AUTH_SECRET. El resto es opcional:
#    sin ellas la aplicación arranca igual y degrada con elegancia.
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Esquema de la base de datos
npm run db:push          # desarrollo
# npm run db:migrate     # producción, aplica drizzle/*.sql

# 4. Arrancar
npm run dev              # http://localhost:3000
```

**Sin `RESEND_API_KEY`, los enlaces mágicos se imprimen por consola.** Copias
la URL, la pegas en el navegador y entras. No hace falta montar nada de correo
para trabajar en local.

### Comprobar que todo funciona

```bash
npm test
```

Recorre el camino crítico completo —validación de slug, generación de textos,
motor de estructura, enlace mágico, verificación, publicación y aislamiento
entre inquilinos— contra la base de datos real. 35 comprobaciones.

---

## Qué está construido

| Pieza | Estado |
|---|---|
| Onboarding conversacional (pantallas 0-8) | ✅ |
| Motor de generación de estructura por reglas | ✅ |
| Generación de textos con IA + respaldo por reglas | ✅ |
| Los 8 bloques del MVP | ✅ |
| Página pública con SSR, OG y datos estructurados | ✅ |
| Registro de visitas, clics y conversiones | ✅ |
| Recomendaciones accionables ("la frase") | ✅ |
| Banner y registro de consentimiento (RGPD) | ✅ |
| Enlace mágico sin contraseñas | ✅ |
| Panel con métricas, QR y compartir | ✅ |
| Denuncias y suspensión automática | ✅ |
| Generación de QR | ✅ |

### Lo que falta para poder lanzar

Por orden de bloqueo:

1. **Textos legales.** `/legal/*` son plantillas vacías a propósito. Un aviso
   legal genérico copiado de internet es peor que ninguno. Lo redacta el
   abogado con los datos reales de la sociedad.
2. **Stripe.** Planes, checkout, webhook y portal de cliente.
3. **Editor de bloques.** Ahora la página se genera pero no se edita desde el
   panel.
4. **Google Safe Browsing.** La tabla y el hueco están; falta la llamada.
5. **CAPI server-side.** V1, mes 7-9 según el roadmap. No antes de abrir el
   plan Agencia.

---

## Arquitectura

```
Navegador
    │
    ▼
Cloudflare  ──► CDN + caché de páginas públicas
    │
    ▼
Next.js 15 (App Router) en Railway
    │
    ▼
PostgreSQL
```

La decisión de fondo: **un solo stack**. Partirlo entre Cloudflare Workers y
Railway ahorra unos pocos euros al mes y cuesta dos entornos de ejecución, dos
despliegues y dos formas de depurar. Con el equipo disponible, no compensa.

### Mapa del código

```
src/
├── db/
│   ├── schema.ts          Modelo multiinquilino completo
│   ├── index.ts           Conexión (pool reutilizado entre recargas)
│   └── prueba-e2e.ts      Prueba del camino crítico
├── lib/
│   ├── env.ts             Configuración; degrada sin claves opcionales
│   ├── auth.ts            Enlace mágico
│   ├── session.ts         Sesión (cookie firmada + fila en BD)
│   ├── crypto.ts          Cifrado, hashes y normalización para Meta
│   ├── slug.ts            PURO: lo usan componentes de cliente
│   ├── slug-db.ts         Consultas de disponibilidad
│   ├── publicar.ts        Onboarding → página real
│   ├── analitica.ts       Registro y lectura de métricas
│   └── recomendaciones.ts "La frase" del panel
├── onboarding/
│   ├── definicion.ts      Las preguntas y qué decide cada una
│   ├── generador.ts       Respuestas → bloques ordenados con jerarquía
│   └── copy.ts            Textos: reglas primero, IA si hay clave
├── bloques/
│   ├── registro.ts        Los 8 tipos. Lista cerrada
│   ├── tipos.ts           Formas de configuración y constructores de URL
│   └── Render.tsx         Renderizado en servidor
└── app/
    ├── page.tsx           Home (negocio)
    ├── agencias/          Landing de agencias
    ├── crear/             Onboarding
    ├── entrar/            Acceso y verificación
    ├── panel/             Panel
    ├── [slug]/            Página pública
    └── api/               t · lead · consentimiento · slug · qr · denunciar
```

---

## Las decisiones que hay que entender antes de tocar nada

### 0. Todo vive bajo `tuenlace.es/{slug}`. No hay nada separado.

Sin subdominios (`yago.tuenlace.es`) y **sin dominios de cliente**. Una página
es `tuenlace.es/yago` y punto. El `slug` es único globalmente y es la identidad
del cliente.

Tres consecuencias que hay que tener presentes:

- **La lista de palabras reservadas de `src/lib/slug.ts` es crítica.** El slug
  es el único espacio de nombres que existe; recuperar una palabra después
  significa quitarle la URL a un cliente. Amplíala antes de abrir el registro,
  no después.
- **El slug acaba impreso.** En el QR del escaparate, en las tarjetas, en la
  bio. Cambiarlo rompe cosas del mundo físico: trátalo como permanente y, si
  algún día se permite cambiarlo, deja redirección 301 desde el antiguo.
- **Es el motor de marca.** Cada página, incluidas las de pago, lleva
  `tuenlace.es` en la URL. Con dominios de cliente, los clientes que pagan
  desaparecían del escaparate; así se ven siempre.

### 1. `orgId` va en toda consulta. Sin excepciones.

Un particular es una organización con una página; una agencia es una
organización con veinticinco. **No hay dos modelos de datos, hay uno.** Una
fuga de datos entre inquilinos en un producto de agencias es el fin del
producto.

### 2. La página pública funciona sin JavaScript.

Los botones son `<a>` reales con `href` reales. El rastreador se monta encima:
si el script falla, solo se pierde la estadística, nunca el botón. Esto no es
purismo, es que el usuario final está en la calle con mala cobertura.

### 3. La estructura la deciden reglas, no la IA.

La IA solo redacta textos, y solo si hay `AI_API_KEY`. **El orden de los
botones —que es lo que hace que la página convierta— lo decide código
determinista, auditable y gratis.** Si la IA falla o tarda más de 9 segundos,
se usan las reglas y el usuario no se entera.

Los competidores usan IA para escribir una biografía bonita. Nosotros usamos
las preguntas para decidir la estructura de conversión.

### 4. El `event_id` se genera en el servidor.

Es la clave de deduplicación con el píxel de navegador de Meta (ventana: 48 h).
Generarlo en cliente significa depender de que el JS se ejecute. Cuando llegue
el CAPI, se incrusta en el HTML durante el SSR.

### 5. La CAPI no esquiva el consentimiento.

Enviar datos personales desde el servidor es el mismo tratamiento que enviarlos
desde el navegador. La arquitectura es **CMP → señal → puerta**, y el argumento
de venta es la calidad del dato frente a bloqueadores, nunca la evasión del
banner.

### 6. Indexación selectiva por calidad.

Una página nace con `indexable: false`. Indexar miles de páginas de contenido
fino bajo `tuenlace.es` daña la reputación del dominio entero, incluida la web
comercial. Solo se indexan las que superen un umbral: cinco bloques o más,
descripción propia de 80 caracteres, más de 14 días publicada y con visitas
reales.

**Sin dominios de cliente, este umbral importa el doble**: absolutamente todas
las páginas viven bajo `tuenlace.es`, así que no hay ninguna válvula de escape
para el contenido fino. No lo relajes sin mirar Search Console.

### 7. Trust & Safety no es opcional.

Una sola página de phishing puede meter `tuenlace.es` en Google Safe Browsing y
tumbar **todas** las páginas a la vez, incluidos los enlaces ya compartidos por
WhatsApp. Por eso: verificación de email antes de publicar, `nofollow ugc` en
todo enlace saliente, botón de denuncia en cada página y suspensión automática
a las tres denuncias.

---

## Notas de operación

### Base de datos

- Las tablas de analítica hay que **particionar por día** antes de crecer.
  40.000 páginas a 250 visitas son 10 millones de filas al mes.
- Retención: eventos en crudo 90 días, agregados diarios para siempre.
- **Si usáis Neon, elegid Frankfurt el día uno**: la región no se puede cambiar
  después.

### RGPD

Frankfurt y Ámsterdam cumplen igual que Madrid; no hace falta región española.
Lo que sí hace falta: **DPA firmado con cada proveedor** (Cloudflare, Railway,
Neon, Stripe y Resend son estadounidenses aunque los servidores estén en la UE),
apoyo en el EU-US Data Privacy Framework o cláusulas contractuales tipo, y
registro de actividades de tratamiento.

---

## Lo que NO se va a construir

Está aquí para que no se discuta cada tres meses:

```
❌ Tienda de productos digitales con comisión (compites con TikTok Shop)
❌ Media kit para influencers
❌ Programador de publicaciones en redes
❌ Auto-DM de Instagram
❌ CRM propio (tenéis GoHighLevel: integrad, no construyáis)
❌ App móvil nativa
❌ Marketplace de plantillas
❌ Perfiles públicos descubribles
❌ Editor visual libre sin restricciones
❌ Chatbot de soporte con IA
❌ Más de 8 bloques en el MVP
❌ Más de 6 plantillas en el MVP
```

---

## Despliegue en Railway

1. Conecta el repositorio.
2. Añade el plugin de PostgreSQL (o apunta `DATABASE_URL` a Neon en Frankfurt).
3. Variables: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` y las
   opcionales que vayas activando.
4. Build: `npm run build` · Start: `npm start`.
5. Migraciones: `npm run db:migrate` en el *release command*.
6. Pon Cloudflare delante con caché agresiva sobre `/:slug` y purga por
   etiqueta al publicar.

---

## Licencia

Propiedad de Grupo Publistar / Agencia 9 Estrellas. Todos los derechos
reservados.
