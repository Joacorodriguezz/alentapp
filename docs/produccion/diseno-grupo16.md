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
