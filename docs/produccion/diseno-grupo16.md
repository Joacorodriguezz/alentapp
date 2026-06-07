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
> 1. Crear `packages/api/tsconfig.prod.json` con `"noEmit": false` y `"outDir": "./dist"`.
> 2. Agregar el script `"build": "tsc --project tsconfig.prod.json"` en `packages/api/package.json`.
> 3. El `CMD` del stage `runtime` apunta a `node dist/app.js`, consistente con el `outDir` definido en el punto 1.

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
| `cap_drop: [ALL]` | ✅ | ✅ | Parcial | Elimina capabilities innecesarias del kernel |
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
