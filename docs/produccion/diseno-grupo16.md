## b) `packages/web/Dockerfile.prod`

### Propósito

Empaquetar el frontend (Vite + React) para **producción** bajo un modelo de
**infraestructura inmutable**: una imagen versionada, reproducible y autocontenida que se
construye una sola vez y se promueve sin modificaciones entre entornos.

Hace falta porque el `Dockerfile` vigente sirve para desarrollo local —Node 20, `vite` dev
server en el puerto 5173, bind mounts y hot reload— y ese stack **no debe llegar a
producción**: el dev server no está endurecido, entrega módulos sin optimizar y deja vivo un
proceso de Node que en producción es superfluo. El `Dockerfile.prod` separa *construir* de
*servir*: compila una vez y publica únicamente los estáticos resultantes detrás de un
servidor web dedicado.

### Estructura (etapas y capas)

Multi-stage build de 3 etapas. Cada una arranca de una base mínima y solo la última llega a
la imagen final:

| Etapa | Nombre | Base | Propósito |
|-------|--------|------|-----------|
| Stage 1 | `deps` | `node:22-alpine` | Instalar dependencias del workspace |
| Stage 2 | `build` | `node:22-alpine` | Compilar con Vite (`vite build`) |
| Stage 3 | `runtime` | `nginx:stable-alpine` | Servir los archivos estáticos |

**Ordenamiento de capas (Stages 1 y 2) para el caché.** El monorepo usa npm workspaces y el
frontend depende de `@alentapp/shared`, así que las instrucciones van de lo más estable a lo
más volátil:

1. Copiar **solo los manifiestos** — `package.json` + `package-lock.json` raíz,
   `packages/web/package*.json` y `packages/shared/package*.json`.
2. Instalar dependencias con `npm ci` (build determinista anclado al lockfile).
3. **Después** copiar el código fuente y ejecutar `vite build`.

Mientras los manifiestos no cambien, Docker reutiliza la capa de dependencias y **evita
reinstalar todo** cuando solo se toca un archivo de la UI. Se incluye el manifiesto de
`shared` explícitamente para no provocar resoluciones de versiones inconsistentes entre los
servicios del monorepo.

La Stage 3 copia desde la Stage 2 únicamente el directorio compilado (`dist/`) al *document
root* de Nginx, junto con el archivo `nginx.conf`.

### Decisiones arquitectónicas (ADR)

**ADR-1 — Tres etapas en lugar de una.** Dividir en `deps`, `build` y `runtime` persigue
**bajar el tamaño final y la superficie de ataque**. La imagen productiva queda sin Node.js,
sin código fuente original y sin dependencias de compilación (`vite`, `typescript`,
devDependencies): conserva solo el output estático del `vite build`. Es el principio de
**"Evitar la vulnerabilidad"** de Sommerville llevado al empaquetado —lo que no se incluye no
se puede explotar.

**ADR-2 — Nginx en runtime, no Node.js.** Para entregar estáticos, un servidor web
especializado resuelve concurrencia y E/S con un modelo de eventos asíncrono, más eficiente
que el *event loop* de un solo hilo de Node.js. Además cubre de forma nativa compresión,
caché HTTP, cabeceras de seguridad y el fallback de SPA, sin escribir código de aplicación.
Es, asimismo, un **requerimiento explícito**: nada de Node.js en producción.

### Contrato de configuración (Nginx)

Aplicando el principio de **"Localizar parámetros de configuración"** de Sommerville, la
política del servidor **no se incrusta** en el Dockerfile: vive en un **`nginx.conf` separado**
que se copia en la Stage 3, de modo que pueda auditarse y versionarse aparte de la imagen.

Ese `nginx.conf` debe definir:

- **Cabeceras de seguridad** (contra XSS, clickjacking y MIME-sniffing):
  - `X-Frame-Options: DENY` — bloquea el embebido en iframes (clickjacking).
  - `X-Content-Type-Options: nosniff` — impide interpretar MIME no declarados.
  - `Content-Security-Policy` — restringe orígenes de scripts/estilos (defensa central anti-XSS).
  - `Referrer-Policy: strict-origin-when-cross-origin`.
- **Compresión gzip** sobre tipos de texto (`text/css`, `application/javascript`,
  `application/json`, SVG) para ahorrar ancho de banda.
- **Caché de assets**: `.js`, `.css`, imágenes y fuentes (con hash en el nombre) →
  `Cache-Control: public, max-age=31536000, immutable`; el `index.html` se sirve con
  `no-cache` para que cada deploy tome la versión nueva.
- **Fallback de SPA**: `try_files $uri $uri/ /index.html`, para que el ruteo de React Router
  funcione en recargas y rutas profundas.

### Operaciones y resiliencia (Healthcheck)

Diseñar para las operaciones exige que el contenedor **reporte su propio estado**. La
directiva `HEALTHCHECK` se embebe en la Stage 3 para que la imagen sea **autodescriptiva**
ante cualquier orquestador (Compose, Swarm, Kubernetes):

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1
```

- `interval=30s` — cada cuánto se ejecuta la sonda.
- `timeout=5s` — una respuesta más lenta cuenta como fallo.
- `start-period=5s` — margen de arranque antes de empezar a contar fallos.
- `retries=3` — tres fallos seguidos marcan el contenedor `unhealthy`.

Con esto el orquestador sabe cuándo enviar tráfico y cuándo reiniciar tras una falla.
*(Nota: `nginx:stable-alpine` no incluye `curl`; se instala en la Stage 3 o se usa
`wget -qO- ... || exit 1`.)*

### Seguridad: privilegios mínimos

Nginx se diseña para **no correr como root**, acotando el daño si el servidor web es
comprometido. Aquí surge una tensión que el ADR debe resolver explícitamente:

> Un proceso **no-root no puede bindear puertos < 1024** sin la capability
> `NET_BIND_SERVICE`, y el requerimiento pide healthcheck contra `localhost:80`.

**Decisión adoptada:** conservar el puerto **80** y ejecutar como usuario `nginx` (no-root),
ajustando los permisos de los directorios que Nginx escribe (`/var/cache/nginx`, `/var/run`,
`/var/log/nginx`) y otorgando solo la capability `NET_BIND_SERVICE` para el bind del 80.
**Alternativa equivalente:** usar `nginxinc/nginx-unprivileged`, que corre como no-root
sirviendo en `8080`; en ese caso el healthcheck apunta a `localhost:8080` y el puerto se
mapea en el orquestador. Se prioriza la primera por respetar el requerimiento explícito del
puerto 80.

### Requisitos no funcionales

| Atributo | Objetivo |
|----------|----------|
| **Tamaño máximo de imagen** | ≤ 60 MB (`nginx:stable-alpine` ≈ 50 MB + estáticos). El multi-stage descarta Node.js y `node_modules`. |
| **Tiempo de startup** | < 2 s hasta `healthy` (Nginx arranca casi instantáneo; sin compilar en runtime). |
| **Reproducibilidad** | `npm ci` + `package-lock.json` → build determinista; imagen inmutable promovible entre entornos. |
| **Tiempo de rebuild (UI)** | Capa de dependencias cacheada → ante cambios de código solo se rehace el `vite build`. |
| **Seguridad** | Proceso no-root, superficie mínima (sin Node ni fuentes), cabeceras de seguridad activas. |
| **Disponibilidad** | `HEALTHCHECK` que habilita el reinicio automático del orquestador. |
| **Footprint en runtime** | Sin proceso Node.js; el consumo lo dominan los workers de Nginx. |
