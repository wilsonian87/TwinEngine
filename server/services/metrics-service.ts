/**
 * Metrics Service
 *
 * In-memory metrics collection for application observability.
 * Tracks counters, gauges, histograms, and request timing.
 *
 * Metrics are exposed via /api/metrics endpoint in Prometheus format.
 */

// ============================================================================
// TYPES
// ============================================================================

export type MetricType = "counter" | "gauge" | "histogram";

export interface MetricLabels {
  [key: string]: string;
}

interface CounterMetric {
  type: "counter";
  name: string;
  help: string;
  values: Map<string, number>;
}

interface GaugeMetric {
  type: "gauge";
  name: string;
  help: string;
  values: Map<string, number>;
}

interface HistogramMetric {
  type: "histogram";
  name: string;
  help: string;
  buckets: number[];
  values: Map<string, { count: number; sum: number; buckets: number[] }>;
}

type Metric = CounterMetric | GaugeMetric | HistogramMetric;

// ============================================================================
// METRICS REGISTRY
// ============================================================================

class MetricsRegistry {
  private metrics: Map<string, Metric> = new Map();
  private defaultBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

  /**
   * Register a counter metric
   */
  registerCounter(name: string, help: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        type: "counter",
        name,
        help,
        values: new Map(),
      });
    }
  }

  /**
   * Register a gauge metric
   */
  registerGauge(name: string, help: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        type: "gauge",
        name,
        help,
        values: new Map(),
      });
    }
  }

  /**
   * Register a histogram metric
   */
  registerHistogram(name: string, help: string, buckets?: number[]): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        type: "histogram",
        name,
        help,
        buckets: buckets || this.defaultBuckets,
        values: new Map(),
      });
    }
  }

  /**
   * Increment a counter
   */
  incCounter(name: string, labels: MetricLabels = {}, value: number = 1): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== "counter") {
      this.registerCounter(name, name);
      this.incCounter(name, labels, value);
      return;
    }

    const key = this.labelsToKey(labels);
    const current = metric.values.get(key) || 0;
    metric.values.set(key, current + value);
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== "gauge") {
      this.registerGauge(name, name);
      this.setGauge(name, value, labels);
      return;
    }

    const key = this.labelsToKey(labels);
    metric.values.set(key, value);
  }

  /**
   * Increment a gauge
   */
  incGauge(name: string, labels: MetricLabels = {}, value: number = 1): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== "gauge") {
      this.registerGauge(name, name);
      this.incGauge(name, labels, value);
      return;
    }

    const key = this.labelsToKey(labels);
    const current = metric.values.get(key) || 0;
    metric.values.set(key, current + value);
  }

  /**
   * Decrement a gauge
   */
  decGauge(name: string, labels: MetricLabels = {}, value: number = 1): void {
    this.incGauge(name, labels, -value);
  }

  /**
   * Observe a histogram value
   */
  observeHistogram(name: string, value: number, labels: MetricLabels = {}): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== "histogram") {
      this.registerHistogram(name, name);
      this.observeHistogram(name, value, labels);
      return;
    }

    const key = this.labelsToKey(labels);
    let data = metric.values.get(key);
    if (!data) {
      data = {
        count: 0,
        sum: 0,
        buckets: new Array(metric.buckets.length).fill(0),
      };
      metric.values.set(key, data);
    }

    data.count++;
    data.sum += value;

    for (let i = 0; i < metric.buckets.length; i++) {
      if (value <= metric.buckets[i]) {
        data.buckets[i]++;
      }
    }
  }

  /**
   * Get all metrics in Prometheus format
   */
  toPrometheus(): string {
    const lines: string[] = [];

    for (const metric of Array.from(this.metrics.values())) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      if (metric.type === "counter" || metric.type === "gauge") {
        for (const [key, value] of Array.from(metric.values.entries())) {
          const labels = key ? `{${key}}` : "";
          lines.push(`${metric.name}${labels} ${value}`);
        }
      } else if (metric.type === "histogram") {
        for (const [key, data] of Array.from(metric.values.entries())) {
          const labelPart = key ? `${key},` : "";
          let cumulative = 0;
          for (let i = 0; i < metric.buckets.length; i++) {
            cumulative += data.buckets[i];
            lines.push(`${metric.name}_bucket{${labelPart}le="${metric.buckets[i]}"} ${cumulative}`);
          }
          lines.push(`${metric.name}_bucket{${labelPart}le="+Inf"} ${data.count}`);
          lines.push(`${metric.name}_sum{${key}} ${data.sum}`);
          lines.push(`${metric.name}_count{${key}} ${data.count}`);
        }
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Get metrics as JSON
   */
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const metric of Array.from(this.metrics.values())) {
      if (metric.type === "counter" || metric.type === "gauge") {
        const values: Record<string, number> = {};
        for (const [key, value] of Array.from(metric.values.entries())) {
          values[key || "_default"] = value;
        }
        result[metric.name] = {
          type: metric.type,
          help: metric.help,
          values,
        };
      } else if (metric.type === "histogram") {
        const values: Record<string, { count: number; sum: number; avg: number }> = {};
        for (const [key, data] of Array.from(metric.values.entries())) {
          values[key || "_default"] = {
            count: data.count,
            sum: data.sum,
            avg: data.count > 0 ? data.sum / data.count : 0,
          };
        }
        result[metric.name] = {
          type: metric.type,
          help: metric.help,
          buckets: metric.buckets,
          values,
        };
      }
    }

    return result;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const metric of Array.from(this.metrics.values())) {
      if (metric.type === "counter" || metric.type === "gauge") {
        metric.values.clear();
      } else if (metric.type === "histogram") {
        metric.values.clear();
      }
    }
  }

  private labelsToKey(labels: MetricLabels): string {
    const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([k, v]) => `${k}="${v}"`).join(",");
  }
}

