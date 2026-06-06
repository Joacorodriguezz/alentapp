# Análisis de Infraestructura Docker y Operaciones

**Usuario:** Joacorodriguezz
**Materia:** Ingeniería y Calidad de Software — UTN FRLP, 2026
**Duración:** 2 horas
**Fecha:** 2026-06-06
**Archivo:** `docs/produccion/analisis-Joacorodriguezz.md`

---

## 1.1. Analizar la infraestructura Docker actual

Se auditaron `docker-compose.yml`, `packages/api/Dockerfile` y `packages/web/Dockerfile`. El stack está pensado para desarrollo local (bind mounts, hot reload, comandos `dev`), por lo que la mayoría de las debilidades estructurales de cara a producción ya fueron documentadas por mis compañeros.

Para no repetir hallazgos, este informe se construyó **después** de revisar los análisis de Leonel Piquet, Tomás Bellizzi, Lucas Legorburu, LucaGio04 y Facudevida. Quedan así descartados los puntos ya cubiertos (multi-stage builds, secrets hardcodeados, usuario root, ausencia de `limits`/healthchecks en API y Web, orden de `COPY`/caché de capas, `npm ci`, tag flotante sin digest, puerto 5432 expuesto, polling de archivos, volúmenes anónimos de `node_modules`, `prisma generate`/`migrate dev` en runtime, `tsx watch`, Vite dev server, bind mounts del repo, `.dockerignore` insuficiente, `depends_on` sin condición de salud, ausencia de `restart`, hardening de capabilities, logging con rotación, `profiles` dev/prod e instrucción `HEALTHCHECK` en el Dockerfile).

Sobre esa base se identificaron **cinco problemas adicionales**, cada uno verificado contra los principios de *SWEBOK v4*, *The DevOps Handbook* y las diapositivas de la materia, y confirmado como no mencionado en los informes anteriores.

| Problema (explicar) | ¿Dónde ocurre? (archivo:línea) | Impacto (alto/medio/bajo) | Solución propuesta (qué cambiar) |
| :--- | :--- | :--- | :--- |
| **1. `NODE_ENV` nunca se establece en `production`:** ni los Dockerfiles ni el Compose definen `NODE_ENV`, por lo que Node y las librerías (Fastify, Prisma) corren en modo desarrollo y `npm install` instala además las `devDependencies`. La imagen se vuelve más grande y más lenta, y la configuración no distingue ambientes. | `packages/api/Dockerfile:1-22` · `packages/web/Dockerfile:1-17` · `docker-compose.yml:29-32` y `48-50` (bloques `environment`) | Alto | Definir `ENV NODE_ENV=production` en la imagen productiva e instalar con `npm ci --omit=dev`. Mantener `NODE_ENV=development` solo en el override de desarrollo, respetando la inmutabilidad de la imagen entre ambientes. |
| **2. El proceso Node se ejecuta como PID 1 sin init system:** los `CMD`/`command` lanzan `node`/`tsx`/`npm` directamente como proceso 1 del contenedor. Node como PID 1 no reenvía correctamente `SIGTERM` ni recolecta procesos zombie, por lo que `docker stop` espera el grace period completo y termina matando el proceso con `SIGKILL`, cortando conexiones en curso. | `packages/api/Dockerfile:22` (CMD) · `docker-compose.yml:35-38` (command de API) y `58` (command de Web) | Medio | Habilitar el init de Docker (`init: true` en cada servicio del Compose) o usar `tini` como `ENTRYPOINT`. Esto garantiza un apagado limpio (graceful shutdown), clave para reducir el MTTR y para despliegues sin downtime. |
| **3. `RUN npm install` no limpia la caché de npm en la misma capa:** la instalación deja `~/.npm` dentro de la capa generada, sumando decenas de MB de tarballs descargados que no se usan en runtime y que persisten en la imagen final. | `packages/api/Dockerfile:12` · `packages/web/Dockerfile:8` | Bajo | Encadenar la limpieza en la misma instrucción: `RUN npm ci --omit=dev && npm cache clean --force`. En multi-stage build, la etapa final ni siquiera arrastra la caché de la etapa de dependencias. |
| **4. PostgreSQL sin `shm_size` configurado (memoria compartida por defecto de 64 MB):** la imagen oficial limita `/dev/shm` a 64 MB. Bajo consultas con ordenamientos grandes, `work_mem` elevado o paralelismo, PostgreSQL lanza errores `could not resize shared memory segment`. No hay ningún ajuste de este parámetro en el servicio `db`. | `docker-compose.yml:2-17` (servicio `db`, sin `shm_size`) | Medio | Agregar `shm_size: 256mb` (o superior según carga) al servicio `db`. Es un ajuste de resource management específico de PostgreSQL en contenedores, independiente de los `limits` de CPU/RAM. |
| **5. Puertos de API y Web publicados en todas las interfaces (`0.0.0.0`):** los mapeos `'3000:3000'` y `'5173:5173'` se enlazan a todas las interfaces del host. En un servidor cloud sin firewall estricto, la API y el dev server quedan alcanzables desde el exterior. (Distinto del puerto 5432, ya tratado por LucaGio04: acá el foco es API y Web.) | `docker-compose.yml:33-34` (API) y `56-57` (Web) | Medio | En producción no publicar puertos de aplicación al host: exponer solo a través de un reverse proxy (Nginx/Traefik) en la red interna de Compose. Si se requiere acceso local, enlazar a loopback: `'127.0.0.1:3000:3000'`. |

