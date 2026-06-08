# Fase 4: Informe de verificación y entrega

> **Grupo:** 16  
> **Materia:** Ingeniería y Calidad de Software — 2026  
> **Proyecto:** AlentApp  
> **Fecha de medición:** 07/06/2026  
> **Integrantes:** Bellizzi Tomas, DeVida Facundo, Giordani Luca, Legorburu Lucas, Rodriguez Joaquin y Piquet Leonel

---

## 4.1. Verificación técnica

Comparación entre el stack de **desarrollo** (`docker-compose.yml`, `Dockerfile`) y el stack de **producción** (`docker-compose.prod.yml`, `Dockerfile.prod`).

### Tabla de métricas

| Métrica | Antes (desarrollo) | Después (producción) | Mejora |
|---------|-------------------|----------------------|--------|
| Tamaño imagen API | `docker images alentapp-api` → **1,52 GB** | `docker images alentapp-prod-api` → **1,33 GB** | **−190 MB (−12,5 %)** |
| Tamaño imagen Web | `docker images alentapp-web` → **858 MB** | `docker images alentapp-prod-web` → **94,8 MB** | **−763 MB (−89 %)** |
| Tiempo de startup API | `time docker compose up -d api` → **64,9 s** | `time docker compose -f docker-compose.prod.yml up -d api` → **6,9 s** | **−58 s (−89 %)** — ~9,4× más rápido |
| Tiempo hasta `healthy` (API) | Sin healthcheck en dev | **~6 s** tras el `up` (con `db` ya healthy) | Arranque verificable en prod |
| Memoria API (idle) | `docker stats --no-stream alentapp-api` → **81,0 MiB** | `docker stats --no-stream alentapp-api-prod` → **41,6 MiB** | **−39,4 MiB (−49 %)** |
| Endpoints accesibles | `curl http://localhost:3000/health` | `GET /health` → **200**, `GET /` → **200** | ✅ Operativos |
| Frontend vía nginx | Vite dev server `:5173` | `curl http://localhost:80/` → **200** | ✅ Nginx sirviendo estáticos |

### Comandos utilizados

```bash
# Desarrollo
docker compose build
docker images alentapp-api alentapp-web
time docker compose up -d api
docker stats --no-stream alentapp-api

# Producción
docker compose -f docker-compose.prod.yml build
docker images alentapp-prod-api alentapp-prod-web
time docker compose -f docker-compose.prod.yml up -d api
docker stats --no-stream alentapp-api-prod

# Endpoints
curl -s http://localhost:3000/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:80/
```

### Conclusiones

- La mejora más significativa está en **Web**: de una imagen con Node + dev server (858 MB) a Nginx + estáticos (94,8 MB), casi **9× más liviana**.
- La API de producción reduce **190 MB** de imagen (−12,5 %) y consume **la mitad de RAM** en idle (81 → 41,6 MiB).
- El arranque de la API en prod (**6,9 s** + **~6 s** hasta `healthy`) cumple el objetivo de diseño (< 40 s API, < 60 s stack).
- La imagen de API prod aún pesa ~1,33 GB por Prisma Client y dependencias OpenTelemetry; es un punto de mejora futura.

> **Nota metodológica:** el tiempo de startup en dev (64,9 s) incluye levantar `db` y ejecutar `prisma migrate dev`. En prod se midió con `db` ya healthy, escenario típico de redeploy.

---

## 4.2. Verificación de seguridad

Confirmación de que cada medida de hardening del diseño funciona en el stack productivo.

