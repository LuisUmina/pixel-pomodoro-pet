# Roadmap

De pomodoro con mascota a **mascota virtual que además lleva tu pomodoro**.

Las fases están ordenadas de menos a más costosa. Cada una es un incremento
que se puede lanzar solo: al terminar cualquiera, la app sigue siendo usable y
tiene sentido. No hay que hacerlas todas ni en este orden, pero las
dependencias sí se respetan.

**Estado:** v0.1 entregada. **Fases 1–4 terminadas.** El resto sin empezar.

---

## Índice

| # | Fase | Costo | Depende de |
| --- | --- | --- | --- |
| 1 | [Burbujas de diálogo](#fase-1--burbujas-de-diálogo) ✅ | S | — |
| 2 | [Recordatorios](#fase-2--recordatorios) ✅ | S/M | 1 |
| 3 | [Vida propia del pato](#fase-3--vida-propia-del-pato) ✅ | M | — |
| 4 | [Personajes intercambiables](#fase-4--personajes-intercambiables) ✅ | M | — |
| 5 | [Modo mascota (sin marco)](#fase-5--modo-mascota-sin-marco) | M/L | — |
| 6 | [Historial, rachas y heatmap](#fase-6--historial-rachas-y-heatmap) | L | — |
| 7 | [Ánimo de la mascota](#fase-7--ánimo-de-la-mascota) | M | 1, 3, 6 |
| 8 | [Deambular por el escritorio](#fase-8--deambular-por-el-escritorio) | L | 3, 5 |
| 9 | [Objetivos y tareas](#fase-9--objetivos-y-tareas) | XL | — |

**Siguiente recomendada:** la **6** (historial, rachas y heatmap), que es la
única grande sin dependencias que queda y la que alimenta a la **7**. La
alternativa es la **5** (modo mascota sin marco), más vistosa pero con el
problema técnico del click-through por resolver.

---

## Principios

Reglas que salieron de construir v0.1 y que aplican a todo lo que sigue.

**Nada roba el foco.** Ya nos costó un bug real: la ventana se llevaba el
teclado y las teclas que escribías en tu editor terminaban en el widget.
Ninguna burbuja, panel o ventana nueva puede volver a hacerlo.

**Toda puerta tiene salida por teclado.** Click-through y ocultar fueron
puertas de una sola dirección hasta que les pusimos `Ctrl+Alt+G` y
`Ctrl+Alt+H`. Cualquier modo nuevo que pueda dejar el widget inalcanzable
nace con su atajo.

**El arte y el contenido son datos.** Sprites, temas y fuente ya son JSON.
Los mensajes, los personajes y los recordatorios también. Añadir un personaje
o cien frases no debería tocar una línea de TypeScript.

**El núcleo sigue puro.** `core/` no toca DOM ni Tauri. Rachas, selección de
mensajes, agenda de recordatorios y atribución de tareas son funciones puras
con tests, no lógica enterrada en un componente.

**Se puede apagar todo.** Una mascota que habla es encantadora el primer día
y motivo de desinstalación el tercero si no se puede callar. Cada cosa que
interrumpe nace con su interruptor y su modo silencio.

---

## Fase 1 — Burbujas de diálogo ✅

**Terminada · Costo: S · Desbloquea la fase 2**

Entregado tal como estaba planeado, con dos desviaciones que vale la pena
dejar anotadas:

- **La burbuja no tiene cola.** El escenario mide apenas más que el pato, así
  que cualquier cola apuntando hacia abajo cae sobre su cabeza y no se ve
  nunca. La caja encima del pato se lee igual de bien y encaja mejor con la
  estética de terminal.
- **El texto se revela con un reflow síncrono, no con `requestAnimationFrame`.**
  Un widget que se pasa la vida sin foco no puede confiar en que el navegador
  le dé un frame cuando lo pide: en las pruebas, `rAF` no disparó y la burbuja
  se quedaba en el DOM con opacidad 0.

Los recordatorios de la fase 2 se entregan por este mismo canal.

---

<details>
<summary>Plan original</summary>

**Costo: S · Sin dependencias · Desbloquea la fase 2**

El pato dice cosas en una burbuja pixel-art anclada a su cabeza. Es la base
de casi todo lo demás: los recordatorios, las reacciones al historial y el
ánimo se entregan por este mismo canal.

**Qué incluye**

- Catálogo de mensajes como datos (`src/messages/*.json`), etiquetados por
  disparador y por tono.
- Burbuja dibujada con el motor de sprites que ya existe, con cola apuntando
  al personaje y colores del tema activo.
- Disparadores: arranque de focus, fin de fase, entrada a descanso, hitos
  (3.º pomodoro del día, ronda antes del descanso largo), inactividad larga,
  vuelta después de mucho rato.
- Se desvanece sola; clic para descartarla ya.

**Complementos que le hacen falta para no ser molesta**

- **Tono configurable.** No a todo el mundo le sirve lo mismo: `dev`
  (sarcasmo de programador), `motivacional`, `seco` (solo lo funcional),
  `mudo`. Sin esto, la mitad de la gente odia la función.
- **Límite de frecuencia.** Nunca más de una burbuja cada N minutos, y nunca
  dos seguidas del mismo tipo. Un pato que habla cada dos minutos se cierra.
- **Contexto, no aleatoriedad.** Un mensaje que sabe en qué fase estás, qué
  ronda llevas y qué hora es vale diez veces uno al azar. "Cuarto seguido, ya
  ganaste el día" pega distinto que una frase de calendario motivacional.
- **Sin sonido por defecto.** El chime ya existe para las fases; las burbujas
  llegan calladas salvo que las actives.

**Toca:** `src/messages/` (nuevo), `src/ui/bubble.ts` (nuevo),
`src/core/dialogue.ts` (nuevo, puro y testeable), `widget.ts`,
`settings-panel.ts`, `styles.css`.

</details>

---

## Fase 2 — Recordatorios ✅

**Terminada · Costo: S/M**

Los cinco packs entregados con switches y cadencia, anclados a la fase, más
el modo silencio. Tres cosas que el plan no decía:

- **`OFF` de voz se lleva los recordatorios.** Llegan por la misma burbuja,
  así que cualquier otra cosa haría del label una mentira. Los switches se
  ven deshabilitados mientras la voz está en `OFF`, y `PLAIN` quedó como la
  opción "útil pero sin bromas".
- **Todo lo que interrumpe entra por un solo `utter()`**, que arranca el
  enfriamiento y aplica el silencio. Sin ese cuello de botella un canal nuevo
  se saltaría las reglas por descuido.
- **`RESTORE DEFAULTS` pasó a resetear todo el panel.** Antes solo tocaba las
  duraciones, lo cual ya era discutible y se volvió falso cuando voz,
  recordatorios y silencio se mudaron encima del botón.
- **Los packs cuentan tiempo de sesión, no tiempo de reloj**, y lo acumulan
  desde el ticker en vez de desde un sondeo. La regla 20-20-20 mide veinte
  minutos mirando una pantalla: veinte minutos con el widget abierto sin
  usarlo no pueden contar. Y un sondeo de una vez por minuto tendría que
  adivinar de qué lado de una pausa cae cada intervalo — el ticker ya mide
  eso exacto, cuatro veces por segundo y solo mientras corre.

Los recordatorios propios del usuario (texto libre + cadencia) siguen fuera:
son los que necesitan una pantalla de edición completa. Queda como **2b**, a
retomar solo si los packs se quedan cortos con el uso real.

---

<details>
<summary>Plan original</summary>

**Costo: S/M · Depende de la fase 1**

Aprovechar la burbuja para acordarte de cosas: tomar agua, estirarte,
descansar la vista.

**Qué incluye**

- **Packs incluidos**, listos y con textos escritos: hidratación, postura,
  vista (regla 20-20-20), estiramiento, respiración. Cada uno se prende o
  apaga con un switch y tiene su cadencia.
- **Anclados a la fase**, que es lo que los hace útiles: los de moverse y
  tomar agua caen en el descanso, cuando de verdad te puedes levantar; los de
  vista caen durante el focus, que es cuando llevas 20 minutos sin parpadear.
- **Modo silencio** de N horas para cuando estás en una llamada o presentando.

**Lo que se deja para después dentro de esta misma fase**

Recordatorios propios del usuario (texto libre + cada cuánto + en qué fase).
Es lo que dispara el costo, porque necesita una pantalla de edición completa.
Los packs con toggles cubren el 80 % del valor con el 20 % del trabajo, así
que van primero y esto queda como 2b.

**Toca:** `src/core/reminders.ts` (nuevo, puro), `settings-panel.ts`,
`store/preferences.ts`.

</details>

---

## Fase 3 — Vida propia del pato ✅

**Terminada · Costo: M**

Catorce conductas en los cinco estados, construidas con ocho parches nuevos,
y un planificador con pesos que saca una distinta al final de cada actuación.
El paseo corto entró completo: el pato camina hasta tres píxeles a un lado,
mira alrededor y vuelve.

Lo que el plan no anticipaba:

- **El arte salió más barato de lo previsto** porque los ojos miden dos
  píxeles de lado. Mirar de reojo es mover el brillo al otro lado; mirar
  abajo es que la fila superior tome el color del cuerpo; caminar es que
  una pata pierda su fila de contorno. Nada de eso requiere redibujar nada.
- **Las duraciones desparejas importan más que la cantidad de cuadros.**
  Cuadros de igual largo laten como metrónomo, y ese es el detalle que
  delata un bucle corto por más variedad que tenga.
- **Los tests apuntan a lo que de verdad falla**: que cada ánimo tenga más
  de una opción, que nada se repita al hilo, que toda conducta sea
  alcanzable y que un paseo siempre vuelva al centro — si no, el pato
  derivaría un poco más en cada actuación hasta salirse.

El deambular libre por el escritorio sigue siendo la fase 8, aparte.

---

<details>
<summary>Plan original</summary>

**Costo: M · Sin dependencias**

Que el pato haga cosas por su cuenta en vez de solo respirar y parpadear.

**Qué incluye**

- **Más comportamientos en su sitio:** mirar alrededor, estirarse, sacudirse,
  quedarse dormido en la pausa, teclear en un teclado diminuto durante el
  focus, mirarte cuando pasas el mouse.
- **Un planificador de conducta** que elige el siguiente comportamiento con
  pesos según la fase — en focus teclea más, en descanso se estira más — con
  esperas irregulares para que no se sienta un bucle.
- **Deambular corto** dentro de su zona: ciclo de caminata, volteo horizontal
  según la dirección, y vuelta al centro. Sin salir de la ventana todavía;
  eso es la fase 8.

**El costo real aquí es el arte, no el código.** El motor de parches ya
soporta todo esto; lo que hay que dibujar son los cuadros nuevos, y un ciclo
de caminata decente son varios. Conviene hacer primero los comportamientos
estáticos (baratos, reusan parches de pocos píxeles) y dejar la caminata como
un segundo empujón.

**Toca:** `src/sprites/duck.json` (arte nuevo), `src/sprites/behaviors.ts`
(nuevo), `pet-canvas.ts`.

</details>

---

## Fase 4 — Personajes intercambiables ✅

**Terminada · Costo: M**

Cuatro personajes — pato, ninja, terminal y chispa — elegibles desde ajustes,
persistentes, y repintados por los tres temas. Cómo quedó frente al plan:

- **Las dos familias existen, pero solo como concepto de autoría.** El motor
  no distingue criaturas de emblemas: cada personaje es un JSON autocontenido
  con grilla, parches *y conductas*, así que un emblema simplemente trae
  conductas de efectos (cursor, glow, standby) en vez de parpadeos y pasos.
  Eso dejó el motor más chico de lo planeado, no más grande.
- **El contrato de estados se valida al cargar**, no por convención: un
  personaje sin nada que hacer en algún ánimo no parsea. El parser también
  rechaza parches fuera de grilla, referencias colgantes, duraciones
  congeladas y paseos que no vuelven al centro.
- **Sin vista previa animada en el panel.** La selección aplica al instante y
  el personaje mismo es la vista previa al cerrar. Una preview en miniatura
  habría duplicado instancias del canvas por un beneficio menor.
- **Sin logos reales, como estaba decidido**: la terminal y la chispa son las
  versiones "inspiradas en". La decisión abierta sobre personajes del usuario
  (cargar JSON desde una carpeta) sigue abierta — el formato ya lo permite.

---

<details>
<summary>Plan original</summary>

**Costo: M · Sin dependencias**

Poder cambiar el pato por otra cosa: un ninja, un gato hacker, un emblema de
terminal, logos de herramientas de dev.

**Qué incluye**

- **Registro de personajes:** una carpeta por personaje con su JSON y su
  paleta. Añadir uno nuevo no toca código, solo se suelta el archivo.
- **Un contrato:** todo personaje implementa los mismos estados
  (`idle`, `focus`, `rest`, `celebrate`, `sleepy`). Si falta uno, cae al
  genérico en vez de romperse.
- **Selector en ajustes** con vista previa animada.

**La decisión de diseño que hay que tomar aquí**

Un logo no es una criatura. Un icono de GitHub no puede parpadear ni caminar,
así que si lo metes en el mismo molde que el pato se va a ver muerto. La
salida es admitir **dos familias**:

- **Criaturas** — pato, ninja, gato: anatomía, parpadeo, caminata, expresión.
- **Emblemas** — logos y símbolos: no se anima el cuerpo, se animan
  **efectos**. Pulso, glitch, órbita de partículas, giro lento, barrido de
  scanline, cambio de color al completar. Se ven vivos por otra vía.

Reconocerlo desde el principio evita rediseñar el motor a la mitad.

**Nota práctica:** los logos de marcas ajenas (GitHub, Claude, Codex) son de
ellos. Para tu uso personal no hay problema. Si esto llega a una release
pública, conviene tener versiones "inspiradas en" — un octópodo genérico, un
terminal, un asterisco — y dejar los logos reales como algo que el usuario
añade por su cuenta gracias a que los personajes son archivos sueltos.

**Toca:** `src/sprites/characters/` (nuevo), `duck.ts` → `characters.ts`,
`themes.ts` (las paletas pasan a ser por personaje), `settings-panel.ts`,
`scripts/generate-icon.mjs`.

</details>

---

## Fase 5 — Modo mascota (sin marco)

**Costo: M/L · Sin dependencias**

Quitar la ventana de terminal y dejar solo la silueta con el contador y lo
mínimo indispensable.

**Qué incluye**

- Vista alterna: personaje + reloj, sin marco, sin barra de título, sin
  botonera. El resto de la información aparece al pasar el mouse.
- El reloj **bajo** el sprite en la fuente pixel que ya tenemos, o dentro de
  una placa mínima translúcida. Probar ambas; la de abajo suele leerse mejor
  sobre fondos arbitrarios.
- Alternar entre modo completo y modo mascota con un atajo y desde ajustes.

**El problema técnico que hay que resolver**

Hoy el marco es opaco, así que los clics caen sobre algo. En modo mascota
casi toda la ventana es transparente, pero la ventana **igual captura esos
clics** y bloquea lo que hay detrás. Dos salidas:

1. **Encoger la ventana** para que abrace al sprite. Simple y suficiente si
   el personaje es compacto.
2. **Hit-testing por píxel:** leer el alfa del canvas bajo el cursor y
   alternar `set_ignore_cursor_events` según si hay dibujo o no. Es la
   solución correcta y la que hace falta si el personaje deambula.

Empezar por la 1, subir a la 2 si la fase 8 llega a hacerse.

**Y su salida por teclado**, por el principio de siempre: un widget sin
botones visibles necesita cómo volver.

**Toca:** `styles.css`, `widget.ts`, `src-tauri/src/window.rs`,
`platform/desktop.ts`.

---

## Fase 6 — Historial, rachas y heatmap

**Costo: L · Sin dependencias**

Que el trabajo acumulado se vea. Hoy solo existe el contador del día y se
pierde a medianoche.

**Qué incluye**

- **Almacén de historial:** registro de sesiones por día. No cabe en las
  preferencias actuales, así que es un almacén nuevo con su migración y
  lectura defensiva.
- **Rachas** de días con al menos una sesión, mejor racha, récord de día y de
  semana, total acumulado.
- **Heatmap** estilo contribuciones de GitHub, en un panel aparte.
- El personaje reacciona al historial, lo cual alimenta las burbujas de la
  fase 1.

**El complemento importante: días de descanso.** Una racha que se rompe
porque no trabajaste un sábado es una función que hace que la gente abandone
la app. Dos formas de arreglarlo, y hay que elegir una:

- Meta **semanal** en vez de diaria (N sesiones por semana), o
- comodines: 1-2 días al mes que no rompen la racha.

Sin esto, la función castiga descansar, que es exactamente lo contrario de lo
que un pomodoro debería enseñar.

**Toca:** `src/store/history.ts` (nuevo), `src/core/streaks.ts` (nuevo,
puro), panel nuevo en `ui/`.

---

## Fase 7 — Ánimo de la mascota

**Costo: M · Depende de las fases 1, 3 y 6**

El pegamento. Un modelo diminuto de estado — energía y ánimo — derivado de tu
uso real: cuánto llevas hoy, si vienes de una racha, si llevas cuatro horas
sin descansar de verdad, hace cuánto que no aparecías.

Ese estado decide **qué animación sale y qué mensaje se elige**. Un pato que
lleva seis horas contigo se ve cansado y te lo dice; uno que no te ve desde
el martes te recibe distinto.

Es poco código encima de lo que ya existiría, y es lo que convierte "popups
aleatorios con animaciones" en algo que se siente como una mascota. Por eso
va después: sin las fases 1, 3 y 6 no tiene ni de dónde leer ni por dónde
expresarse.

**Toca:** `src/core/mood.ts` (nuevo, puro), y conexiones en `dialogue.ts`,
`behaviors.ts` y `main.ts`.

---

## Fase 8 — Deambular por el escritorio

**Costo: L · Riesgoso · Depende de las fases 3 y 5**

El personaje camina por el escritorio de verdad, se sienta en el borde
superior de una ventana, se asoma desde una esquina.

**Por qué es la más riesgosa de la lista.** Mover la ventana del sistema
operativo de forma continua pelea contra casi todo lo que ya funciona: la
posición guardada, varios monitores, monitores con distinto DPI, el
click-through, y el costo de CPU de reposicionar una ventana a 60 fps. Y
"sentarse en el borde de una ventana" implica leer la geometría de ventanas
ajenas, que es API nativa de Windows y no es portable.

Vale la pena solo si la fase 5 ya quedó bien y de verdad quieres esto. Un
buen intermedio: que deambule dentro de una ventana ancha y transparente,
que se ve casi igual y no pelea con nada.

**Toca:** `src-tauri/src/window.rs`, `platform/desktop.ts`, `pet-canvas.ts`.

---

## Fase 9 — Objetivos y tareas

**Costo: XL · Sin dependencias, pero es la que más cambia el modelo de datos**

Que el pomodoro trabaje por objetivos: tu lista del día, marcar tareas,
atribuir cada sesión a una tarea.

**Qué incluye**

- Lista de tareas con estimación en pomodoros.
- **Una tarea activa, el resto plegado.** 300 píxeles de ancho no dan para
  una vista de Jira, y la gracia del widget es que no lo sea.
- Atribución: cada pomodoro cerrado suma a la tarea activa, sin que tengas
  que hacer nada.
- Objetivo del día (N sesiones o N tareas) con progreso visible.
- Panel aparte para gestionarlas; la vista compacta solo muestra la activa.

**Por qué va al final:** es la que más toca el modelo de datos, la que más
superficie de UI nueva necesita, y la única que se beneficia de que el
historial (fase 6) ya exista para no inventar dos almacenes distintos.

**El riesgo a vigilar** es de producto, no técnico: esto puede convertir un
widget encantador en un gestor de tareas mediocre compitiendo con los veinte
que ya usas. Mantenerlo deliberadamente pobre en funciones es parte del
diseño — sin subtareas, sin etiquetas, sin fechas, sin proyectos.

**Toca:** `src/core/tasks.ts` (nuevo), `src/store/tasks.ts` (nuevo), panel
nuevo, `main.ts`, `widget.ts`.

---

## Decisiones abiertas

Cosas que hay que resolver antes de tocar la fase correspondiente.

- **Fase 4** — ¿Los personajes se distribuyen con la app o se pueden añadir
  desde una carpeta del usuario? Lo segundo es más bonito y no cuesta mucho
  más, pero abre la puerta a JSON malformado que hay que validar.
- **Fase 5** — ¿El modo mascota es un modo aparte o el modo por defecto con
  el marco como opción? Cambia dónde vive el estado.
- **Fase 6** — Meta semanal o comodines. Hay que elegir una, no ambas.
- **Fase 9** — ¿Las tareas viven solo aquí, o algún día se sincronizan con
  algo externo? Si es lo segundo, el modelo de datos nace distinto.

## Fuera de alcance

Para que el proyecto no se desdibuje:

- Cuentas de usuario, sincronización en la nube, backend.
- Estadísticas de productividad tipo dashboard corporativo.
- Gamificación con moneda, tienda y compras — los logros y las rachas sí, el
  casino no.
- Multiplataforma **verificada**. El código no tiene nada de Windows salvo lo
  que salga en la fase 8, pero probarlo en macOS y Linux es un proyecto en sí.
