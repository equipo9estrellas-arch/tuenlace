'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { CAMPOS_POR_TIPO, leerRuta, recalcularPrioridades, type CampoBloque } from '@/bloques/campos'
import { META_BLOQUES } from '@/bloques/tipos'
import { TIPOS_BLOQUE, type TipoBloque } from '@/bloques/registro'
import type { Tema } from '@/db/schema'
import { ICONO_BLOQUE } from '@/iconos/mapas'
import { IconoAbajoChica, IconoArribaChica, IconoMas, IconoOjo, IconoPapelera } from '@/iconos'
import { borrarBloque, crearBloque, guardarBloques, guardarCabecera, guardarMarca } from './acciones'
import { ICONOS_BOTON } from '@/iconos/botones'
import { colorValido } from '@/bloques/tema'
import { Marca, type MarcaEstado } from './Marca'
import { Subidor } from './Subidor'

export type BloqueInicial = {
  id: string
  tipo: TipoBloque
  orden: number
  activo: boolean
  config: Record<string, unknown>
  esCabecera: boolean
}

type Estado = BloqueInicial & { valores: Record<string, string> }

function aEstado(b: BloqueInicial): Estado {
  const valores: Record<string, string> = {}
  for (const campo of CAMPOS_POR_TIPO[b.tipo]) valores[campo.ruta] = leerRuta(b.config, campo.ruta)
  return { ...b, valores }
}

