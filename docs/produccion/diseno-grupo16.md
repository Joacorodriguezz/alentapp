# 2.2 Diseño de la observabilidad

## A) Métricas RED a capturar

### ¿Qué es el método RED?

El método **RED** resume el monitoreo de una API en tres preguntas básicas:

- **Rate (tasa):** ¿cuántas solicitudes llegan por segundo?
- **Errors (errores):** ¿cuántas solicitudes fallan? (HTTP 4xx y 5xx)
- **Duration (duración):** ¿cuánto tarda cada solicitud en responder?

Son las métricas fundamentales para APIs REST porque miden **carga** (Rate), **confiabilidad** (Errors) y **rendimiento** (Duration) sin necesitar decenas de indicadores distintos.

### Tabla de métricas

| Métrica | Tipo OpenTelemetry | Descripción | Labels |
| ------- | ------------------ | ----------- | ------ |
| `http.requests.total` | Counter | Total de solicitudes HTTP atendidas. El Rate se calcula a partir de este contador. | `method`, `route`, `status` |
| `http.requests.errors` | Counter | Solicitudes que respondieron con error (4xx o 5xx). | `method`, `route`, `status` |
| `http.request.duration` | Histogram | Tiempo de respuesta de cada solicitud. | `method`, `route` |
| `process.memory.usage` | Gauge | Memoria que usa el proceso Node.js de la API. | — |
| `http.requests.active` | Gauge | Solicitudes que están siendo procesadas en este momento. | — |

### Detalle por métrica

#### 1. Rate — `http.requests.total`

| Atributo | Valor |
| -------- | ----- |
| Nombre técnico | `http.requests.total` |
| Tipo OpenTelemetry | Counter |
| Descripción | Suma 1 por cada solicitud completada. |
| Unidad | solicitudes (conteo acumulado) |
| Labels | `method`, `route`, `status` |

**Justificación técnica:** Un **Counter** solo incrementa. Eso es exactamente lo que hace una solicitud HTTP: ocurre, se cuenta, y no se "deshace". Para obtener requests por segundo, Prometheus calcula cuánto creció el contador en un intervalo de tiempo. Es el instrumento más simple y correcto para medir Rate.

#### 2. Errors — `http.requests.errors`

| Atributo | Valor |
| -------- | ----- |
| Nombre técnico | `http.requests.errors` |
| Tipo OpenTelemetry | Counter |
| Descripción | Suma 1 cuando la respuesta es 4xx o 5xx. |
| Unidad | solicitudes (conteo acumulado) |
| Labels | `method`, `route`, `status` |

**Justificación técnica:** Usamos otro **Counter** dedicado a errores para poder medir la tasa de error directamente, sin mezclar solicitudes exitosas (2xx) con fallidas. El label `status` permite distinguir, por ejemplo, un 404 de un 500.

#### 3. Duration — `http.request.duration`

| Atributo | Valor |
| -------- | ----- |
| Nombre técnico | `http.request.duration` |
| Tipo OpenTelemetry | Histogram |
| Descripción | Guarda cuántos milisegundos tardó cada solicitud. |
| Unidad | `ms` |
| Labels | `method`, `route` |

**Justificación técnica:** Un **Histogram** agrupa los tiempos de respuesta en rangos (buckets). Eso permite calcular percentiles como p95 o p99, que muestran si algunas solicitudes son mucho más lentas que el promedio. Un Counter o Gauge no servirían para esto: la latencia es un valor que varía en cada solicitud y necesita una distribución.

#### 4. `process.memory.usage`

| Atributo | Valor |
| -------- | ----- |
| Nombre técnico | `process.memory.usage` |
| Tipo OpenTelemetry | Gauge |
| Unidad | bytes |
| Descripción | Memoria actual del proceso Node.js. |

**Justificación:** Un **Gauge** sube y baja. La memoria no es un evento que se acumula: es un valor instantáneo. Si la memoria crece sin bajar, puede indicar un problema antes de que la API deje de responder.

#### 5. `http.requests.active`

| Atributo | Valor |
| -------- | ----- |
| Nombre técnico | `http.requests.active` |
| Tipo OpenTelemetry | Gauge |
| Unidad | solicitudes |
| Descripción | Cuántas solicitudes están en curso ahora mismo. |

