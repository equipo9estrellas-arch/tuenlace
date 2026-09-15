'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  CANALES,
  CATEGORIAS,
  MAX_OBJETIVOS,
  OBJETIVOS,
  campoEsObligatorio,
  camposDeObjetivos,
  camposQueFaltan,
  hayCanalDeRespaldo,
  type CampoRequerido,
  type ClaveCanal,
  type ClaveCategoria,
  type ClaveObjetivo,
} from '@/onboarding/definicion'
import { ICONO_CATEGORIA } from '@/iconos/mapas'
import { IconoAtras, IconoCorreo } from '@/iconos'
import { comprobarSlug, crearEnlace } from './acciones'

/**
 * EL ONBOARDING CONVERSACIONAL
 *
 * Objetivo: menos de 3 minutos desde que entra hasta tener página publicada.
 * Son ~7 pantallas: unos 20 segundos por pantalla. Solo se sostiene si cada
 * pantalla es un clic. En cuanto alguien meta un campo opcional "por si acaso",
 * se rompe.
 *
 * Nota: la pantalla de conectar Instagram del diseño no entra en el MVP —
 * depende de la revisión de la app de Meta, que es un proceso aparte. Se
 * añadirá cuando esos permisos estén aprobados.
 */

const PASOS = ['slug', 'categoria', 'descripcion', 'objetivos', 'canales', 'datos', 'email'] as const
type Paso = (typeof PASOS)[number]

export function Onboarding({ slugInicial }: { slugInicial: string }) {
  const [paso, setPaso] = useState<Paso>(slugInicial ? 'categoria' : 'slug')
  const [slug, setSlug] = useState(slugInicial)
  const [categoria, setCategoria] = useState<ClaveCategoria | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [objetivos, setObjetivos] = useState<ClaveObjetivo[]>([])
  const [canales, setCanales] = useState<ClaveCanal[]>([])
  const [datos, setDatos] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [pendiente, iniciar] = useTransition()

  const indice = PASOS.indexOf(paso)
  const progreso = Math.round(((indice + 1) / PASOS.length) * 100)

  const cat = CATEGORIAS.find((c) => c.clave === categoria)

  /** Los campos a pedir salen de los objetivos elegidos. Ni uno más. */
  const camposRequeridos: CampoRequerido[] = useMemo(
    () => camposDeObjetivos(objetivos),
    [objetivos],
  )

  function avanzar() {
    setError(null)
    const siguiente = PASOS[indice + 1]
    if (siguiente) setPaso(siguiente)
  }

  function retroceder() {
    setError(null)
    const anterior = PASOS[indice - 1]
    if (anterior) setPaso(anterior)
  }

  function alternarObjetivo(clave: ClaveObjetivo) {
    setObjetivos((actuales) => {
      if (actuales.includes(clave)) return actuales.filter((o) => o !== clave)
      if (actuales.length >= MAX_OBJETIVOS) return actuales
      return [...actuales, clave]
    })
  }

  function enviar() {
    setError(null)
    iniciar(async () => {
      const faltan = camposQueFaltan(objetivos, datos)
      if (faltan.length > 0) {
        setError(`Falta ${faltan[0].etiqueta.toLowerCase()}.`)
        setPaso('datos')
        return
      }

      const resultado = await crearEnlace({
        slug,
        categoria,
        descripcionNegocio: descripcion,
        objetivos,
        canales,
        datos,
        email,
      })

      if (!resultado.ok) {
        setError(resultado.error)
        if (resultado.campo === 'slug') setPaso('slug')
        else if (resultado.campo && camposRequeridos.some((c) => c.clave === resultado.campo)) {
          setPaso('datos')
        }
        return
      }
      setEnviado(true)
    })
  }

  if (enviado) return <RevisaTuCorreo email={email} slug={slug} />

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pb-10 pt-6">
      <div className="mb-8 flex items-center gap-4">
        {indice > 0 && (
          <button
            type="button"
            onClick={retroceder}
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-tinta-40)] hover:text-[var(--color-tinta)]"
          >
            <IconoAtras tam={15} />
            Atrás
          </button>
        )}
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-borde)]">
          <div
            className="h-full rounded-full bg-[var(--color-acento)] transition-[width] duration-300"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      {error && (
        <p className="mb-5 rounded-[10px] border border-[color:#F5C6C2] bg-[#FDF0EF] px-3.5 py-2.5 text-[14px] text-[var(--color-alerta)]">
          {error}
        </p>
      )}

      {paso === 'slug' && <PasoSlug slug={slug} setSlug={setSlug} onListo={avanzar} />}

      {paso === 'categoria' && (
        <PasoCategoria
          valor={categoria}
          onElegir={(c) => {
            setCategoria(c)
            avanzar()
          }}
        />
      )}

      {paso === 'descripcion' && (
        <PasoDescripcion
          valor={descripcion}
          ejemplo={cat?.ejemploDescripcion ?? ''}
          onCambiar={setDescripcion}
          onListo={avanzar}
        />
      )}

      {paso === 'objetivos' && (
        <PasoObjetivos
          elegidos={objetivos}
          sugeridos={cat?.objetivosSugeridos ?? []}
          onAlternar={alternarObjetivo}
          onListo={avanzar}
        />
      )}

      {paso === 'canales' && (
        <PasoCanales
          elegidos={canales}
          onAlternar={(c) =>
            setCanales((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]))
          }
          onListo={avanzar}
        />
      )}

      {paso === 'datos' && (
        <PasoDatos
          campos={camposRequeridos}
          objetivos={objetivos}
          valores={datos}
          onCambiar={(clave, valor) => setDatos((d) => ({ ...d, [clave]: valor }))}
          onListo={avanzar}
        />
      )}

      {paso === 'email' && (
        <PasoEmail valor={email} onCambiar={setEmail} onEnviar={enviar} pendiente={pendiente} />
      )}
    </div>
  )
}

