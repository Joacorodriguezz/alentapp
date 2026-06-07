# Fase 2: Especificación y diseño

> **Autor:** Grupo 16
> **Materia:** Ingeniería y Calidad de Software
> **Proyecto:** AlentApp — Monorepo (`@alentapp/api`)

---

## 2.1. Diseño de la infraestructura Docker

### a) `packages/api/Dockerfile.prod`

#### 1. PROPÓSITO

El presente Dockerfile implementa un **Multi-stage build de 3 etapas** para generar una imagen Docker de producción de la API REST de AlentApp (`@alentapp/api`), basada en Fastify y TypeScript dentro de un monorepo npm con workspaces.

El [Dockerfile actual](../../packages/api/Dockerfile) es una imagen de etapa única con tres problemas críticos para producción:

1. **`npm install` completo** — instala devDependencies (`tsx`, `vitest`, `prisma` CLI, `@types/*`) que no tienen uso en runtime.
2. **`tsx watch` como entrypoint** — runner de desarrollo TypeScript-en-vuelo; no apto para producción.
3. **Usuario `root` por defecto** — sin restricciones de privilegio ni instrucción de salud.

El Multi-stage build elimina estos problemas estructuralmente: cada etapa intermedia es efímera y sus capas no se heredan en la imagen final salvo lo que se copie explícitamente con `COPY --from`. Esto garantiza que el compilador, las devDependencies y los fuentes `.ts` **nunca lleguen al contenedor de producción**, reduciendo el tamaño final en ~70% y la superficie de ataque al mínimo.

---

#### 2. ESTRUCTURA (Tabla de Etapas)

Las tres etapas usan `node:22-alpine` como base para garantizar consistencia de runtime entre etapas y un footprint mínimo del sistema operativo.

| Etapa | Nombre | Base | Propósito |
|---|---|---|---|
| **Stage 1** | `deps` | `node:22-alpine` | Instalación determinista **solo de dependencias de producción**. Se ejecuta `npm ci --omit=dev` desde la raíz del monorepo para que npm Workspaces resuelva correctamente los paquetes internos (`@alentapp/shared`). El `node_modules` resultante no contiene ninguna devDependency. Es el único artefacto de este stage que llega a `runtime`. |
| **Stage 2** | `build` | `node:22-alpine` | Compilación TypeScript → JavaScript. Se copia el código fuente completo del monorepo (`packages/api/src`, `packages/shared`) y se ejecuta `npm ci` completo para disponer de `tsc`. El compilador emite el JS en `packages/api/dist/` (vía `tsconfig.prod.json` con `"noEmit": false`, `"outDir": "./dist"`). Este stage es **efímero**: sus capas, devDeps y fuentes `.ts` no llegan a la imagen final. |
| **Stage 3** | `runtime` | `node:22-alpine` | Imagen final de producción. Recibe únicamente `packages/api/dist/` desde `build` y `node_modules` de producción desde `deps`. No contiene fuentes TypeScript, compilador ni devDependencies. Se configura el usuario no-root `node`, se expone el puerto `3000`, se define el `HEALTHCHECK` y el `CMD` ejecuta `node dist/app.js` directamente. |

**Diagrama de flujo:**

```
┌──────────────────────────────────────────┐
│  Contexto de Build (filtrado por         │
│  .dockerignore — ~10 MB de fuentes)      │
└──────────┬───────────────────────────────┘
           │
  ┌────────▼────────┐
  │  Stage 1: deps  │  node:22-alpine
  │  npm ci         │
  │  --omit=dev     │→ node_modules/ (solo prod)
  └────────┬────────┘
           │ COPY --from=deps node_modules/
           │
  ┌────────▼────────┐
  │  Stage 2: build │  node:22-alpine
  │  npm ci (full)  │
  │  tsc → dist/    │
  └───┬─────────────┘
      │ COPY --from=build dist/
      │ COPY --from=deps  node_modules/
      │
  ┌───▼─────────────────────────────────┐
  │  Stage 3: runtime  ← Imagen final   │  node:22-alpine
  │  USER node | HEALTHCHECK            │
  │  CMD node dist/app.js               │
  └─────────────────────────────────────┘
```

---

#### 3. REQUISITOS NO FUNCIONALES Y SEGURIDAD

Las siguientes restricciones se aplican en la etapa `runtime` (Stage 3). El tiempo de startup objetivo es < 5 s para el proceso Node.js; el `--start-period=20s` del HEALTHCHECK actúa como margen de tolerancia hasta que Fastify y Prisma completan su inicialización.

