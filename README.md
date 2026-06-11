# 🎲 Banana Roll — overlay de dados de Roll20 para OBS

*[🇬🇧 English](README.en.md) · [🇪🇸 Español](README.md)*

## TL;DR

Muestra las tiradas de Roll20 en directo con overlays 3D animados. Una pestaña de Roll20 envía cada tirada a un pequeño relay en Node, que a su vez la reenvía por SSE a una Browser Source de OBS. Así, tu audiencia ve los dados rodar y caer exactamente en el número que ha salido en mesa.

👉 **Demo en vivo: https://bananaroll.up.railway.app**

Aviso: esto salió de una sesión intensa de **vibe coding en un solo día**, así que conviene tomarlo como lo que es: un proyecto hobby divertido, no un software blindado. Funciona y ya se ha usado en directo, pero el historial de commits es corto y el bus factor es uno. Se aceptan PRs.


```text
Pestaña de Roll20 (userscript) --HTTP POST--> Relay en Node (salas + parseo) --SSE--> Browser Source de OBS
```

Si te está siendo útil y quieres ayudar con los costes del proyecto: https://buymeacoffee.com/ankorio ☕

## Qué hace

<details>
<summary><strong>Captura las tiradas de todos los jugadores, no solo las tuyas.</strong></summary>

El userscript se engancha al feed de datos de Firebase que usa Roll20 a nivel de transporte, así que detecta automáticamente las tiradas públicas de todos los jugadores. No hace falta escribir las tiradas de una forma especial. Los susurros privados y las tiradas del GM nunca se reenvían.

</details>

<details>
<summary><strong>Dados 3D reales que coinciden con el resultado.</strong></summary>

Los dados físicos de `dice-box-threejs` están preparados para caer en los valores exactos que devuelve el parser. En tiradas con ventaja o desventaja se lanzan dos d20 y se muestra el dado correcto en cámara.

</details>

<details>
<summary><strong>Un overlay que de verdad queda bien.</strong></summary>

El diseño “Arcane Plaque” incluye marco ornamentado, retrato, total grande, nombre de la tirada, desglose de dados, insignia de ventaja/desventaja y etiqueta de crítico o pifia. Además, hay partículas de confeti en críticos y pifias.

</details>

<details>
<summary><strong>Overlay general o por jugador.</strong></summary>

Cada jugador tiene una URL de overlay filtrada, por ejemplo `…/overlay?player=<id>`, útil para escenas individuales, cámaras separadas o composiciones personalizadas en OBS.

</details>

<details>
<summary><strong>Estilos de dados por jugador.</strong></summary>

La página de personalización permite que cada jugador elija textura, material y colores para sus dados. Las preferencias se guardan en el servidor y se mantienen entre sesiones.

</details>

<details>
<summary><strong>Reglas gestionadas en el servidor.</strong></summary>

La lógica de críticos y pifias es configurable según el sistema de juego. Por defecto usa `dnd5e`, mientras que `generic` muestra solo los totales. Esto permite ajustar reglas sin obligar a nadie a reinstalar el userscript.

</details>

<details>
<summary><strong>Fallbacks razonables.</strong></summary>

El motor de dados, las fuentes, los sonidos y el confeti están vendorizados y se cargan primero en local. Si algo falla, el overlay sigue mostrando una placa limpia con el total.

</details>

<details>
<summary><strong>Vista previa sin OBS.</strong></summary>

Abre cualquier URL de overlay en el navegador y pulsa **T** para alternar entre tiradas falsas: normal → crítico → pifia.

</details>

## Inicio rápido en local

```bash
npm start                 # arranca en http://localhost:8765 y compila antes el motor de dados
```

