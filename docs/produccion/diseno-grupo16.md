# Diseño del Dockerfile de Producción para la API — Fase 2.1 (a)

> **Autor:** Grupo 16  
> **Proyecto:** AlentApp — Monorepo (`@alentapp/api`)  
> **Fase:** 2.1 (a) — Containerización de la API para entorno de producción  

---

## 1. PROPÓSITO

### ¿Qué hace este Dockerfile?

El presente Dockerfile implementa una estrategia de **Multi-stage build** (construcción en múltiples etapas) para generar una imagen Docker de producción para la API REST de AlentApp (`@alentapp/api`), basada en Fastify y TypeScript dentro de un monorepo npm con workspaces.

Su objetivo es producir una imagen final de contenedor que contenga **exclusivamente** los artefactos estrictamente necesarios para ejecutar la API en producción: el código JavaScript compilado (output de TypeScript) y las dependencias de runtime, sin ningún vestigio del entorno de construcción.

### ¿Por qué separar desarrollo de producción mediante Multi-stage builds?

El Dockerfile actual del proyecto ([`packages/api/Dockerfile`](../../packages/api/Dockerfile)) es una imagen de **etapa única** que presenta tres problemas críticos para producción:

1. **Usa `npm install`** en lugar de `npm ci`, instalando tanto dependencias de producción como de desarrollo (herramientas como `tsx`, `vitest`, `prisma CLI`, `@types/*`).
2. **Ejecuta `tsx watch`**, que es el runner de desarrollo de TypeScript-en-vuelo, una herramienta que no debe existir en producción.
3. **Hereda la base `node:20-alpine`** sin restricciones de usuario ni instrucciones de salud, exponiendo al contenedor con el usuario `root` por defecto.

El Multi-stage build resuelve estos problemas de forma estructural mediante tres beneficios fundamentales:

#### a) Seguridad — Minimización de la superficie de ataque

Cada etapa intermedia actúa como un entorno efímero y descartable. Las herramientas de compilación (`tsc`, `tsx`, `prisma CLI`, devDependencies en general) **nunca llegan a la imagen final**. Esto reduce drásticamente la superficie de ataque: un hipotético atacante que logre Remote Code Execution (RCE) dentro del contenedor no encontrará compiladores, gestores de paquetes completos ni herramientas de desarrollo que pueda usar para escalar el ataque o exfiltrar información del entorno de build.

Adicionalmente, la etapa final ejecuta el proceso Node.js bajo el usuario **no-root `node`** (precreado en las imágenes oficiales de Node Alpine), eliminando la posibilidad de que una vulnerabilidad en la aplicación derive en compromisos a nivel de sistema operativo del host a través de privilege escalation.

#### b) Optimización de recursos — Tamaño de imagen

Las imágenes Docker se componen de **capas inmutables**. En una imagen de etapa única, las capas de instalación de devDependencies, los fuentes TypeScript originales y los artefactos intermedios del compilador permanecen en la imagen final aunque se intenten eliminar con `RUN rm -rf`. El Multi-stage build garantiza que la imagen final solo contenga las capas de la etapa `runtime`, ya que Docker **no hereda las capas intermedias** entre etapas, sino únicamente los artefactos copiados explícitamente con `COPY --from=<stage>`.

Esto permite reducir el tamaño final de imagen en aproximadamente un **70%**: de ~1 GB (imagen con devDeps, compilador, fuentes `.ts`) a ~300 MB (runtime Node + deps de producción + JS compilado).

#### c) Reproducibilidad y consistencia

El uso de `npm ci` (en lugar de `npm install`) garantiza instalaciones **deterministas**, trazables y verificadas contra el `package-lock.json`, eliminando la posibilidad de inconsistencias entre entornos por resolución no determinista de versiones de paquetes.

---

## 2. ESTRUCTURA (Tabla de Etapas)

