/**
 * Shared utility functions for storage modules
 */
import { randomUUID } from "crypto";

// Random data generation helpers
export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomFloat = (min: number, max: number, decimals: number = 1): number =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

export const randomChoice = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const generateId = (): string => randomUUID();

// Sample data for HCP generation
export const firstNames = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
];

export const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
];

export const organizations = [
  "Memorial Hospital", "City Medical Center", "University Health System",
  "Regional Medical Group", "Coastal Healthcare", "Mountain View Hospital",
  "Valley Medical Associates", "Metro Health Network", "Sunrise Medical Center",
  "Lakeside Healthcare", "Central Medical Group", "Premier Health Partners",
];

export const cities = [
  { city: "New York", state: "NY" },
  { city: "Los Angeles", state: "CA" },
  { city: "Chicago", state: "IL" },
  { city: "Houston", state: "TX" },
  { city: "Phoenix", state: "AZ" },
  { city: "Philadelphia", state: "PA" },
  { city: "San Antonio", state: "TX" },
  { city: "San Diego", state: "CA" },
  { city: "Dallas", state: "TX" },
  { city: "San Jose", state: "CA" },
  { city: "Austin", state: "TX" },
  { city: "Boston", state: "MA" },
];

// Common month labels for time series data
export const months = [
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
];
