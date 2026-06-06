# Actividad 4 — Fase 1: Análisis de infraestructura Docker y OpenTelemetry

**Autor:** LucaGio04  
**Materia:** Ingeniería y Calidad de Software  
**Fecha:** 6 de junio de 2026  
**Repositorio:** alentapp  
**Archivo:** `docs/produccion/analisis-LucaGio04.md`

---

## 1.1 Análisis de la infraestructura Docker actual

Se revisaron `docker-compose.yml`, `packages/api/Dockerfile`, `packages/web/Dockerfile` y `.dockerignore`. El stack levanta PostgreSQL, la API Fastify/Prisma y el frontend Vite/React con bind mounts y comandos de desarrollo.

Este informe complementa los análisis de Leonel Piquet, Tomás Bellizzi y Lucas Legor: se evitan repetir sus hallazgos centrales (multi-stage builds, credenciales hardcodeadas, usuario root, healthchecks/límites de recursos, tags flotantes) y se priorizan cinco problemas distintos detectados en una segunda pasada de auditoría.

### Evaluación por dimensiones

| Dimensión | Estado | Observación breve |
|-----------|--------|-------------------|
| **Tamaño de imagen** | Mejorable | Las bases `node:20-alpine` y `postgres:16-alpine` son razonables, pero las capas de build arrastran toolchains de desarrollo y el monorepo completo. No hay etapa final mínima. |
| **Seguridad** | Deficiente | Además de credenciales en texto plano (ya documentadas por compañeros), PostgreSQL se publica al host y no hay hardening de filesystem ni capabilities. |
| **Resource management** | Parcial | Solo `db` tiene `healthcheck`. No hay límites de CPU/RAM, política de restart ni configuración de logging. |
| **Caché de capas** | Parcial | Se copian manifiestos antes de instalar dependencias, pero se usa `npm install` (no determinista) y `COPY . .` invalida capas ante cambios en docs/tests. |
| **Entorno** | Solo dev | Polling forzado, generación de Prisma en runtime, volúmenes anónimos de `node_modules` y un único compose para todo. |

### Tabla de problemas identificados

| # | Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|---|----------|----------------|---------|-------------------|
| 1 | **Uso de `npm install` en lugar de `npm ci` en los builds** — los Dockerfiles instalan dependencias sin garantizar reproducibilidad respecto al `package-lock.json`. | `packages/api/Dockerfile` (L12) · `packages/web/Dockerfile` (L8) | Medio/Alto | Reemplazar por `npm ci` (requiere copiar también `package-lock.json` en la etapa de dependencias). En producción, combinar con `--omit=dev` para instalar solo runtime deps. |
| 2 | **Puerto de PostgreSQL publicado al host (`5432:5432`)** — la base de datos queda accesible desde la máquina anfitriona y, en despliegues cloud, potencialmente desde redes externas si no hay firewall. | `docker-compose.yml` (L9-10) | Alto (seguridad) | En producción, eliminar el mapeo de puertos y dejar que solo la API se conecte por la red interna de Compose (`db:5432`). Exponer PostgreSQL solo en un perfil `debug` o túnel administrativo. |
| 3 | **Polling de archivos activado globalmente (`CHOKIDAR_USEPOLLING`, `WATCHPACK_POLLING`)** — variables pensadas para entornos con bind mounts (WSL, Docker Desktop) que fuerzan escaneo periódico del filesystem. | `docker-compose.yml` (L31-32, L49-50) | Medio | Restringir estas variables a un `docker-compose.dev.yml`. En producción, donde no hay hot reload, eliminarlas para reducir consumo de CPU e I/O. |
| 4 | **Volúmenes anónimos de `node_modules` crean estado opaco e inconsistente** — los montajes `/app/node_modules` y similares evitan pisar binarios nativos del contenedor, pero dificultan depurar qué versión de dependencias corre realmente y pueden divergir entre máquinas. | `docker-compose.yml` (L26-28, L53-55) | Medio | Documentar el patrón como exclusivo de desarrollo. En CI/producción, construir imágenes inmutables sin bind mounts ni volúmenes anónimos de dependencias. |
| 5 | **`prisma generate` ejecutado en cada arranque del contenedor API** — la generación del cliente Prisma ocurre en runtime dentro del `command` de Compose, no durante el build de la imagen. | `docker-compose.yml` (L37) · secuencia de arranque del servicio `api` | Medio/Alto | Mover `prisma generate` (y idealmente `prisma migrate deploy`) al Dockerfile o a un job de CI previo al deploy. El contenedor productivo debería arrancar con el client ya generado. |

