/**
 * Seedable Random Number Generator
 * Uses mulberry32 algorithm for reproducible random sequences
 */

export class SeededRandom {
  private state: number;
  private readonly initialSeed: number;

  constructor(seed: number = 42) {
    this.initialSeed = seed;
    this.state = seed;
  }

  /**
   * Reset the RNG to its initial seed
   */
  reset(): void {
    this.state = this.initialSeed;
  }

  /**
   * Generate a random number between 0 and 1 (exclusive)
   * Uses mulberry32 algorithm
   */
  random(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate a random integer between min (inclusive) and max (inclusive)
   */
  int(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a random float between min and max
   */
  float(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  /**
   * Pick a random element from an array
   */
  pick<T>(array: readonly T[]): T {
    return array[this.int(0, array.length - 1)];
  }

  /**
   * Pick multiple random elements from an array (without replacement)
   */
  pickMany<T>(array: readonly T[], count: number): T[] {
    const shuffled = this.shuffle([...array]);
    return shuffled.slice(0, Math.min(count, array.length));
  }

  /**
   * Shuffle an array (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Pick an element based on weighted probabilities
   * @param items Array of items with weights
   */
  weightedPick<T>(items: readonly { item: T; weight: number }[]): T {
    const totalWeight = items.reduce((sum, { weight }) => sum + weight, 0);
    let random = this.random() * totalWeight;

    for (const { item, weight } of items) {
      random -= weight;
      if (random <= 0) {
        return item;
      }
    }

    // Fallback (shouldn't happen)
    return items[items.length - 1].item;
  }

  /**
   * Generate a normally distributed random number (Box-Muller transform)
   * @param mean Mean of the distribution
   * @param stdDev Standard deviation
   */
  normal(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.random();
    const u2 = this.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z * stdDev + mean;
  }

  /**
   * Generate a normally distributed integer, clamped to a range
   */
  normalInt(mean: number, stdDev: number, min: number, max: number): number {
    const value = Math.round(this.normal(mean, stdDev));
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Generate a date between two dates
   */
  dateBetween(start: Date, end: Date): Date {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = this.int(startTime, endTime);
    return new Date(randomTime);
  }

  /**
   * Generate a boolean with a given probability of being true
   */
  boolean(probability: number = 0.5): boolean {
    return this.random() < probability;
  }

  /**
   * Generate a UUID-like string (not cryptographically secure)
   */
  uuid(): string {
    const hex = () => this.int(0, 15).toString(16);
    return (
      Array(8).fill(0).map(hex).join("") +
      "-" +
      Array(4).fill(0).map(hex).join("") +
      "-4" +
      Array(3).fill(0).map(hex).join("") +
      "-" +
      ["8", "9", "a", "b"][this.int(0, 3)] +
      Array(3).fill(0).map(hex).join("") +
      "-" +
      Array(12).fill(0).map(hex).join("")
    );
  }

  /**
   * Generate a 10-digit NPI number
   */
  npi(): string {
    return Array(10)
      .fill(0)
      .map(() => this.int(0, 9))
      .join("");
  }
}

// Global RNG instance (can be reseeded)
let globalRng: SeededRandom | null = null;

export function initializeRng(seed: number): SeededRandom {
  globalRng = new SeededRandom(seed);
  return globalRng;
}

export function getRng(): SeededRandom {
  if (!globalRng) {
    throw new Error("RNG not initialized. Call initializeRng(seed) first.");
  }
  return globalRng;
}
