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
| `api` | `wget -qO- http://127.0.0.1:3000/health` | 15s | 5s | 3 | 30s |

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
| **Tiempo de startup** | API lista en < 40 s; stack completo en < 60 s | Imagen pre-construida con JS compilado y Prisma Client generado en build; `start_period: 30s` en healthcheck de API |
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
