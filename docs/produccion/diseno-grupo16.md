## b) `packages/web/Dockerfile.prod`

### Propósito

Definir el empaquetado de **producción** del frontend (Vite + React) bajo un modelo de
**infraestructura inmutable**: una imagen autocontenida, versionada y reproducible que se
construye una sola vez y se promueve sin cambios entre entornos.

Es necesario porque el `Dockerfile` actual está orientado a desarrollo local (Node 20,
`vite` dev server en el puerto 5173, bind mounts, hot reload). Ese stack **no es apto para
producción**: el dev server de Vite no está endurecido, sirve módulos sin optimizar y
mantiene vivo un proceso de Node innecesario. El `Dockerfile.prod` separa el *cómo se
construye* del *cómo se sirve* para entregar únicamente los archivos estáticos ya
compilados, servidos por un servidor web especializado.

### Decisiones arquitectónicas (ADR)

**ADR-1 — Multi-stage de 3 etapas.** Separar `deps`, `build` y `runtime` busca **reducir la
superficie de ataque y el tamaño final**. La imagen productiva no incluye Node.js, ni el
código fuente original, ni las dependencias de build (`vite`, `typescript`, devDependencies);
solo conserva el resultado estático del `vite build`. Esto aplica el principio de **"Evitar la
vulnerabilidad"** de Sommerville: lo que no está en la imagen no puede ser explotado.

**ADR-2 — Nginx en runtime, no Node.js.** Para servir assets estáticos, un servidor web
dedicado (Nginx) gestiona concurrencia y E/S mediante un modelo de eventos asíncrono,
mucho más eficiente que el *event loop* de un único hilo de Node.js. Nginx además resuelve
de forma nativa compresión, caché HTTP, cabeceras y el fallback de SPA, sin código de
aplicación. **Requerimiento explícito: no usar Node.js en producción.**

### Estructura (etapas y capas)

Multi-stage build con 3 etapas:

| Etapa | Nombre | Base | Propósito |
|-------|--------|------|-----------|
| Stage 1 | `deps` | `node:22-alpine` | Instalar dependencias del workspace |
| Stage 2 | `build` | `node:22-alpine` | Compilar con Vite (`vite build`) |
| Stage 3 | `runtime` | `nginx:stable-alpine` | Servir los archivos estáticos |

**Orden de capas para aprovechar el caché (Stages 1 y 2).** El monorepo usa npm workspaces,
por lo que el frontend depende de `@alentapp/shared`. Las instrucciones se ordenan de lo que
cambia menos a lo que cambia más:

1. Copiar **solo los manifiestos**: `package.json` + `package-lock.json` de la raíz,
   `packages/web/package*.json` y `packages/shared/package*.json`.
2. Ejecutar la instalación de dependencias (`npm ci`).
3. **Recién después** copiar el resto del código fuente y ejecutar `vite build`.

Así, mientras no cambien los manifiestos, Docker reutiliza la capa de dependencias desde el
caché y **no reinstala todo** cuando solo se modifica un archivo de la UI — reduciendo
drásticamente el tiempo de rebuild. (Se copia explícitamente el manifiesto de `shared` para
evitar instalaciones inconsistentes entre servicios del monorepo.)

La Stage 3 copia únicamente el directorio compilado (`dist/`) desde la Stage 2 hacia el
*document root* de Nginx, más el archivo de configuración `nginx.conf`.

### Contrato de configuración (Nginx)

Siguiendo el principio de **"Localizar parámetros de configuración"** de Sommerville, la
configuración **no se hardcodea** en el Dockerfile: se define en un **`nginx.conf` separado**
que se copia en la Stage 3. Esto permite auditar y versionar la política del servidor de forma
independiente de la imagen.

El `nginx.conf` debe especificar:

- **Security headers** (mitigan XSS, clickjacking y MIME-sniffing):
  - `X-Frame-Options: DENY` — evita el embebido en iframes (clickjacking).
  - `X-Content-Type-Options: nosniff` — impide la interpretación de MIME no declarados.
  - `Content-Security-Policy` — restringe orígenes de scripts/estilos (defensa principal anti-XSS).
  - `Referrer-Policy: strict-origin-when-cross-origin`.
- **Compresión gzip** sobre tipos de texto (`text/css`, `application/javascript`,
  `application/json`, SVG) para reducir ancho de banda.
- **Caché de assets**: `.js`, `.css`, imágenes y fuentes con hash en el nombre →
  `Cache-Control: public, max-age=31536000, immutable`. El `index.html` se sirve **sin caché**
  (`no-cache`) para que cada deploy tome la nueva versión.
- **Fallback de SPA**: `try_files $uri $uri/ /index.html` para que el ruteo de React Router
  funcione en recargas y rutas profundas.

### Operaciones y resiliencia (Healthcheck)

Diseñar para las operaciones implica que el contenedor **informe su propio estado de salud**.
Se incluye la directiva `HEALTHCHECK` en la Stage 3, embebida en la imagen para que sea
**autodescriptiva** ante cualquier orquestador (Compose, Swarm, Kubernetes):

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1
```

- `interval=30s`: frecuencia de la sonda.
- `timeout=5s`: una sonda más lenta se considera fallida.
- `start-period=5s`: margen de arranque antes de contar fallos.
- `retries=3`: tres fallos consecutivos marcan el contenedor `unhealthy`.

Esto permite al orquestador saber cuándo el contenedor está listo para recibir tráfico o si
debe reiniciarse tras una falla. *(Nota: `nginx:stable-alpine` no trae `curl`; se instala en la
Stage 3 o se usa `wget -qO- ... || exit 1`.)*

### Seguridad: privilegios mínimos

El contenedor se diseña para **no ejecutar Nginx como root**, limitando el impacto si el
servidor web es vulnerado. Aquí aparece una tensión de diseño que el ADR debe resolver:

> Un proceso **no-root no puede bindear puertos < 1024** sin la capability
> `NET_BIND_SERVICE`. El requerimiento pide healthcheck contra `localhost:80`.

**Decisión adoptada:** mantener el contrato del puerto **80** y ejecutar como usuario `nginx`
(no-root) ajustando los permisos de los directorios que Nginx necesita escribir
(`/var/cache/nginx`, `/var/run`, `/var/log/nginx`) y otorgando la capability mínima
`NET_BIND_SERVICE` para el bind del 80. Alternativa equivalente: usar la imagen
`nginxinc/nginx-unprivileged`, que corre como no-root sirviendo en `8080` por diseño; en ese
caso el healthcheck apuntaría a `localhost:8080` y se mapearía el puerto en el orquestador.
Se prioriza la primera por respetar el requerimiento explícito del puerto 80.

### Requisitos no funcionales

| Atributo | Objetivo |
|----------|----------|
| **Tamaño máximo de imagen** | ≤ 60 MB (base `nginx:stable-alpine` ≈ 50 MB + assets estáticos). El multi-stage descarta Node.js y `node_modules`. |
| **Tiempo de startup** | < 2 s hasta `healthy` (Nginx arranca casi instantáneo; sin compilación en runtime). |
| **Reproducibilidad** | Build determinista vía `npm ci` + `package-lock.json`; imagen inmutable promovible entre entornos. |
| **Tiempo de rebuild (UI)** | Capa de dependencias cacheada → solo se recompila el `vite build` ante cambios de código. |
| **Seguridad** | Proceso no-root, superficie mínima (sin Node ni fuentes), security headers activos. |
| **Disponibilidad** | `HEALTHCHECK` que habilita el reinicio automático del orquestador. |
| **Footprint en runtime** | Sin proceso Node.js; consumo de memoria dominado por los workers de Nginx. |