---

## Detalle y fundamento de cada hallazgo

### 1. `NODE_ENV` sin definir → modo desarrollo en producción

`The DevOps Handbook` insiste en que la imagen debe ser **inmutable** y que lo único que cambia entre Test/Staging/Producción es la configuración inyectada. Hoy no existe ninguna señal de ambiente: sin `NODE_ENV=production`, frameworks como Fastify habilitan logging verboso y validaciones de desarrollo, y `npm install` arrastra `devDependencies` (compiladores, linters, Playwright) que no deberían ejecutarse en runtime. Es a la vez un problema de **entorno** (no hay separación dev/prod a nivel de proceso) y de **tamaño de imagen**.

A diferencia del hallazgo de Tomás Bellizzi —que apunta al **comando** de arranque (`tsx watch`/`npm run dev`) y propone compilar y ejecutar con `node`—, este punto se concentra en la **variable de ambiente ausente**: aunque se cambiara el comando a `node`, sin `NODE_ENV=production` los frameworks seguirían en modo desarrollo y el `npm install` seguiría instalando `devDependencies`. Son dos cambios independientes (uno en el `command`/`CMD`, otro en la configuración de ambiente) que se complementan.

```dockerfile
# Etapa de runtime productiva
ENV NODE_ENV=production
RUN npm ci --omit=dev && npm cache clean --force
```

### 2. Node como PID 1 sin init system

En Linux, el proceso 1 tiene responsabilidades especiales: reenviar señales a sus hijos y recolectar procesos huérfanos (zombies). Node no fue diseñado para ese rol. La consecuencia práctica viola las prácticas de **Ingeniería de Resiliencia (SRE)**: al hacer `docker stop`, la señal `SIGTERM` no se procesa, el contenedor agota el grace period y recibe `SIGKILL`, abortando requests activos y aumentando el MTTR percibido en cada deploy.

```yml
# docker-compose.yml — en api y web
api:
  init: true
```

### 3. `npm install` sin limpieza de caché

Docker cachea cada capa tal cual queda al terminar la instrucción. Si `npm install` deja la caché de npm dentro de la capa, ese peso viaja en cada `pull` del registry. El principio de **imágenes mínimas** de las diapositivas exige que cada capa contenga solo lo necesario para runtime.

```dockerfile
RUN npm ci --omit=dev && npm cache clean --force
```

