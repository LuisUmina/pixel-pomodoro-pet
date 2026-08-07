# Roadmap

De pomodoro con mascota a **mascota virtual que además lleva tu pomodoro**.

Las fases están ordenadas de menos a más costosa. Cada una es un incremento
que se puede lanzar solo: al terminar cualquiera, la app sigue siendo usable y
tiene sentido. No hay que hacerlas todas ni en este orden, pero las
dependencias sí se respetan.

**Estado:** v0.1 entregada. **Fases 1–7, 9–11, 13–17 terminadas.**
Fases 12 y 18 planeadas y aprobadas, a la espera de que se defina el
orden de arranque. La fase 8 sigue en pausa.

---

## Índice

| # | Fase | Costo | Depende de |
| --- | --- | --- | --- |
| 1 | [Burbujas de diálogo](#fase-1--burbujas-de-diálogo) ✅ | S | — |
| 2 | [Recordatorios](#fase-2--recordatorios) ✅ | S/M | 1 |
| 3 | [Vida propia del pato](#fase-3--vida-propia-del-pato) ✅ | M | — |
| 4 | [Personajes intercambiables](#fase-4--personajes-intercambiables) ✅ | M | — |
| 5 | [Modo mascota (sin marco)](#fase-5--modo-mascota-sin-marco) ✅ | M/L | — |
| 6 | [Historial, rachas y heatmap](#fase-6--historial-rachas-y-heatmap) ✅ | L | — |
| 7 | [Ánimo de la mascota](#fase-7--ánimo-de-la-mascota) ✅ | M | 1, 3, 6 |
| 8 | [Deambular por el escritorio](#fase-8--deambular-por-el-escritorio) | L | 3, 5 |
| 9 | [Objetivos y tareas](#fase-9--objetivos-y-tareas) ✅ | XL | — |
| 10 | [Legibilidad de la burbuja](#fase-10--legibilidad-de-la-burbuja-de-diálogo) ✅ | S | — |
| 11 | [Exportar e importar datos](#fase-11--exportar-e-importar-datos) ✅ | S/M | — |
| 12 | [Recordatorios propios](#fase-12--recordatorios-propios) | S/M | 2 |
| 13 | [Atajos configurables](#fase-13--atajos-configurables) ✅ | M | — |
| 14 | [Vista previa animada y temas nuevos](#fase-14--vista-previa-animada-y-temas-de-color-nuevos) ✅ | S/M | 4 |
| 15 | [Personajes nuevos](#fase-15--tres-personajes-nuevos) ✅ | L | 4 |
| 16 | [Comportamientos más vivos](#fase-16--comportamientos-más-vivos) ✅ | M | 3 |
| 17 | [Checklist flotante en modo mascota](#fase-17--checklist-flotante-en-modo-mascota) ✅ | M | 5, 9 |
| 18 | [Secciones de tareas](#fase-18--secciones-de-tareas) | S/M | 9 |

**Siguiente recomendada:** sin definir todavía entre las que quedan (12, 18)
— el orden de arranque queda a criterio propio. Ninguna depende de la 8,
que sigue en pausa por decisión propia: sus dependencias (3 y 5) están
resueltas, pero el riesgo que el roadmap siempre le marcó — mover la ventana
del SO en tiempo real, multi-monitor y DPI distinto — sigue en pie.

---

## Principios

Reglas que salieron de construir v0.1 y que aplican a todo lo que sigue.

**Nada roba el foco.** Ya nos costó un bug real: la ventana se llevaba el
teclado y las teclas que escribías en tu editor terminaban en el widget.
Ninguna burbuja, panel o ventana nueva puede volver a hacerlo.

**Toda puerta tiene salida por teclado.** Click-through, ocultar y el modo
mascota fueron puertas de una sola dirección hasta que les pusimos
`Ctrl+Alt+G`, `Ctrl+Alt+H` y `Ctrl+Alt+Z`. Cualquier modo nuevo que pueda
dejar el widget inalcanzable nace con su atajo.

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

## Fase 5 — Modo mascota (sin marco) ✅

**Terminada · Costo: M/L**

Vista alterna sin marco, sin barra de título y sin botonera: solo el
personaje y el reloj, con el resto revelado al pasar el mouse. Alternable con
`Ctrl+Alt+Z`, desde la bandeja o desde ajustes. Cómo quedó frente al plan:

- **El reloj quedó sin placa.** La silueta bare sobre transparente ya se leía
  bien en la práctica; una placa translúcida solo habría sido una caja extra
  que tapar cada vez que el fondo detrás fuera oscuro.
- **El problema del click-through se resolvió con la salida simple, como
  decía el plan:** encoger la ventana hasta abrazar el sprite
  (`resize_keep_center` en `window.rs`), sin tocar hit-testing por píxel. Ese
  comando además recalcula la posición para que el centro geométrico del
  widget no se mueva al encoger ni al volver — sin eso, el pato "saltaría" de
  lugar cada vez que se cambia de modo.
- **Entrar y salir del modo no son simétricos.** Entrar mide el DOM ya
  redibujado (el tamaño mini depende del personaje activo y del ancho del
  reloj, no hay fórmula mejor que el layout mismo); salir reusa la escala
  guardada en vez de medir, porque justo después del cambio la ventana del SO
  todavía es la chica, y medir en ese instante leería un viewport que aún no
  llegó a su tamaño real — y encerraría la ventana en lo que el modo completo
  alcanzó a exprimirse ahí adentro, no en su tamaño real.
- **Un atajo de teclado puede registrarse sin sonar nunca.** El plan original
  para `Ctrl+Alt+M` no falló al registrarse — Tauri solo reporta error ante un
  reclamo *exclusivo* a nivel de sistema — pero jamás disparó: algo más en la
  máquina (probablemente un hook de teclado de un software de gestión/acceso
  remoto instalado) lo interceptaba una capa por debajo, sin dejar rastro. La
  salida pragmática fue cambiar a `Ctrl+Alt+Z`, no perseguir al culpable
  exacto — la app ya está diseñada para que un atajo no disponible no le
  impida arrancar.
- **El overlay de hover no puede usar `:focus-within`.** El único elemento
  enfocable dentro de la zona revelada es el propio botón que la revela, así
  que un clic lo deja enfocado y `:focus-within` la mantiene abierta para
  siempre después del primer clic. Solo `:hover`.
- **Un panel abierto y el modo mascota no conviven solos.** Si ajustes o
  historial quedan abiertos y el modo mascota se activa por atajo o bandeja
  (no por el propio botón del panel, que queda oculto), el panel se encoge
  junto con la ventana y el overlay de hover —con más `z-index` para quedar
  por encima del pato— termina tapándolo y robándole los clics. La entrada al
  modo mascota ahora cierra cualquier panel abierto de entrada.

El deambular libre y el hit-testing por píxel siguen en la fase 8, tal como
estaba previsto.

---

<details>
<summary>Plan original</summary>

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

</details>

---

## Fase 6 — Historial, rachas y heatmap ✅

**Terminada · Costo: L**

Un almacén de historial nuevo (`store/history.ts`), rachas con un día de
descanso perdonado por semana, y un heatmap de 53 semanas estilo GitHub
detrás del contador "N today", que ahora es un botón.

La decisión pendiente del plan se resolvió por **comodines**: no una meta
semanal, sino que la racha en sí perdona un día vacío por semana
lunes-domingo. Se mantiene el concepto familiar de "racha" — no hacía falta
enseñarle al usuario un concepto nuevo — solo se le quitó el filo.

**Lo que costó más de lo esperado fue el algoritmo, no los datos.** Un
recorrido *hacia atrás* desde hoy parece la forma obvia de calcular "la racha
actual", pero perdonar un hueco es una pregunta de orden cronológico: el
primer hueco que ve una semana es el que se perdona, y un segundo hueco esa
misma semana es el que rompe la racha. Caminar hacia atrás encuentra los
huecos en el orden contrario y puede perdonar el equivocado. Dos rondas de
revisión con Codex lo confirmaron con casos concretos antes de que quedara
bien: primero el cambio a un recorrido hacia adelante, después una condición
más — un hueco solo gasta el día de gracia de la semana si de verdad está
protegiendo una racha activa, no si cae antes de que empezara cualquier cosa.

Otras decisiones:

- **`totalSessions`, `bestDayCount`, `bestWeekCount` y `bestStreak` son
  contadores que nunca se podan**, separados de `days` (la ventana acotada a
  ~53 semanas que alimenta el heatmap). Así los récords de toda la vida no se
  erosionan cuando el registro día a día envejece y sale de la ventana —
  aunque la propia racha, actual o récord, sí queda acotada a esa ventana por
  construcción: no hay forma de reportar una racha más larga que los datos
  que efectivamente se conservan. Documentado como límite aceptado, no
  arreglado con un contador incremental paralelo: exigiría duplicar toda la
  lógica de la gracia semanal por una racha de más de un año casi sin fallar
  un día, un caso límite que este proyecto no necesita perseguir.
- **`isoDay` (antes en `store/preferences.ts`) se movió a `core/format.ts`**
  y ahora rellena el año a 4 dígitos, no solo mes y día — `store/history.ts`
  valida una fecha guardada haciéndola ida y vuelta por esa misma función, y
  un año sin rellenar nunca calzaría con su propia entrada de 4 dígitos.
- **`settings` e `history` comparten un shell de overlay genérico**
  (`.panel`/`.panel__bar`/`.panel__title`/`.panel__body`) en vez de que cada
  panel tenga su propia copia del mismo chrome — dos overlays idénticos ya es
  el punto en el que vale la pena sacarlo en común, y un tercero (tareas, más
  adelante) ya está en el roadmap.
- **El heatmap se calcula solo al abrir el panel**, no en cada render del
  widget (que corre 4 veces por segundo mientras el timer corre): 371 celdas
  más un recorrido de racha no tienen por qué recalcularse detrás de un panel
  cerrado.

Lo que quedó fuera, tal como decía el plan original: el personaje
reaccionando al historial. Eso alimenta las burbujas de diálogo, así que
pertenece a la fase 7, que ahora ya tiene de dónde leer.

---

<details>
<summary>Plan original</summary>

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

</details>

---

## Fase 7 — Ánimo de la mascota ✅

**Terminada · Costo: M**

Un modelo diminuto de estado — `energized` / `steady` / `weary` — derivado de
tu uso real: cuántos pomodoros llevas hoy, si vienes de una racha, cuánto
hace de un descanso de verdad. Decide qué línea de diálogo puede salir y, en
un caso, qué animación. Cómo quedó frente al plan:

- **Sin ánimo nuevo para "cansado".** El plan hablaba de que el ánimo
  decidiera "qué animación sale"; en vez de dibujar una pose de cansancio
  aparte, un pato `weary` que está ocioso (sin sesión corriendo, sin
  celebrar) simplemente toma prestado el estado `sleepy` que la pausa ya
  usaba. Cero arte nuevo, un `if` de tres líneas en `petState()`.
- **"Hace cuánto que no aparecías" se separó del ánimo en sí.** Una ausencia
  larga no es lo mismo que estar cansado — son narrativamente opuestos, uno
  es de haber trabajado de más y el otro de no haber estado — así que en vez
  de forzarlos al mismo enum, el saludo al volver ganó un segundo disparador,
  `welcomeBackLong`, que se activa con una ausencia bastante mayor a la de
  `welcomeBack` (que sigue siendo para "te levantaste a hacer café").
- **La racha no se recalcula en cada render.** `currentStreak` recorre hasta
  un año de historial — el mismo costo que la fase 6 ya había aislado detrás
  del panel de historial. El ánimo se guarda en una variable que solo se
  refresca cuando una fase termina y en el chequeo ambiental de cada minuto,
  no en el ciclo de render que corre cuatro veces por segundo.
- **El catálogo de frases ganó una cuarta condición de filtro** (`mood`,
  junto a `hours`, `minCompleted` y `maxCompleted`), con el mismo contrato
  que las demás: ausente significa "encaja con cualquier ánimo". La
  suite de tests que exige una línea incondicional por disparador y tono
  ahora también exige que esa línea no tenga ánimo — así una fase futura no
  puede dejar accidentalmente algún disparador mudo en algún ánimo.

**Toca:** `src/core/mood.ts` (nuevo, puro), y conexiones en
`messages/types.ts`, `dialogue.ts`, `catalog.ts`/`catalog.json` y `main.ts`.
`sprites/behaviors.ts` no necesitó tocarse — reusar `sleepy` no le pidió nada
nuevo.

---

<details>
<summary>Plan original</summary>

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

</details>

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

## Fase 9 — Objetivos y tareas ✅

**Terminada · Costo: XL**

El pomodoro ahora trabaja por objetivos: una tarea activa, atribución
automática de cada sesión, un panel para el resto de la lista. Cómo quedó
frente al plan:

- **"Tu lista del día" resultó ser el objetivo, no la lista.** Una tarea que
  no se termina hoy no tiene por qué desaparecer a medianoche — eso hubiera
  castigado exactamente lo que la app está para ayudar. Lo que sí es del día
  es la meta: un objetivo diario opcional de pomodoros (chips en ajustes,
  igual que `dim` o `quiet`) que convierte "3 today" en "3/6 today". Se optó
  por contar pomodoros y no tareas — ya existía el contador, contar tareas
  hubiera exigido definir qué hace que una meta de tareas cuente como
  cumplida sin ganar nada a cambio.
- **Escribir en el campo nunca crea una tarea nueva — siempre renombra la
  activa.** Esa única regla resolvió de un saque la pregunta más difícil del
  diseño: qué pasa con el campo de texto libre que ya existía. Alguien que
  nunca abre el panel de tareas sigue usando la app exactamente como antes,
  sin fricción nueva ni saberlo; una segunda tarea es siempre un gesto
  explícito desde el panel (☰, junto al campo), nunca un accidente de
  retipear.
- **Un bug real, encontrado y arreglado durante la verificación:** el panel
  de tareas empezó guardando su modelo en `WidgetModel`, igual que
  settings/history — pero a diferencia de esos dos, una acción *del propio
  panel* (agregar, marcar hecha) necesita verse reflejada antes de que el
  próximo `render()` normal llegue a correr, y según qué corriera primero se
  veía una fila fantasma o directamente ninguna. La salida fue la misma que
  `history` ya usaba por otra razón (no recalcular el heatmap detrás de un
  panel cerrado): un callback `viewTasks()` que main.ts resuelve en el
  momento, no un valor cacheado — así "¿ya corrió el render?" deja de ser una
  pregunta que importa.
- **Sin sincronización, tal como decía "fuera de alcance".** Todo vive en
  `store/tasks.ts`, mismo patrón defensivo que `history.ts`.

Lo que quedó deliberadamente afuera, seguido al pie de la letra: sin
subtareas, sin etiquetas, sin fechas, sin proyectos. Tampoco hay reordenar
arrastrando ni una vista retrospectiva de tareas por día — la lista es una
sola cosa, hecha o por hacer, y el heatmap ya cuenta la historia de las
sesiones.

**Toca:** `src/core/tasks.ts` (nuevo, puro), `src/store/tasks.ts` (nuevo),
`src/dailyGoal.ts` (nuevo), `src/ui/tasks-panel.ts` (nuevo), y conexiones en
`main.ts`, `widget.ts`, `settings-panel.ts`, `store/preferences.ts`.

---

<details>
<summary>Plan original</summary>

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

</details>

---

## Fase 10 — Legibilidad de la burbuja de diálogo ✅

**Terminada · Costo: S**

`.bubble__text` subió de 10px a 13px, con `line-height`, padding y
`min-height` ajustados en proporción. Ningún texto del catálogo necesitó
acortarse: el mensaje más largo (58 caracteres) se verificó contra el ancho
real de la burbuja en una corrida de DOM en vivo y sigue entrando en dos
líneas.

Una observación que quedó documentada en el commit: el mismo chequeo contra
`main` mostró que la burbuja ya excedía su propio `min-height` para los
mensajes más largos *antes* de este cambio — no es una regresión de esta
fase, es una característica preexistente del catálogo que sigue igual de
presente (en la misma proporción) con la fuente más grande.

**Toca:** `src/ui/styles.css`.

---

## Fase 11 — Exportar e importar datos ✅

**Terminada · Costo: S/M**

Un botón en ajustes vuelca historial + tareas + preferencias a un `.json` vía
el diálogo de guardado nativo, y otro carga uno de vuelta con la misma
lectura defensiva que ya usan los stores — reusando `loadHistory`,
`loadTasks` y `loadPreferences` de verdad contra un `JsonStore` temporal en
memoria, en vez de reinventar la sanitización. Sin nube ni cuentas.

**Tres rondas de auditoría, tres bugs reales encontrados y corregidos —
ninguno lo hubiera atrapado un test unitario:**

- **Los permisos de Tauri no alcanzaban para escribir ni leer nada.** El
  primer intento agregó `fs:default`, que en `tauri-plugin-fs` solo otorga
  crear carpetas propias de la app y leerlas — nada de `read-text-file` ni
  `write-text-file` en ningún lado. Exportar abría el diálogo, pero el
  archivo nunca se creaba, en silencio. Confirmado probando el flujo real en
  la ventana nativa, no solo corriendo los tests de `backup.ts`.
- **El primer arreglo de permisos sobrecorrigió**: agregó `{ "path": "*" }`
  y `{ "path": "**" }` al scope, dándole a la app acceso a todo el sistema
  de archivos por un caso de uso que solo necesitaba las carpetas estándar
  del usuario. Se acotó a Desktop, Download, Document, Home y AppData
  nombrados explícitamente — reverificado guardando en Documentos de verdad.
- **Un stub falso.** La rama se abrió antes de que la fase 13 (atajos
  configurables) existiera; al pedir que un import re-aplicara los atajos
  restaurados, el agente no tenía visibilidad de que `updateShortcuts`
  ya existía con una firma real en `main` — así que inventó una versión
  vacía, sin parámetros, que no hacía nada. Se resolvió rebaseando la rama
  contra `main` y llamando a la función real con el mapa de atajos
  restaurado.

**Toca:** `src/store/backup.ts` (nuevo), `src/platform/desktop.ts`,
`settings-panel.ts`, `capabilities/default.json`, dependencias nuevas
`@tauri-apps/plugin-dialog` y `@tauri-apps/plugin-fs`.

---

## Fase 12 — Recordatorios propios

**Costo: S/M · Depende de la fase 2**

La "fase 2b" que quedó pendiente desde el principio: texto libre, cadencia y
fase de anclaje (focus/descanso), con su propia pantalla de edición —
separada de los packs con switches que ya existen.

**Toca:** `src/core/reminders.ts`, `settings-panel.ts` (sub-pantalla nueva),
`store/preferences.ts`.

---

## Fase 13 — Atajos configurables ✅

**Terminada · Costo: M**

Reasignación configurable de atajos globales (`Ctrl+Alt+Space/N/R/G/Z/H`) desde
el panel de ajustes. Incluye detección inmediata de conflictos entre funciones y
re-registro dinámico en caliente en el shell de Rust.

Detalles de implementación y cómo quedó frente al plan:

- **Lógica de dominio pura (`src/core/shortcuts.ts`):** Módulo aislado con
  tests unitarios para normalizar combinaciones de teclas (`Ctrl+Alt+G`), validar
  esquemas y detectar duplicados entre acciones antes de solicitar cambios al
  sistema.
- **Re-registro seguro con rollback en caliente (`src-tauri/src/shortcuts.rs`):**
  El comando `update_shortcuts` en Rust desregistra los atajos existentes y
  aplica la nueva configuración. Si el sistema operativo rechaza algún atajo (por
  ejemplo, tomado exclusivamente por otra app), deshace los cambios y restaura los
  atajos previos sin dejar accesos "fantasma".
- **Edición interactiva en ajustes:** Captura directa por teclado de combinaciones
  de teclas y campos normales con resaltado de error si existe conflicto o rechazo
  del SO.
- **Persistencia defensiva (`src/store/preferences.ts`):** La carga de preferencias
  valida la integridad del mapa de atajos y cae a `DEFAULT_SHORTCUTS` si encuentra
  datos malformados o duplicados.

**Dos bugs reales, encontrados en auditoría y ya corregidos:**

- **El arranque era "todo o nada".** La primera versión registraba los 6
  atajos por defecto llamando al mismo `update_shortcuts` transaccional que
  usa una reasignación manual: si el sistema operativo rechazaba uno solo (el
  caso real que ya vivió `Ctrl+Alt+M` en la fase 5), el rollback dejaba la
  app **sin ningún atajo global**, no solo el que chocaba. Arreglado
  devolviendo el registro inicial a intentar cada atajo por separado — la
  transacción con rollback quedó exclusivamente para cuando el usuario
  reasigna algo a mano desde ajustes, que es donde sí corresponde.
- **Captura de atajos disparaba una llamada por cada tecla.** Mientras se
  mantenían solo los modificadores (`Ctrl`, luego `Ctrl+Alt`) ya se intentaba
  aplicar el cambio. Arreglado con `hasPrimaryKey()`: no se aplica hasta que
  la combinación tenga una tecla real, y si el campo pierde el foco a medio
  capturar, vuelve solo al valor guardado.

**Toca:** `src/core/shortcuts.ts` (nuevo, puro), `tests/shortcuts.test.ts` (nuevo),
`src-tauri/src/shortcuts.rs`, `src-tauri/src/lib.rs`, `src/platform/desktop.ts`,
`src/store/preferences.ts`, `settings-panel.ts`, `styles.css`, `index.html`.

---

## Fase 14 — Vista previa animada y temas de color nuevos ✅

**Terminada · Costo: S/M · Depende de la fase 4**

El selector de personajes ahora muestra un único canvas de vista previa
animada para el personaje elegido, junto a los chips. Se enciende solo al
abrir ajustes y se detiene al cerrarlos: así reutiliza las animaciones reales
sin crear un loop o canvas por cada personaje. Se sumaron Nord, Catppuccin y
Solarized Dark como paletas de datos en `themes.json`.

El brief nombraba `themes.ts`, pero el código existente guarda las paletas en
`themes.json`; `themes.ts` solo las carga y tipa, por lo que no necesitó lógica
nueva.

**Toca:** `settings-panel.ts`, `src/sprites/themes.json`, un canvas chico
adicional para la miniatura.

---

## Fase 15 — Tres personajes nuevos ✅

**Terminada · Costo: L**

Tres personajes entregados tal como se planeó, registrados en
`characters.ts` vía imports explícitos (el registro no auto-descubre
carpetas, así que sumar uno sigue siendo tocar esa lista, no soltar un
archivo suelto — una diferencia menor con la fase 4 original que quedó
documentada en el commit en vez de improvisada):

- **`tentacat`** ("Gato pulpo") — inspirado en el Octocat de GitHub sin
  reproducir el logo real, familia *criatura*.
- **`bug`** ("Bicho") — guiño a "debuggear", familia *criatura*, seis patas
  y antenas propias.
- **`coffee`** ("Café") — familia *emblema*: vapor animado que se enfría y
  se apaga en el estado `sleepy`, igual que la chispa se vuelve brasa.

**Un bug real, encontrado en auditoría y ya corregido:** la fila de
personajes en ajustes no tenía `flex-wrap`, así que al pasar de 4 a 7 chips
el último (`CAFÉ`) quedaba fuera del panel visible — alcanzable solo con
scroll horizontal, que nada indicaba. Arreglado agregando `flex-wrap: wrap`
a `.chips`; confirmado que las demás filas de chips (que sí entran en una
línea) no cambiaron.

**Toca:** `src/sprites/characters/` (tres archivos nuevos), `characters.ts`,
`src/ui/styles.css`.

---

## Fase 16 — Comportamientos más vivos ✅

**Terminada · Costo: M**

15 conductas nuevas repartidas en los 7 personajes, una por cada estado
(idle/focus/rest/sleepy) que estaba en el mínimo de 2 opciones — ahora todos
tienen 3 o más, verificado contando pesos reales por estado, no solo leyendo
la descripción del commit. `celebrate` se dejó en 1 opción a propósito: es un
estallido corto, no necesita variedad.

- **Cero arte nuevo.** Cada conducta nueva reusa parches que el personaje ya
  tenía, así que `src/sprites/behaviors.ts` no necesitó ningún cambio —
  `pickBehavior` ya era genérico sobre cualquier cantidad de conductas por
  ánimo.
- **`MAX_BOB`/`MAX_SHIFT` quedaron intactos a propósito.** Subirlos habría
  aumentado el canvas del widget, y eso alimenta el cálculo de
  `resize_keep_center` del modo mascota (fase 5) — fuera del alcance de esta
  fase.
- Los personajes *emblema* (terminal, spark, café) siguen sin `offsetX` ni
  caminata en ninguna conducta nueva, consistente con la fase 4: un emblema
  se anima por intensidad visual, no por movimiento de cuerpo.

**Toca:** los 7 JSON en `src/sprites/characters/`. `behaviors.ts` sin tocar.

---

## Fase 17 — Checklist flotante en modo mascota ✅

**Terminada · Costo: M**

Un estado opcional del modo mascota: además de personaje + reloj, debajo
aparece una lista compacta de las tareas del día (solo tildar hecha, sin el
formulario de alta del panel completo). Vive en el mismo overlay de
hover-reveal que ya usan los controles del modo mascota — el botón que la
prende solo existe dentro de `data-mini="true"`, así que no ocupa lugar en
la vista completa donde el panel entero ya cubre lo mismo.

- **`src-tauri/src/window.rs` no se tocó.** En vez de un comando Rust nuevo,
  el toggle mide el DOM ya redibujado (`widget.measureFrame()`) y llama al
  `resize_keep_center` que la fase 5 ya expone — el mismo patrón que usa la
  entrada al modo mascota. Verificado en la app nativa: la ventana crece y
  se centra matemáticamente igual que al entrar en modo mascota.
- **Dos bugs reales, encontrados por una revisión de Codex que el propio
  agente pidió antes de avisar** (y ya corregidos): la barra de controles
  revelada al pasar el mouse podía tapar la última fila del checklist —
  arreglado ampliando el margen inferior a la altura real de esa barra; y
  un clic rechazado por el guard de doble-clic dejaba el checkbox nativo
  desincronizado del dato real hasta el próximo refresco — arreglado
  revirtiendo el checkbox cuando el guard lo descarta.
- Confirmé ambos en vivo: la fila queda visible con el overlay revelado, y
  tildar una casilla en el modo mini reordena y persiste igual que en el
  panel completo — ambas vistas leen del mismo `viewTasks()`, ninguna queda
  desactualizada.

**Toca:** `src/ui/mini-checklist.ts` (nuevo), `widget.ts`,
`store/preferences.ts`, `styles.css`, `index.html`. `window.rs` sin tocar.

---

## Fase 18 — Secciones de tareas

**Costo: S/M · Depende de la fase 9**

Una forma liviana de dividir la lista, no un sistema de etiquetas: cada tarea
gana un campo opcional de "sección" (texto corto, se escribe una vez y las
siguientes tareas la reusan de una lista desplegable), y el panel — y el
checklist de la fase 17, si ya existe — agrupan visualmente por esa sección
en vez de mostrar todo en una sola lista plana. Sin colores, sin filtros, sin
jerarquía: una tarea pertenece a una sección o a ninguna.

Conviene resolverla antes o junto con la fase 17, porque así el checklist
flotante nace ya sabiendo agrupar en vez de necesitar un segundo cambio
después — pero no hay una dependencia dura entre ambas; se pueden hacer en
cualquier orden.

**Toca:** `src/core/tasks.ts` (campo nuevo en `Task`), `src/store/tasks.ts`
(migración defensiva), `tasks-panel.ts`.

---

## Decisiones abiertas

Cosas que hay que resolver antes de tocar la fase correspondiente.

- **Fase 4** — ¿Los personajes se distribuyen con la app o se pueden añadir
  desde una carpeta del usuario? Lo segundo es más bonito y no cuesta mucho
  más, pero abre la puerta a JSON malformado que hay que validar.

## Fuera de alcance

Para que el proyecto no se desdibuje:

- Cuentas de usuario, sincronización en la nube, backend.
- Estadísticas de productividad tipo dashboard corporativo.
- Gamificación con moneda, tienda y compras — los logros y las rachas sí, el
  casino no.
- Multiplataforma **verificada**. El código no tiene nada de Windows salvo lo
  que salga en la fase 8, pero probarlo en macOS y Linux es un proyecto en sí.
