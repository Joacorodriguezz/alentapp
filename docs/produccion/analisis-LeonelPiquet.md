# Actividad 1.1 — Análisis de Infraestructura Docker Actual

**Autor:** Leonel Piquet  
**Materia:** Ingeniería y Calidad de Software  
**Fecha:** 2026-06-05  
**Repositorio:** alentapp-1

---

## Contexto

Se auditaron los siguientes archivos de configuración del proyecto:

- `docker-compose.yml` (raíz del monorepo)
- `packages/api/Dockerfile`
- `packages/web/Dockerfile`

El objetivo es identificar problemas críticos respecto a las buenas prácticas de producción en entornos Docker, clasificados por área de impacto.

---

## Hallazgos

| # | Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
| :- | :--- | :--- | :---: | :--- |
| 1 | **Imagen base monolítica sin etapa de build separada (ausencia de Multi-stage Build).** Ambos Dockerfiles utilizan `node:20-alpine` como única etapa y exponen el código fuente completo, las `devDependencies`, el compilador TypeScript (`tsx`) y herramientas de monitoreo de archivos (`chokidar`, `watchpack`) en la imagen final. Esto resulta en imágenes de producción que fácilmente superan los 500 MB con superficie de ataque innecesaria. | `packages/api/Dockerfile` línea 1 · `packages/web/Dockerfile` línea 1 | **Alto** | Implementar **Multi-stage builds**: una etapa `builder` (`node:20-alpine`) que instala dependencias y compila TypeScript/Vite, y una etapa `production` que parte de `node:20-alpine` (API) o `nginx:1.27-alpine` (Web) copiando solo el artefacto compilado (`dist/`) y las `dependencies` de producción (`npm ci --omit=dev`). La imagen resultante del frontend puede bajar a ~25 MB. |
| 2 | **Credenciales de base de datos hardcodeadas en texto plano dentro del repositorio.** El `docker-compose.yml` define `POSTGRES_USER: admin`, `POSTGRES_PASSWORD: password123` y `DATABASE_URL=postgres://admin:password123@db:5432/alentapp_db` como literales dentro del archivo, que es commiteado al VCS. Cualquier actor con acceso al repositorio obtiene las credenciales de producción directamente. | `docker-compose.yml` líneas 6-8 y línea 30 | **Alto** | Reemplazar todos los valores sensibles por referencias a variables de entorno del host usando la sintaxis `${VAR}` de Compose, e incluir un archivo `.env.example` en el repositorio (sin valores reales) y un `.env` ignorado por `.gitignore`. Ejemplo: `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}` y `DATABASE_URL=postgres://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}`. En producción, inyectar los secretos mediante Docker Secrets o un gestor externo (AWS Secrets Manager, Vault). |
| 3 | **Procesos de aplicación ejecutándose como usuario `root` dentro del contenedor.** Ninguno de los dos Dockerfiles define la instrucción `USER`, por lo que el proceso Node.js corre como UID 0. En caso de vulnerabilidad en la aplicación (RCE, path traversal), el atacante obtiene privilegios de root dentro del contenedor y puede escalar al host si el runtime no está correctamente aislado. | `packages/api/Dockerfile` (sin instrucción `USER`) · `packages/web/Dockerfile` (sin instrucción `USER`) | **Alto** | Añadir en cada Dockerfile, previo a `CMD`, la creación y activación de un usuario sin privilegios: `RUN addgroup -S appgroup && adduser -S appuser -G appgroup` seguido de `USER appuser`. Para la etapa Nginx del frontend, usar la imagen `nginx:1.27-alpine` que ofrece el usuario `nginx` incorporado y configurar el servidor para escuchar en el puerto 8080 (no privilegiado). |
| 4 | **Ausencia total de límites de recursos (CPU y memoria) y de healthchecks en los servicios `api` y `web`.** Sin `deploy.resources.limits`, un único servicio puede monopolizar toda la CPU/RAM del host ante un pico de carga o un memory leak, causando la caída del resto del stack. La falta de `healthcheck` impide que Docker y los orquestadores (Compose `depends_on: condition: service_healthy`, Kubernetes liveness probe) detecten un contenedor en estado degradado y lo reinicien automáticamente. | `docker-compose.yml` — bloques `api` (líneas 19-41) y `web` (líneas 43-60); ninguno contiene `deploy.resources` ni `healthcheck` | **Alto** | Agregar en cada servicio dentro de `docker-compose.yml`: un bloque `deploy.resources.limits` (ej. `cpus: '0.5'`, `memory: 512M`) y un bloque `healthcheck` con un endpoint real. Ejemplo para `api`: `healthcheck: { test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"], interval: 30s, timeout: 10s, retries: 3, start_period: 20s }`. Para `web` en producción (Nginx): `test: ["CMD", "curl", "-f", "http://localhost:8080"]`. |
| 5 | **Orden incorrecto de instrucciones en el Dockerfile del frontend que invalida el caché de capas en cada cambio de código fuente.** En `packages/web/Dockerfile`, el `COPY package*.json` no incluye el `package.json` del workspace compartido (`packages/shared/package*.json`), lo que puede hacer que `npm install` resuelva dependencias distintas a las de los demás servicios. Adicionalmente, como `COPY . .` (línea 11) se ejecuta inmediatamente después de `npm install` en una sola etapa, cualquier cambio en cualquier archivo fuente invalida la capa de dependencias, forzando una reinstalación completa de todos los paquetes en cada build. | `packages/web/Dockerfile` líneas 6-11; comparar con `packages/api/Dockerfile` líneas 6-17 que sí copia los `package.json` de los workspaces antes del install | **Medio** | Copiar **todos** los manifiestos de paquetes necesarios antes del `RUN npm install` para maximizar el cache hit: `COPY package*.json ./` · `COPY packages/web/package*.json ./packages/web/` · `COPY packages/shared/package*.json ./packages/shared/`. Luego ejecutar `RUN npm install`. Finalmente copiar solo el código fuente relevante: `COPY packages/web/src ./packages/web/src` · `COPY packages/shared/src ./packages/shared/src`. Con Multi-stage builds, la etapa `production` parte del artefacto ya compilado y no requiere reinstalar dependencias. |

---

## Resumen por área

| Área | Problema # | Estado actual |
| :--- | :---: | :--- |
| Tamaño de imagen | 1 | ❌ Sin Multi-stage build — imagen incluye toolchain de desarrollo |
| Seguridad (credenciales) | 2 | ❌ Secrets hardcodeados en archivos versionados |
| Seguridad (privilegios) | 3 | ❌ Proceso corre como root — sin `USER` no-privilegiado |
| Resource management | 4 | ❌ Sin `limits` de CPU/memoria ni `healthcheck` en api/web |
| Caché de capas | 5 | ⚠️ Orden de COPY subóptimo — cache miss en cada cambio de código |

---

## Próximos pasos (Actividades siguientes)

Los 5 problemas identificados serán abordados en la Actividad 1.2 mediante:

1. **Multi-stage builds** con etapa `builder` (Node 20 Alpine) y etapa final `nginx:1.27-alpine` para el frontend.
2. **Archivo `.env`** excluido de VCS con variables de entorno para todos los secretos.
3. **Instrucción `USER appuser`** (UID sin privilegios) en ambos Dockerfiles de producción.
4. **Bloque `deploy.resources.limits` + `healthcheck`** en todos los servicios de `docker-compose.yml`.
5. **Reordenamiento de capas** con copia granular de manifiestos antes de `npm install`.
