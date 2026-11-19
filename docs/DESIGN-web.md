# DESIGN · web pública de TUENLACE (home y /agencias)

Rediseño premium, noviembre de 2026. El panel y las páginas de los clientes no cambian.

## 1. Atmósfera
Negro cálido y tipografía editorial. Mucho aire y pocas cosas a la vez. Tiene que parecer un producto serio de una agencia de aquí, no una app de startup. El color de marca se usa como brasa: aparece muy poco.

## 2. Color (variables en `.lujo`, globals.css)
| Token | Valor | Uso |
|---|---|---|
| `--l-fondo` | `#0b0a09` | Fondo |
| `--l-elevado` | `#151311` | Tarjetas, teléfono |
| `--l-hueso` | `#f2ede4` | Texto y botón principal |
| `--l-tenue` | `rgba(242,237,228,.58)` | Texto secundario |
| `--l-brasa` | `#e07a52` | Acento desaturado del naranja de marca. Solo para detalles: puntos, números y la palabra clave del titular |

El botón principal es hueso sobre negro, no naranja.

## 3. Tipografía
- Display: Bricolage Grotesque (autoalojada con @fontsource), peso 600, tracking −0.045em e interlineado 0.98. La palabra clave va en brasa, sin cursiva. (Instrument Serif descartada por Diego el 19-nov-2026.)
- Texto: Inter Variable.
- Kickers: Inter en mayúsculas con tracking de 0.28em y 11-12px.

## 4. Componentes
- **Botón principal:** fondo hueso y texto negro, 999px de radio. En hover sube 1px y aparece un brillo. En active vuelve a su sitio. En focus lleva un anillo de 2px en brasa. No hay estado disabled en la landing.
- **Botón secundario:** borde de 1px hueso al 25 % y texto hueso. En hover el borde pasa al 60 %.
- **Tarjeta bento:** fondo elevado, borde hueso al 8 % y 28px de radio. Lleva un foco de luz que sigue al cursor (variables `--mx` y `--my`), solo en `(hover: hover)`.
- **Teléfono:** maqueta hecha con HTML (no es imagen). Tiene una página de ejemplo marcada como «Ejemplo», y su URL cambia mientras escribes en el campo del hero.

## 5. Layout
Ancho de 1200px como máximo. Secciones con `clamp(6rem, 14vh, 11rem)` de padding vertical. Se alternan secciones contenidas, a sangre completa (la frase del problema y la marquesina) y la asimétrica (el hero, en dos columnas).

## 6. Profundidad
Grano SVG al 5 % en overlay. Dos glows de brasa muy tenues fuera de encuadre. Sombra larga bajo el teléfono.

## 7. Movimiento (N2 sin librerías)
- Reveals por IntersectionObserver con `data-r` (sube y aparece) y `data-r="palabras"` (palabra a palabra).
- Marquesina CSS con los canales.
- Inclinación del teléfono con el puntero, con damping exponencial (λ=6) y rAF.
- Foco de luz de las tarjetas por variables CSS.
- Con `prefers-reduced-motion` todo queda en su estado final visible: no hay inclinación ni marquesina.

## 8. Do's & don'ts
- Sí: los precios salen de `PLANES` y los textos describen solo lo que existe en el código.
- Sí: el ejemplo del teléfono va marcado como ejemplo.
- Sí: se animan solo `transform` y `opacity`.
- No: testimonios, logos de clientes ni cifras de uso. Todavía no hay datos reales.
- No: degradados como hueco de imagen ni recuadros «foto aquí».
- No: rejillas de tarjetas iguales en la zona de funciones.
- No: el naranja saturado en botones grandes.
- No: menciones ni comparativas con otras marcas.
- No: `filter: blur` en elementos que se mueven.

## 9. Responsive
En móvil el hero pasa a una columna, con el teléfono debajo del campo y sin inclinación. El bento pasa a una columna. El titular usa `clamp(2.6rem, 9vw, 6.2rem)`. Margen lateral de 20px y sin scroll horizontal (la marquesina va con `overflow: hidden`).
