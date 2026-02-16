/**
 * Data Generation Configuration
 * Distribution weights and constants for realistic data generation
 *
 * @see DOMAIN-ANCHOR (claude-brain/templates/DOMAIN-ANCHOR.md) Part 8 for baseline distributions
 *
 * Note: This config extends DOMAIN-ANCHOR with specialty-specific tier distributions
 * and segment-by-tier correlations based on industry patterns. When updating distributions,
 * ensure alignment with DOMAIN-ANCHOR principles:
 * - Tier 1: ~8-10% of population (high-value targets)
 * - Tier 2: ~15-20% of population (growth potential)
 * - Tier 3: ~70-75% of population (maintenance)
 *
 * Canonical reference: DOMAIN-ANCHOR Part 8 (Synthetic Data Guidelines)
 */

import type { Specialty, Tier, Segment, Channel } from "@shared/schema";

// ============================================================================
// SPECIALTY DISTRIBUTION WEIGHTS
// ============================================================================

export const SPECIALTY_WEIGHTS: { item: Specialty; weight: number }[] = [
  { item: "Oncology", weight: 15 },
  { item: "Cardiology", weight: 18 },
  { item: "Neurology", weight: 10 },
  { item: "Endocrinology", weight: 12 },
  { item: "Rheumatology", weight: 8 },
  { item: "Pulmonology", weight: 9 },
  { item: "Gastroenterology", weight: 11 },
  { item: "Nephrology", weight: 6 },
  { item: "Dermatology", weight: 7 },
  { item: "Psychiatry", weight: 4 },
];

// ============================================================================
// TIER DISTRIBUTION BY SPECIALTY
// ============================================================================

export const TIER_BY_SPECIALTY: Record<Specialty, { item: Tier; weight: number }[]> = {
  Oncology: [
    { item: "Tier 1", weight: 25 },
    { item: "Tier 2", weight: 45 },
    { item: "Tier 3", weight: 30 },
  ],
  Cardiology: [
    { item: "Tier 1", weight: 20 },
    { item: "Tier 2", weight: 50 },
    { item: "Tier 3", weight: 30 },
  ],
  Neurology: [
    { item: "Tier 1", weight: 22 },
    { item: "Tier 2", weight: 48 },
    { item: "Tier 3", weight: 30 },
  ],
  Endocrinology: [
    { item: "Tier 1", weight: 18 },
    { item: "Tier 2", weight: 47 },
    { item: "Tier 3", weight: 35 },
  ],
  Rheumatology: [
    { item: "Tier 1", weight: 15 },
    { item: "Tier 2", weight: 45 },
    { item: "Tier 3", weight: 40 },
  ],
  Pulmonology: [
    { item: "Tier 1", weight: 17 },
    { item: "Tier 2", weight: 48 },
    { item: "Tier 3", weight: 35 },
  ],
  Gastroenterology: [
    { item: "Tier 1", weight: 20 },
    { item: "Tier 2", weight: 50 },
    { item: "Tier 3", weight: 30 },
  ],
  Nephrology: [
    { item: "Tier 1", weight: 12 },
    { item: "Tier 2", weight: 43 },
    { item: "Tier 3", weight: 45 },
  ],
  Dermatology: [
    { item: "Tier 1", weight: 14 },
    { item: "Tier 2", weight: 46 },
    { item: "Tier 3", weight: 40 },
  ],
  Psychiatry: [
    { item: "Tier 1", weight: 10 },
    { item: "Tier 2", weight: 40 },
    { item: "Tier 3", weight: 50 },
  ],
};

// ============================================================================
// SEGMENT DISTRIBUTION BY TIER
// ============================================================================

export const SEGMENT_BY_TIER: Record<Tier, { item: Segment; weight: number }[]> = {
  "Tier 1": [
    { item: "High Prescriber", weight: 40 },
    { item: "Academic Leader", weight: 25 },
    { item: "Engaged Digital", weight: 15 },
    { item: "Traditional Preference", weight: 10 },
    { item: "Growth Potential", weight: 5 },
    { item: "New Target", weight: 5 },
  ],
  "Tier 2": [
    { item: "High Prescriber", weight: 20 },
    { item: "Growth Potential", weight: 30 },
    { item: "Engaged Digital", weight: 20 },
    { item: "Traditional Preference", weight: 15 },
    { item: "New Target", weight: 10 },
    { item: "Academic Leader", weight: 5 },
  ],
  "Tier 3": [
    { item: "New Target", weight: 35 },
    { item: "Growth Potential", weight: 25 },
    { item: "Engaged Digital", weight: 15 },
    { item: "Traditional Preference", weight: 15 },
    { item: "High Prescriber", weight: 5 },
    { item: "Academic Leader", weight: 5 },
  ],
};