---

##### 3.1 Usuario No-Root

Las imágenes oficiales `node:*-alpine` incluyen el usuario del sistema `node` (UID 1000, GID 1000) sin privilegios de superusuario; no es necesario crearlo manualmente. La instrucción `USER node` se declara en el stage `runtime` tras copiar los artefactos y asignar propiedad con `chown -R node:node /app`.

Ejecutar como `root` implicaría que ante una vulnerabilidad de la aplicación (path traversal, SSRF con escritura en disco), el atacante tendría privilegios de administrador sobre el sistema de archivos del contenedor. Con `USER node`, el blast radius queda restringido al directorio `/app`.

---

##### 3.2 HEALTHCHECK

La instrucción `HEALTHCHECK` nativa de Docker se configura apuntando a `http://localhost:3000/health` usando `wget` (disponible en Alpine vía busybox, a diferencia de `curl`).

| Parámetro | Valor | Justificación |
|---|---|---|
| `--interval=30s` | 30 s | Frecuencia de chequeo: detecta caídas sin sobrecargar el proceso. |
| `--timeout=10s` | 10 s | Tiempo máximo de respuesta antes de marcar el chequeo como fallido. |
| `--start-period=20s` | 20 s | Período de gracia inicial para que Fastify y Prisma terminen de inicializarse. |
| `--retries=3` | 3 | El contenedor se marca `unhealthy` solo tras 3 fallos consecutivos, evitando falsos positivos. |

> **Pendiente — Fase 3:** El endpoint `GET /health` debe implementarse en la API como ruta de bajo costo que responda `200 OK` con `{ "status": "ok" }`, sin lógica de negocio.

---

##### 3.3 Mecanismo de Exclusión — `.dockerignore`

El [`.dockerignore` actual](../../.dockerignore) contiene solo 4 patrones, insuficiente para producción. El archivo extendido debe excluir obligatoriamente: `**/node_modules`, `**/dist`, `.env` y `.env.*` (secretos), `.git`, `.github`, `coverage`, archivos de configuración de editor/linter (`.vscode`, `.eslintrc.js`, `.prettierrc.json`), archivos de test (`**/*.test.ts`, `e2e-fullstack`), y documentación (`docs`, `README.md`).

**Impacto:**

| Categoría | Sin `.dockerignore` completo | Con `.dockerignore` completo |
|---|---|---|
| Contexto enviado al daemon | ~500 MB – 1 GB (incl. `node_modules`) | ~5–15 MB (fuentes y configs) |
| Riesgo de filtración de secretos | Alto (`.env` con credenciales DB) | Eliminado |
| Tiempo de `docker build` | Lento (transferencia de contexto pesada) | Reducido significativamente |

---

##### 3.4 Meta de Tamaño — Reducción del ~70%

**Objetivo:** pasar de ~1 GB (imagen de desarrollo actual) a ~300 MB.

| Componente eliminado | Mecanismo de eliminación | Ahorro estimado |
|---|---|---|
| devDependencies completas (`tsx`, `vitest`, `prisma` CLI, `@types/*`) | `node_modules` copiado desde `deps` (solo prod) | ~200–400 MB |
| Compilador TypeScript (`tsc`) | Solo existe en stage `build` (efímero) | ~50–100 MB |
| Fuentes `.ts` originales | Stage `runtime` recibe solo `dist/` (JS compilado) | ~5–20 MB |
| Caché de npm y artefactos de build | `npm ci` + `npm cache clean --force` en cada stage | ~50–100 MB |

La imagen final contiene únicamente: base `node:22-alpine` (~55 MB), `node_modules` de producción (Fastify + Prisma Client, ~180–250 MB) y `dist/app.js` (~1–5 MB). **Total estimado: ~240–310 MB.**

---

#### Nota Técnica — Prerrequisito para el Stage `build`

> [!IMPORTANT]
> El `tsconfig.json` de la API hereda `"noEmit": true` del `tsconfig.json` raíz, lo que impide que `tsc` emita archivos JavaScript. Antes de implementar este Dockerfile es **obligatorio**:
>
> 1. Crear `packages/api/tsconfig.prod.json` con `"noEmit": false`, `"outDir": "./dist"` y `"rootDir": ".."` (ver Nota Técnica siguiente para la justificación de `rootDir`).
> 2. Agregar el script `"build": "tsc --project tsconfig.prod.json"` en `packages/api/package.json`.
> 3. El `CMD` del stage `runtime` apunta a `node dist/app.js`. Como `rootDir: ".."` anida el emit (ver Nota Técnica siguiente), el stage `runtime` aplana el subdirectorio compilado de la API hacia `./dist` para preservar esa ruta.

