# TUENLACE dentro de Gestiona-lo

TUENLACE (tuenlace.es) es la séptima app de Gestiona-lo, igual que Finanzas, 9 Estrellas, El Foko, Koolor, LPB y 9ven. Su panel de superadmin se construye **dentro de Gestiona-lo**, con su diseño y su menú, y trabaja contra la API de TUENLACE descrita aquí.

Los datos se quedan en TUENLACE (Postgres en Railway). Gestiona-lo no copia nada: lee y actúa a través de la API.

## 1. Cómo se autentica

No hay claves compartidas. El panel llama a la API con **el access token del usuario logueado en Gestiona-lo** (Supabase Auth):

```
Authorization: Bearer <session.access_token>
```

TUENLACE comprueba el token y el permiso **preguntando a la propia central**, con ese mismo token:

1. `GET {SUPABASE_URL}/auth/v1/user` → quién es (si el token no vale, 401).
2. `POST {SUPABASE_URL}/rest/v1/rpc/gp_puede` con `{ p_app: 'tuenlace', p_modulo, p_nivel }` → si puede.

Consecuencias:

- Los permisos se gestionan en Gestiona-lo como en las demás apps (`gp_roles`, `gp_accesos`). TUENLACE no guarda ninguno.
- El superadmin de la central lo es también aquí, sin configurar nada más.
- Si la central exige la verificación en dos pasos y la sesión no la tiene, la API devuelve 403 con «Completa la verificación en dos pasos en Gestiona-lo».
- Lo que se hace desde Gestiona-lo queda en el registro de TUENLACE con el correo de quien lo hizo y `"desde": "Gestiona-lo"`.

## 2. Lo que hay que crear en Gestiona-lo (Supabase)

App, módulos y roles, igual que las demás:

```sql
insert into public.gp_apps (id, nombre, descripcion, interno, url, estado, color, color_texto, iniciales, orden)
values ('tuenlace', 'TUENLACE', 'Cuentas, planes, páginas y denuncias de tuenlace.es', true, '', 'activo',
        '#ff5d2e', '#ffffff', 'TE', 7)
on conflict (id) do nothing;

insert into public.gp_app_modulos (app_id, id, nombre, descripcion, orden) values
  ('tuenlace', 'resumen',   'Resumen',   'Cifras: suscripciones, pruebas, páginas, tráfico', 1),
  ('tuenlace', 'cuentas',   'Cuentas',   'Planes, pruebas, correos, sesiones, entrar como y borrar', 2),
  ('tuenlace', 'paginas',   'Páginas',   'Suspender y reactivar páginas', 3),
  ('tuenlace', 'denuncias', 'Denuncias', 'Revisar denuncias de páginas', 4),
  ('tuenlace', 'registro',  'Registro',  'Todo lo que hacen los superadmins', 5)
on conflict do nothing;
```

Roles: los de sistema (`Administrador` con `es_admin = true` y `Miembro`) y uno de `Consulta` con todos los módulos en `ver`, creados como en las otras apps. **Antes de ejecutar nada, revisa en el código de Gestiona-lo cómo se crean los roles y el logo de una app nueva y sigue ese mismo patrón**; el SQL de arriba es la forma, no un sustituto de las migraciones del proyecto.

Niveles que pide cada cosa:

| Acción | Módulo | Nivel |
|---|---|---|
| Ver resumen, catálogo | `resumen` | ver |
| Ver cuentas y una cuenta | `cuentas` | ver |
| Cambiar plan, fijar prueba, renombrar, cambiar correo, cerrar sesiones | `cuentas` | editar |
| Entrar como el usuario, borrar cuenta | `cuentas` | admin |
| Ver páginas | `paginas` | ver |
| Suspender / reactivar página | `paginas` | editar |
| Ver denuncias | `denuncias` | ver |
| Resolver denuncia | `denuncias` | editar |
| Ver registro | `registro` | ver |

## 3. La API

Base: `https://tuenlace.es/api/gestionalo`

Toda respuesta es JSON: `{ "ok": true, "datos": ... }` o `{ "ok": false, "error": "texto para enseñar" }`.

Códigos: 401 (sin token o caducado: renovar sesión), 403 (sin permiso, o dos pasos pendiente), 404 (no existe), 400 (dato no válido), 429 (más de 300 peticiones por minuto), 503 (TUENLACE no llega a la central).

Las fechas llegan como texto ISO. Los importes, en céntimos (`699` = 6,99 €).

### Lecturas (GET)