**Justificación:** También es un **Gauge** porque refleja un estado actual (solicitudes en vuelo), no un total acumulado. Si este valor crece mucho, la API puede estar saturada aunque el Rate se mantenga estable.

### Justificación de las métricas seleccionadas

- **Rate** (`http.requests.total`): indica cuánta carga recibe la API. Si sube de golpe, hay más tráfico; si baja a cero, algo puede estar mal.
- **Errors** (`http.requests.errors`): indica si la API responde bien o está fallando para los usuarios.
- **Duration** (`http.request.duration`): indica si la API responde rápido o se está poniendo lenta.
- **Memoria** (`process.memory.usage`) y **requests activas** (`http.requests.active`): complementan RED mostrando la salud interna del proceso Node.js.

Estas cinco métricas son suficientes para observar una API REST como la de Alentapp: cubren tráfico, errores, velocidad y estado del servidor, que es exactamente lo que pide la consigna del TP.

---

## B) OpenTelemetry SDK

### Arquitectura propuesta

Flujo de telemetría (sin componentes adicionales):

**Fastify API → OpenTelemetry SDK → Instrumentaciones → Métricas RED → Prometheus Exporter → Endpoint /metrics → Prometheus**

Descripción paso a paso:

1. La **API Fastify** atiende solicitudes en el puerto 3000.
2. El **OpenTelemetry SDK** se inicializa al arrancar la aplicación, antes de cargar Fastify.
3. Las **Instrumentaciones** (HTTP y Fastify) observan el tráfico de forma automática.
4. Las **métricas RED personalizadas** se registran manualmente en los controllers.
5. El **Prometheus Exporter** convierte todas las métricas al formato que Prometheus entiende.
6. El endpoint **`/metrics`** en el puerto 9464 expone esas métricas por HTTP.
7. **Prometheus** visita ese endpoint periódicamente (scraping) y guarda los valores.

### Componentes del diseño

#### 1. NodeSDK

**Responsabilidad:** Es el componente principal que arranca todo OpenTelemetry en Node.js.

**Función en la arquitectura:** Configura el MeterProvider, conecta el PrometheusExporter y activa las instrumentaciones. Se ejecuta una sola vez al inicio de la aplicación.

**Por qué es necesario:** Sin NodeSDK habría que configurar cada pieza por separado. El SDK lo hace en un solo lugar y es el punto de entrada estándar del ecosistema OpenTelemetry para Node.js.

#### 2. PrometheusExporter

**Responsabilidad:** Levanta un servidor HTTP que publica las métricas en formato Prometheus.

**Cómo expone métricas:** Recibe las métricas del SDK y las sirve como texto plano en un endpoint HTTP. Prometheus las lee desde afuera (pull/scraping).

**Puerto elegido:** 9464

**Endpoint elegido:** `/metrics`

**Justificación:** El puerto 9464 es el que indica la consigna del TP y no interfiere con el puerto 3000 de la API. El path `/metrics` es el estándar que Prometheus espera encontrar.

#### 3. Auto Instrumentations

**Qué son:** Un paquete que activa instrumentaciones automáticas para librerías comunes de Node.js.

**Qué métricas generan automáticamente:** Métricas básicas del servidor HTTP (duración y conteo de solicitudes a nivel de protocolo).

**Beneficios:** No requiere escribir código de instrumentación para la capa HTTP base; funciona apenas se configura en el SDK.

**Limitaciones:** Las métricas automáticas usan nombres genéricos del estándar OpenTelemetry, no los nombres RED que pide el TP (`http.requests.total`, etc.). Por eso igual necesitamos métricas manuales.

#### 4. HTTP Instrumentation

**Qué monitorea:** El módulo HTTP de Node.js (conexiones, solicitudes y respuestas).

**Qué datos aporta:** Método, código de estado y duración a nivel de protocolo HTTP.

**Cómo contribuye a observabilidad:** Cubre todo el tráfico HTTP aunque no se registre nada manual en un controller. Es la capa más baja de observación.

#### 5. Fastify Instrumentation

**Qué monitorea:** El framework Fastify (rutas, hooks y ciclo de vida de cada solicitud).

**Qué datos aporta:** Información de enrutamiento específica de Fastify, vinculada a las rutas registradas en la API.