---

#### Nota Técnica — Compilación del workspace `@alentapp/shared`

> [!IMPORTANT]
> La API importa `@alentapp/shared`, y ese paquete **exporta enums** (es decir, **valores JavaScript en runtime**, no únicamente tipos que se borran al transpilar). Por lo tanto `shared` **debe compilarse a JS y estar disponible en el contenedor de producción**. Esto impone tres ajustes obligatorios respecto del modelo simplificado descrito arriba (un `outDir` plano con un único `dist/app.js`); sin ellos la imagen **no compila o falla en runtime**:
>
> 1. **`rootDir: ".."` en `tsconfig.prod.json`.** Para que `tsc` compile a la vez `packages/api/src` **y** `packages/shared`, el `rootDir` debe abarcar ambos paquetes desde la raíz del monorepo. Como efecto, el emit deja de ser plano: `packages/api/src/app.ts` se compila a `packages/api/dist/api/src/app.js`, y `shared` queda en `packages/api/dist/shared/`. El diagrama de flujo y la tabla de etapas describen el `dist/` de forma simplificada; la estructura real es la anidada que se detalla aquí.
>
> 2. **Re-inyección de `shared` compilado en `node_modules` (stage `runtime`).** El `node_modules` heredado de `deps` contiene a `@alentapp/shared` como **symlink de workspace que apunta a `index.ts`**, archivo que Node.js no puede ejecutar. Por eso el stage `runtime` copia el `shared` ya compilado (`dist/shared/`) sobre `node_modules/@alentapp/shared/` y **reescribe su `package.json`** para que `"main"` apunte al `.js` compilado. Sin este paso, `import … from '@alentapp/shared'` falla en runtime. Esto significa que el stage `runtime` recibe en la práctica **tres** artefactos (la API compilada, el `node_modules` de producción y el `shared` compilado), y no dos como sugiere la tabla de etapas.
>
> 3. **Aplanado del `COPY` de la API compilada.** Derivado del punto 1: el `CMD` espera `dist/app.js`, pero `tsc` emitió la API en `dist/api/src/`. Por eso el stage `runtime` copia ese subdirectorio anidado directamente hacia `./dist` (`COPY --from=build /app/packages/api/dist/api/src ./dist`), en lugar del `COPY dist/` plano que aparece en el diagrama. Así `node dist/app.js` sigue siendo la ruta de entrada correcta.

---

### b) `packages/web/Dockerfile.prod`

#### Propósito

Empaquetar el frontend (Vite + React) para **producción** bajo un modelo de
**infraestructura inmutable**: una imagen versionada, reproducible y autocontenida que se
construye una sola vez y se promueve sin modificaciones entre entornos.

Hace falta porque el `Dockerfile` vigente sirve para desarrollo local —Node 20, `vite` dev
server en el puerto 5173, bind mounts y hot reload— y ese stack **no debe llegar a
producción**: el dev server no está endurecido, entrega módulos sin optimizar y deja vivo un
proceso de Node que en producción es superfluo. El `Dockerfile.prod` separa *construir* de
*servir*: compila una vez y publica únicamente los estáticos resultantes detrás de un
servidor web dedicado.

#### Estructura (etapas y capas)

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

#### Contrato de configuración (Nginx)

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

#### Operaciones y resiliencia (Healthcheck)

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

#### Seguridad: privilegios mínimos

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

#### Requisitos no funcionales

| Atributo | Objetivo |
|----------|----------|
| **Tamaño máximo de imagen** | ≤ 60 MB (`nginx:stable-alpine` ≈ 50 MB + estáticos). El multi-stage descarta Node.js y `node_modules`. |
| **Tiempo de startup** | < 2 s hasta `healthy` (Nginx arranca casi instantáneo; sin compilar en runtime). |
| **Reproducibilidad** | `npm ci` + `package-lock.json` → build determinista; imagen inmutable promovible entre entornos. |
| **Tiempo de rebuild (UI)** | Capa de dependencias cacheada → ante cambios de código solo se rehace el `vite build`. |
| **Seguridad** | Proceso no-root, superficie mínima (sin Node ni fuentes), cabeceras de seguridad activas. |
| **Disponibilidad** | `HEALTHCHECK` que habilita el reinicio automático del orquestador. |
| **Footprint en runtime** | Sin proceso Node.js; el consumo lo dominan los workers de Nginx. |