// ============================================================================
// GLOBAL REGISTRY
// ============================================================================

export const metrics = new MetricsRegistry();

// ============================================================================
// PREDEFINED METRICS
// ============================================================================

// HTTP metrics
metrics.registerCounter("http_requests_total", "Total HTTP requests");
metrics.registerHistogram("http_request_duration_seconds", "HTTP request duration in seconds");
metrics.registerCounter("http_request_errors_total", "Total HTTP request errors");

// Validation metrics
metrics.registerCounter("validation_requests_total", "Total validation requests");
metrics.registerHistogram("validation_duration_seconds", "Validation duration in seconds");
metrics.registerCounter("validation_passed_total", "Validations that passed");
metrics.registerCounter("validation_failed_total", "Validations that failed");

// Knowledge metrics
metrics.registerCounter("knowledge_searches_total", "Total knowledge searches");
metrics.registerHistogram("knowledge_search_duration_seconds", "Knowledge search duration");
metrics.registerGauge("knowledge_items_total", "Total knowledge items");

// Auth metrics
metrics.registerCounter("auth_logins_total", "Total login attempts");
metrics.registerCounter("auth_login_failures_total", "Failed login attempts");
metrics.registerCounter("auth_tokens_issued_total", "JWT tokens issued");
metrics.registerGauge("auth_active_sessions", "Active user sessions");

// Circuit breaker metrics
metrics.registerCounter("circuit_breaker_opens_total", "Circuit breaker opens");
metrics.registerCounter("circuit_breaker_half_opens_total", "Circuit breaker half-opens");
metrics.registerCounter("circuit_breaker_closes_total", "Circuit breaker closes");
metrics.registerGauge("circuit_breaker_state", "Circuit breaker state (0=closed, 1=half-open, 2=open)");

// Database metrics
metrics.registerHistogram("db_query_duration_seconds", "Database query duration");
metrics.registerCounter("db_query_errors_total", "Database query errors");
metrics.registerGauge("db_pool_size", "Database connection pool size");
metrics.registerGauge("db_pool_available", "Available database connections");

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
): void {
  const labels = {
    method,
    path: normalizePath(path),
    status: String(statusCode),
  };

  metrics.incCounter("http_requests_total", labels);
  metrics.observeHistogram("http_request_duration_seconds", durationMs / 1000, labels);

  if (statusCode >= 400) {
    metrics.incCounter("http_request_errors_total", labels);
  }
}

/**
 * Record validation metrics
 */
export function recordValidation(
  contentType: string,
  status: "approved" | "needs_review" | "rejected",
  durationMs: number
): void {
  const labels = { contentType };

  metrics.incCounter("validation_requests_total", labels);
  metrics.observeHistogram("validation_duration_seconds", durationMs / 1000, labels);

  if (status === "approved") {
    metrics.incCounter("validation_passed_total", labels);
  } else if (status === "rejected") {
    metrics.incCounter("validation_failed_total", labels);
  }
}

/**
 * Record knowledge search metrics
 */
export function recordKnowledgeSearch(resultCount: number, durationMs: number): void {
  metrics.incCounter("knowledge_searches_total");
  metrics.observeHistogram("knowledge_search_duration_seconds", durationMs / 1000, {
    hasResults: resultCount > 0 ? "true" : "false",
  });
}

/**
 * Record circuit breaker state change
 */
export function recordCircuitBreakerChange(
  name: string,
  state: "open" | "half-open" | "closed"
): void {
  const labels = { name };

  switch (state) {
    case "open":
      metrics.incCounter("circuit_breaker_opens_total", labels);
      metrics.setGauge("circuit_breaker_state", 2, labels);
      break;
    case "half-open":
      metrics.incCounter("circuit_breaker_half_opens_total", labels);
      metrics.setGauge("circuit_breaker_state", 1, labels);
      break;
    case "closed":
      metrics.incCounter("circuit_breaker_closes_total", labels);
      metrics.setGauge("circuit_breaker_state", 0, labels);
      break;
  }
}

/**
 * Record database query metrics
 */
export function recordDbQuery(operation: string, table: string, durationMs: number, error?: boolean): void {
  const labels = { operation, table };

  metrics.observeHistogram("db_query_duration_seconds", durationMs / 1000, labels);

  if (error) {
    metrics.incCounter("db_query_errors_total", labels);
  }
}

/**
 * Normalize path for metrics labels (remove IDs)
 */
function normalizePath(path: string): string {
  // Replace UUIDs with :id
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/\d+/g, "/:id");
}

/**
 * Create a timer for measuring duration
 */
export function createTimer(): () => number {
  const start = process.hrtime.bigint();
  return () => {
    const end = process.hrtime.bigint();
    return Number(end - start) / 1_000_000; // Convert to milliseconds
  };
}

/**
 * Get metrics in Prometheus format
 */
export function getPrometheusMetrics(): string {
  return metrics.toPrometheus();
}

/**
 * Get metrics as JSON
 */
export function getJsonMetrics(): Record<string, unknown> {
  return metrics.toJSON();
}
