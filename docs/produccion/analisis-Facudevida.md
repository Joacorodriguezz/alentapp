# Actividad 4 — Fase 1: Análisis de Infraestructura Docker y OpenTelemetry

**Autor:** Facudevida  
**Materia:** Ingeniería y Calidad de Software  
**Fecha:** 6 de junio de 2026  
**Repositorio:** alentapp  
**Archivo:** `docs/produccion/analisis-Facudevida.md`

---

## 1.1 Análisis de la infraestructura Docker actual

Se revisaron los siguientes archivos del proyecto:

- `docker-compose.yml` (raíz del monorepo)
- `packages/api/Dockerfile`
- `packages/web/Dockerfile`

El stack actual está orientado a desarrollo local: levanta PostgreSQL, la API Fastify/Prisma y el frontend Vite/React con bind mounts y comandos de desarrollo. Este informe complementa los análisis de Leonel Piquet, Tomás Bellizzi, Lucas Legorburu y LucaGio04, evitando repetir sus hallazgos principales (multi-stage builds, credenciales hardcodeadas, usuario root, healthchecks/límites de recursos, `npm ci`, puerto 5432 expuesto, polling de archivos, volúmenes anónimos de `node_modules`, `prisma generate` en runtime, tag flotante sin digest, API con deps de Web, `.dockerignore` insuficiente, `depends_on` sin condición de salud, ausencia de `restart`, `tsx watch`, `migrate dev`, Vite dev server, bind mounts del repo completo).

### Evaluación por dimensiones

| Dimensión | Estado | Observación breve |
|-----------|--------|-------------------|
| **Tamaño de imagen** | Mejorable | El web Dockerfile instala workspaces incompletos: copia `packages/web/package*.json` pero omite `packages/shared/package*.json`, lo que produce instalaciones inconsistentes con el resto del monorepo. |
| **Seguridad** | Deficiente | No se aplica ningún hardening de capabilities ni restricción de syscalls (`cap_drop`, `security_opt`) en ningún servicio de Compose. |
| **Resource management** | Parcial | No hay configuración de `logging driver` con rotación en ningún servicio; en un servidor de larga ejecución los logs del daemon pueden llenar el disco sin límite. |
| **Caché de capas** | Subóptima | El web Dockerfile omite el `package.json` del workspace compartido (`packages/shared`) antes del `RUN npm install`, lo que puede generar instalaciones distintas entre servicios e impide aprovechar el caché correctamente cuando solo cambia el código fuente. |
| **Entorno** | Solo dev | No se utilizan los **profiles** nativos de Docker Compose para separar servicios o variables de entorno de desarrollo y producción; todo convive en un único archivo sin segregación formal. |

---

### Tabla de problemas identificados

| # | Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|---|----------|----------------|---------|-------------------|
| 1 | **Web Dockerfile omite `packages/shared/package*.json` antes del install** — al ejecutar `RUN npm install` sin el manifiesto de `packages/shared`, npm workspaces puede resolver versiones distintas a las usadas por la API, generando inconsistencias de dependencias entre servicios del mismo monorepo. Además, al cambiar solo el código fuente de `shared`, la capa de dependencias del Web no se beneficia del caché porque el manifiesto que debería anclar esa capa nunca se copió. | `packages/web/Dockerfile` líneas 6-8 | Medio | Agregar `COPY packages/shared/package*.json ./packages/shared/` después de la línea 7 y antes del `RUN npm install`, alineándose con el patrón ya seguido en `packages/api/Dockerfile` (líneas 6-9). |
| 2 | **Ausencia de hardening de capabilities y opciones de seguridad del contenedor** — ningún servicio en `docker-compose.yml` define `cap_drop`, `cap_add` ni `security_opt`. Por defecto, Docker otorga a los contenedores un conjunto de ~14 capabilities de Linux (incluyendo `NET_RAW`, `AUDIT_WRITE`, `MKNOD`, etc.) que ninguno de los tres servicios necesita. Tampoco se restringe la escalada de privilegios con `no-new-privileges`. | `docker-compose.yml` — bloques `db` (L2-17), `api` (L19-41) y `web` (L43-60); ninguno contiene `cap_drop` ni `security_opt` | Alto (seguridad) | Agregar en cada servicio: `cap_drop: ["ALL"]` para eliminar todas las capabilities por defecto, y `security_opt: ["no-new-privileges:true"]` para impedir que un proceso hijo eleve privilegios mediante `setuid`/`setgid`. Agregar de vuelta solo las capabilities estrictamente necesarias con `cap_add` (en este caso ninguna para API y Web; PostgreSQL puede requerir `SETUID`/`SETGID` que ya gestiona la imagen oficial). |
| 3 | **Sin driver de logging con rotación — los logs pueden llenar el disco** — ninguno de los servicios configura el campo `logging` en `docker-compose.yml`. El driver por defecto (`json-file`) acumula los logs de stdout/stderr de cada contenedor en archivos JSON sin límite de tamaño ni rotación. En un servidor de larga ejecución con `tsx watch` generando salida continua, el daemon de Docker puede llenar el disco del host y provocar una caída de todos los contenedores por falta de espacio. | `docker-compose.yml` — todos los servicios (L2-60); ninguno define `logging` | Medio/Alto | Configurar el driver de logging en cada servicio con límite de tamaño y rotación: `logging: { driver: "json-file", options: { max-size: "10m", max-file: "3" } }`. Alternativamente, configurar el driver `local` de Docker (más eficiente) a nivel global en `/etc/docker/daemon.json`. En producción, considerar un driver centralizado como `loki` o `fluentd`. |
| 4 | **No se usan `profiles` de Docker Compose para separar entornos dev/prod** — el único `docker-compose.yml` define los tres servicios sin ningún `profiles:` asociado. Las variables de polling, los comandos de desarrollo, los bind mounts y las configuraciones de depuración conviven en el mismo archivo que eventualmente se usaría como base productiva. Docker Compose soporta perfiles nativos desde la versión 1.28 (`--profile dev` / `--profile prod`) que permiten activar selectivamente servicios o sobreescribir configuraciones sin duplicar archivos. | `docker-compose.yml` — estructura completa (L1-64) | Medio | Definir perfiles en el Compose. Los servicios con herramientas de desarrollo (hot reload, polling) deben pertenecer al perfil `dev`. Los servicios productivos, sin bind mounts y con imágenes compiladas, deben pertenecer al perfil `prod`. Complementar con un `docker-compose.override.yml` para desarrollo local que sobreescriba los valores por defecto productivos, manteniendo el `docker-compose.yml` base apto para producción. |
| 5 | **El servicio `api` no tiene instrucción `HEALTHCHECK` en su Dockerfile — solo depende del Compose** — aunque `docker-compose.yml` podría definir un healthcheck para `api` (no lo hace actualmente; Lucas Legorburu documentó la asimetría `depends_on`), el mecanismo más robusto es embeber el `HEALTHCHECK` directamente en el Dockerfile. Así, la imagen es auto-descriptiva y funciona correctamente tanto en Docker Compose como en Docker Swarm, Kubernetes o cualquier orquestador que interprete el estado de salud de la imagen. Sin `HEALTHCHECK` en el Dockerfile, la imagen siempre reporta estado `healthy` por defecto, lo que puede inducir a error en pipelines de CI que validan la salud del contenedor antes de proceder con el despliegue. | `packages/api/Dockerfile` — sin instrucción `HEALTHCHECK` (23 líneas totales, ninguna es HEALTHCHECK) · `packages/web/Dockerfile` — sin instrucción `HEALTHCHECK` | Medio | Agregar en `packages/api/Dockerfile` antes del `CMD`: `HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1`. Para el Dockerfile de Web, en un escenario productivo con Nginx: `HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8080/ || exit 1`. Esto garantiza que cualquier sistema que inspeccione la imagen obtenga el estado real del proceso. |

---

### Notas complementarias por área