El Dockerfile de producción se estructura en **tres etapas secuenciales**, todas basadas en `node:22-alpine` para garantizar consistencia de runtime y acceso a las herramientas de Alpine.

| Etapa | Nombre | Base | Propósito |
|---|---|---|---|
| **Stage 1** | `deps` | `node:22-alpine` | Instalación limpia y determinista **exclusivamente de dependencias de producción** del monorepo. Se ejecuta `npm ci --omit=dev` desde la raíz del monorepo para que npm Workspaces resuelva correctamente los paquetes internos (`@alentapp/shared`). El `node_modules` resultante no contiene ninguna devDependency (sin `tsx`, `vitest`, `prisma` CLI, ni `@types/*`). Este artefacto es el único que se reutilizará en la etapa `runtime`. |
| **Stage 2** | `build` | `node:22-alpine` | Compilación del código fuente TypeScript a JavaScript. Se copia **todo el código fuente** del monorepo (incluyendo `packages/api/src` y `packages/shared`) y se ejecuta `npm ci` completo (con devDependencies) para disponer de `tsc` y demás herramientas de build. Luego se invoca el compilador TypeScript (`npx tsc --project tsconfig.json`) que emite el JavaScript compilado en el directorio `dist/` configurado como `outDir`. Este stage es **efímero**: sus capas, devDeps y fuentes `.ts` nunca llegarán a la imagen final. |
| **Stage 3** | `runtime` | `node:22-alpine` | Imagen final de producción. Recibe **únicamente** los artefactos necesarios: el directorio `dist/` copiado desde `build` y el `node_modules` de producción copiado desde `deps`. No contiene fuentes TypeScript, compilador, ni devDependencies. Se configura el usuario no-root `node`, se expone el puerto `3000`, se define el HEALTHCHECK y se establece como `CMD` la ejecución directa con `node` nativo (sin intermediarios como `tsx` o `nodemon`). |

### Diagrama de flujo del Multi-stage build

```
┌─────────────────────────────────────────────────────────────────┐
│                    Contexto de Build (host)                     │
│         (filtrado por .dockerignore antes de enviarse)          │
└───────────────────┬─────────────────────────────────────────────┘
                    │
          ┌─────────▼──────────┐
          │  Stage 1: deps     │  node:22-alpine
          │  npm ci --omit=dev │
          │  → node_modules/   │  (solo prod deps)
          └─────────┬──────────┘
                    │  COPY --from=deps node_modules/
                    │
          ┌─────────▼──────────┐
          │  Stage 2: build    │  node:22-alpine
          │  npm ci (full)     │
          │  tsc → dist/       │
          └───┬────────────────┘
              │ COPY --from=build dist/
              │ COPY --from=deps  node_modules/
              │
          ┌───▼────────────────┐
          │  Stage 3: runtime  │  node:22-alpine  ← Imagen final
          │  USER node         │
          │  HEALTHCHECK       │
          │  CMD node dist/... │
          └────────────────────┘
```

---

## 3. REQUISITOS NO FUNCIONALES Y SEGURIDAD

Las siguientes restricciones se aplican **exclusivamente en la etapa `runtime`** (Stage 3), que es la única que se materializa como imagen de producción ejecutable.

---

### 3.1 Usuario No-Root

**Restricción:** El proceso Node.js de la API **no debe ejecutarse como `root`** dentro del contenedor.

**Estrategia:** Las imágenes oficiales `node:*-alpine` incluyen por defecto el usuario del sistema `node` (UID 1000, GID 1000), sin privilegios de superusuario. No es necesario crearlo manualmente.

**Implementación en Dockerfile:**

```dockerfile
# Stage 3: runtime
FROM node:22-alpine AS runtime

WORKDIR /app

# Copia de artefactos desde etapas anteriores
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist

# Asignar propiedad de los archivos al usuario no-root ANTES de cambiar de usuario
RUN chown -R node:node /app

# Cambiar al usuario no-root
USER node
```

