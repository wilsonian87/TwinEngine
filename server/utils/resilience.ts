/**
 * Resilience Utilities
 *
 * Provides patterns for fault-tolerant operations:
 * - Circuit Breaker: Prevents cascading failures
 * - Retry with Exponential Backoff: Handles transient failures
 * - Graceful Degradation: Fallback behavior when services are unavailable
 */

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before attempting to close the circuit */
  resetTimeout: number;
  /** Time in ms for the half-open test window */
  halfOpenTimeout?: number;
  /** Name for logging/monitoring */
  name?: string;
}

export type CircuitState = "closed" | "open" | "half-open";

export class CircuitBreakerError extends Error {
  constructor(message: string, public state: CircuitState) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config.failureThreshold,
      resetTimeout: config.resetTimeout,
      halfOpenTimeout: config.halfOpenTimeout ?? 5000,
      name: config.name ?? "unnamed",
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from open to half-open
    if (this.state === "open") {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.config.resetTimeout) {
        this.state = "half-open";
        this.successCount = 0;
        console.log(`[CircuitBreaker:${this.config.name}] Transitioning to half-open`);
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker is open for ${this.config.name}`,
          this.state
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === "half-open") {
      this.successCount++;
      // Require 3 successful calls to close the circuit
      if (this.successCount >= 3) {
        this.state = "closed";
        this.failureCount = 0;
        console.log(`[CircuitBreaker:${this.config.name}] Circuit closed`);
      }
    } else if (this.state === "closed") {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      // Single failure in half-open state reopens the circuit
      this.state = "open";
      console.log(`[CircuitBreaker:${this.config.name}] Circuit opened (failed in half-open)`);
    } else if (this.state === "closed") {
      this.failureCount++;
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = "open";
        console.log(
          `[CircuitBreaker:${this.config.name}] Circuit opened (threshold: ${this.config.failureThreshold})`
        );
      }
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    lastFailureTime: number;
    successCount: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.successCount = 0;
    console.log(`[CircuitBreaker:${this.config.name}] Circuit manually reset`);
  }
}

// ============================================================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================================================

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in ms */
  baseDelay: number;
  /** Maximum delay in ms */
  maxDelay: number;
  /** Multiplier for exponential backoff (default: 2) */
  exponentialBase?: number;
  /** Add random jitter to prevent thundering herd */
  jitter?: boolean;
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Callback for each retry attempt */
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: unknown
  ) {
    super(message);
    this.name = "RetryError";
  }
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  const {
    maxAttempts,
    baseDelay,
    maxDelay,
    exponentialBase = 2,
    jitter = true,
    isRetryable = () => true,
    onRetry,
  } = config;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === maxAttempts || !isRetryable(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(
        baseDelay * Math.pow(exponentialBase, attempt - 1),
        maxDelay
      );

      // Add jitter (0-50% of delay)
      if (jitter) {
        delay = delay * (1 + Math.random() * 0.5);
      }

      // Notify about retry
      onRetry?.(attempt, error, delay);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw new RetryError(
    `Failed after ${maxAttempts} attempts`,
    maxAttempts,
    lastError
  );
}

/**
 * Create a retry wrapper with preset configuration
 */
export function createRetryWrapper(config: RetryConfig) {
  return <T>(fn: () => Promise<T>) => withRetry(fn, config);
}

// ============================================================================
// GRACEFUL DEGRADATION
// ============================================================================

export interface DegradationConfig<T> {
  /** The primary function to execute */
  primary: () => Promise<T>;
  /** Fallback function when primary fails */
  fallback: () => Promise<T> | T;
  /** Optional circuit breaker for the primary */
  circuitBreaker?: CircuitBreaker;
  /** Optional retry config for the primary */
  retryConfig?: RetryConfig;
  /** Whether to log degradation events */
  logDegradation?: boolean;
  /** Name for logging */
  name?: string;
}

export interface DegradationResult<T> {
  data: T;
  degraded: boolean;
  source: "primary" | "fallback";
  error?: unknown;
}

/**
 * Execute with graceful degradation
 */
export async function withDegradation<T>(
  config: DegradationConfig<T>
): Promise<DegradationResult<T>> {
  const {
    primary,
    fallback,
    circuitBreaker,
    retryConfig,
    logDegradation = true,
    name = "unnamed",
  } = config;

  try {
    // Build the execution chain
    let executor = primary;

    // Wrap with retry if configured
    if (retryConfig) {
      const originalExecutor = executor;
      executor = () => withRetry(originalExecutor, retryConfig);
    }

    // Wrap with circuit breaker if configured
    if (circuitBreaker) {
      const originalExecutor = executor;
      executor = () => circuitBreaker.execute(originalExecutor);
    }

    const data = await executor();

    return {
      data,
      degraded: false,
      source: "primary",
    };
  } catch (error) {
    if (logDegradation) {
      console.warn(`[Degradation:${name}] Primary failed, using fallback:`, error);
    }

    try {
      const fallbackResult = await Promise.resolve(fallback());

      return {
        data: fallbackResult,
        degraded: true,
        source: "fallback",
        error,
      };
    } catch (fallbackError) {
      // Both primary and fallback failed
      console.error(`[Degradation:${name}] Both primary and fallback failed`);
      throw fallbackError;
    }
  }
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Timeout wrapper for promises
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = "Operation timed out"
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number, // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Check if an operation can proceed
   */
  canProceed(): boolean {
    this.refill();
    return this.tokens >= 1;
  }

  /**
   * Consume a token (returns false if no tokens available)
   */
  consume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    return false;
  }

  /**
   * Wait until a token is available
   */
  async waitForToken(): Promise<void> {
    while (!this.consume()) {
      await sleep(1000 / this.refillRate);
    }
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Preset circuit breaker for InsightRx validation
 */
export const insightRxValidationCircuit = new CircuitBreaker({
  name: "insightrx-validation",
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
});

/**
 * Preset circuit breaker for InsightRx knowledge search
 */
export const insightRxKnowledgeCircuit = new CircuitBreaker({
  name: "insightrx-knowledge",
  failureThreshold: 3,
  resetTimeout: 15000, // 15 seconds
});

/**
 * Default retry config for validation operations
 */
export const validationRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 200,
  maxDelay: 2000,
  jitter: true,
  isRetryable: (error) => {
    // Retry on network errors, not on validation failures
    if (error instanceof Error) {
      return (
        error.message.includes("network") ||
        error.message.includes("timeout") ||
        error.message.includes("ECONNREFUSED")
      );
    }
    return false;
  },
};

/**
 * Default retry config for knowledge search
 */
export const knowledgeSearchRetryConfig: RetryConfig = {
  maxAttempts: 2,
  baseDelay: 100,
  maxDelay: 1000,
  jitter: true,
};