// ── Pantalla 0 · Reclamar la URL ─────────────────────────────────────────────

function PasoSlug({
  slug,
  setSlug,
  onListo,
}: {
  slug: string
  setSlug: (v: string) => void
  onListo: () => void
}) {
  const [estado, setEstado] = useState<'vacio' | 'comprobando' | 'libre' | 'ocupado' | 'invalido'>(
    'vacio',
  )
  const [motivo, setMotivo] = useState<string | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (temporizador.current) clearTimeout(temporizador.current)
    if (slug.trim().length < 3) {
      setEstado('vacio')
      return
    }
    setEstado('comprobando')
    temporizador.current = setTimeout(async () => {
      const r = await comprobarSlug(slug)
      if (r.estado === 'invalido') {
        setEstado('invalido')
        setMotivo(r.motivo)
      } else {
        setEstado(r.estado)
        setMotivo(null)
        if (r.estado === 'libre') setSlug(r.slug)
      }
    }, 350)
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  return (
    <Pantalla titulo="Elige tu enlace" ayuda="Podrás cambiarlo más adelante si quieres.">
      <div className="flex items-center rounded-[12px] border-2 border-[var(--color-borde)] bg-white px-4 focus-within:border-[var(--color-acento)]">
        <span className="select-none text-[16px] text-[var(--color-tinta-40)]">tuenlace.es/</span>
        <input
          autoFocus
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          placeholder="minegocio"
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-[58px] min-w-0 flex-1 bg-transparent pl-0.5 text-[17px] font-semibold outline-none placeholder:font-normal placeholder:text-[var(--color-tinta-40)] focus:outline-none focus-visible:outline-none"
        />
      </div>

      <p className="mt-2.5 min-h-[22px] text-[14px]">
        {estado === 'comprobando' && <span className="text-[var(--color-tinta-40)]">Comprobando…</span>}
        {estado === 'libre' && <span className="font-medium text-[var(--color-exito)]">✓ Disponible</span>}
        {estado === 'ocupado' && <span className="text-[var(--color-alerta)]">Ya está cogido. Prueba con otro.</span>}
        {estado === 'invalido' && <span className="text-[var(--color-alerta)]">{motivo}</span>}
      </p>

      <BotonPrincipal onClick={onListo} disabled={estado !== 'libre'}>
        Continuar
      </BotonPrincipal>
    </Pantalla>
  )
}

// ── Pantalla 1 · ¿Quién eres? ────────────────────────────────────────────────

