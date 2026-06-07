import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { metrics } from '@opentelemetry/api';
const isTest = process.env.VITEST === 'true';
const prometheusExporter = isTest
    ? undefined
    : new PrometheusExporter({
        port: 9464,
        endpoint: '/metrics',
    });
const sdk = new NodeSDK({
    metricReader: prometheusExporter,
    instrumentations: isTest
        ? []
        : [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-http': {},
            }),
        ],
});
if (!isTest) {
    sdk.start();
}
const meter = metrics.getMeter('alentapp-api');
let activeRequestsCount = 0;
let currentMemoryBytes = 0;
export function createREDMetrics(m) {
    const requestCounter = m.createCounter('http.requests.total', {
        description: 'Total de requests HTTP',
    });
    const errorCounter = m.createCounter('http.requests.errors', {
        description: 'Total de errores HTTP',
    });
    const requestDuration = m.createHistogram('http.request.duration', {
        description: 'Duración de requests',
        unit: 'ms',
    });
    const memoryUsage = m.createObservableGauge('process.memory.usage', {
        description: 'Memoria del proceso Node.js',
        unit: 'bytes',
    });
    const activeRequests = m.createObservableGauge('http.requests.active', {
        description: 'Requests concurrentes',
    });
    memoryUsage.addCallback((result) => {
        result.observe(currentMemoryBytes);
    });
    activeRequests.addCallback((result) => {
        result.observe(activeRequestsCount);
    });
    return { requestCounter, errorCounter, requestDuration, memoryUsage, activeRequests };
}
export const redMetrics = createREDMetrics(meter);
let memoryInterval;
if (!isTest) {
    currentMemoryBytes = process.memoryUsage().rss;
    memoryInterval = setInterval(() => {
        currentMemoryBytes = process.memoryUsage().rss;
    }, 15_000);
}
export function incrementActiveRequests() {
    activeRequestsCount += 1;
}
export function decrementActiveRequests() {
    activeRequestsCount -= 1;
}
export async function shutdownTelemetry() {
    if (memoryInterval) {
        clearInterval(memoryInterval);
    }
    await sdk.shutdown();
}
export { sdk, meter, prometheusExporter };