1. **Instala el userscript:** abre `http://localhost:8765/roll20-capture.user.js` con [Tampermonkey](https://www.tampermonkey.net/). El servidor ya inserta su propio origen, así que no tienes que editar nada. La primera vez que se ejecute en Roll20 creará una sala automáticamente y abrirá la página de configuración.

2. **Añade el overlay a OBS:** Fuentes → **+** → **Navegador** y pega la `overlayUrl`. El fondo es transparente.

3. **Tira dados en Roll20.** Las tiradas aparecerán en el overlay.

Si prefieres probar la API directamente, puedes crear una sala con:

```bash
curl -X POST localhost:8765/rooms
```

La respuesta incluye una `overlayUrl`, una `setupUrl` y un `publishToken`.

## Para otros devs

Lee esto antes de tocar nada.

### Ejecutar y testear

```bash
npm start          # modo similar a producción: compila el motor de dados con prestart y sirve la app
npm test           # tests del parser + test del backend Redis usando ioredis-mock, sin Redis real
npm run smoke      # end-to-end completo: levanta el servidor y comprueba create/SSE/dedup/replay/403
npm run dice:build # recompila el bundle de dados y el manifest después de añadir texturas
```

### Arquitectura en una frase

* **Captura (`userscript`):** se ejecuta en `document-start`, intercepta el WebSocket de la página para leer los frames de Firebase de Roll20 y reenvía cada registro de chat en crudo al relay. No hay lógica de dados en el cliente.

* **Parseo (`src/parser.js`):** convierte el registro crudo de Roll20 en el formato de tirada que usa el overlay. Aplana inline rolls y rolltemplates, elige la tirada mostrada respetando ventaja/desventaja y aplica la lógica de crítico/pifia. Tiene tests unitarios.

* **Relay (`src/server.js` + `src/rooms.js`):** gestiona la entrada HTTP, la salida por SSE, las salas, los rate limits y la deduplicación.

### Estado y persistencia — ⚠️ lo único que hay que entender

El estado vive en un `Map` en memoria por instancia. Tiene que ser así, porque ahí están las conexiones SSE vivas. El estado duradero o compartido se replica en un **backend intercambiable**, elegido al arrancar según el entorno:

| Entorno      | Backend                                                       | Uso                              |
| ------------ | ------------------------------------------------------------- | -------------------------------- |
| `REDIS_URL`  | **Redis** — claves por sala con TTL + **fan-out por pub/sub** | Producción / escalado            |
| `STATE_FILE` | Fichero JSON, una sola instancia                              | Persistencia en local            |
| *(ninguno)*  | Solo memoria                                                  | Pruebas rápidas en local / tests |

El backend Redis es lo que permite trabajar con varias instancias: una tirada que llega a la instancia A alcanza a los clientes SSE conectados a la instancia B mediante pub/sub, y los datos de sala y estilo se comparten entre instancias.

Aun así, mantén las réplicas en 1 por ahora salvo que lo hayas probado con carga real. Una sola máquina aguanta muchísimos clientes SSE, y aunque el camino de pub/sub está implementado y testeado, todavía no se ha probado en serio entre réplicas reales. El `Set` de clientes SSE siempre es local a cada instancia y nunca sale del proceso.

### Configuración por entorno

| Variable                                 | Por defecto             | Para qué sirve                                                           |
| ---------------------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| `PORT`                                   | `8765`                  | Puerto de escucha. Railway lo inyecta automáticamente                    |
| `BASE_URL`                               | Derivado de la petición | Base absoluta para los enlaces generados. Conviene fijarla en producción |
| `REDIS_URL` / `REDIS_PRIVATE_URL`        | *(sin valor)*           | Conexión a Redis. Activa el backend Redis                                |
| `STATE_FILE`                             | *(sin valor)*           | Ruta de persistencia en JSON. Se ignora si existe `REDIS_URL`            |
| `ROOM_TTL`                               | `21600000` — 6 h        | Tiempo de vida de una sala inactiva, en ms                               |
| `MAX_ROOMS`                              | `5000`                  | Límite global de salas                                                   |
| `CREATE_RATE_MAX` / `CREATE_RATE_WINDOW` | `10` / `60000`          | Límite de llamadas a `/rooms` por IP                                     |
| `ROLL_RATE_MAX` / `ROLL_RATE_WINDOW`     | `20` / `1000`           | Límite de tiradas por sala                                               |
| `CLIENTS_MAX`                            | `50`                    | Máximo de clientes SSE por sala                                          |
| `SEEN_MAX`                               | `500`                   | Ventana de deduplicación por sala                                        |

### Despliegue en Railway

Este es el montaje que se usa en la demo en vivo.

1. Conecta el repositorio de GitHub a un proyecto de Railway y despliega en cada push. Ese será tu flujo de despliegue. El build usa Nixpacks; `railway.json` fija el comando de arranque y el healthcheck en `/healthz`.

2. Añade una base de datos **Redis** al proyecto y configura `REDIS_URL = ${{Redis.REDIS_URL}}` en el servicio de la app.

3. Genera un dominio público. Opcionalmente, fija `BASE_URL` con ese dominio.

En los logs deberías ver algo parecido a:

```text
[state] backend: redis
[redis] connected
[redis] loaded N room(s)
```

Sirve cualquier host que permita **conexiones de larga duración**, como Railway, Render, Fly o un VPS. No uses funciones serverless: SSE y fan-out en memoria no encajan bien con ese modelo.

### Añadir tus propias texturas de dados

Mete un `.webp` en:

```text
public/assets/custom-textures/
```

Después añade una entrada en:

```text
public/assets/custom-textures/dice-textures.json
```

Y ejecuta:

```bash
npm run dice:build
```

Esto inyecta la textura en el bundle vendorizado del motor de dados y regenera el manifest que usa la página de personalización.

### Modelo de seguridad

Las URLs funcionan como accesos por posesión: quien tiene el enlace, tiene acceso.

El `publishToken` solo aparece en la respuesta de `POST /rooms` y dentro del userscript instalado. Nunca se envía por SSE ni se muestra en páginas que solo usan el id de la sala. Los ids y tokens son de 128 bits.

Las invariantes completas están documentadas en `CLAUDE.md`.

### Estructura del proyecto

```text
src/server.js                  servidor HTTP + enrutado
src/rooms.js                   store de salas, rate limits, barrido TTL y persistencia intercambiable: redis/file/memory
src/parser.js                  registro crudo de Roll20 → formato de tirada para el overlay, con sistemas de juego enchufables
public/overlay.html            overlay transparente para OBS: EventSource + dados 3D + animaciones
public/setup.html              página de configuración por sala, con enlaces por jugador
public/customize.html          personalización autoservicio de dados por jugador
public/landing.html            página de aterrizaje
public/roll20-capture.user.js  script de captura para Tampermonkey, con origen inyectado al servir
public/assets/                 motor de dados, texturas, sonidos, fuentes y arte de la placa, todo vendorizado
scripts/build-dice.mjs         compila el bundle de dados y el manifest
scripts/parser.test.cjs        tests unitarios del parser
scripts/redis.test.mjs         test del backend Redis con ioredis-mock
scripts/smoke.mjs              test end-to-end
```

### Créditos

Banana Roll se apoya en dos excelentes librerías de código abierto:

- **[@3d-dice/dice-box-threejs](https://github.com/3d-dice/dice-box-threejs)** — el motor de dados 3D con físicas que tira los resultados predeterminados en el overlay.
- **[canvas-confetti](https://github.com/catdad/canvas-confetti)** — las ráfagas de partículas de crítico / pifia.

Licencia MIT. Diviértete y que no te salga una pifia. 🎲