**Tamaño de imagen:** la omisión del `package.json` de `shared` en el Dockerfile de Web no aumenta el tamaño de la imagen per se, pero sí provoca resoluciones de dependencias inconsistentes y puede llevar a instalar versiones incorrectas de paquetes compartidos, generando bugs sutiles que solo aparecen en el servicio web.

**Seguridad:** el hardening de capabilities es una capa de defensa en profundidad independiente del usuario con el que corre el proceso. Incluso con un usuario no-root (hallazgo ya documentado por Leonel), un proceso con `NET_RAW` puede ejecutar ataques de red internos dentro de la red de Compose. Eliminar todas las capabilities y agregar solo las estrictamente necesarias reduce drásticamente la superficie de ataque lateral.

**Resource management:** la ausencia de logging con rotación es un riesgo operativo silencioso. Los contenedores de desarrollo generan mucha más salida de logs que los productivos (hot reload, polling, migraciones), lo que agrava el problema en el contexto actual del stack.

**Caché de capas:** el problema del manifiesto de `shared` faltante en Web es análogo al hallazgo #5 de Leonel, pero desde la perspectiva inversa: mientras Leonel señaló que la Web no copia `shared/package.json` antes del install, aquí se profundiza en la implicancia concreta sobre la consistencia de versiones entre servicios del monorepo.

**Entorno:** la falta de `profiles` es un problema de diseño del Compose que trasciende las variables de entorno individuales. Sin perfiles, es imposible activar o desactivar grupos de servicios según el contexto sin editar el archivo manualmente, lo que aumenta el riesgo de desplegar configuraciones de desarrollo en producción.

---

## 1.2 Investigación sobre OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

**OpenTelemetry (OTel)** es un proyecto de la Cloud Native Computing Foundation (CNCF) que provee un conjunto estándar, vendor-neutral, de APIs, SDKs, agentes y convenciones semánticas para **instrumentar, generar, recolectar y exportar** datos de observabilidad. Cubre tres señales: trazas, métricas y logs. No almacena datos por sí mismo: actúa como capa de instrumentación que envía telemetría a un backend compatible.

**Prometheus** es un sistema completo de **monitoreo y almacenamiento de métricas de series temporales**. Incluye un modelo de datos propio, un lenguaje de consulta (PromQL), un motor de alertas (Alertmanager) y un protocolo de recolección basado en scraping HTTP (`/metrics`). Su foco exclusivo son las métricas numéricas; no maneja trazas ni logs de forma nativa.

| Dimensión | OpenTelemetry | Prometheus |
|-----------|---------------|------------|
| **Rol principal** | Framework de instrumentación y transporte | Backend de almacenamiento y consulta de métricas |
| **Señales cubiertas** | Traces + Metrics + Logs | Solo Metrics |
| **Modelo de recolección** | Push activo vía OTLP hacia un Collector | Pull pasivo — Prometheus scrapea endpoints `/metrics` |
| **Vendor lock-in** | Ninguno — exporta a cualquier backend | Medio — acoplado a su propio ecosistema |
| **Almacenamiento** | No almacena — delega en backends | Almacenamiento propio de series temporales (TSDB) |
| **Uso típico** | Instrumentar la aplicación (SDK en el código) | Almacenar métricas y definir alertas |

La diferencia clave es de **rol en la arquitectura de observabilidad**: OTel vive en la capa de instrumentación (dentro de la aplicación), mientras que Prometheus vive en la capa de almacenamiento y consulta. No son alternativas excluyentes; un patrón habitual es: *App con OTel SDK → OTel Collector → Prometheus (métricas) + Tempo (trazas) + Loki (logs) → Grafana (visualización)*.

---

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares de la observabilidad son:

| Pilar | Descripción | Herramienta típica de backend |
|-------|-------------|-------------------------------|
| **Métricas** | Valores numéricos agregados en el tiempo que describen el comportamiento del sistema. Ejemplo: cantidad de requests por segundo, uso de CPU, latencia en percentiles p50/p95/p99. | Prometheus, InfluxDB, Datadog |
| **Logs** | Registros textuales de eventos discretos con contexto (timestamp, nivel de severidad, mensaje, atributos). Ejemplo: `ERROR: Prisma P2002 unique constraint violation on members`. | Loki, Elasticsearch (ELK Stack) |
| **Trazas (Traces)** | Representación del recorrido completo de una solicitud a través de múltiples componentes o servicios. Compuesta por *spans* anidados con duración y atributos. Ejemplo: un request a `POST /equipment-loans` que pasa por el Controller → UseCase → Repository → PostgreSQL. | Jaeger, Zipkin, Grafana Tempo |

**OpenTelemetry aborda los tres pilares de forma unificada.** Provee APIs y SDKs para instrumentar métricas (`Meter`), trazas (`Tracer`) y logs (`Logger`) desde una única librería por lenguaje. La ventaja diferencial es que los tres pilares comparten el mismo contexto de correlación (`trace_id`, `span_id`), lo que permite, por ejemplo, partir de una métrica RED anómala en Grafana, abrir la traza del request lento y ver el log exacto del error en la misma interfaz.

---

### Métricas RED (Rate, Errors, Duration)

El método **RED** es un framework de monitoreo orientado a servicios que procesan solicitudes (APIs, microservicios). Fue propuesto por Tom Wilkie (Grafana Labs) y responde tres preguntas fundamentales sobre cualquier servicio:

| Métrica | Definición | ¿Para qué sirve? | Ejemplo en alentapp |
|---------|------------|------------------|---------------------|
| **Rate** (Tasa) | Número de solicitudes procesadas por segundo (`req/s`). | Mide la **carga actual** del servicio. Un aumento repentino puede indicar un pico de tráfico; una caída puede señalar que el servicio colapsó o dejó de recibir tráfico. | `18 req/s` en `GET /members` durante el horario de mayor actividad del club. |
| **Errors** (Errores) | Porcentaje o tasa de solicitudes que resultaron en error (HTTP 4xx/5xx, timeouts, excepciones no manejadas). | Mide la **calidad y confiabilidad** del servicio. Un incremento en el error rate es el indicador más directo de que algo está fallando para los usuarios finales. Es la métrica central para definir SLOs. | `3.2%` de respuestas `HTTP 500` en `POST /equipment-loans` durante un pico de carga. |
| **Duration** (Duración) | Tiempo que tarda el servicio en responder a cada solicitud, medido en percentiles (p50, p95, p99). | Mide la **experiencia del usuario**. La latencia en p99 revela el peor caso experimentado. Permite detectar degradación de rendimiento antes de que se convierta en errores explícitos. | `p99 = 520ms` en consultas a `GET /equipment-loans/:id` cuando Prisma realiza un join con members. |

Las métricas RED son el punto de partida recomendado para definir **SLIs (Service Level Indicators)** y **SLOs (Service Level Objectives)**: por ejemplo, *"el 99% de los requests a `/members` deben completarse en menos de 300ms con un error rate inferior al 1%"*.

---

### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

**OTLP (OpenTelemetry Protocol)** es el protocolo nativo de OpenTelemetry para transportar datos de telemetría desde las aplicaciones instrumentadas hacia un OTel Collector o directamente hacia un backend compatible. Soporta dos transportes:

- **gRPC** (puerto 4317) — binario, eficiente, bidireccional.
- **HTTP/JSON** (puerto 4318) — más fácil de depurar, compatible con firewalls restrictivos.

Transporta las tres señales (trazas, métricas y logs) por el mismo canal.

**Comparación con exportar directamente a Prometheus:**

