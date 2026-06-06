# Analisis individual de infraestructura Docker y OpenTelemetry - Alentapp

**Materia:** Ingenieria y Calidad de Software  
**Actividad:** TP Integrador - Actividad 4: Preparando para Produccion  
**Alumno:** Tomas Bellizzi  
**Archivo:** `docs/produccion/analisis-TomasBellizzi.md`

---

## 1.1. Analisis de la infraestructura Docker actual

Se analizaron los siguientes archivos del proyecto:

- `docker-compose.yml`
- `packages/api/Dockerfile`
- `packages/web/Dockerfile`

La configuracion actual esta orientada principalmente a desarrollo local. Permite levantar la base de datos, la API y el frontend con hot reload, bind mounts y comandos de desarrollo. Sin embargo, si se quisiera usar como base para produccion, aparecen problemas importantes de seguridad, operacion y separacion de ambientes.

Para no repetir todos los puntos ya desarrollados en el analisis de Leonel Piquet, este informe prioriza cinco hallazgos. Se mantienen los problemas de impacto alto aunque coincidan parcialmente, y se evitan algunos puntos de menor impacto que ya fueron cubiertos en detalle, como la optimizacion fina del cache de capas.

### Tabla de problemas detectados

| # | Problema | Donde ocurre | Impacto | Solucion propuesta |
|---|---|---|---|---|
| 1 | Credenciales y datos sensibles hardcodeados | `docker-compose.yml`, lineas 5-8 y 29-30 | Alto | Mover `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` y `DATABASE_URL` a variables de entorno. En produccion, usar secrets gestionados por la plataforma o Docker Secrets. |
| 2 | La API se ejecuta en modo desarrollo y con hot reload | `docker-compose.yml`, lineas 35-38; `packages/api/Dockerfile`, linea 22 | Alto | Crear una imagen productiva que compile TypeScript durante el build y ejecute solo JavaScript compilado con `node`, sin `tsx watch` ni `npm run dev`. |
| 3 | Las migraciones de Prisma se ejecutan automaticamente al iniciar el contenedor | `docker-compose.yml`, lineas 35-37 | Alto | Separar las migraciones del arranque normal de la API. En produccion, usar `prisma migrate deploy` como paso controlado del pipeline o del release. |
| 4 | El frontend se sirve con Vite dev server en lugar de artefactos estaticos productivos | `docker-compose.yml`, linea 58; `packages/web/Dockerfile`, linea 16 | Alto | Ejecutar `vite build` en una etapa de build y servir `dist/` con Nginx, Caddy u otro servidor estatico preparado para produccion. |
| 5 | Se monta todo el repositorio dentro de los contenedores con filesystem de escritura | `docker-compose.yml`, lineas 24-28 y 51-55 | Medio/Alto | En produccion no usar `.:/app`. La imagen debe contener el codigo o artefactos ya construidos. Mantener volumenes solo para datos persistentes, como PostgreSQL, y evaluar `read_only: true` para servicios stateless. |

---

### Explicacion de los problemas principales

#### 1. Credenciales hardcodeadas

En `docker-compose.yml` aparecen credenciales directamente escritas:

```yml
POSTGRES_USER: admin
POSTGRES_PASSWORD: password123
POSTGRES_DB: alentapp_db
DATABASE_URL=postgres://admin:password123@db:5432/alentapp_db
```

Esto es riesgoso porque cualquier persona con acceso al repositorio puede ver las credenciales. Aunque hoy parezcan valores de desarrollo, el patron es peligroso: si se copia esta configuracion a produccion, las credenciales quedan expuestas y versionadas.

**Solucion:** reemplazar los valores literales por variables:

```yml
environment:
  POSTGRES_USER: ${POSTGRES_USER}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  POSTGRES_DB: ${POSTGRES_DB}
```

Para produccion, lo correcto seria usar secrets del orquestador o del proveedor cloud.

---

#### 2. API ejecutandose en modo desarrollo

La API se levanta con:

```yml
npx tsx watch packages/api/src/app.ts
```

`tsx watch` esta pensado para desarrollo: observa cambios en el codigo y reinicia el proceso. En produccion esto agrega dependencias innecesarias, consume mas recursos y ejecuta TypeScript directamente en runtime.

**Solucion:** compilar previamente la API y ejecutar el resultado:

```txt
npm run build -w packages/api
node packages/api/dist/app.js
```