---

### c) `docker-compose.prod.yml`

#### Propósito

Define el despliegue productivo de **alentapp** como stack autocontenido: PostgreSQL, API (Node.js compilada desde `Dockerfile.prod`) y frontend (Nginx sirviendo assets estáticos desde `Dockerfile.prod`).

Es necesario porque el `docker-compose.yml` actual está orientado exclusivamente a desarrollo (bind mounts, hot reload, `migrate dev`, Vite dev server, credenciales hardcodeadas). Este archivo separa responsabilidades, aplica hardening de seguridad, limita recursos, rota logs y centraliza secretos en `.env`, cumpliendo los requisitos de la consigna para producción.

---

#### Estructura

El archivo se organiza en **cinco bloques**:

| Bloque | Contenido |
|--------|-----------|
| **Servicios** | `db`, `api`, `web` — build/image, environment, redes, seguridad y logging por servicio |
| **Redes** | Red personalizada `alentapp-prod` (bridge dedicada, no la default) |
| **Volúmenes** | `pgdata` persistente para datos de PostgreSQL |
| **Dependencias** | `api` → `db` (healthy); `web` → `api` (healthy) |
| **Variables** | Secretos y configuración desde `.env` en la raíz del proyecto |

**Diagrama de servicios:**

```txt
                    ┌─────────────────────────────────────┐
                    │     Red: alentapp-prod (bridge)      │
                    │                                     │
  Host :80 ────────►│  web (nginx:stable-alpine)          │
                    │         │                           │
                    │         ▼                           │
  Host :3000 ──────►│  api (node:22-alpine, no-root)      │
                    │         │                           │
                    │         │ DATABASE_URL              │
                    │         ▼                           │
                    │  db (postgres:16-alpine)            │
                    │     [sin puerto publicado al host]  │
                    └─────────────────────────────────────┘
```

| Servicio | Imagen / Build | Puerto al host | Volumen |
|----------|----------------|----------------|---------|
| `db` | `postgres:16-alpine` | Ninguno (solo red interna) | `pgdata:/var/lib/postgresql/data` |
| `api` | `packages/api/Dockerfile.prod` | `3000:3000` | Ninguno (imagen inmutable) |
| `web` | `packages/web/Dockerfile.prod` | `80:80` | Ninguno (imagen inmutable) |

---

#### Diseño por aspecto (requisitos de la consigna)

##### Resource limits

Límites de CPU y memoria por servicio para evitar que un contenedor monopolice el host y facilitar planificación de capacidad.

| Servicio | `cpus` (limit) | `memory` (limit) | `memory` (reservation) | Justificación |
|----------|----------------|------------------|------------------------|---------------|
| `db` | `1.0` | `512M` | `256M` | PostgreSQL requiere RAM para conexiones y cache |
| `api` | `0.5` | `384M` | `128M` | Node.js + Prisma Client bajo carga de requests |
| `web` | `0.25` | `128M` | `64M` | Nginx sirviendo archivos estáticos; footprint bajo |

```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 384M
    reservations:
      cpus: '0.25'
      memory: 128M
```

##### Healthchecks

Según la consigna, healthchecks para **API** y **DB**. Permiten ordenar el arranque y detectar servicios degradados.

| Servicio | Test | Interval | Timeout | Retries | `start_period` |
|----------|------|----------|---------|---------|----------------|
| `db` | `pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}` | 10s | 5s | 5 | 10s |
| `api` | `wget -qO- http://localhost:3000/health` | 30s | 10s | 3 | 20s |

Los parámetros del healthcheck de `api` replican los definidos en a) (`Dockerfile.prod`): `interval=30s`, `timeout=10s`, `start_period=20s`, `retries=3` y URL con `localhost`.

**Nota de implementación:** se debe agregar el endpoint `GET /health` en la API (hoy solo existe `GET /`). Opcionalmente puede incluir un `SELECT 1` a PostgreSQL para un readiness probe más estricto.

##### Seguridad

Hardening aplicado en servicios stateless (`api`, `web`). `db` mantiene filesystem de escritura por el volumen de datos.