**Justificación técnica:** Ejecutar como `root` dentro de un contenedor implica que, ante una vulnerabilidad de la aplicación (e.g., path traversal, SSRF que permita escritura en disco), el atacante dispone de privilegios de administrador sobre el sistema de archivos del contenedor. Con `USER node`, el proceso tiene permisos restringidos únicamente al directorio `/app`, reduciendo el blast radius de cualquier compromiso.

---

### 3.2 HEALTHCHECK

**Restricción:** El contenedor debe auto-reportar su estado de salud al Docker daemon para que orquestadores (Docker Compose, Kubernetes, ECS) puedan tomar decisiones de re-inicio o balanceo de carga.

**Implementación en Dockerfile:**

```dockerfile
HEALTHCHECK \
  --interval=30s \
  --timeout=10s \
  --start-period=20s \
  --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
```

**Justificación de cada parámetro:**

| Parámetro | Valor | Justificación |
|---|---|---|
| `--interval=30s` | 30 segundos | Frecuencia de chequeo. Suficientemente frecuente para detectar caídas, sin sobrecargar al proceso. |
| `--timeout=10s` | 10 segundos | Tiempo máximo de espera de respuesta. Si la API tarda más de 10s en responder `/health`, el chequeo falla. |
| `--start-period=20s` | 20 segundos | Período de gracia al inicio del contenedor para que Fastify y Prisma terminen de inicializarse antes de que los fallos cuenten como unhealthy. |
| `--retries=3` | 3 reintentos | El contenedor se marca como `unhealthy` solo tras 3 fallos consecutivos, evitando falsos positivos por picos de latencia momentáneos. |

> **Nota de implementación:** Se usa `wget` en lugar de `curl` porque Alpine no incluye `curl` por defecto, mientras que `wget` está disponible a través de `busybox`. El endpoint `/health` debe ser implementado en la API como ruta de bajo costo que responda `200 OK` sin lógica de negocio compleja, idealmente con un JSON `{ "status": "ok" }`.

---

### 3.3 Mecanismo de Exclusión — `.dockerignore`

**Restricción:** El contexto de build enviado al Docker daemon debe ser mínimo, seguro y libre de archivos sensibles o innecesarios.

**Problema actual:** El [`.dockerignore`](../../.dockerignore) existente en la raíz del proyecto contiene apenas 4 patrones (`node_modules`, `dist`, `.git`, `*.log`). Esto es insuficiente para un entorno de producción en un monorepo.

**Patrones obligatorios para el `.dockerignore` de producción:**

```dockerignore
# ─── Dependencias locales ───────────────────────────────────────────────────
# Nunca copiar node_modules del host; siempre instalar dentro del contenedor
node_modules
**/node_modules

# ─── Artefactos de compilación ──────────────────────────────────────────────
# La carpeta dist se generará dentro del stage 'build', no se debe heredar del host
dist
**/dist

# ─── Control de versiones ───────────────────────────────────────────────────
# El historial de git no es necesario en ninguna etapa del build
.git
.gitignore

# ─── Archivos de entorno y secretos ─────────────────────────────────────────
# CRÍTICO: Evitar filtración de credenciales en la imagen de producción
.env
.env.*
*.env
!.env.example

# ─── Configuración de CI/CD y GitHub Actions ────────────────────────────────
.github

# ─── Cobertura y reportes de tests ──────────────────────────────────────────
coverage
.nyc_output

# ─── Logs y archivos temporales ─────────────────────────────────────────────
*.log
npm-debug.log*
logs

# ─── Archivos de configuración del editor / IDE ─────────────────────────────
.vscode
.editorconfig
.prettierrc.json
.prettierignore
.eslintrc.js
.eslintignore

# ─── Archivos de documentación (no necesarios en runtime) ───────────────────
docs
README.md

# ─── Archivos de test ───────────────────────────────────────────────────────
**/*.test.ts
**/*.spec.ts
e2e-fullstack

# ─── Archivos de configuración de herramientas de desarrollo ────────────────
vitest.config.ts
playwright.fullstack.config.ts
```

