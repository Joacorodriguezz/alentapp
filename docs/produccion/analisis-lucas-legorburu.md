# Actividad 1.1 — Análisis de Infraestructura Docker Actual

**Autor:** Lucas Legorburu  
**Materia:** Ingeniería y Calidad de Software  
**Fecha:** 2026-06-06  
**Repositorio:** alentapp  
**Archivo:** `docs/produccion/analisis-lucas-legorburu.md`

---

## Contexto

Se auditaron los siguientes archivos de configuración del proyecto:

- `docker-compose.yml` (raíz del monorepo)
- `packages/api/Dockerfile`
- `packages/web/Dockerfile`
- `.dockerignore` (impacta el contexto de build usado por ambos Dockerfiles)

El stack actual está orientado a desarrollo local (hot reload, bind mounts, comandos `dev`). Este informe aporta **cinco hallazgos adicionales** no cubiertos en los análisis de Leonel Piquet ni Tomás Bellizzi.

---

## Tabla resumen de hallazgos

| # | Problema | ¿Dónde ocurre? | Categoría | Impacto |
| :-: | :--- | :--- | :--- | :---: |
| 1 | Imágenes base con tag flotante sin digest fijo | `packages/api/Dockerfile` línea 1 · `packages/web/Dockerfile` línea 1 | Seguridad | **Medio** |
| 2 | API instala dependencias del workspace Web innecesariamente | `packages/api/Dockerfile` líneas 9 y 12 | Tamaño de imagen | **Alto** |
| 3 | `.dockerignore` insuficiente agranda contexto e invalida caché de capas | `.dockerignore` líneas 1-4 · `packages/api/Dockerfile` línea 17 · `packages/web/Dockerfile` línea 11 | Caché de capas | **Medio** |
| 4 | `depends_on` de Web sin condición de salud (asimetría con API→DB) | `docker-compose.yml` líneas 39-41 y 59-60 | Resource Management | **Medio** |
| 5 | Ausencia de política `restart` en todos los servicios | `docker-compose.yml` líneas 1-63 | Resource Management | **Medio** |

---

## Detalle de hallazgos

### 1. Imágenes base con tag flotante sin digest fijo

| Campo | Detalle |
| :--- | :--- |
| **Archivo** | `packages/api/Dockerfile` línea 1 · `packages/web/Dockerfile` línea 1 |
| **Líneas** | 1 (en ambos archivos) |
| **Evidencia** | `FROM node:20-alpine` |
| **Categoría** | Seguridad |
| **Impacto** | Medio |

**Explicación técnica:**  
Ambos Dockerfiles referencian la imagen base mediante el tag `node:20-alpine`, que es un tag móvil: Docker Hub puede actualizar el contenido detrás de ese tag cuando se publica un parche de Alpine o de Node.js. Dos builds ejecutados en fechas distintas pueden producir imágenes con bases diferentes (versiones de libc, OpenSSL, npm, etc.) sin que el repositorio haya cambiado. No se fija un digest (`@sha256:...`) ni una versión minor/patch explícita (`node:20.18.0-alpine3.20`).

**Riesgo en producción:**  
Pérdida de reproducibilidad entre entornos (CI, staging, producción). Un rebuild puede introducir silenciosamente vulnerabilidades corregidas — o regresiones — en la capa base. En escenarios de supply-chain compromise del registry, un tag flotante amplifica la superficie de ataque porque no hay anclaje criptográfico al artefacto exacto.

**Solución propuesta:**  
Fijar la imagen base por versión explícita y, preferentemente, por digest SHA256. Automatizar la actualización mediante Dependabot/Renovate o pipeline de CI que valide el nuevo digest antes de promoverlo.

**Ejemplo concreto:**

```dockerfile
# packages/api/Dockerfile (y equivalente en web)
FROM node:20.18.0-alpine3.20@sha256:<digest-verificado-en-build>
```

---

### 2. API instala dependencias del workspace Web innecesariamente

