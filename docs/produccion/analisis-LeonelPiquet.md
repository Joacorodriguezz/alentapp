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

## Preguntas Conceptuales — Observabilidad y OpenTelemetry

---

### 1. ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

**OpenTelemetry (OTel)** es un estándar abierto (CNCF) y un conjunto de APIs, SDKs y herramientas de instrumentación que permite recolectar, procesar y exportar datos de telemetría (trazas, métricas y logs) de forma **vendor-neutral**. Su propósito es proporcionar una capa de instrumentación unificada que no esté atada a ningún backend específico.

**Prometheus**, en cambio, es una solución completa de monitoreo y alerta centrada exclusivamente en **métricas numéricas de series temporales**. Incluye su propio modelo de datos, un protocolo de scraping HTTP y un lenguaje de consulta (PromQL).

| Dimensión | OpenTelemetry | Prometheus |
| :--- | :--- | :--- |
| **Tipo de herramienta** | Framework de instrumentación | Sistema de monitoreo + base de datos de métricas |
| **Señales que cubre** | Trazas, Métricas y Logs (los 3 pilares) | Solo Métricas |
| **Modelo de recolección** | Push (OTLP) o Pull (exporter Prometheus) | Pull (scraping HTTP `/metrics`) |
| **Vendor lock-in** | Ninguno — exporta a cualquier backend | Acoplado a su propio ecosistema |
| **Rol habitual** | Capa de instrumentación en la aplicación | Backend de almacenamiento y consulta |

En la práctica se usan **juntos**: OTel instrumenta la aplicación y exporta las métricas al formato Prometheus o a un Collector, y Prometheus las almacena y sirve para dashboards en Grafana.

---

### 2. ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares de la observabilidad son:

| Pilar | Descripción | Herramientas típicas |
| :--- | :--- | :--- |
| **Métricas** | Valores numéricos agregados en el tiempo que describen el comportamiento del sistema (ej: request rate, uso de CPU, latencia en percentiles). | Prometheus, Datadog |
| **Trazas** | Registro del recorrido completo de una solicitud a través de múltiples servicios (distributed tracing). Permiten identificar cuellos de botella en arquitecturas de microservicios. | Jaeger, Zipkin, Tempo |
| **Logs** | Registros textuales de eventos discretos con contexto (timestamp, severity, mensaje). Son el pilar más tradicional. | Loki, ELK Stack |

**OpenTelemetry aborda los tres pilares** de manera unificada. Provee APIs y SDKs para instrumentar trazas (`Tracer`), métricas (`Meter`) y logs (`Logger`) desde una única librería, y permite correlacionarlos mediante identificadores comunes (`trace_id`, `span_id`). Esta correlación entre pilares es una ventaja clave frente a herramientas que solo cubren uno de ellos.

---

### 3. Métricas RED (Rate, Errors, Duration): concepto y utilidad

El método **RED** es un framework de monitoreo orientado a servicios que solicitan trabajo (APIs, microservicios). Fue propuesto por Tom Wilkie (Grafana Labs) como una evolución de USE para servicios orientados a peticiones.

| Métrica | Definición | ¿Para qué sirve? |
| :--- | :--- | :--- |
| **Rate** (Tasa) | Número de solicitudes procesadas por segundo (`req/s`). | Mide la **carga actual** del servicio. Un aumento repentino puede indicar un pico de tráfico o un ataque. Una caída puede señalar que el servicio dejó de recibir tráfico o colapsó. |
| **Errors** (Errores) | Porcentaje o tasa de solicitudes que resultaron en error (HTTP 5xx, timeouts, excepciones). | Mide la **calidad del servicio**. Un incremento en el error rate es el indicador más directo de que algo está fallando para los usuarios. Es la métrica más crítica para SLOs. |
| **Duration** (Duración) | Tiempo que tarda el servicio en responder a cada solicitud (latencia), generalmente medido en percentiles (p50, p95, p99). | Mide la **experiencia del usuario**. La latencia en p99 revela el peor caso que experimentan los usuarios. Permite detectar degradación de rendimiento antes de que se conviertan en errores explícitos. |