| Directiva | `api` | `web` | `db` | Propósito |
|-----------|-------|-------|------|-----------|
| `read_only: true` | ✅ | ✅ | ❌ | Impide modificaciones del filesystem en runtime |
| `tmpfs: /tmp` | ✅ | ✅ | — | Escritura efímera donde el proceso lo requiera |
| `cap_drop: [ALL]` | ✅ | ✅ | ❌ | Elimina capabilities innecesarias del kernel |
| `cap_add: [NET_BIND_SERVICE]` | ❌ | ✅ | — | Nginx no-root necesita bindear puerto 80 |
| `security_opt: [no-new-privileges:true]` | ✅ | ✅ | ✅ | Evita escalada de privilegios vía setuid |

Adicionalmente:

- Sin bind mounts de código fuente (`.:/app`).
- `db` sin mapeo `5432:5432` al host — accesible solo desde la red interna.
- Contenedores `api` y `web` corren como usuario no-root (definido en sus `Dockerfile.prod`).

Para Nginx con `read_only: true`, se requieren tmpfs adicionales:

```yaml
tmpfs:
  - /tmp
  - /var/cache/nginx
  - /var/run
```

##### Logging

Driver **`json-file`** con rotación para evitar que los logs llenen el disco del host.

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

Retención máxima por servicio: ~30 MB (3 archivos × 10 MB). Aplica a los tres servicios (`db`, `api`, `web`).

##### Red

Red personalizada **`alentapp-prod`**, tipo `bridge`, explícita. Reemplaza la red `default` implícita de Compose.

```yaml
networks:
  alentapp-prod:
    name: alentapp-prod
    driver: bridge
```

| Servicio | Red | Acceso externo |
|----------|-----|----------------|
| `db` | `alentapp-prod` | Solo desde `api` |
| `api` | `alentapp-prod` | Host vía `:3000` |
| `web` | `alentapp-prod` | Host vía `:80` |

En un despliegue más restrictivo, `api` no publicaría puerto al host y solo `web` (Nginx) actuaría como reverse proxy hacia `http://api:3000`.

##### Secrets

Variables sensibles desde archivo **`.env`** (gitignored). El repositorio incluye `.env.example` con placeholders, sin valores reales.

**`.env.example`:**

```env
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
NODE_ENV=production
PORT=3000
```

**Uso en el compose:**

```yaml
# db
environment:
  POSTGRES_USER: ${POSTGRES_USER}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  POSTGRES_DB: ${POSTGRES_DB}

# api
environment:
  DATABASE_URL: ${DATABASE_URL}
  NODE_ENV: production
  PORT: "3000"
```

**Decisiones de diseño:**

- **`restart: unless-stopped`** — recuperación automática ante fallos del proceso.
- **`depends_on` con `condition: service_healthy`** — la API no arranca hasta PostgreSQL; el frontend espera a la API.
- **Migraciones fuera del compose** — `prisma migrate deploy` se ejecuta como job de CI/CD previo al deploy, no en el `command` del contenedor.

---

#### Requisitos no funcionales

| Requisito | Objetivo | Cómo lo cumple el diseño |
|-----------|----------|--------------------------|
| **Tiempo de startup** | API lista en < 40 s; stack completo en < 60 s | Imagen pre-construida con JS compilado y Prisma Client generado en build; healthcheck de API alineado con a) (`interval: 30s`, `start_period: 20s`) |
| **Disponibilidad** | Recuperación automática ante crash | `restart: unless-stopped` + healthchecks en DB y API |
| **Seguridad** | Mínimo privilegio, sin secretos en repo | `read_only`, `cap_drop`, no-root, `.env` externo, DB sin puerto público |
| **Observabilidad operativa** | Logs acotados y consultables | `json-file` con rotación 10m × 3 archivos |
| **Aislamiento de red** | DB no expuesta al host | Red `alentapp-prod` + sin mapeo de puerto en `db` |
| **Reproducibilidad** | Mismo stack en staging y prod | Imágenes inmutables desde `Dockerfile.prod`, variables desde `.env` |
| **Consumo de recursos** | ~1 GB RAM total bajo carga normal | Límites: DB 512M + API 384M + Web 128M |

#### Diferencias respecto a `docker-compose.yml` (dev)

| Aspecto | Dev | Prod |
|---------|-----|------|
| Dockerfiles | `Dockerfile` | `Dockerfile.prod` (multi-stage) |
| Código | Bind mount `.:/app` | Imagen inmutable |
| API | `tsx watch`, `migrate dev` | `node dist/app.js`, migrate en CI |
| Web | Vite dev server `:5173` | Nginx `:80` |
| DB | Puerto `5432` publicado | Solo red interna |
| Seguridad | Sin hardening | `read_only`, `cap_drop`, no-root |
| Secretos | Hardcodeados | `.env` |