Idealmente esto deberia estar en un `Dockerfile.prod` o en una etapa final de un multi-stage build.

---

#### 3. Migraciones automaticas durante el arranque

El contenedor de API ejecuta:

```yml
npx prisma migrate dev --name init --config packages/api/prisma.config.ts
```

Este comando es especialmente problematico para produccion. `migrate dev` esta orientado a desarrollo, puede crear migraciones y modificar el esquema de forma no controlada. Ademas, mezclar migraciones con el arranque normal de la API hace que cada reinicio del contenedor tenga efectos sobre la base de datos.

**Solucion:** separar responsabilidades:

- Build de imagen: compila codigo y genera Prisma Client si corresponde.
- Paso de migracion: ejecuta `prisma migrate deploy` una sola vez y de forma controlada.
- Arranque de API: solo inicia la aplicacion.

---

#### 4. Frontend usando Vite dev server

El frontend se inicia con:

```yml
npm run dev -w packages/web -- --host 0.0.0.0
```

Esto es adecuado para desarrollo local, pero no para produccion. El servidor de desarrollo de Vite esta pensado para hot reload, debugging y feedback rapido, no para servir trafico productivo.

**Solucion:** construir los assets estaticos:

```txt
npm run build -w packages/web
```

Luego servir el directorio `dist/` con Nginx, Caddy o un servidor equivalente, configurando cache de assets, compresion y headers de seguridad.

---

#### 5. Bind mounts del repositorio completo

Tanto API como Web montan el repositorio completo:

```yml
volumes:
  - .:/app
```

Esto es util en desarrollo porque permite editar archivos en el host y ver los cambios dentro del contenedor. En produccion, en cambio, genera varios problemas:

- el contenedor depende del estado del filesystem del host;
- se exponen archivos que no deberian estar en runtime;
- se facilita la modificacion accidental del codigo en ejecucion;
- se pierde la garantia de que la imagen contiene exactamente lo desplegado.

**Solucion:** en produccion, no montar el codigo fuente. La imagen debe traer los artefactos ya construidos. Para servicios stateless, se puede complementar con `read_only: true` y volumenes temporales explicitos si la aplicacion necesita escribir en `/tmp` u otra ruta.

---

## Evaluacion por area solicitada

### Tamano de imagen

Las imagenes base `node:20-alpine` y `postgres:16-alpine` no son pesadas en comparacion con variantes Debian completas. El problema principal no es la base elegida, sino que las imagenes de API y Web no separan build y runtime. Terminan incluyendo codigo fuente, dependencias de desarrollo y herramientas que no deberian estar en produccion.

Coincido con Leonel en que deberian usarse multi-stage builds. De todos modos, como ese punto ya esta desarrollado en su archivo, aca lo tomo como causa transversal de varios problemas y no como hallazgo independiente.

### Seguridad

Hay tres riesgos claros:

- credenciales hardcodeadas;
- procesos Node corriendo como root porque los Dockerfiles no definen `USER`;
- contenedores con filesystem de escritura y bind mounts del repositorio completo.

Tambien faltan medidas de hardening como `cap_drop: ["ALL"]`, `security_opt: ["no-new-privileges:true"]` y `read_only: true`. Estas medidas deberian aplicarse en una configuracion productiva, ajustando excepciones segun cada servicio.

### Resource management

La base de datos tiene `healthcheck`, pero API y Web no. Tampoco hay limites de CPU o memoria para ningun servicio.

Este punto es importante, pero ya esta tratado en detalle en el analisis de Leonel. Coincido con su evaluacion: para produccion deberian agregarse limites y healthchecks reales, especialmente para que el orquestador pueda detectar servicios degradados.

### Cache de capas

El Dockerfile de API esta relativamente bien ordenado para cachear dependencias, porque copia primero los `package.json` de los workspaces y despues el resto del codigo. El Dockerfile de Web es mejorable porque no copia explicitamente el `package.json` de `packages/shared` antes de instalar dependencias.

De todos modos, este problema tiene menor impacto que los anteriores. Lo mas relevante para produccion no es solo mejorar el orden de `COPY`, sino pasar a builds reproducibles con `npm ci` y separar dependencias de build/runtime.

### Entorno

No hay una separacion clara entre desarrollo y produccion. El mismo `docker-compose.yml` usa:

- hot reload;
- variables `CHOKIDAR_USEPOLLING` y `WATCHPACK_POLLING`;
- bind mounts;
- `migrate dev`;
- Vite dev server;
- puertos publicados directamente al host.

La solucion seria mantener esta configuracion como `docker-compose.dev.yml` y crear una configuracion productiva separada, por ejemplo `docker-compose.prod.yml`, junto con Dockerfiles o stages productivos para API y Web.

---

## 1.2. Investigacion sobre OpenTelemetry

### Que es OpenTelemetry y como se diferencia de Prometheus

OpenTelemetry, tambien llamado OTel, es un estandar abierto para instrumentar aplicaciones y generar telemetria: metricas, trazas y logs. Su objetivo es que la aplicacion produzca datos de observabilidad de forma neutral, sin quedar atada a un proveedor especifico.

Prometheus, en cambio, es principalmente un sistema de monitoreo y almacenamiento de metricas de series temporales. Prometheus recolecta, guarda y permite consultar metricas, pero no cubre de forma nativa trazas distribuidas ni logs como senales principales.

En una arquitectura comun, OpenTelemetry instrumenta la aplicacion y exporta datos; Prometheus puede actuar como backend para metricas.

---

### Cuales son los tres pilares de la observabilidad y cual aborda OpenTelemetry

Los tres pilares de la observabilidad son:

1. **Metricas:** valores numericos medidos en el tiempo, como cantidad de requests, uso de memoria, CPU o latencia.
2. **Trazas:** recorrido de una solicitud a traves de distintos servicios o componentes.
3. **Logs:** eventos registrados por la aplicacion, normalmente con timestamp, nivel y contexto.

OpenTelemetry aborda los tres pilares. Permite instrumentar aplicaciones para generar metricas, trazas y logs, y exportarlos a distintos backends compatibles.

---

### Metricas RED: Rate, Errors, Duration

El metodo RED sirve para monitorear servicios orientados a requests, como APIs.

- **Rate:** cantidad de solicitudes por segundo. Sirve para medir el volumen de trafico.
- **Errors:** cantidad o porcentaje de solicitudes fallidas. Sirve para detectar problemas que afectan directamente a los usuarios.
- **Duration:** tiempo que tardan las solicitudes en completarse. Sirve para medir latencia y degradacion de rendimiento.

Estas metricas ayudan a responder tres preguntas basicas: cuanto trafico recibe el sistema, cuantas solicitudes fallan y cuanto tarda en responder.

---

### Que es OTLP y que ventaja tiene frente a exportar directamente a Prometheus

OTLP, OpenTelemetry Protocol, es el protocolo usado por OpenTelemetry para enviar telemetria desde una aplicacion hacia un Collector o backend compatible.

La ventaja frente a exportar directamente a Prometheus es el desacoplamiento. Si la aplicacion envia datos a un OpenTelemetry Collector usando OTLP, el Collector puede reenviar esos datos a Prometheus, Grafana, Jaeger, Tempo u otras herramientas sin cambiar el codigo de la aplicacion.

Exportar directamente a Prometheus puede ser suficiente para metricas, pero acopla mas la aplicacion a ese backend y no cubre tan bien trazas y logs.

---

### Como se relaciona OpenTelemetry con Grafana

Grafana se usa para visualizar y analizar datos de observabilidad. OpenTelemetry genera y exporta esos datos; Grafana los muestra a traves de datasources como Prometheus, Tempo o Loki.

Un flujo comun seria:

```txt
Aplicacion Node.js
  -> OpenTelemetry SDK
  -> OpenTelemetry Collector
  -> Prometheus / Tempo / Loki
  -> Grafana
```

En resumen, OpenTelemetry se encarga de producir y transportar la telemetria, mientras que Grafana permite visualizarla, correlacionarla y construir dashboards o alertas.

---

## Conclusion

La infraestructura actual funciona bien como entorno de desarrollo local, pero no deberia usarse sin cambios en produccion. Los problemas mas importantes son las credenciales hardcodeadas, la ejecucion de API y Web en modo desarrollo, las migraciones automaticas al iniciar, la falta de separacion dev/prod y el uso de bind mounts del repositorio completo.

Coincido con los hallazgos principales del analisis de Leonel, especialmente en credenciales, root, multi-stage builds y resource management. Para complementar y no repetir tanto los puntos de menor impacto, este informe pone mas enfasis en los riesgos operativos de ejecutar herramientas de desarrollo dentro del runtime productivo.