---

### Notas complementarias por área

**Tamaño de imagen:** el problema principal sigue siendo la ausencia de multi-stage builds (ya cubierto por Leonel). Desde este análisis, el uso de `npm install` agrava el problema porque puede resolver versiones distintas en cada build, invalidando capas y produciendo imágenes no comparables entre entornos.

**Seguridad:** más allá de secrets en texto plano, publicar el puerto 5432 amplía la superficie de ataque innecesariamente. La API y la Web no necesitan acceso directo del host a PostgreSQL.

**Resource management:** la falta de `restart`, límites de memoria y healthchecks en API/Web ya fue documentada. Aquí se suma la ausencia de `logging` driver con rotación, lo que en servidores long-running puede llenar disco con logs de contenedor sin límite.

**Caché de capas:** copiar `package.json` antes del install es correcto, pero sin `npm ci` el beneficio se reduce. Además, `.dockerignore` solo excluye cuatro patrones; cambios en `docs/` o tests invalidan `COPY . .` aunque el código de API/Web no haya cambiado (Lucas Legor profundizó este punto).

**Entorno:** el mismo `docker-compose.yml` mezcla preocupaciones de desarrollo (polling, bind mounts, `migrate dev`) con servicios que podrían confundirse como base productiva. Conviene separar perfiles `dev` y `prod` explícitamente.

---

## 1.2 Investigación sobre OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

**OpenTelemetry (OTel)** es un proyecto de la CNCF que estandariza cómo las aplicaciones **generan, enriquecen y exportan** telemetría: trazas, métricas y logs. Ofrece APIs, SDKs por lenguaje, convenciones semánticas y el protocolo OTLP. No almacena datos; actúa como capa de instrumentación vendor-neutral.

**Prometheus** es un **backend de monitoreo** especializado en métricas de series temporales. Expone un endpoint `/metrics`, almacena muestras con etiquetas (labels) y permite consultarlas con PromQL. También incluye un motor de alertas.

La diferencia clave es de **rol en la arquitectura**:

| | OpenTelemetry | Prometheus |
|---|---------------|------------|
| Propósito | Instrumentar y exportar | Almacenar y consultar métricas |
| Señales | Traces, metrics, logs | Solo metrics |
| Acoplamiento | Bajo — cambiar backend sin reescribir la app | Medio — la app o el Collector deben exponer formato Prometheus |
| Modelo típico | Push via OTLP hacia Collector | Pull — Prometheus scrapea endpoints |

No son alternativas excluyentes. Un patrón habitual es: app instrumentada con OTel → Collector → Prometheus (métricas) + Tempo (trazas) + Loki (logs).

---

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares son:

1. **Métricas** — agregados numéricos en el tiempo (req/s, latencia p95, conexiones activas a PostgreSQL).
2. **Logs** — eventos discretos con contexto textual (`ERROR: Prisma P2002 unique constraint on members`).
3. **Trazas (traces)** — recorrido de una operación a través de componentes, con spans anidados y tiempos parciales.

**OpenTelemetry aborda los tres pilares** con un mismo contexto de correlación (`trace_id`, `span_id`). Eso permite, por ejemplo, partir de una métrica RED anómala en Grafana, abrir la traza del request lento y ver el log exacto del error en la misma vista.