| Ruta | Devuelve |
|---|---|
| `/catalogo` | `planes[]` (`clave`, `nombre`, `precioMensualCentimos`, `aLaVenta`), `estadosCuenta` (clave → nombre), `appUrl` |
| `/resumen` | `cuentas` {total, pago, cortesia, prueba, caducadas, altas30, pruebaAcaba3}, `mrrCentimos`, `paginas` {publicadas, suspendidas, borradores}, `visitas30`, `clics30`, `contactos30`, `denunciasAbiertas` |
| `/cuentas?q=&estado=` | hasta 200 cuentas, las más nuevas primero: `id`, `nombre`, `plan`, `pruebaHasta`, `stripeSubscriptionId`, `creadoEn`, `estado`, `correos[]`, `paginas[]` {slug, estado}. `q` busca en nombre, correo y dirección; `estado` = `PAGO` · `CORTESIA` · `PRUEBA` · `CADUCADA` |
| `/cuentas/{orgId}` | `org` (toda la fila), `estado`, `miembros[]` {userId, email, nombre, rol, creadoEn, verificado, sesiones, ultimoUso}, `paginas[]` {id, slug, titulo, estado, motivoSuspension, revisionPendiente, creadoEn, visitas30, contactos, denuncias}, `historial[]` (últimas 30 acciones de superadmin sobre esa cuenta) |
| `/paginas?q=&estado=&revision=1` | hasta 200 páginas: `id`, `slug`, `titulo`, `estado`, `revisionPendiente`, `motivoSuspension`, `orgId`, `orgNombre`, `creadoEn` |
| `/denuncias?ver=abiertas\|resueltas` | `id`, `motivo`, `detalle`, `estado`, `nota`, `creadoEn`, `revisadoEn`, `pageId`, `slug`, `estadoPagina`, `orgId` |
| `/registro` | últimas 300 acciones: `ts`, `adminEmail`, `accion`, `objetivo`, `detalle` |

Estados de cuenta: **De pago** (plan con suscripción en Stripe), **Cortesía** (plan puesto a mano, no cobra), **En prueba** (15 días desde el alta, con todo Esencial), **Sin plan** (prueba terminada: su página no se ve, pero no se borra nada).

### Acciones (POST, cuerpo JSON)

| Ruta | Cuerpo | Notas |
|---|---|---|
| `/cuentas/{orgId}/plan` | `{ "plan": "ESENCIAL" }` | `GRATIS` = sin plan. Si la cuenta paga por Stripe, el próximo aviso de Stripe vuelve a poner el plan que tenga allí |
| `/cuentas/{orgId}/prueba` | `{ "dias": 15 }` | Días desde hoy, de 0 a 365. 0 la termina ya |
| `/cuentas/{orgId}/nombre` | `{ "nombre": "..." }` | |
| `/cuentas/{orgId}/borrar` | `{ "confirmacion": "correo@del.miembro" }` | Irreversible. Pedir que escriban el correo. Si paga por Stripe, avisar de cancelar allí antes |
| `/usuarios/{userId}/email` | `{ "email": "nuevo@correo.com" }` | Cierra sus sesiones |
| `/usuarios/{userId}/cerrar-sesiones` | — | Devuelve `{ sesiones: n }` |
| `/usuarios/{userId}/entrar` | — | Devuelve `{ url, caducaEnSegundos: 120, sesionHasta, email }`. Abrir `url` en una pestaña nueva **en el momento** |
| `/paginas/{pageId}/suspender` | `{ "motivo": "..." }` | El dueño ve el motivo en su panel |
| `/paginas/{pageId}/restaurar` | — | La publica y la saca de revisión |
| `/denuncias/{id}/resolver` | `{ "decision": "desestimar" \| "suspender", "nota": "..." }` | Resuelve todas las abiertas de esa página. Desestimar una página suspendida la vuelve a publicar |

### «Entrar como»

`url` es un enlace de **un solo uso** que caduca en 2 minutos. Al abrirlo, tuenlace.es deja la sesión del cliente (2 horas como máximo) y lleva a su panel con una franja roja: «Estás viendo la cuenta de … como superadmin (desde Gestiona-lo)». El botón «Salir de esta cuenta» cierra esa sesión y vuelve a Gestiona-lo.

Ejemplo:

```ts
const { data: { session } } = await supabase.auth.getSession()
const r = await fetch(`https://tuenlace.es/api/gestionalo/usuarios/${userId}/entrar`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
}).then((r) => r.json())
if (r.ok) window.open(r.datos.url, '_blank', 'noopener')
else avisar(r.error)
```

## 4. Variables en TUENLACE (Railway)

| Variable | Valor |
|---|---|
| `GESTIONALO_SUPABASE_URL` | `https://dpjtrljklbxjnshncmrp.supabase.co` |
| `GESTIONALO_SUPABASE_KEY` | La clave **publicable** (anon) del proyecto de Supabase de Gestiona-lo, la misma que usa su web. Nunca la `service_role` |
| `GESTIONALO_URL` | La dirección de la web de Gestiona-lo (adonde se vuelve al salir y a la que se permite llamar a la API) |
| `GESTIONALO_ORIGENES` | Opcional: más orígenes permitidos, separados por comas (p. ej. el de desarrollo) |

Sin `GESTIONALO_URL` (o `GESTIONALO_ORIGENES`) el navegador bloquea las llamadas por CORS.

## 5. Lo que sigue funcionando en TUENLACE

`tuenlace.es/admin` sigue existiendo para los correos de `SUPERADMINS` y hace exactamente lo mismo (comparten el código de `src/lib/admin-ops.ts`). Cuando el módulo de Gestiona-lo esté en marcha se puede retirar.