### 4. PostgreSQL y el límite de memoria compartida

La imagen `postgres:16-alpine` monta `/dev/shm` con apenas 64 MB. PostgreSQL usa esa memoria compartida para buffers de consultas paralelas y ordenamientos. Bajo carga real, la base emite `could not resize shared memory segment` y la consulta falla, no por falta de RAM del host sino por este límite del contenedor. Es un ajuste de **resource management** complementario —no sustituto— de los `deploy.resources.limits` que ya señalaron mis compañeros.

```yml
db:
  image: postgres:16-alpine
  shm_size: 256mb
```

### 5. Exposición de puertos de aplicación en `0.0.0.0`

El *principio de privilegios mínimos* del *SWEBOK* aplica también a la superficie de red: cada puerto publicado es una vía de entrada. LucaGio04 ya señaló retirar el mapeo de PostgreSQL; este hallazgo extiende el criterio a **API y Web**, que en producción no deberían publicarse directamente al host sino quedar detrás de un reverse proxy que centralice TLS, rate limiting y headers de seguridad.

```yml
# Producción: solo el proxy publica al exterior; API/Web viven en la red interna
api:
  expose:
    - '3000'   # visible solo dentro de la red de Compose
# Acceso local de debug, si hace falta:
#   ports: ['127.0.0.1:3000:3000']
```

---

## Resumen por área evaluada

| Área | Hallazgo # | Estado actual |
| :--- | :---: | :--- |
| Entorno (separación dev/prod) | 1 | `NODE_ENV` sin definir — proceso y deps en modo desarrollo |
| Resource Management (resiliencia) | 2, 4 | Node como PID 1 sin init; PostgreSQL con `/dev/shm` de 64 MB |
| Tamaño de imagen | 1, 3 | `devDependencies` + caché de npm dentro de la capa |
| Seguridad (superficie de red) | 5 | API y Web publicados en todas las interfaces |
| Caché de capas | — | Sin hallazgos nuevos *(agotado en informes previos)* |

---



## 1.2. Investigación sobre OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

**OpenTelemetry (OTel)** es un framework de observabilidad de la CNCF que define *cómo* una aplicación produce y exporta telemetría. No es un producto que se instala y consulta, sino un conjunto de APIs, SDKs y convenciones semánticas que se incrustan en el código para emitir trazas, métricas y logs en un formato común, sin atarse a ningún proveedor.

**Prometheus** es lo contrario en términos de rol: un producto cerrado y completo de monitoreo de métricas, con su propia base de series temporales (TSDB), su lenguaje PromQL y su modelo de recolección por *scraping*. Hace una cosa —métricas— y la hace de punta a punta.

La forma más clara de verlo: si una aplicación quisiera dejar de usar Prometheus y migrar a otro backend, con instrumentación nativa de Prometheus habría que tocar el código; con OpenTelemetry, basta cambiar la configuración del exportador. OTel responde a "cómo genero los datos"; Prometheus, a "dónde guardo y consulto las métricas". Por eso es común usarlos **juntos**: OTel instrumenta, Prometheus almacena.

| | OpenTelemetry | Prometheus |
| :--- | :--- | :--- |
| Naturaleza | Estándar/framework de instrumentación | Producto de monitoreo de métricas |
| Qué cubre | Trazas + métricas + logs | Solo métricas |
| ¿Almacena? | No (delega en backends) | Sí (TSDB propia) |
| Recolección | Push vía OTLP | Pull vía scraping `/metrics` |
| Atadura a proveedor | Vendor-neutral | Su propio ecosistema |

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares son **métricas**, **logs** y **trazas**, y cada uno responde una pregunta distinta:

- **Métricas:** *¿qué tan bien funciona el sistema en conjunto?* Son números agregados en el tiempo (req/s, latencia p95, uso de memoria). Baratas de almacenar, ideales para dashboards y alertas.
- **Logs:** *¿qué pasó exactamente en este evento?* Registros discretos con detalle textual y contexto. Son la fuente de verdad para depurar un caso puntual.
- **Trazas:** *¿por dónde pasó esta solicitud y dónde se perdió el tiempo?* Reconstruyen el camino de un request a través de los componentes, con spans que miden cada tramo. Imprescindibles en sistemas distribuidos.