---

## 2.2. Diseño de la observabilidad

### A) Métricas RED a capturar

#### ¿Qué es el método RED?

El método **RED** resume el monitoreo de una API en tres preguntas básicas:

- **Rate (tasa):** ¿cuántas solicitudes llegan por segundo?
- **Errors (errores):** ¿cuántas solicitudes fallan? (HTTP 4xx y 5xx)
- **Duration (duración):** ¿cuánto tarda cada solicitud en responder?

Son las métricas fundamentales para APIs REST porque miden **carga** (Rate), **confiabilidad** (Errors) y **rendimiento** (Duration) sin necesitar decenas de indicadores distintos.

#### Tabla de métricas

| Métrica | Tipo OpenTelemetry | Descripción | Labels |
| ------- | ------------------ | ----------- | ------ |
| `http.requests.total` | Counter | Total de solicitudes HTTP completadas (2xx, 4xx y 5xx). El Rate se calcula a partir de este contador. | `method`, `route`, `status` |
| `http.requests.errors` | Counter | Subconjunto de `http.requests.total`: solicitudes con respuesta 4xx o 5xx. | `method`, `route`, `status` |
| `http.request.duration` | Histogram | Tiempo de respuesta de cada solicitud. | `method`, `route` |
| `process.memory.usage` | Gauge | Memoria que usa el proceso Node.js de la API. | — |
| `http.requests.active` | Gauge | Solicitudes que están siendo procesadas en este momento. | — |

> **Label `route`:** usar el patrón de ruta Fastify (`request.routeOptions.url`, ej. `/api/v1/socios/:id`), **no** la URL concreta de la solicitud (`request.url`, ej. `/api/v1/socios/123`). Evita explosión de cardinalidad cuando hay parámetros dinámicos. Si no hay ruta matcheada (404 global), usar `'unknown'`.

#### Detalle por métrica

##### 1. Rate — `http.requests.total`

| Atributo | Valor |
| -------- | ----- |
| Nombre técnico | `http.requests.total` |
| Tipo OpenTelemetry | Counter |
| Descripción | Suma 1 por cada solicitud completada, **independientemente del código de estado** (2xx, 4xx o 5xx). |
| Unidad | solicitudes (conteo acumulado) |
| Labels | `method`, `route`, `status` |

**Justificación técnica:** Un **Counter** solo incrementa. Eso es exactamente lo que hace una solicitud HTTP: ocurre, se cuenta, y no se "deshace". Cuenta **todas** las respuestas —no solo las exitosas— porque el Rate debe reflejar el tráfico real. `http.requests.errors` es el subconjunto de este contador donde `status >= 400`. Para obtener requests por segundo, Prometheus calcula cuánto creció el contador en un intervalo de tiempo. Es el instrumento más simple y correcto para medir Rate.

##### 2. Errors — `http.requests.errors`

| Atributo | Valor |
| -------- | ----- |
| Nombre técnico | `http.requests.errors` |
| Tipo OpenTelemetry | Counter |
| Descripción | Suma 1 cuando la respuesta es 4xx o 5xx. |
| Unidad | solicitudes (conteo acumulado) |
| Labels | `method`, `route`, `status` |

**Justificación técnica:** Usamos otro **Counter** dedicado a errores para poder medir la tasa de error directamente, sin mezclar solicitudes exitosas (2xx) con fallidas. El label `status` permite distinguir, por ejemplo, un 404 de un 500.

##### 3. Duration — `http.request.duration`

| Atributo | Valor |
| -------- | ----- |
| Nombre técnico | `http.request.duration` |
| Tipo OpenTelemetry | Histogram |
| Descripción | Guarda cuántos milisegundos tardó cada solicitud. |
| Unidad | `ms` |
| Labels | `method`, `route` |

**Justificación técnica:** Un **Histogram** agrupa los tiempos de respuesta en rangos (buckets). Eso permite calcular percentiles como p95 o p99, que muestran si algunas solicitudes son mucho más lentas que el promedio. Un Counter o Gauge no servirían para esto: la latencia es un valor que varía en cada solicitud y necesita una distribución.

##### 4. `process.memory.usage`

| Atributo | Valor |
| -------- | ----- |
| Nombre técnico | `process.memory.usage` |
| Tipo OpenTelemetry | Gauge |
| Unidad | bytes |
| Descripción | Memoria actual del proceso Node.js. |