function PasoCategoria({
  valor,
  onElegir,
}: {
  valor: ClaveCategoria | null
  onElegir: (c: ClaveCategoria) => void
}) {
  return (
    <Pantalla titulo="¿Cuál de estas eres tú?">
      <div className="grid grid-cols-2 gap-2.5">
        {CATEGORIAS.map((c) => {
          const Icono = ICONO_CATEGORIA[c.clave]
          return (
          <button
            key={c.clave}
            type="button"
            onClick={() => onElegir(c.clave)}
            className={`flex flex-col items-start rounded-[12px] border-2 bg-white p-4 text-left transition-colors ${
              valor === c.clave
                ? 'border-[var(--color-acento)]'
                : 'border-[var(--color-borde)] hover:border-[var(--color-tinta-40)]'
            }`}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-[11px] ${
                valor === c.clave
                  ? 'bg-[var(--color-acento)] text-white'
                  : 'bg-[var(--color-borde-suave)] text-[var(--color-tinta-80)]'
              }`}
            >
              <Icono tam={21} />
            </span>
            <span className="mt-2.5 text-[15px] font-semibold leading-tight">{c.etiqueta}</span>
            {c.ejemplos && (
              <span className="mt-1 text-[12.5px] leading-snug text-[var(--color-tinta-40)]">
                {c.ejemplos}
              </span>
            )}
          </button>
          )
        })}
      </div>
    </Pantalla>
  )
}

// ── Pantalla 2 · ¿A qué te dedicas? ──────────────────────────────────────────

function PasoDescripcion({
  valor,
  ejemplo,
  onCambiar,
  onListo,
}: {
  valor: string
  ejemplo: string
  onCambiar: (v: string) => void
  onListo: () => void
}) {
  return (
    <Pantalla
      titulo="¿A qué te dedicas?"
      ayuda="Cuéntanoslo en una frase, como se lo dirías a un cliente."
    >
      <textarea
        autoFocus
        value={valor}
        onChange={(e) => onCambiar(e.target.value.slice(0, 160))}
        placeholder={ejemplo}
        rows={3}
        className="w-full resize-none rounded-[12px] border-2 border-[var(--color-borde)] bg-white p-4 text-[16px] leading-[1.5] outline-none focus:border-[var(--color-acento)]"
      />
      <p className="mt-1.5 text-right text-[13px] text-[var(--color-tinta-40)]">
        {valor.length} / 160
      </p>
      <BotonPrincipal onClick={onListo} disabled={valor.trim().length < 8}>
        Continuar
      </BotonPrincipal>
    </Pantalla>
  )
}

// ── Pantalla 3 · La pregunta que lo decide todo ──────────────────────────────

/**
 * Esta pantalla NO llega con nada marcado, y es a propósito.
 *
 * Antes se premarcaban los tres objetivos sugeridos por la categoría. Parecía
 * un atajo amable y era una trampa: al llegar con el cupo lleno, el resto de
 * opciones salían en gris, y quien pulsaba las que quería estaba DESmarcando.
 * La gente acababa con un objetivo en vez de tres sin enterarse.
 *
 * Responder por el usuario la única pregunta que decide la estructura de su
 * página, y además en silencio, no ahorra un paso: se lo salta. La sugerencia
 * se queda como etiqueta, que informa sin decidir.
 */
function PasoObjetivos({
  elegidos,
  sugeridos,
  onAlternar,
  onListo,
}: {
  elegidos: ClaveObjetivo[]
  sugeridos: ClaveObjetivo[]
  onAlternar: (c: ClaveObjetivo) => void
  onListo: () => void
}) {
  const completo = elegidos.length >= MAX_OBJETIVOS
  return (
    <Pantalla
      titulo="Cuando alguien llega a tu enlace, ¿qué quieres que haga?"
      ayuda={`Elige hasta ${MAX_OBJETIVOS}. El orden importa: el primero será el botón más grande de tu página.`}
    >
      <div className="flex flex-col gap-2">
        {OBJETIVOS.map((o) => {
          const posicion = elegidos.indexOf(o.clave)
          const elegido = posicion >= 0
          const bloqueado = completo && !elegido
          const recomendado = sugeridos.includes(o.clave)
          return (
            <button
              key={o.clave}
              type="button"
              disabled={bloqueado}
              aria-pressed={elegido}
              onClick={() => onAlternar(o.clave)}
              className={`flex items-center gap-3 rounded-[12px] border-2 bg-white px-4 py-3.5 text-left transition-colors ${
                elegido
                  ? 'border-[var(--color-acento)]'
                  : bloqueado
                    ? 'cursor-not-allowed border-[var(--color-borde-suave)] opacity-45'
                    : 'border-[var(--color-borde)] hover:border-[var(--color-tinta-40)]'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  elegido
                    ? 'bg-[var(--color-acento)] text-white'
                    : 'border-2 border-[var(--color-borde)] text-transparent'
                }`}
              >
                {elegido ? posicion + 1 : '·'}
              </span>
              <span className="text-[15.5px] font-medium">{o.etiqueta}</span>
              {recomendado && !elegido && (
                <span className="ml-auto shrink-0 rounded-full bg-[var(--color-borde-suave)] px-2 py-0.5 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-tinta-60)]">
                  Recomendado
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-3 min-h-[20px] text-center text-[13px] text-[var(--color-tinta-40)]">
        {completo
          ? `Ya tienes ${MAX_OBJETIVOS}. Quita uno si quieres cambiarlo.`
          : elegidos.length > 0
            ? `${elegidos.length} de ${MAX_OBJETIVOS} elegidos.`
            : ''}
      </p>

      <BotonPrincipal onClick={onListo} disabled={elegidos.length === 0}>
        Continuar
      </BotonPrincipal>
    </Pantalla>
  )
}

// ── Pantalla 4 · ¿Dónde vas a poner el enlace? ───────────────────────────────

function PasoCanales({
  elegidos,
  onAlternar,
  onListo,
}: {
  elegidos: ClaveCanal[]
  onAlternar: (c: ClaveCanal) => void
  onListo: () => void
}) {
  return (
    <Pantalla titulo="¿Dónde vas a usar este enlace?" ayuda="Puedes marcar varios.">
      <div className="flex flex-col gap-2">
        {CANALES.map((c) => {
          const elegido = elegidos.includes(c.clave)
          return (
            <button
              key={c.clave}
              type="button"
              onClick={() => onAlternar(c.clave)}
              className={`flex items-start gap-3 rounded-[12px] border-2 bg-white px-4 py-3.5 text-left transition-colors ${
                elegido ? 'border-[var(--color-acento)]' : 'border-[var(--color-borde)]'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-[12px] font-bold text-white ${
                  elegido ? 'bg-[var(--color-acento)]' : 'border-2 border-[var(--color-borde)]'
                }`}
              >
                {elegido ? '✓' : ''}
              </span>
              <span>
                <span className="block text-[15.5px] font-medium">{c.etiqueta}</span>
                {elegido && (
                  <span className="mt-0.5 block text-[13px] leading-snug text-[var(--color-tinta-60)]">
                    {c.consecuencia}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <BotonPrincipal onClick={onListo}>Continuar</BotonPrincipal>
    </Pantalla>
  )
}

// ── Pantalla 6 · Solo los datos que hacen falta ──────────────────────────────

/** Enlaces que, si se dejan vacíos, hacen que el botón salga por otro canal. */
const CON_RESPALDO: Record<string, string> = {
  urlReservas: 'el botón de cita',
  urlCatalogo: 'el botón de carta o servicios',
  urlTienda: 'el botón de compra',
}

/**
 * Aquí se cierra el agujero: lo que esta pantalla deja pasar es EXACTAMENTE
 * lo que el generador sabe construir. Una sola definición, en definicion.ts.
 * Antes el formulario aceptaba un enlace de reservas vacío y el generador,
 * al no encontrarlo, borraba el objetivo entero sin decir nada.
 */
function PasoDatos({
  campos,
  objetivos,
  valores,
  onCambiar,
  onListo,
}: {
  campos: CampoRequerido[]
  objetivos: ClaveObjetivo[]
  valores: Record<string, string>
  onCambiar: (clave: string, valor: string) => void
  onListo: () => void
}) {
  const obligatorio = (c: CampoRequerido) => campoEsObligatorio(c, objetivos, valores)
  const completo = campos.every((c) => !obligatorio(c) || valores[c.clave]?.trim())
  const canalRespaldo = valores.telefonoWhatsapp?.trim()
    ? 'tu WhatsApp'
    : valores.telefono?.trim()
      ? 'tu teléfono'
      : valores.emailAvisos?.trim()
        ? 'tu formulario de contacto'
        : null
  const conRespaldo = hayCanalDeRespaldo(valores)

  return (
    <Pantalla titulo="Ya casi está" ayuda="Solo te pedimos lo que hace falta para tus botones.">
      <div className="flex flex-col gap-4">
        {campos.map((campo) => {
          const esObligatorio = obligatorio(campo)
          const respaldo =
            !esObligatorio && conRespaldo && !valores[campo.clave]?.trim()
              ? CON_RESPALDO[campo.clave]
              : undefined
          return (
          <label key={campo.clave} className="block">
            <span className="mb-1.5 block text-[14.5px] font-medium">
              {campo.etiqueta}
              {!esObligatorio && (
                <span className="ml-1.5 font-normal text-[var(--color-tinta-40)]">(opcional)</span>
              )}
            </span>
            {campo.tipo === 'textarea' ? (
              <textarea
                value={valores[campo.clave] ?? ''}
                onChange={(e) => onCambiar(campo.clave, e.target.value)}
                rows={2}
                className="w-full resize-none rounded-[10px] border-2 border-[var(--color-borde)] bg-white p-3 text-[16px] outline-none focus:border-[var(--color-acento)]"
              />
            ) : (
              <input
                type={campo.tipo === 'tel' ? 'tel' : campo.tipo === 'email' ? 'email' : 'text'}
                inputMode={campo.tipo === 'tel' ? 'tel' : undefined}
                value={valores[campo.clave] ?? ''}
                onChange={(e) => onCambiar(campo.clave, e.target.value)}
                className="h-[52px] w-full rounded-[10px] border-2 border-[var(--color-borde)] bg-white px-3.5 text-[16px] outline-none focus:border-[var(--color-acento)]"
              />
            )}
            {campo.ayuda && (
              <span className="mt-1 block text-[12.5px] leading-snug text-[var(--color-tinta-40)]">
                {campo.ayuda}
              </span>
            )}
            {respaldo && (
              <span className="mt-1 block text-[12.5px] leading-snug text-[var(--color-tinta-60)]">
                Si lo dejas vacío, {respaldo} irá a {canalRespaldo}. Sigue funcionando.
              </span>
            )}
          </label>
          )
        })}
      </div>

      <BotonPrincipal onClick={onListo} disabled={!completo}>
        Continuar
      </BotonPrincipal>
    </Pantalla>
  )
}

// ── Pantalla 7 · El correo ───────────────────────────────────────────────────

function PasoEmail({
  valor,
  onCambiar,
  onEnviar,
  pendiente,
}: {
  valor: string
  onCambiar: (v: string) => void
  onEnviar: () => void
  pendiente: boolean
}) {
  const valido = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(valor)
  return (
    <Pantalla
      titulo="¿A qué correo te mandamos tu página?"
      ayuda="Sin contraseñas. Te llega un enlace y entras."
    >
      <input
        autoFocus
        type="email"
        inputMode="email"
        autoComplete="email"
        value={valor}
        onChange={(e) => onCambiar(e.target.value.trim())}
        placeholder="tu@correo.com"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && valido && !pendiente) onEnviar()
        }}
        className="h-[58px] w-full rounded-[12px] border-2 border-[var(--color-borde)] bg-white px-4 text-[17px] outline-none focus:border-[var(--color-acento)]"
      />
      <BotonPrincipal onClick={onEnviar} disabled={!valido || pendiente}>
        {pendiente ? 'Montando tu página…' : 'Publicar mi enlace'}
      </BotonPrincipal>
      <p className="mt-3 text-center text-[12.5px] leading-snug text-[var(--color-tinta-40)]">
        Al continuar aceptas los términos y la política de privacidad.
      </p>
    </Pantalla>
  )
}

function RevisaTuCorreo({ email, slug }: { email: string; slug: string }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[460px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-borde-suave)] text-[var(--color-acento)]">
        <IconoCorreo tam={30} />
      </div>
      <h1 className="mt-4 text-[24px] font-bold leading-tight tracking-[-0.02em]">
        Mira tu correo
      </h1>
      <p className="mt-3 text-[15.5px] leading-[1.55] text-[var(--color-tinta-60)]">
        Hemos enviado un enlace a <strong className="text-[var(--color-tinta)]">{email}</strong>.
        Púlsalo y tu página <strong className="text-[var(--color-tinta)]">tuenlace.es/{slug}</strong>{' '}
        queda publicada.
      </p>
      <p className="mt-6 text-[13px] text-[var(--color-tinta-40)]">
        ¿No lo ves? Mira en spam. El enlace caduca en 30 minutos.
      </p>
    </div>
  )
}

// ── Piezas compartidas ───────────────────────────────────────────────────────

function Pantalla({
  titulo,
  ayuda,
  children,
}: {
  titulo: string
  ayuda?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h1 className="text-[25px] font-bold leading-[1.22] tracking-[-0.02em]">{titulo}</h1>
      {ayuda && (
        <p className="mt-2 text-[15px] leading-[1.5] text-[var(--color-tinta-60)]">{ayuda}</p>
      )}
      <div className="mt-6">{children}</div>
    </div>
  )
}

function BotonPrincipal({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-7 h-[56px] w-full rounded-[12px] bg-[var(--color-acento)] text-[16.5px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  )
}