export function Editor({
  pageId,
  slug,
  titulo: tituloInicial,
  descripcion: descripcionInicial,
  bloques: bloquesIniciales,
  limiteBloques,
  plan,
  marca: marcaInicial,
  puedeSubir,
}: {
  pageId: string
  slug: string
  titulo: string
  descripcion: string
  bloques: BloqueInicial[]
  limiteBloques: number
  plan: string
  marca: MarcaEstado
  puedeSubir: boolean
}) {
  const [bloques, setBloques] = useState<Estado[]>(() => bloquesIniciales.map(aEstado))
  const [titulo, setTitulo] = useState(tituloInicial)
  const [descripcion, setDescripcion] = useState(descripcionInicial)
  const [marca, setMarca] = useState<MarcaEstado>(marcaInicial)
  const [pestana, setPestana] = useState<'contenido' | 'marca'>('contenido')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [sucio, setSucio] = useState(false)
  const [pendiente, iniciar] = useTransition()

  /** Los que se pintan en el editor: la cabecera se edita arriba, aparte. */
  const editables = useMemo(() => bloques.filter((b) => !b.esCabecera), [bloques])

  /** Vista previa de la jerarquía. Se calcula igual que en el servidor. */
  const prioridades = useMemo(
    () => recalcularPrioridades(editables.map((b) => ({ tipo: b.tipo, activo: b.activo }))),
    [editables],
  )

  function tocar() {
    setSucio(true)
    setGuardado(false)
    setError(null)
  }

  function cambiarValor(id: string, ruta: string, valor: string) {
    setBloques((bs) => bs.map((b) => (b.id === id ? { ...b, valores: { ...b.valores, [ruta]: valor } } : b)))
    tocar()
  }

  function alternarActivo(id: string) {
    setBloques((bs) => bs.map((b) => (b.id === id ? { ...b, activo: !b.activo } : b)))
    tocar()
  }

  function mover(id: string, direccion: -1 | 1) {
    setBloques((bs) => {
      const visibles = bs.filter((b) => !b.esCabecera)
      const i = visibles.findIndex((b) => b.id === id)
      const j = i + direccion
      if (i < 0 || j < 0 || j >= visibles.length) return bs
      const copia = [...visibles]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return [...bs.filter((b) => b.esCabecera), ...copia]
    })
    tocar()
  }

  function guardar() {
    setError(null)
    iniciar(async () => {
      const cabecera = await guardarCabecera(pageId, titulo, descripcion)
      if (!cabecera.ok) {
        setError(cabecera.error)
        return
      }

      const m = await guardarMarca(pageId, {
        avatarUrl: marca.avatarUrl,
        portadaUrl: marca.portadaUrl,
        etiqueta: marca.etiqueta,
        tema: marca.tema as Tema,
      })
      if (!m.ok) {
        setError(m.error)
        setPestana('marca')
        return
      }

      const r = await guardarBloques(
        pageId,
        editables.map((b, i) => ({ id: b.id, orden: i, activo: b.activo, valores: b.valores })),
      )
      if (!r.ok) {
        setError(r.error)
        setPestana('contenido')
        if (r.bloqueId) setAbierto(r.bloqueId)
        return
      }
      setSucio(false)
      setGuardado(true)
    })
  }

  function anadir(tipo: TipoBloque) {
    setError(null)
    iniciar(async () => {
      const r = await crearBloque(pageId, tipo)
      if (!r.ok) setError(r.error)
      else window.location.reload()
    })
  }

  function borrar(id: string) {
    setError(null)
    iniciar(async () => {
      const r = await borrarBloque(pageId, id)
      if (!r.ok) setError(r.error)
      else window.location.reload()
    })
  }

  return (
    <div className="pb-32">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">Tu página</h1>
          <a
            href={`/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[14px] text-[var(--color-azul)]"
          >
            <IconoOjo tam={15} />
            Ver cómo queda
          </a>
        </div>
        <Link href="/panel" className="text-[14.5px] font-medium text-[var(--color-tinta-60)]">
          Volver al panel
        </Link>
      </div>

      {/* Dos trabajos distintos: qué dice la página y qué aspecto tiene.
          Mezclarlos en una sola columna hacía scroll de kilómetro y medio. */}
      <div
        role="tablist"
        aria-label="Secciones del editor"
        className="mb-5 inline-flex gap-1 rounded-[12px] border border-[var(--color-borde)] bg-white p-1"
      >
        {(['contenido', 'marca'] as const).map((clave) => (
          <button
            key={clave}
            type="button"
            role="tab"
            aria-selected={pestana === clave}
            onClick={() => setPestana(clave)}
            className={`rounded-[9px] px-4 py-2 text-[14.5px] font-semibold transition-colors ${
              pestana === clave
                ? 'bg-[var(--color-tinta)] text-white'
                : 'text-[var(--color-tinta-60)] hover:text-[var(--color-tinta)]'
            }`}
          >
            {clave === 'contenido' ? 'Contenido' : 'Marca y estilo'}
          </button>
        ))}
      </div>

      {pestana === 'marca' ? (
        <Marca
          estado={marca}
          titulo={titulo}
          descripcion={descripcion}
          puedeSubir={puedeSubir}
          onCambiar={(parcial) => {
            setMarca((m) => ({ ...m, ...parcial }))
            tocar()
          }}
        />
      ) : (
        <>
      {/* Cabecera */}
      <section className="mb-5 rounded-[14px] border border-[var(--color-borde)] bg-white p-5">
        <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-40)]">
          Lo primero que se lee
        </h2>
        <label className="mt-3.5 block">
          <span className="mb-1.5 block text-[14.5px] font-medium">Título</span>
          <input
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value.slice(0, 80))
              tocar()
            }}
            className="h-[50px] w-full rounded-[10px] border-2 border-[var(--color-borde)] px-3.5 text-[16px] outline-none focus:border-[var(--color-acento)]"
          />
        </label>
        <label className="mt-3.5 block">
          <span className="mb-1.5 block text-[14.5px] font-medium">Una frase debajo</span>
          <textarea
            value={descripcion}
            onChange={(e) => {
              setDescripcion(e.target.value.slice(0, 200))
              tocar()
            }}
            rows={2}
            className="w-full resize-none rounded-[10px] border-2 border-[var(--color-borde)] p-3 text-[16px] outline-none focus:border-[var(--color-acento)]"
          />
          <span className="mt-1 block text-[12.5px] text-[var(--color-tinta-40)]">
            Esto es lo que se ve al compartir el enlace por WhatsApp.
          </span>
        </label>
      </section>

      {/* Bloques */}
      <div className="flex flex-col gap-3">
        {editables.map((bloque, i) => (
          <Bloque
            key={bloque.id}
            bloque={bloque}
            prioridad={prioridades[i]}
            primero={i === 0}
            ultimo={i === editables.length - 1}
            abierto={abierto === bloque.id}
            onAbrir={() => setAbierto(abierto === bloque.id ? null : bloque.id)}
            onCambiar={(ruta, valor) => cambiarValor(bloque.id, ruta, valor)}
            onAlternar={() => alternarActivo(bloque.id)}
            onMover={(d) => mover(bloque.id, d)}
            onBorrar={() => borrar(bloque.id)}
            pendiente={pendiente}
            puedeSubir={puedeSubir}
          />
        ))}
      </div>

      {/* Añadir */}
      <section className="mt-5 rounded-[14px] border border-dashed border-[var(--color-borde)] p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <IconoMas tam={17} />
          Añadir un bloque
        </h2>
        <p className="mt-1 text-[13.5px] text-[var(--color-tinta-60)]">
          Llevas {editables.length + 1} de {limiteBloques}
          {plan === 'GRATIS' ? ' del plan gratuito' : ''}.
        </p>
        <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIPOS_BLOQUE.map((tipo) => (
            <button
              key={tipo}
              type="button"
              disabled={pendiente}
              onClick={() => anadir(tipo)}
              className="flex flex-col items-start rounded-[10px] border border-[var(--color-borde)] bg-white p-3 text-left transition-colors hover:border-[var(--color-tinta-40)] disabled:opacity-50"
            >
              <IconoDeTipo tipo={tipo} />
              <span className="mt-2 text-[13.5px] font-semibold">{META_BLOQUES[tipo].nombre}</span>
            </button>
          ))}
        </div>
      </section>
        </>
      )}

      {/* Barra de guardado */}
      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--color-borde)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[720px] items-center gap-3 px-5 py-3.5">
          <p className="min-w-0 flex-1 text-[14px] leading-snug">
            {error ? (
              <span className="text-[var(--color-alerta)]">{error}</span>
            ) : guardado ? (
              <span className="text-[var(--color-exito)]">Guardado. Ya está en tu página.</span>
            ) : sucio ? (
              <span className="text-[var(--color-tinta-60)]">Tienes cambios sin guardar.</span>
            ) : (
              <span className="text-[var(--color-tinta-40)]">Todo guardado.</span>
            )}
          </p>
          <button
            type="button"
            onClick={guardar}
            disabled={pendiente || !sucio}
            className="h-[46px] shrink-0 rounded-[10px] bg-[var(--color-acento)] px-6 text-[15.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            {pendiente ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function IconoDeTipo({ tipo }: { tipo: TipoBloque }) {
  const Icono = ICONO_BLOQUE[tipo]
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-borde-suave)]">
      <Icono tam={17} />
    </span>
  )
}

// ── Un bloque ────────────────────────────────────────────────────────────────

function Bloque({
  bloque,
  prioridad,
  primero,
  ultimo,
  abierto,
  onAbrir,
  onCambiar,
  onAlternar,
  onMover,
  onBorrar,
  pendiente,
  puedeSubir,
}: {
  bloque: Estado
  prioridad: 1 | 2 | 3
  primero: boolean
  ultimo: boolean
  abierto: boolean
  onAbrir: () => void
  onCambiar: (ruta: string, valor: string) => void
  onAlternar: () => void
  onMover: (d: -1 | 1) => void
  onBorrar: () => void
  pendiente: boolean
  puedeSubir: boolean
}) {
  const meta = META_BLOQUES[bloque.tipo]
  const Icono = ICONO_BLOQUE[bloque.tipo]
  const [verApariencia, setVerApariencia] = useState(false)
  const todos = CAMPOS_POR_TIPO[bloque.tipo]
  const contenido = todos.filter((c) => !c.apariencia)
  const apariencia = todos.filter((c) => c.apariencia)
  const resumen = bloque.valores.texto || bloque.valores.titulo || meta.descripcion

  return (
    <section
      className={`rounded-[14px] border bg-white transition-colors ${
        bloque.activo ? 'border-[var(--color-borde)]' : 'border-[var(--color-borde-suave)] bg-[var(--color-borde-suave)]/30'
      }`}
    >
      <div className="flex items-center gap-2.5 p-3.5">
        <div className="flex flex-col">
          <button
            type="button"
            aria-label="Subir"
            disabled={primero || pendiente}
            onClick={() => onMover(-1)}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-tinta-60)] hover:bg-[var(--color-borde-suave)] disabled:opacity-25"
          >
            <IconoArribaChica tam={15} />
          </button>
          <button
            type="button"
            aria-label="Bajar"
            disabled={ultimo || pendiente}
            onClick={() => onMover(1)}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-tinta-60)] hover:bg-[var(--color-borde-suave)] disabled:opacity-25"
          >
            <IconoAbajoChica tam={15} />
          </button>
        </div>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] ${
            bloque.activo
              ? 'bg-[var(--color-borde-suave)] text-[var(--color-tinta)]'
              : 'text-[var(--color-tinta-40)]'
          }`}
        >
          <Icono tam={18} />
        </span>

        <button type="button" onClick={onAbrir} className="min-w-0 flex-1 text-left">
          <span className="flex items-center gap-2">
            <span className="text-[15px] font-semibold">{meta.nombre}</span>
            {bloque.activo && prioridad === 1 && (
              <span className="rounded-full bg-[var(--color-acento)] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">
                Principal
              </span>
            )}
            {!bloque.activo && (
              <span className="rounded-full bg-[var(--color-borde)] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--color-tinta-60)]">
                Oculto
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[13.5px] text-[var(--color-tinta-60)]">
            {resumen}
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={bloque.activo}
          aria-label={bloque.activo ? 'Ocultar bloque' : 'Mostrar bloque'}
          disabled={pendiente}
          onClick={onAlternar}
          className={`h-6 w-10 shrink-0 rounded-full transition-colors ${
            bloque.activo ? 'bg-[var(--color-exito)]' : 'bg-[var(--color-borde)]'
          }`}
        >
          <span
            className={`block h-[18px] w-[18px] rounded-full bg-white transition-transform ${
              bloque.activo ? 'translate-x-[21px]' : 'translate-x-[3px]'
            }`}
          />
        </button>
      </div>

      {abierto && (
        <div className="border-t border-[var(--color-borde-suave)] p-3.5">
          <div className="flex flex-col gap-3.5">
            {contenido.map((campo) => (
              <Campo
                key={campo.ruta}
                campo={campo}
                valor={bloque.valores[campo.ruta] ?? ''}
                puedeSubir={puedeSubir}
                onCambiar={(v) => onCambiar(campo.ruta, v)}
              />
            ))}
          </div>

          {/* La apariencia va plegada: el 90% de las veces el dueño entra a
              cambiar un texto, no a elegir un icono. */}
          {apariencia.length > 0 && (
            <div className="mt-4 rounded-[10px] border border-[var(--color-borde-suave)]">
              <button
                type="button"
                onClick={() => setVerApariencia((v) => !v)}
                aria-expanded={verApariencia}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-[var(--color-tinta-60)]"
              >
                Aspecto de este botón
                {verApariencia ? <IconoArribaChica tam={15} /> : <IconoAbajoChica tam={15} />}
              </button>
              {verApariencia && (
                <div className="flex flex-col gap-4 border-t border-[var(--color-borde-suave)] p-3.5">
                  {apariencia.map((campo) => (
                    <Campo
                      key={campo.ruta}
                      campo={campo}
                      valor={bloque.valores[campo.ruta] ?? ''}
                      puedeSubir={puedeSubir}
                      onCambiar={(v) => onCambiar(campo.ruta, v)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            disabled={pendiente}
            onClick={onBorrar}
            className="mt-4 text-[13.5px] font-medium text-[var(--color-alerta)] disabled:opacity-50"
          >
            Quitar este bloque
          </button>
        </div>
      )}
    </section>
  )
}

function Campo({
  campo,
  valor,
  puedeSubir,
  onCambiar,
}: {
  campo: CampoBloque
  valor: string
  puedeSubir: boolean
  onCambiar: (v: string) => void
}) {
  const clases =
    'w-full rounded-[10px] border-2 border-[var(--color-borde)] bg-white text-[16px] outline-none focus:border-[var(--color-acento)]'

  const titulo = (
    <span className="mb-1.5 block text-[14px] font-medium">
      {campo.etiqueta}
      {!campo.obligatorio && campo.tipo !== 'interruptor' && (
        <span className="ml-1.5 font-normal text-[var(--color-tinta-40)]">(opcional)</span>
      )}
    </span>
  )
  const ayuda = campo.ayuda && (
    <span className="mt-1 block text-[12.5px] leading-snug text-[var(--color-tinta-40)]">
      {campo.ayuda}
    </span>
  )

  if (campo.tipo === 'interruptor') {
    const encendido = valor === 'si'
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] font-medium">{campo.etiqueta}</span>
          <button
            type="button"
            role="switch"
            aria-checked={encendido}
            aria-label={campo.etiqueta}
            onClick={() => onCambiar(encendido ? '' : 'si')}
            className={`h-6 w-10 shrink-0 rounded-full transition-colors ${
              encendido ? 'bg-[var(--color-exito)]' : 'bg-[var(--color-borde)]'
            }`}
          >
            <span
              className={`block h-[18px] w-[18px] rounded-full bg-white transition-transform ${
                encendido ? 'translate-x-[21px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        </div>
        {ayuda}
      </div>
    )
  }

  if (campo.tipo === 'imagen') {
    return (
      <div>
        {titulo}
        <Subidor
          valor={valor}
          puedeSubir={puedeSubir}
          forma="redondeado"
          ayuda={campo.ayuda}
          onCambiar={onCambiar}
        />
      </div>
    )
  }

  if (campo.tipo === 'color') {
    return (
      <div>
        {titulo}
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={campo.etiqueta}
            value={colorValido(valor) ? valor : '#FF5D2E'}
            onChange={(e) => onCambiar(e.target.value)}
            className="h-[42px] w-[54px] shrink-0 cursor-pointer rounded-[9px] border-2 border-[var(--color-borde)] bg-white p-1"
          />
          <input
            value={valor}
            onChange={(e) => onCambiar(e.target.value.trim())}
            placeholder="Sin color propio"
            spellCheck={false}
            className={`h-[42px] min-w-0 flex-1 rounded-[9px] border-2 px-3 font-mono text-[14px] uppercase outline-none ${
              valor && !colorValido(valor)
                ? 'border-[var(--color-alerta)]'
                : 'border-[var(--color-borde)]'
            }`}
          />
          {valor && (
            <button
              type="button"
              onClick={() => onCambiar('')}
              className="shrink-0 rounded-[9px] border-2 border-[var(--color-borde)] px-2.5 py-2 text-[var(--color-tinta-60)] hover:border-[var(--color-alerta)] hover:text-[var(--color-alerta)]"
              aria-label="Quitar el color propio"
            >
              <IconoPapelera tam={15} />
            </button>
          )}
        </div>
        {ayuda}
      </div>
    )
  }

  if (campo.tipo === 'icono') {
    return (
      <div>
        {titulo}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onCambiar('')}
            aria-pressed={valor === ''}
            title="El del tipo de bloque"
            className={`h-10 rounded-[9px] border-2 px-3 text-[12.5px] font-semibold ${
              valor === ''
                ? 'border-[var(--color-tinta)] bg-[var(--color-tinta)] text-white'
                : 'border-[var(--color-borde)] hover:border-[var(--color-tinta-40)]'
            }`}
          >
            Automático
          </button>
          {ICONOS_BOTON.map(({ clave, nombre, Icono: I }) => (
            <button
              key={clave}
              type="button"
              onClick={() => onCambiar(clave)}
              aria-pressed={valor === clave}
              aria-label={nombre}
              title={nombre}
              className={`flex h-10 w-10 items-center justify-center rounded-[9px] border-2 ${
                valor === clave
                  ? 'border-[var(--color-tinta)] bg-[var(--color-tinta)] text-white'
                  : 'border-[var(--color-borde)] hover:border-[var(--color-tinta-40)]'
              }`}
            >
              <I tam={18} />
            </button>
          ))}
        </div>
        {ayuda}
      </div>
    )
  }

  return (
    <label className="block">
      {titulo}
      {campo.tipo === 'textarea' ? (
        <textarea
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          rows={2}
          placeholder={campo.marcador}
          className={`${clases} resize-none p-3`}
        />
      ) : (
        <input
          type={campo.tipo === 'tel' ? 'tel' : campo.tipo === 'email' ? 'email' : 'text'}
          inputMode={campo.tipo === 'tel' ? 'tel' : undefined}
          autoCapitalize={campo.tipo === 'usuario' || campo.tipo === 'url' ? 'none' : undefined}
          autoCorrect={campo.tipo === 'usuario' || campo.tipo === 'url' ? 'off' : undefined}
          spellCheck={campo.tipo === 'usuario' || campo.tipo === 'url' ? false : undefined}
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          placeholder={campo.marcador}
          className={`${clases} h-[48px] px-3.5`}
        />
      )}
      {ayuda}
    </label>
  )
}