**Justificación:** Un **Gauge** sube y baja. La memoria no es un evento que se acumula: es un valor instantáneo. Si la memoria crece sin bajar, puede indicar un problema antes de que la API deje de responder.

##### 5. `http.requests.active`

| Atributo | Valor |
| -------- | ----- |
| Nombre técnico | `http.requests.active` |
| Tipo OpenTelemetry | Gauge |
| Unidad | solicitudes |
| Descripción | Cuántas solicitudes están en curso ahora mismo. |

**Justificación:** También es un **Gauge** porque refleja un estado actual (solicitudes en vuelo), no un total acumulado. Si este valor crece mucho, la API puede estar saturada aunque el Rate se mantenga estable.

#### Justificación de las métricas seleccionadas

- **Rate** (`http.requests.total`): indica cuánta carga recibe la API. Si sube de golpe, hay más tráfico; si baja a cero, algo puede estar mal.
- **Errors** (`http.requests.errors`): indica si la API responde bien o está fallando para los usuarios.
- **Duration** (`http.request.duration`): indica si la API responde rápido o se está poniendo lenta.
- **Memoria** (`process.memory.usage`) y **requests activas** (`http.requests.active`): complementan RED mostrando la salud interna del proceso Node.js.

Estas cinco métricas son suficientes para observar una API REST como la de Alentapp: cubren tráfico, errores, velocidad y estado del servidor, que es exactamente lo que pide la consigna del TP.

#### Estrategia de registro

Las cinco métricas se registran desde un **único punto de integración** en [`packages/api/src/app.ts`](../../packages/api/src/app.ts), usando hooks globales de Fastify y un timer periódico. No se instrumenta cada controller por separado: eso dejaría fuera respuestas que Fastify genera sin ejecutar un handler (404 de ruta inexistente, fallos de validación de schema, error handlers globales).

**Diagrama de flujo:**

```txt
  Request
     │
     ▼
  onRequest ──► guardar startTime
             └──► http.requests.active +1
     │
     ▼
  Handler del controller  — o —  respuesta Fastify (404, 400, 500)
     │
     ▼
  onResponse ──► http.requests.total +1  (cualquier status)
             ├──► http.requests.errors +1  (si status >= 400)
             ├──► http.request.duration    (now − startTime)
             └──► http.requests.active −1
```

---

##### Métricas RED — hooks globales

| Hook | Acción |
|------|--------|
| `onRequest` | Guardar timestamp de inicio en la request (p. ej. `request.startTime = Date.now()`). |
| `onResponse` | Incrementar `http.requests.total` con labels `method`, `route` y `status` — **toda** respuesta completada (2xx, 4xx, 5xx). |
| `onResponse` | Si `status >= 400`, incrementar también `http.requests.errors` con los mismos labels. |
| `onResponse` | Registrar `Date.now() − startTime` en `http.request.duration` con labels `method` y `route`. |

**Justificación:** Los hooks `onRequest` / `onResponse` envuelven **todo** el ciclo de vida de la solicitud, incluidas respuestas que nunca llegan a un controller. Registrar en cada handler repetiría lógica en decenas de endpoints y omitiría tráfico relevante para RED (p. ej. un `GET /ruta-inexistente` → 404).

---

##### Label `route` — patrón Fastify, no URL concreta

El valor del label `route` se obtiene de `request.routeOptions.url` (patrón declarado al registrar la ruta), **no** de `request.url` (path concreto de la solicitud).

| Origen | Ejemplo | ¿Usar? |
|--------|---------|--------|
| `request.routeOptions.url` | `/api/v1/socios/:id` | ✅ Sí — cardinalidad acotada por endpoint |
| `request.url` | `/api/v1/socios/550e8400-e29b-41d4-a716-446655440000` | ❌ No — una serie temporal distinta por cada ID |
| Sin ruta matcheada | — | Fallback `'unknown'` (404 global, ruta no registrada) |

Rutas reales del proyecto en [`memberRoutes.ts`](../../packages/api/src/infrastructure/routers/memberRoutes.ts): `PUT /api/v1/socios/:id`, `DELETE /api/v1/socios/:id`. Todas las solicitudes a distintos socios agrupan bajo el mismo label `/api/v1/socios/:id`.

---

##### `process.memory.usage` — timer periódico