| Campo | Detalle |
| :--- | :--- |
| **Archivo** | `packages/api/Dockerfile` |
| **Líneas** | 9 y 12 |
| **Evidencia** | Línea 9: `COPY packages/web/package.json ./packages/web/` — Línea 12: `RUN npm install` |
| **Categoría** | Tamaño de imagen |
| **Impacto** | Alto |

**Explicación técnica:**  
El Dockerfile de la API copia el manifiesto del workspace `packages/web` antes de ejecutar `npm install`. En un monorepo npm workspaces, al existir `packages/web/package.json` en el árbol, el instalador resuelve e instala las dependencias declaradas allí: React 19, Vite 8, Chakra UI, Playwright, ESLint, etc. (`packages/web/package.json`, líneas 15-47). La API solo requiere `@alentapp/api`, `@alentapp/shared` y sus dependencias de backend (`fastify`, `@prisma/client`, etc.).

**Riesgo en producción:**  
La imagen de la API termina conteniendo cientos de MB de paquetes de frontend y herramientas de build/lint que nunca se ejecutan en runtime. Esto incrementa tiempo de pull/despliegue, consumo de disco en nodos y superficie de ataque (más binarios y librerías auditables con CVEs irrelevantes para el servicio API).

**Solución propuesta:**  
Copiar únicamente los `package.json` de los workspaces que la API necesita (`api` y `shared`). En producción, complementar con multi-stage build e `npm ci --omit=dev --workspace=packages/api` para instalar solo dependencias de runtime.

**Ejemplo concreto:**

```dockerfile
# packages/api/Dockerfile — manifiestos mínimos
COPY package*.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --workspace=packages/api --workspace=packages/shared --omit=dev
```

---

### 3. `.dockerignore` insuficiente agranda contexto e invalida caché de capas

| Campo | Detalle |
| :--- | :--- |
| **Archivo** | `.dockerignore` · `packages/api/Dockerfile` · `packages/web/Dockerfile` |
| **Líneas** | `.dockerignore` 1-4 · API Dockerfile 17 · Web Dockerfile 11 |
| **Evidencia** | `.dockerignore` contiene solo: `node_modules`, `dist`, `.git`, `*.log`. Ambos Dockerfiles ejecutan `COPY . .` después de `npm install`. |
| **Categoría** | Caché de capas |
| **Impacto** | Medio |

**Explicación técnica:**  
El contexto de build enviado al daemon Docker incluye todo el monorepo salvo los cuatro patrones anteriores. Directorios como `docs/` (decenas de TDDs), `e2e-fullstack/`, `packages/web/e2e/`, archivos de Playwright, cobertura y documentación entran en la capa generada por `COPY . .`. Cualquier cambio en documentación, tests E2E o archivos Markdown invalida esa capa aunque el código de API/Web no haya cambiado.

**Riesgo en producción:**  
Builds más lentos en CI/CD, mayor transferencia de contexto al daemon remoto (BuildKit/ECR/ACR), imágenes finales con archivos que no participan del runtime (documentación, specs, fixtures) y mayor probabilidad de filtrar artefactos internos al contenedor.

**Solución propuesta:**  
Ampliar `.dockerignore` con exclusiones por servicio o usar contextos de build reducidos. Copiar solo directorios de código necesarios en lugar de `COPY . .`.

**Ejemplo concreto:**

```dockerignore
# .dockerignore
node_modules
dist
.git
*.log
docs
e2e-fullstack
**/*.test.ts
**/*.test.tsx
**/*.spec.ts
**/*.spec.tsx
**/e2e
**/coverage
playwright-report
test-results
```

```dockerfile
# packages/api/Dockerfile — reemplazar COPY . .
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared
```

---

### 4. `depends_on` de Web sin condición de salud (asimetría con API→DB)

| Campo | Detalle |
| :--- | :--- |
| **Archivo** | `docker-compose.yml` |
| **Líneas** | 39-41 (API→DB) y 59-60 (Web→API) |
| **Evidencia** | API: `depends_on: db: condition: service_healthy`. Web: `depends_on: - api` (sin `condition`). |
| **Categoría** | Resource Management |
| **Impacto** | Medio |