// ============================================================================
// CHANNEL PREFERENCES BY SEGMENT
// ============================================================================

export const CHANNEL_BY_SEGMENT: Record<Segment, { item: Channel; weight: number }[]> = {
  "High Prescriber": [
    { item: "rep_visit", weight: 35 },
    { item: "phone", weight: 25 },
    { item: "email", weight: 20 },
    { item: "webinar", weight: 10 },
    { item: "conference", weight: 8 },
    { item: "digital_ad", weight: 2 },
  ],
  "Growth Potential": [
    { item: "email", weight: 30 },
    { item: "rep_visit", weight: 25 },
    { item: "webinar", weight: 20 },
    { item: "phone", weight: 15 },
    { item: "digital_ad", weight: 7 },
    { item: "conference", weight: 3 },
  ],
  "New Target": [
    { item: "email", weight: 35 },
    { item: "digital_ad", weight: 25 },
    { item: "webinar", weight: 20 },
    { item: "rep_visit", weight: 10 },
    { item: "phone", weight: 7 },
    { item: "conference", weight: 3 },
  ],
  "Engaged Digital": [
    { item: "email", weight: 30 },
    { item: "digital_ad", weight: 25 },
    { item: "webinar", weight: 25 },
    { item: "phone", weight: 10 },
    { item: "rep_visit", weight: 8 },
    { item: "conference", weight: 2 },
  ],
  "Traditional Preference": [
    { item: "rep_visit", weight: 40 },
    { item: "phone", weight: 30 },
    { item: "conference", weight: 15 },
    { item: "email", weight: 10 },
    { item: "webinar", weight: 4 },
    { item: "digital_ad", weight: 1 },
  ],
  "Academic Leader": [
    { item: "conference", weight: 30 },
    { item: "webinar", weight: 25 },
    { item: "rep_visit", weight: 20 },
    { item: "email", weight: 15 },
    { item: "phone", weight: 8 },
    { item: "digital_ad", weight: 2 },
  ],
};

// ============================================================================
// CHANNEL RESPONSE RATES (Base rates, modified by HCP characteristics)
// ============================================================================

export const CHANNEL_RESPONSE_RATES: Record<Channel, number> = {
  email: 0.15,
  rep_visit: 0.45,
  webinar: 0.35,
  conference: 0.55,
  digital_ad: 0.05,
  phone: 0.25,
};

// ============================================================================
// CAMPAIGN TYPES AND WEIGHTS
// ============================================================================

export const CAMPAIGN_TYPES = [
  { item: "launch", weight: 20 },
  { item: "maintenance", weight: 35 },
  { item: "awareness", weight: 25 },
  { item: "retention", weight: 20 },
] as const;

export type CampaignType = (typeof CAMPAIGN_TYPES)[number]["item"];

// ============================================================================
// PRODUCTS AND THERAPEUTIC AREAS
// ============================================================================

export const PRODUCTS = [
  { name: "Novax-1", therapeuticArea: "Oncology" },
  { name: "Cardiozen", therapeuticArea: "Cardiology" },
  { name: "NeuroCalm", therapeuticArea: "Neurology" },
  { name: "EndoBalance", therapeuticArea: "Endocrinology" },
  { name: "RheumaFlex", therapeuticArea: "Rheumatology" },
  { name: "PulmoEase", therapeuticArea: "Pulmonology" },
  { name: "GastroShield", therapeuticArea: "Gastroenterology" },
  { name: "NephroGuard", therapeuticArea: "Nephrology" },
  { name: "DermaClear", therapeuticArea: "Dermatology" },
  { name: "MindWell", therapeuticArea: "Psychiatry" },
] as const;

// ============================================================================
// STIMULUS TYPES BY CHANNEL
// ============================================================================

export const STIMULUS_TYPES_BY_CHANNEL: Record<Channel, string[]> = {
  email: ["email_send", "email_open", "email_click"],
  rep_visit: ["rep_visit", "sample_delivery"],
  webinar: ["webinar_invite", "webinar_attend"],
  conference: ["conference_meeting"],
  digital_ad: ["digital_ad_impression", "digital_ad_click"],
  phone: ["phone_call"],
};