| Aspecto | Decisión |
|---------|----------|
| Creación del Gauge | Una sola vez al inicializar el módulo de telemetría |
| Actualización | Timer cada **15 s** que lee `process.memoryUsage()` y escribe el valor |
| Alcance | Un solo lugar (módulo de telemetría), no por request |

**Justificación:** La memoria es un estado del **proceso completo**, no de una solicitud individual. Un timer central evita duplicar lecturas y mantiene la métrica independiente del tráfico HTTP.

---

##### `http.requests.active` — concurrencia en vuelo

| Hook | Acción |
|------|--------|
| `onRequest` | Sumar 1 al Gauge |
| `onResponse` | Restar 1 al Gauge |

Sin labels: un único valor global de solicitudes concurrentes. Se combina con el mismo par de hooks usado para las métricas RED, de modo que `onRequest` concentra el inicio de medición y el conteo activo, y `onResponse` concentra total, errores, duración y cierre del conteo activo.
## 2.2. Diseño de observabilidad

### c) Dashboard RED en Grafana

El dashboard RED de **AlentApp API** se diseña para observar el comportamiento del servicio `api` definido en `docker-compose.prod.yml`, que corre la API REST en Node.js y expone el puerto configurado por `PORT=3000`.

El foco del dashboard está puesto en los endpoints HTTP de la API, a partir de las tres señales principales del modelo RED:

- **Rate**: cantidad de requests por segundo.
- **Errors**: porcentaje de requests con error.
- **Duration**: latencia de las requests, especialmente percentiles altos.

La fuente de datos del dashboard es **Prometheus**, alimentada por las métricas exportadas desde la API instrumentada con OpenTelemetry. El servicio observado es `api`; `web` queda fuera del dashboard RED porque en producción solo sirve archivos estáticos con Nginx, y `db` se monitorea aparte como dependencia interna no expuesta al host.

En Prometheus, los nombres de métricas se consultan con formato normalizado usando guiones bajos.

**Dashboard:** `RED - AlentApp API`

| Elemento | Valor alineado con 2.1 |
|----------|-------------------------|
| Servicio observado | `api` |
| Stack productivo | `docker-compose.prod.yml` |
| Puerto de API | `3000` (`PORT=3000`) |
| Runtime | `node:22-alpine`, imagen generada desde `packages/api/Dockerfile.prod` |
| Dependencia principal | `db`, accesible por red interna `alentapp-prod` |
| Endpoint de salud relacionado | `GET /health` |

| Panel | Métrica / PromQL | Visualización | Objetivo |
|-------|-------------------|---------------|----------|
| Requests por segundo | `sum(rate(http_server_duration_count[1m]))` | Time series | Ver el volumen de tráfico recibido por la API. |
| Tasa de error | `100 * sum(rate(http_server_duration_count{status=~"5.."}[1m])) / clamp_min(sum(rate(http_server_duration_count[1m])), 1)` | Time series | Detectar degradaciones por respuestas 5xx. |
| Latencia p95 / p99 | `histogram_quantile(0.95, sum(rate(http_server_duration_bucket[5m])) by (le))` y `histogram_quantile(0.99, sum(rate(http_server_duration_bucket[5m])) by (le))` | Time series | Medir la experiencia de los usuarios más afectados por latencias altas. |
| Respuestas por status code | `sum by(status) (rate(http_server_duration_count[5m]))` | Stacked area | Comparar rápidamente respuestas 2xx, 4xx y 5xx. |
| Memoria del proceso | `process_memory_usage_bytes / 1024 / 1024` | Time series | Monitorear consumo de memoria de la API en MB. |
| Endpoints más lentos | `topk(5, avg by(route) (http_server_duration_ms))` | Bar chart horizontal | Identificar las rutas con mayor duración promedio. |

#### Layout propuesto

El dashboard se organiza en dos filas de tres paneles:

| Fila | Paneles |
|------|---------|
| 1 | Requests por segundo, tasa de error, latencia p95/p99 |
| 2 | Respuestas por status code, memoria del proceso, endpoints más lentos |

Esta distribución permite revisar primero el estado general del servicio y luego bajar al detalle por status, recursos y endpoints.

#### Umbrales de referencia

| Señal | Umbral sugerido | Motivo |
|-------|-----------------|--------|
| Error rate | > 5% | Indica posible incidente o degradación del backend. |
| Latencia p95 | > 500 ms | Puede afectar la experiencia de uso en operaciones frecuentes. |
| Memoria | Crecimiento sostenido | Puede anticipar fugas de memoria o presión de recursos. |