Las métricas RED son el punto de partida recomendado para definir **SLIs (Service Level Indicators)** y **SLOs (Service Level Objectives)** en producción.

---

### 4. ¿Qué es OTLP y qué ventaja tiene frente a exportar directamente a Prometheus?

**OTLP (OpenTelemetry Protocol)** es el protocolo de transmisión nativo de OpenTelemetry para enviar datos de telemetría desde las aplicaciones instrumentadas hacia un **OTel Collector** o directamente a un backend compatible. Funciona sobre gRPC (puerto 4317) o HTTP/JSON (puerto 4318) y soporta las tres señales: trazas, métricas y logs en un único protocolo.

**Comparación con exportar directamente a Prometheus:**

| Aspecto | OTLP → OTel Collector | Exportar directo a Prometheus |
| :--- | :--- | :--- |
| **Señales soportadas** | Trazas + Métricas + Logs | Solo Métricas |
| **Modelo de transporte** | Push activo desde la aplicación | Pull pasivo (Prometheus hace scraping) |
| **Backends soportados** | Cualquiera (Prometheus, Jaeger, Tempo, Datadog, etc.) mediante receivers del Collector | Solo Prometheus |
| **Procesamiento intermedio** | El Collector puede filtrar, enriquecer y enrutar datos antes de enviarlos | No hay capa intermedia |
| **Acoplamiento** | Bajo — cambiar de backend no requiere redeployar la app | Alto — cambiar de backend implica cambiar el exporter en la app |
| **Correlación de señales** | Total — trace_id/span_id están presentes en métricas y logs | No aplica — Prometheus no maneja trazas ni logs |

La ventaja central de OTLP es su **desacoplamiento**: la aplicación solo conoce el OTel Collector, y es el Collector quien decide hacia qué backends enrutar cada señal, sin necesidad de redeployar la aplicación al cambiar de stack de observabilidad.

---

### 5. ¿Cómo se relaciona OpenTelemetry con Grafana?

**Grafana** es una plataforma de visualización y análisis que por sí sola no recolecta ni almacena datos; necesita conectarse a **datasources** (fuentes de datos) que son los backends donde viven los datos de telemetría. La relación con OpenTelemetry se da en dos niveles:

**Nivel de ecosistema (indirecto):**

```
Aplicación (OTel SDK)
    │
    │  OTLP (gRPC/HTTP)
    ▼
OTel Collector
    ├──► Prometheus  ◄── scraping ── Grafana (datasource: Prometheus)
    ├──► Grafana Tempo             ── Grafana (datasource: Tempo) [Trazas]
    └──► Grafana Loki              ── Grafana (datasource: Loki)  [Logs]
```

**Nivel de integración nativa (directo):**  
Grafana soporta **OTLP como datasource nativo** a partir de Grafana 10+, lo que permite enviar trazas y métricas directamente desde el Collector a Grafana sin necesidad de Tempo ni Prometheus como intermediarios.

**Puntos clave de la relación:**

- **Grafana Labs** es uno de los principales contribuidores al proyecto OpenTelemetry y mantiene el OTel Collector Distribution para Grafana (`grafana/otelcol`).
- La correlación entre pilares que OTel habilita (ej: ir de una traza lenta directamente a los logs del mismo `trace_id`) se visualiza en Grafana mediante la función **Explore** y los dashboards correlacionados entre Tempo, Loki y Prometheus.
- **Grafana Beyla** es un agente de Grafana Labs basado en eBPF que genera telemetría compatible con OTel de forma automática sin modificar el código fuente de la aplicación.

En resumen: **OpenTelemetry genera y transporta los datos; Grafana los visualiza, correlaciona y alertiza**. Son complementarios y forman el stack de observabilidad moderno de facto en entornos Cloud Native.