// ============================================================================
// CONTENT CATEGORIES
// ============================================================================

export const CONTENT_CATEGORIES = [
  "clinical_data",
  "patient_outcomes",
  "dosing_guide",
  "formulary_update",
  "safety_info",
  "peer_insights",
  "case_study",
  "promotional",
] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

/**
 * Maps stimuli content categories to message_theme_dim categories.
 * Aligns the 8 CONTENT_CATEGORIES from stimuli generation with the 8
 * theme categories seeded at server startup in message-saturation-storage.
 */
export const CONTENT_TO_THEME_MAP: Record<ContentCategory, string> = {
  clinical_data: "efficacy",
  patient_outcomes: "patient_outcomes",
  dosing_guide: "dosing_convenience",
  formulary_update: "cost_value",
  safety_info: "safety",
  peer_insights: "peer_validation",
  case_study: "rwe",
  promotional: "mechanism_of_action",
};

// ============================================================================
// DELIVERY STATUS WEIGHTS
// ============================================================================

export const DELIVERY_STATUS_WEIGHTS = [
  { item: "delivered", weight: 85 },
  { item: "bounced", weight: 5 },
  { item: "pending", weight: 3 },
  { item: "failed", weight: 2 },
  { item: "scheduled", weight: 5 },
] as const;

// ============================================================================
// OUTCOME TYPES BY STIMULUS TYPE
// ============================================================================

export const OUTCOME_MAPPING: Record<string, string[]> = {
  email_send: ["email_open", "email_click", "content_download"],
  email_open: ["email_click", "content_download"],
  email_click: ["content_download", "form_submit"],
  rep_visit: ["meeting_completed", "sample_request", "rx_written"],
  webinar_invite: ["webinar_register", "webinar_attend"],
  webinar_attend: ["content_download", "form_submit"],
  conference_meeting: ["meeting_completed", "referral"],
  digital_ad_impression: ["digital_ad_click"],
  digital_ad_click: ["content_download", "form_submit"],
  phone_call: ["call_completed", "meeting_scheduled"],
  sample_delivery: ["rx_written"],
};

// ============================================================================
// GENERATION TARGETS
// ============================================================================

export const DEFAULT_TARGETS = {
  hcps: 2000,
  stimuliEvents: 80000,
  outcomeEvents: 16000,
  prescribingHistory: 24000,
  territoryAssignments: 2500,
  campaigns: 50,
  months: 12,
};

// ============================================================================
// BATCH CONFIGURATION
// ============================================================================

export const BATCH_SIZE = 500;

// ============================================================================
// REGIONS AND TERRITORIES
// ============================================================================

export const REGIONS = [
  { name: "Northeast", territories: ["NY Metro", "New England", "Mid-Atlantic"] },
  { name: "Southeast", territories: ["Florida", "Gulf Coast", "Carolinas", "Atlanta Metro"] },
  { name: "Midwest", territories: ["Great Lakes", "Chicago Metro", "Plains"] },
  { name: "Southwest", territories: ["Texas", "Arizona", "Mountain"] },
  { name: "West", territories: ["California North", "California South", "Pacific Northwest"] },
] as const;

// ============================================================================
// FIRST NAMES AND LAST NAMES FOR HCP GENERATION
// ============================================================================

export const FIRST_NAMES = [
  "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
  "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua",
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
  "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Ashley", "Dorothy", "Kimberly", "Emily", "Donna",
  "Amir", "Raj", "Wei", "Jin", "Mei", "Yuki", "Kenji", "Ahmed", "Fatima", "Priya",
];

export const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Chen", "Patel", "Kim", "Park", "Shah", "Kumar", "Singh", "Zhang", "Wang", "Li",
];

// ============================================================================
// REP NAMES
// ============================================================================

export const REP_FIRST_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Quinn", "Avery", "Peyton",
  "Cameron", "Dakota", "Skyler", "Reese", "Finley", "Charlie", "Drew", "Hayden", "Kendall", "Blake",
];

export const REP_LAST_NAMES = [
  "Anderson", "Baker", "Carter", "Davis", "Evans", "Foster", "Green", "Hayes", "Irving", "Jenkins",
  "Kelly", "Lane", "Mitchell", "Nelson", "Owen", "Parker", "Quinn", "Roberts", "Stone", "Turner",
];