**Cómo contribuye a observabilidad:** Como Alentapp usa Fastify, esta instrumentación adapta la observación automática al framework real de la aplicación.

#### 6. MeterProvider

**Responsabilidad:** Administra todos los instrumentos métricos (Counters, Histograms, Gauges) y los envía al exportador.

**Relación con la creación de métricas:** Cuando creamos un Counter o Histogram, el MeterProvider es quien lo registra y lo hace llegar al PrometheusExporter.

#### 7. Meter

**Responsabilidad:** Es la herramienta con la que se crean los instrumentos métricos concretos.

**Relación con los instrumentos:** Desde un Meter se crean `http.requests.total`, `http.requests.errors`, `http.request.duration`, `process.memory.usage` y `http.requests.active`. Un solo Meter llamado `alentapp-api` agrupa todas las métricas del servicio.

#### 8. Métricas RED personalizadas

**Por qué siguen siendo necesarias aunque exista auto-instrumentación:** Porque el TP pide métricas con nombres y labels específicos (`method`, `route`, `status`). La auto-instrumentación genera métricas estándar distintas; las personalizadas cumplen exactamente la consigna.

**Qué control adicional brindan:** Decidimos nosotros cuándo contar un error (4xx/5xx), qué ruta registrar y en qué unidad medir la duración (ms).

**Qué ventajas ofrecen para el monitoreo del negocio:** Podemos ver tráfico y errores por endpoint de Alentapp (`/api/v1/socios`, `/api/v1/sports`, etc.) con nombres claros y fáciles de interpretar.

### Configuración conceptual propuesta

#### Puerto de exportación

| Parámetro | Valor |
| --------- | ----- |
| Puerto | 9464 |
| Justificación | Es el puerto indicado en la consigna del TP. Está separado del puerto 3000 de la API para que las métricas no compitan con el tráfico de usuarios. |

#### Endpoint de métricas

| Parámetro | Valor |
| --------- | ----- |
| Endpoint | `/metrics` |
| Justificación | Es el path estándar de Prometheus. Facilita la configuración del scraping sin decisiones adicionales. |

#### Instrumentaciones habilitadas

| Instrumentación | Justificación |
| --------------- | ------------- |
| HTTP Instrumentation | Monitorea la capa HTTP de Node.js. Es la base para cualquier API HTTP. |
| Fastify Instrumentation | Monitorea el framework que usa Alentapp. Sin esto, solo veríamos HTTP genérico. |
| Auto Instrumentations | Activa HTTP y Fastify con una sola configuración. Es la forma más simple de habilitar ambas sin configurar cada una manualmente. |

#### Estrategia para métricas RED

Las tres métricas RED se registran **manualmente en cada controller**, siguiendo el mismo patrón en todos los handlers:

1. Al entrar al handler, guardar el momento de inicio.
2. Al responder con éxito, incrementar `http.requests.total` con labels `method`, `route` y `status`.
3. Si la respuesta es 4xx o 5xx, incrementar también `http.requests.errors` con los mismos labels.
4. Al finalizar (en un bloque de limpieza), registrar la duración en `http.request.duration` con labels `method` y `route`.

El valor de `route` se toma de la URL de la solicitud (sin query string). Los labels son solo los tres que pide la consigna: nada más.

Este enfoque es el más simple de implementar porque repite el mismo bloque en cada controller y coincide con lo que muestra el TP en la Fase 3.

#### Estrategia para `process.memory.usage`

Se crea el Gauge una vez al inicializar el SDK. Un timer periódico (cada 15 segundos) lee la memoria del proceso Node.js y actualiza el valor del Gauge.

Se hace en un solo lugar (archivo de telemetría), no en cada controller, porque la memoria es del proceso completo y no de una solicitud individual.

#### Estrategia para `http.requests.active`

Se registra con un hook global de Fastify en la configuración de la aplicación:

- Al recibir una solicitud (`onRequest`): sumar 1 al Gauge.
- Al enviar la respuesta (`onResponse`): restar 1 al Gauge.

Sin labels, para mantener un único valor global de concurrencia. Se hace con un hook central en lugar de repetirlo en cada controller, porque es la forma más simple de cubrir todas las rutas con pocas líneas de código.