| Medida | Comando / verificación | Resultado |
|--------|------------------------|-----------|
| API corre con usuario no-root | `docker exec alentapp-api-prod id` | ✅ `uid=1000(node)` |
| Web corre con usuario no-root | `docker exec alentapp-web-prod id` | ✅ `uid=101(nginx)` |
| No hay `npm` / `tsc` en imagen API final | `docker exec alentapp-api-prod which npm tsc` | ✅ No encontrados |
| No hay herramientas de build en runtime | Imagen final solo contiene `node dist/app.js` + deps prod | ✅ |
| Read-only filesystem (API) | `docker exec alentapp-api-prod touch /test` | ✅ `Read-only file system` |
| Read-only filesystem (Web) | `docker exec alentapp-web-prod touch /test` | ✅ `Read-only file system` |
| Capabilities mínimas | `cap_drop: [ALL]`; web solo `NET_BIND_SERVICE` | ✅ Configurado en compose |
| Variables sensibles vía `.env` | Credenciales en `.env` (gitignored), no en repo | ✅ |
| Healthchecks funcionando | `docker compose -f docker-compose.prod.yml ps` | ✅ `db`, `api`, `web` → **healthy** |
| DB no expuesta al host | Sin mapeo `5432:5432` en prod | ✅ Solo red interna `alentapp-prod` |

### Comandos de verificación

```bash
docker exec alentapp-api-prod id
docker exec alentapp-web-prod id
docker exec alentapp-api-prod which npm tsc
docker exec alentapp-api-prod touch /test
docker exec alentapp-web-prod touch /test
docker compose -f docker-compose.prod.yml ps
```

### Conclusiones

El stack productivo aplica correctamente el modelo de mínimo privilegio definido en `diseno-grupo16.md`: procesos no-root, filesystem de solo lectura en servicios stateless, capabilities reducidas y secretos externalizados.

---

## 4.3. Verificación de observabilidad

### Checklist de la consigna

| Ítem | Estado | Evidencia |
|------|--------|-----------|
| OpenTelemetry exporta métricas en `:9464/metrics` | ✅ Verificado | `curl http://localhost:9464/metrics` → 200 |
| Prometheus scrapea el endpoint OTLP | ⏳ _[completar]_ | Corregir `prometheus.yml` → `targets: ['api:9464']` y verificar en `:9090/targets` |
| Grafana tiene datasource Prometheus configurado | ⏳ _[completar]_ | _[captura: Configuration → Data sources]_ |
| Dashboard RED con 6 paneles funcionales | ⏳ _[completar]_ | Ver tabla de paneles más abajo |
| Gráficos responden al tráfico generado | ⏳ _[completar]_ | _[captura con tráfico activo]_ |
| Métricas de error reflejan 4xx/5xx | ⏳ _[completar]_ | _[captura panel de errores / status codes]_ |

### Métricas exportadas (verificado)

La API registra las cinco métricas RED definidas en el diseño:

| Métrica | Nombre en Prometheus |
|---------|---------------------|
| Rate | `http_requests_total` |
| Errors | `http_requests_errors` |
| Duration | `http_request_duration_bucket` / `_count` / `_sum` |
| Memoria del proceso | `process_memory_usage` |
| Requests activas | `http_requests_active` |

### Generación de tráfico de prueba

```bash
# Respuestas 2xx
for i in $(seq 1 50); do curl -s http://localhost:3000/health > /dev/null; done

# Respuestas 4xx
for i in $(seq 1 20); do curl -s http://localhost:3000/ruta-inexistente > /dev/null; done

# Verificar en el exporter
curl -s http://localhost:9464/metrics | grep http_requests
```

### Dashboard RED — 6 paneles (_[completar tras Grafana]_)

**Nombre del dashboard:** `RED - AlentApp API`

