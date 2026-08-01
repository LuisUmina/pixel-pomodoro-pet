# pixel-pomodoro-pet

Pomodoro de escritorio siempre visible con una mascota pixel-art developer.

Una ventana sin bordes, transparente y **always-on-top** que flota sobre el
editor. Un pato de goma —el del *rubber duck debugging*— reacciona a lo que
estás haciendo: se concentra contigo, descansa contigo y celebra cuando cierras
un pomodoro.

![El widget flotando sobre el terminal](docs/widget-native.png)

Cambiar de tema repinta también al pato:

| Tokyo Night | Dracula | Gruvbox |
| --- | --- | --- |
| ![](docs/theme-tokyo-night.png) | ![](docs/theme-dracula.png) | ![](docs/theme-gruvbox.png) |

## Qué tiene

- **Timer pomodoro completo**: 25 / 5 / 15 configurables, rondas por ciclo y
  descanso largo. Los descansos arrancan solos; el siguiente focus no, para que
  volver sea una decisión consciente.
- **Mascota animada** con cinco estados: `idle`, `focus`, `rest`, `celebrate` y
  `sleepy`. Respira, parpadea y le salen chispas al terminar una sesión.
- **Ajustes editables** detrás del engrane: duraciones de focus, descanso corto
  y largo, rondas por ciclo y auto-arranque. Cambiar una duración con el timer
  corriendo respeta el tiempo que ya llevas.
- **Tamaño ajustable** — cuatro presets (80 / 100 / 125 / 150 %) y un grip en
  la esquina para redimensionar arrastrando. La ventana nativa se redimensiona
  con la interfaz, y el pixel art se mantiene nítido en cada escala.
- **Temas de editor** — Tokyo Night, Dracula y Gruvbox. Cambiar de tema
  **repinta también al pato**, no solo la interfaz.
- **Reloj en fuente pixel propia**, dibujada con el mismo motor de sprites que
  la mascota. Nítida a cualquier escala y sin un solo asset binario.
- **Auto-fade**: seis segundos después de arrancar una sesión el widget baja a
  42 % de opacidad y vuelve al pasar el mouse. Sin esto, algo que se superpone a
  todo se vuelve insoportable en una hora.
- **Modo click-through**: el widget deja de capturar el mouse por completo y
  flota de verdad sobre el IDE.
- **Bandeja del sistema y hotkeys globales**, para manejar el timer sin salir
  del editor.
- **No roba el foco**: aparece sin robarle el teclado a lo que estés haciendo,
  que es la diferencia entre un widget y un estorbo.
- **Recuerda dónde lo dejaste**: posición y tamaño de la ventana, tema, tarea y
  pomodoros del día.

## Atajos

| Atajo | Acción |
| --- | --- |
| `Ctrl+Alt+Space` | Start / Pause |
| `Ctrl+Alt+N` | Saltar fase |
| `Ctrl+Alt+R` | Reiniciar fase |
| `Ctrl+Alt+G` | Click-through on / off |
| `Ctrl+Alt+H` | Ocultar / mostrar el widget |

Los dos últimos existen porque sus botones son **puertas de una sola dirección**:
un widget que ignora el cursor o que está oculto no se puede clickear para
deshacerlo. La bandeja también sirve, pero su icono se pierde con facilidad en
los iconos ocultos de Windows, así que el teclado es la salida garantizada.
Cerrar y volver a abrir la app también limpia el click-through: ese estado no
se persiste, a propósito.

Mientras el click-through está activo, la barra de título lo dice —
`~/focus [ghost]`— porque si no, el modo sería invisible.

## Desarrollo

```bash
npm install
npm run app:dev      # app nativa con hot reload
npm run dev          # solo el frontend, en el navegador
npm test             # tests del núcleo y de los sprites
npm run typecheck    # app + tooling de build
npm run app:build    # instalador NSIS para Windows
npm run icons        # regenera los iconos desde el sprite del pato
```

Requiere Node 20+ y el toolchain de Rust. En Windows además hacen falta las
Build Tools de MSVC y WebView2 (ya viene con Windows 10/11).

## Arquitectura

```
src/
  core/        Timer y rotación de fases. Funciones puras, sin DOM ni Tauri.
  sprites/     Datos de pixel art (JSON) + renderer a canvas + temas.
  ui/          DOM, canvas de la mascota y del reloj, auto-fade.
  platform/    Única frontera con Tauri, detrás de una interfaz.
  store/       Preferencias, con lectura defensiva.
  audio/       Blips chiptune sintetizados con WebAudio.
src-tauri/     Ventana, bandeja y hotkeys. Nada de lógica de dominio.
tests/         Vitest sobre core/ y sprites/.
```

Cuatro decisiones que vale la pena explicar:

**El timer es un reducer puro.** `reduce(state, event, settings)` no toca el
reloj ni el DOM, así que los casos incómodos —descanso largo al cuarto round,
saltar una fase, auto-start— se prueban sin levantar la app. El `Ticker` mide
tiempo real transcurrido en vez de confiar en que el `setInterval` disparó
puntual, de modo que una webview throttleada o un portátil suspendido no
desfasan la cuenta.

**Los sprites son datos, no imágenes.** `duck.json` es una grilla de caracteres
donde cada uno indexa una paleta. Eso hace que el arte sea diffeable en git,
pese bytes, y —lo importante— que un tema pueda repintar al pato cambiando la
paleta. Las expresiones son *parches* de unos pocos píxeles sobre la base, no
una grilla completa por estado.

**El icono se genera del mismo JSON.** `scripts/generate-icon.mjs` lee
`duck.json` y escribe el PNG que `tauri icon` reparte a todos los tamaños, con
un encoder PNG de 40 líneas para no arrastrar una librería de canvas. El icono
de la barra de tareas y el pato en pantalla no pueden divergir.

**Tauri solo hace lo que la web no puede.** Ventana sin bordes, transparencia,
bandeja y hotkeys viven en Rust; todo el dominio vive en la webview. La capa
`platform/` mantiene los imports de Tauri en un archivo, lo que además permite
abrir el widget en un navegador con `npm run dev`, donde cada llamada al shell
es un no-op en vez de un crash.

## Limitaciones conocidas

- Sobre aplicaciones en **fullscreen exclusivo** (juegos, algunos reproductores)
  Windows no respeta el always-on-top. Es del sistema operativo, no del stack.
- Solo se ha probado en Windows. El código no tiene nada específico de la
  plataforma, pero macOS y Linux están sin verificar.

## Roadmap

La dirección es convertirlo en una **mascota virtual que además lleva tu
pomodoro**: que se mueva por su cuenta, que hable, que sirva de recordatorio,
que puedas cambiarle el personaje y que lleve la cuenta de tus rachas.

Está desglosado en nueve fases ordenadas de menos a más costosa, cada una
lanzable por separado, en **[docs/ROADMAP.md](docs/ROADMAP.md)**.