**Explicación técnica:**  
El servicio `api` espera a que PostgreSQL esté listo (`pg_isready` en healthcheck, líneas 13-17) antes de arrancar. Sin embargo, el servicio `web` solo espera que el contenedor `api` exista, no que la API haya completado su secuencia de arranque (`prisma migrate dev`, `prisma generate`, `tsx watch`, líneas 35-38). Docker Compose inicia `web` en cuanto `api` está *started*, no *healthy*.

**Riesgo en producción:**  
Condiciones de carrera en el primer arranque: el frontend puede servir la UI mientras la API aún migra la base o compila Prisma Client, generando errores intermitentes de conexión (`ECONNREFUSED`, HTTP 502 en proxy) difíciles de reproducir. En despliegues con múltiples réplicas, la inconsistencia del grafo de dependencias agrava ventanas de indisponibilidad.

**Solución propuesta:**  
Definir `healthcheck` en `api` y alinear `web` con `condition: service_healthy`, igual que `api` hace con `db`.

**Ejemplo concreto:**

```yml
# docker-compose.yml
api:
  healthcheck:
    test: ['CMD', 'wget', '-qO-', 'http://localhost:3000/health']
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 40s

web:
  depends_on:
    api:
      condition: service_healthy
```

---

### 5. Ausencia de política `restart` en todos los servicios

| Campo | Detalle |
| :--- | :--- |
| **Archivo** | `docker-compose.yml` |
| **Líneas** | 1-63 (ningún bloque de servicio define `restart`) |
| **Evidencia** | Los servicios `db` (líneas 2-17), `api` (líneas 19-41) y `web` (líneas 43-60) carecen de directiva `restart`. |
| **Categoría** | Resource Management |
| **Impacto** | Medio |

**Explicación técnica:**  
Sin `restart: unless-stopped` (o `always`), Docker Compose deja los contenedores en estado `exited` tras un fallo del proceso, un OOM kill del kernel o un reinicio del daemon Docker. El comportamiento por defecto es `restart: "no"`.

**Riesgo en producción:**  
Caídas silenciosas del stack: si la API muere por un error no capturado o PostgreSQL se detiene tras un fallo de disco, el servicio no se recupera automáticamente hasta intervención manual o un orquestador externo. En un servidor único con `docker compose up -d`, esto implica downtime prolongado y violación de expectativas de disponibilidad.

**Solución propuesta:**  
Agregar `restart: unless-stopped` a servicios stateful y stateless. En orquestadores (Swarm/Kubernetes), delegar la política de reinicio al scheduler pero mantener coherencia en Compose para entornos bare-metal/VPS.

**Ejemplo concreto:**

```yml
# docker-compose.yml — en cada servicio
db:
  restart: unless-stopped
  image: postgres:16-alpine
  # ...

api:
  restart: unless-stopped
  build:
    # ...

web:
  restart: unless-stopped
  build:
    # ...
```

---

## Resumen por área

| Área | Problema # | Estado actual |
| :--- | :---: | :--- |
| Seguridad (integridad de imagen base) | 1 | Tag flotante `node:20-alpine` sin digest |
| Tamaño de imagen | 2 | API arrastra dependencias completas de Web |
| Caché de capas | 3 | `.dockerignore` de 4 entradas + `COPY . .` |
| Resource Management | 4, 5 | Grafo de dependencias asimétrico; sin `restart` |
| Variables de entorno | — | Sin hallazgos nuevos en este informe *(credenciales y vars de polling ya cubiertas por compañeros)* |

---

## Nota de complementariedad

Este análisis se apoya en los informes previos sin repetir sus diez hallazgos principales (multi-stage builds, secrets hardcodeados, usuario root, healthchecks/límites de recursos, caché de manifiestos en Web, modo desarrollo, migraciones al arranque, Vite dev server, bind mounts). Los cinco puntos anteriores profundizan riesgos operativos y de build reproducible detectados al revisar el contexto de build (`.dockerignore`), el grafo de dependencias de Compose y la resolución de workspaces en el Dockerfile de API.