---

### Métricas RED (Rate, Errors, Duration)

RED es un conjunto mínimo de métricas para servicios **request-driven** (como la API Fastify de alentapp):

| Métrica | Qué mide | Ejemplo en alentapp |
|---------|----------|---------------------|
| **Rate** | Throughput — solicitudes por segundo | `15 req/s` en `POST /members` durante hora pico |
| **Errors** | Proporción de requests fallidas | `2.3%` de respuestas 5xx en `/payments` |
| **Duration** | Latencia de respuesta | `p99 = 480ms` en consultas a `/equipment-loans` |

RED responde rápidamente: ¿hay tráfico?, ¿está fallando?, ¿está lento? Es complementario al método **USE** (Utilization, Saturation, Errors), que aplica mejor a recursos como CPU, disco o pool de conexiones a PostgreSQL.

---

### ¿Qué es OTLP? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

**OTLP (OpenTelemetry Protocol)** es el protocolo nativo de OTel para transportar telemetría. Soporta gRPC (puerto 4317) y HTTP (4318), y puede llevar traces, metrics y logs en el mismo canal.

Ventajas frente a exportar directo al formato Prometheus:

1. **Un solo exporter en la aplicación** — la app envía OTLP al Collector; el Collector traduce y reenvía a Prometheus, Jaeger, Datadog, etc.
2. **Soporte nativo para trazas y logs** — Prometheus solo entiende métricas; con OTLP no hace falta integrar tres exporters distintos.
3. **Procesamiento en el Collector** — sampling de trazas, enmascarado de datos sensibles, batching y retry antes de llegar al backend.
4. **Push en lugar de pull** — útil cuando los contenedores tienen IPs efímeras y Prometheus no puede scrapearlos de forma estable.
5. **Menor vendor lock-in** — cambiar de Tempo a Jaeger, o de Prometheus a Mimir, no requiere modificar el código de alentapp.

Flujo recomendado para alentapp:

```txt
Fastify API (OTel SDK Node.js)
        │ OTLP
        ▼
OpenTelemetry Collector
        ├──► Prometheus  (métricas RED)
        ├──► Tempo       (trazas de requests)
        └──► Loki        (logs estructurados)
                │
                ▼
            Grafana      (dashboards + alertas)
```

---

### ¿Cómo se relaciona OpenTelemetry con Grafana?

**Grafana** es la capa de **visualización y alertas**. No instrumenta aplicaciones ni recolecta telemetría por sí sola; se conecta a datasources donde viven los datos exportados por OTel.

La relación operativa:

- OTel **produce** la telemetría desde la API (spans por request, contadores RED, logs correlacionados).
- Backends como Prometheus, Tempo y Loki **persisten** cada tipo de señal.
- Grafana **consulta** esos backends, arma dashboards, define alertas y permite correlación en la vista **Explore** (saltar de una traza lenta al log del mismo `trace_id`).

Grafana Labs contribuye activamente al ecosistema OTel y ofrece Grafana Cloud con ingestión OTLP directa, simplificando despliegues pequeños sin montar Collector propio. Para un proyecto como alentapp en producción, un primer paso concreto sería instrumentar la API con `@opentelemetry/sdk-node`, exportar OTLP al Collector, y crear un dashboard Grafana con las tres métricas RED por endpoint.

---

## Referencias

- [OpenTelemetry — Documentación oficial](https://opentelemetry.io/docs/)
- [OpenTelemetry Protocol (OTLP)](https://opentelemetry.io/docs/specs/otlp/)
- [Prometheus — Overview](https://prometheus.io/docs/introduction/overview/)
- [Grafana — OpenTelemetry](https://grafana.com/docs/opentelemetry/)
- [Google SRE — Monitoring distributed systems (RED method)](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Docker — Dockerfile best practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