| Aspecto | OTLP → OTel Collector | Exportar directo a Prometheus |
|---------|----------------------|-------------------------------|
| **Señales soportadas** | Trazas + Métricas + Logs | Solo Métricas |
| **Modelo de transporte** | Push activo desde la aplicación | Pull pasivo — Prometheus scrapea la app |
| **Backends destino** | Cualquiera (Prometheus, Jaeger, Tempo, Datadog, New Relic, etc.) mediante receivers del Collector | Solo Prometheus |
| **Procesamiento intermedio** | El Collector puede filtrar, enriquecer, samplear y enrutar antes de enviar | Sin capa intermedia |
| **Acoplamiento** | Bajo — cambiar backend no requiere modificar el código de la app | Alto — cambiar backend implica reescribir el exporter en la app |
| **Escalabilidad** | El Collector puede actuar como buffer y gestionar backpressure | La app depende de que Prometheus esté disponible para el scraping |

La ventaja central de OTLP es el **desacoplamiento mediante el Collector**: la aplicación solo conoce un destino (el Collector) y es éste quien decide hacia qué backends enrutar cada señal, sin necesidad de redeployar la aplicación al cambiar el stack de observabilidad.

Flujo recomendado para alentapp:

```txt
Fastify API (OTel SDK Node.js)
        │ OTLP (gRPC :4317)
        ▼
OpenTelemetry Collector
        ├──► Prometheus  (métricas RED de los endpoints)
        ├──► Tempo       (trazas de requests: Controller → UseCase → Prisma)
        └──► Loki        (logs estructurados con trace_id correlacionado)
                │
                ▼
            Grafana      (dashboards + alertas + correlación entre pilares)
```

---

### ¿Cómo se relaciona OpenTelemetry con Grafana?

**Grafana** es una plataforma de **visualización, correlación y alertas** que se conecta a *datasources* (fuentes de datos) donde viven los datos exportados. No instrumenta aplicaciones ni recolecta telemetría por sí sola.

La relación con OpenTelemetry se establece en la arquitectura de observabilidad completa:

1. La aplicación (API Fastify de alentapp) se instrumenta con el **OTel SDK para Node.js** (`@opentelemetry/sdk-node`).
2. El SDK genera trazas, métricas y logs con contexto de correlación compartido (`trace_id`, `span_id`).
3. Los datos se envían vía **OTLP** al **OTel Collector**.
4. El Collector los reenvía a backends especializados: **Prometheus** (métricas), **Grafana Tempo** (trazas), **Grafana Loki** (logs).
5. **Grafana** consulta esos backends como datasources y permite:
   - Dashboards con métricas RED por endpoint.
   - Exploración de trazas distribuidas (Controller → UseCase → Prisma → PostgreSQL).
   - Correlación: desde una métrica anómala, ir directamente a la traza y al log del mismo `trace_id`.
   - Alertas basadas en SLOs.

**Integración nativa:** Grafana 10+ soporta OTLP como datasource nativo, permitiendo recibir trazas y métricas directamente desde el Collector sin necesidad de backends intermedios adicionales para despliegues pequeños.

**Grafana Labs y OTel:** Grafana Labs es uno de los principales contribuidores al proyecto OpenTelemetry y mantiene `grafana/otelcol`, una distribución del OTel Collector preconfigurada para el ecosistema Grafana. Para alentapp en un primer despliegue productivo, instrumentar la API con OTel y visualizar los dashboards RED en Grafana permitiría detectar regresiones de rendimiento en cada release de forma objetiva.

---

## Referencias

- [OpenTelemetry — Documentación oficial](https://opentelemetry.io/docs/)
- [OpenTelemetry Protocol (OTLP) — Especificación](https://opentelemetry.io/docs/specs/otlp/)
- [Prometheus — Overview](https://prometheus.io/docs/introduction/overview/)
- [Grafana — OpenTelemetry Integration](https://grafana.com/docs/opentelemetry/)
- [RED Method — Tom Wilkie, Grafana Labs](https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/)
- [Docker — Dockerfile best practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Compose — Profiles](https://docs.docker.com/compose/how-tos/profiles/)
- [Docker — Logging drivers](https://docs.docker.com/config/containers/logging/configure/)
- [Docker — Runtime privilege and Linux capabilities](https://docs.docker.com/engine/reference/run/#runtime-privilege-and-linux-capabilities)