| # | Panel | Query PromQL | Visualización | Resultado |
|---|-------|--------------|---------------|-----------|
| 1 | Requests por segundo | `sum(rate(http_requests_total[1m]))` | Time series | ⏳ _[captura]_ |
| 2 | Tasa de error | `100 * sum(rate(http_requests_errors_total[1m])) / clamp_min(sum(rate(http_requests_total[1m])), 1)` | Time series | ⏳ _[captura]_ |
| 3 | Latencia p95 / p99 | `histogram_quantile(0.95, sum(rate(http_request_duration_bucket[5m])) by (le))` | Time series | ⏳ _[captura]_ |
| 4 | Respuestas por status code | `sum by(status) (rate(http_requests_total[5m]))` | Stacked area | ⏳ _[captura]_ |
| 5 | Memoria del proceso (MB) | `process_memory_usage / 1024 / 1024` | Time series | ⏳ _[captura]_ |
| 6 | Endpoints más lentos | `topk(5, histogram_quantile(0.95, sum(rate(http_request_duration_bucket[5m])) by (le, route)))` | Bar chart | ⏳ _[captura]_ |

**Layout:** fila 1 → paneles 1–3 · fila 2 → paneles 4–6

### Umbrales de referencia

| Señal | Umbral | Observado en prueba |
|-------|--------|---------------------|
| Error rate | > 5 % | ⏳ _[completar]_ |
| Latencia p95 | > 500 ms | ⏳ _[completar]_ |
| Memoria | Crecimiento sostenido | ⏳ _[completar]_ |

### Capturas de observabilidad

<!-- Reemplazar los placeholders por imágenes reales: docs/produccion/capturas/ -->

| Captura | Archivo | Estado |
|---------|---------|--------|
| Métricas en `:9464/metrics` | `capturas/otel-metrics.png` | ⏳ _[agregar]_ |
| Prometheus targets UP | `capturas/prometheus-targets.png` | ⏳ _[agregar]_ |
| Datasource Grafana | `capturas/grafana-datasource.png` | ⏳ _[agregar]_ |
| Dashboard RED completo | `capturas/dashboard-red.png` | ⏳ _[agregar]_ |
| Panel errores con 4xx | `capturas/dashboard-errors.png` | ⏳ _[agregar]_ |

---

## 4.4. Documentación de decisiones

### Arquitectura final

```txt
                    ┌─────────────────────────────────────────┐
                    │        Red: alentapp-prod (bridge)       │
                    │                                          │
  Host :80 ────────►│  web (nginx:stable-alpine)               │
                    │                                          │
  Host :3000 ──────►│  api (node:22-alpine, USER node)         │
  Host :9464 ──────►│       ├── Fastify :3000                  │
                    │       └── OTel PrometheusExporter :9464  │
                    │              ▲                           │
  Host :9090 ──────►│  prometheus ─┘ scrape                    │
                    │              │                           │
  Host :3001 ──────►│  grafana ────┘ query  [pendiente]       │
                    │              │                           │
                    │              ▼                           │
                    │  db (postgres:16-alpine, sin puerto host) │
                    └─────────────────────────────────────────┘
```

### Decisiones técnicas

| Decisión | Alternativa descartada | Justificación |
|----------|------------------------|---------------|
| Multi-stage build (API y Web) | Imagen única con devDeps | Imagen final sin fuentes, compilador ni `node_modules` de desarrollo; menor tamaño y superficie de ataque |
| Nginx para frontend en prod | Node + Vite dev server | Servidor especializado para estáticos; imagen de 94,8 MB vs 858 MB |
| OpenTelemetry + PrometheusExporter `:9464` | Push gateway / logs manuales | Convención estándar OTel; protocolo pull nativo de Prometheus |
| Hooks globales Fastify para métricas RED | Instrumentar cada controller | Captura 404s y errores sin handler; un solo punto de registro |
| `read_only` + `cap_drop: ALL` | Contenedores sin restricciones | Mínimo privilegio; limita daño ante compromiso |
| Healthcheck con `127.0.0.1` | `localhost` | En Alpine, `localhost` resuelve a IPv6 (`::1`) y Fastify escucha en IPv4 |
| Migraciones fuera del compose | `prisma migrate` en `CMD` | Separación deploy/migración; imagen inmutable |
| Secretos en `.env` | Credenciales en compose | No se commitean; rotación sin rebuild de imagen |

### Problemas encontrados