**Impacto en el contexto de build:**

| Categoría | Sin `.dockerignore` completo | Con `.dockerignore` completo |
|---|---|---|
| Contexto enviado al daemon | ~500 MB – 1 GB (incl. `node_modules`) | ~5–15 MB (solo fuentes y configs) |
| Riesgo de filtración de secretos | Alto (`.env` con credenciales DB) | Eliminado |
| Tiempo de `docker build` | Alto (transferencia de contexto lenta) | Reducido significativamente |
| Capas con archivos innecesarios | Presentes en imagen final | Ninguna |

---

### 3.4 Meta de Tamaño — Reducción del ~70%

**Objetivo:** Reducir el tamaño de la imagen final de **~1 GB** (imagen de desarrollo actual) a **~300 MB** (imagen de producción con Multi-stage build).

**Fuentes de bloat eliminadas por diseño:**

| Componente eliminado | Cómo se elimina | Ahorro estimado |
|---|---|---|
| `devDependencies` completas (`tsx`, `vitest`, `prisma` CLI, `@types/*`, `dotenv`) | No se copian al stage `runtime`; solo `node_modules` de prod desde `deps` | ~200–400 MB |
| Compilador TypeScript (`tsc` y su contexto) | Solo existe en stage `build` (efímero, descartado) | ~50–100 MB |
| Código fuente `.ts` original | El stage `runtime` solo recibe `dist/` (JS compilado) | ~5–20 MB |
| Caché de npm y artefactos temporales de build | Se ejecuta `npm ci --omit=dev` con `--prefer-offline` y limpieza de caché | ~50–100 MB |
| Herramientas de desarrollo del entorno Alpine | No instaladas en stage `runtime` (imagen Alpine base ya es minimalista) | Base Alpine: ~7 MB vs Ubuntu: ~80 MB |

**Técnica adicional — Limpieza de caché en cada stage:**

```dockerfile
# En stages deps y build, agregar al final de cada RUN:
RUN npm ci --omit=dev \
    && npm cache clean --force
```

**Justificación técnica de la reducción:**

El principio fundamental es que en Docker, **las capas de etapas anteriores no son heredadas** por etapas posteriores a menos que sean explícitamente copiadas con `COPY --from`. Esto significa que aunque el stage `build` pueda generar 800 MB de capas (devDeps + compilador + caché), **ninguno de esos bytes aparece en la imagen final `runtime`**. La imagen final solo contiene:

1. La imagen base `node:22-alpine` (~55 MB comprimida)
2. El `node_modules` de producción (`deps` stage) — aproximadamente 180–250 MB para las deps de prod de Fastify + Prisma Client
3. El `dist/` con el JavaScript compilado — aproximadamente 1–5 MB
4. Metadatos de configuración (usuario, puerto, variables de entorno)

**Total estimado imagen final: ~240–310 MB**, lo que representa una reducción del ~70% frente a la imagen de desarrollo actual.

---

## Nota Técnica — Prerrequisito para el Stage `build`

> [!IMPORTANT]
> El `tsconfig.json` de la API (`packages/api/tsconfig.json`) hereda del `tsconfig.json` raíz y **tiene configurado `"noEmit": true`**, lo que impide que el compilador TypeScript genere archivos JavaScript en disco. Antes de implementar este Dockerfile de producción, es **obligatorio**:
>
> 1. Configurar un `tsconfig.prod.json` dentro de `packages/api/` que sobreescriba con `"noEmit": false` y defina un `"outDir": "../../dist/api"` (o la ruta que corresponda al monorepo).
> 2. Agregar el script `"build": "tsc --project tsconfig.prod.json"` en el `package.json` de la API (`packages/api/package.json`).
> 3. Verificar que el `CMD` del stage `runtime` apunte correctamente al entrypoint JS compilado (e.g., `node dist/api/src/app.js`).
>

---