**OpenTelemetry aborda los tres**, y su valor diferencial no es solo cubrirlos sino **correlacionarlos**: comparten `trace_id` y `span_id`, de modo que desde una métrica anómala se puede saltar a la traza del request lento y de ahí al log exacto del error. Además, el proyecto incorpora una cuarta señal emergente, los *profiles* (perfilado continuo).

### Expliquen el concepto de métricas RED (Rate, Errors, Duration). ¿Para qué sirve cada una?

**RED** es un conjunto mínimo de tres métricas para vigilar servicios que atienden pedidos (como la API de alentapp). La idea, propuesta por Tom Wilkie, es que con solo tres números se sabe si un servicio está sano:

- **Rate (Tasa):** cuántas solicitudes por segundo atiende el servicio. Sirve para entender la **carga**: detectar picos, caídas de tráfico o comportamiento fuera de lo normal.
- **Errors (Errores):** qué proporción de esas solicitudes falla (5xx, timeouts, excepciones). Sirve para medir la **confiabilidad** y es el disparador más directo de un incidente: si sube, los usuarios ya lo están sufriendo.
- **Duration (Duración):** cuánto tarda en responder, mirado en percentiles (p50/p95/p99). Sirve para medir la **experiencia**: el p99 muestra el peor caso real y permite anticipar degradaciones antes de que se conviertan en errores.

Juntas responden, casi de un vistazo: *¿hay tráfico?, ¿está fallando?, ¿está lento?* Son la base natural para definir SLIs y SLOs.

### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

**OTLP** es el protocolo de transporte propio de OpenTelemetry. Lleva las tres señales —trazas, métricas y logs— por un mismo canal, sobre gRPC (puerto 4317) o HTTP (4318), normalmente hacia un **OpenTelemetry Collector**.

La ventaja frente a exportar directo a Prometheus se entiende pensando en el **acoplamiento**. Con el formato nativo de Prometheus, la aplicación queda ligada a ese backend y solo a métricas: para sumar trazas o logs habría que integrar exportadores adicionales, y para cambiar de backend habría que modificar la app. Con OTLP, la aplicación solo conoce un destino —el Collector— y es éste quien decide a dónde reenviar cada señal (Prometheus, Tempo, Loki, Jaeger, Datadog, etc.). Ese punto intermedio además permite filtrar, enmascarar datos sensibles, samplear y reintentar antes de llegar al backend. En resumen: **un solo protocolo, todas las señales y cero reescritura de la app al cambiar de stack**.

### ¿Cómo se relaciona OpenTelemetry con Grafana?

Cumplen roles complementarios y no compiten. **OpenTelemetry produce y transporta** la telemetría; **Grafana la visualiza, correlaciona y alerta**. Grafana por sí sola no instrumenta ni recolecta: se conecta a *datasources* donde los datos ya fueron almacenados.

El flujo típico para un proyecto como alentapp sería:

```txt
API Fastify  →  OTel SDK (Node.js)
                    │  OTLP
                    ▼
            OpenTelemetry Collector
              ├──► Prometheus  (métricas RED)
              ├──► Tempo       (trazas)
              └──► Loki        (logs)
                        │
                        ▼
                     Grafana   (dashboards · alertas · correlación)
```

La relación se refuerza porque **Grafana Labs** es uno de los grandes contribuyentes a OpenTelemetry y mantiene su propia distribución del Collector; además, Grafana (v10+) admite ingestión OTLP de forma más directa, simplificando despliegues chicos. El resultado práctico para alentapp: instrumentar la API con `@opentelemetry/sdk-node`, exportar por OTLP y montar un dashboard RED por endpoint para medir cada release de manera objetiva.