| Problema | Causa raíz | Solución aplicada |
|----------|------------|-------------------|
| API `unhealthy` en prod | Entrypoint solo arrancaba con sufijo `app.ts`; Dockerfile ejecuta `app.js` | Guard en `app.ts` para `app.ts` y `app.js` |
| Healthcheck fallaba con API operativa | `localhost` → `::1`; Fastify en `0.0.0.0:3000` (IPv4) | Healthcheck en `127.0.0.1:3000` (Dockerfile + compose) |
| `ERR_MODULE_NOT_FOUND` (Prisma) | Client generado no incluido en imagen final | `prisma generate` en stage `build` + `COPY` a `dist/generated/client` |
| `DATABASE_URL` vacía al arrancar | Compose no expande `${VAR}` anidadas dentro del `.env` | URL completa en `.env` |
| Prometheus targets `down` | `prometheus.yml` apuntaba a `host.docker.internal` | _[pendiente]_ cambiar a `api:9464` |

### Lecciones aprendidas

- **Lo más difícil:** la integración entre Dockerfile, compose y código de aplicación (entrypoint, healthcheck IPv6, Prisma Client) — errores que no aparecen en build sino en runtime.
- **Qué cambiaríamos:** implementar Grafana y el fix de Prometheus en la misma iteración que la telemetría, para validar el pipeline completo antes de la entrega.
- **Qué funcionó bien:** el multi-stage build de Web (89 % menos de imagen) y el hardening del compose con verificación automatizable vía `docker exec`.

### Capturas de pantalla

| Captura | Descripción | Estado |
|---------|-------------|--------|
| `capturas/compose-healthy.png` | `docker compose ps` con servicios healthy | ⏳ _[agregar]_ |
| `capturas/security-checks.png` | Salida de comandos de §4.2 | ⏳ _[agregar]_ |
| `capturas/dashboard-red.png` | Dashboard RED con datos en vivo | ⏳ _[agregar]_ |

---

## 4.5. Presentación (10 minutos)

### Guión

| Min | Tema | Contenido |
|-----|------|-----------|
| 0–1 | Introducción | AlentApp, objetivo del TP, dev vs prod |
| 1–3 | Antes y después | Tabla §4.1: imágenes (−89 % Web), startup (9,4×), memoria (−49 %) |
| 3–5 | Seguridad | Demo en vivo: `docker exec id`, `touch /test`, `docker ps` |
| 5–8 | Demo dashboard RED | _[completar]_ Levantar stack → generar tráfico → mostrar 6 paneles en Grafana |
| 8–10 | Lecciones aprendidas | Entrypoint, IPv6, Prisma, pipeline de observabilidad |

### Demo de observabilidad (_[completar]_)

1. `docker compose -f docker-compose.prod.yml up -d`
2. Verificar `http://localhost:9464/metrics` y `http://localhost:9090/targets`
3. Abrir Grafana → dashboard `RED - AlentApp API`
4. Ejecutar script de tráfico (§4.3)
5. Mostrar cómo suben requests/s, aparecen 4xx en errores y se actualiza memoria

### Material de apoyo

- Diseño: [`diseno-grupo16.md`](./diseno-grupo16.md)
- Stack: [`docker-compose.prod.yml`](../../docker-compose.prod.yml)
- Informe: este documento

---

## Anexo: pendientes para cerrar la entrega

> Completar por el integrante responsable de observabilidad (Grafana).

- [ ] Corregir `observability/prometheus/prometheus.yml` → `targets: ['api:9464']`
- [ ] Agregar servicio `grafana` a `docker-compose.prod.yml` con provisioning
- [ ] Crear dashboard RED (JSON) con los 6 paneles y queries de §4.3
- [ ] Ejecutar tráfico de prueba y validar respuesta de gráficos
- [ ] Agregar capturas en `docs/produccion/capturas/`
- [ ] Completar columnas ⏳ de §4.3 y demo de §4.5
- [ ] Completar nombres de integrantes en el encabezado
