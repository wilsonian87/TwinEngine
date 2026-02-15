/**
 * Data Generation CLI
 * Orchestrates synthetic data generation for TwinEngine
 *
 * Usage:
 *   npm run generate:data -- --seed=42 --hcps=2000 --months=12 --wipe
 *   npm run generate:data -- --additive --seed=42 --months=12
 *   npm run generate:data -- --validate-only
 */

import { db, pool } from "../../db";
import {
  hcpProfiles,
  stimuliEvents,
  outcomeEvents,
  prescribingHistory,
  territoryAssignments,
  campaigns,
  campaignParticipation,
  channelCapacity,
  hcpContactLimits,
} from "@shared/schema";
import { sql, count } from "drizzle-orm";

import { initializeRng, getRng } from "./rng";
import { DEFAULT_TARGETS, BATCH_SIZE } from "./config";

import { generateHCPBatch, type GeneratedHCP } from "./generators/persona-generator";
import {
  generateTerritoryAssignments,
  type HCPLocation,
} from "./generators/territory-generator";
import {
  generateCampaigns,
  generateCampaignParticipation,
  type GeneratedCampaign,
} from "./generators/campaign-generator";
import {
  generateStimuliEvents,
  type HCPProfile,
  type CampaignInfo,
  type TerritoryAssignment,
} from "./generators/stimuli-generator";
import {
  generateOutcomeEvents,
  type StimulusEvent,
} from "./generators/outcome-generator";
import {
  generatePrescribingHistory,
  aggregateOutcomesForRx,
  type HCPPrescribingProfile,
} from "./generators/rx-generator";
import { validateDataIntegrity, type ValidationResult } from "./validators/integrity-validator";
import {
  recalculateEngagementMetrics,
  updateCampaignMetrics,
  updateCampaignParticipation,
} from "./aggregator";

interface CliOptions {
  seed: number;
  hcps: number;
  months: number;
  wipe: boolean;
  additive: boolean;
  validateOnly: boolean;
}

/**
 * Parse CLI arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    seed: 42,
    hcps: DEFAULT_TARGETS.hcps,
    months: DEFAULT_TARGETS.months,
    wipe: false,
    additive: false,
    validateOnly: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--seed=")) {
      options.seed = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--hcps=")) {
      options.hcps = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--months=")) {
      options.months = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--wipe") {
      options.wipe = true;
    } else if (arg === "--additive") {
      options.additive = true;
    } else if (arg === "--validate-only") {
      options.validateOnly = true;
    }
  }

  return options;
}

/**
 * Check if data already exists
 */
async function checkExistingData(targetHcps: number): Promise<{ exists: boolean; count: number }> {
  const result = await db.select({ count: count() }).from(hcpProfiles);
  const hcpCount = result[0]?.count || 0;
  return {
    exists: hcpCount >= targetHcps,
    count: hcpCount,
  };
}

/**
 * Wipe all generated data
 */
async function wipeData(): Promise<void> {
  console.log("Wiping existing data...");

  // Order matters due to FK constraints
  await db.delete(campaignParticipation);
  await db.delete(outcomeEvents);
  await db.delete(stimuliEvents);
  await db.delete(prescribingHistory);
  await db.delete(territoryAssignments);
  await db.delete(campaigns);
  await db.delete(channelCapacity);
  await db.delete(hcpContactLimits);
  await db.delete(hcpProfiles);

  console.log("  Data wiped successfully");
}

/**
 * Wipe activity data only (keeps HCP profiles intact)
 */
async function wipeActivityOnly(): Promise<void> {
  console.log("Wiping activity data (keeping HCP profiles)...");

  // Same FK order as wipeData(), but skips hcpProfiles
  await db.delete(campaignParticipation);
  await db.delete(outcomeEvents);
  await db.delete(stimuliEvents);
  await db.delete(prescribingHistory);
  await db.delete(territoryAssignments);
  await db.delete(campaigns);
  await db.delete(channelCapacity);
  await db.delete(hcpContactLimits);

  console.log("  Activity data wiped successfully");
}

/**
 * Insert records in batches with transaction wrapping
 */
async function batchInsert<T extends Record<string, unknown>>(
  table: any,
  records: T[],
  tableName: string
): Promise<void> {
  const total = records.length;
  let inserted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await db.insert(table).values(batch as any);
    inserted += batch.length;

    if (inserted % (BATCH_SIZE * 10) === 0 || inserted === total) {
      console.log(`  ${tableName}: ${inserted}/${total}`);
    }
  }
}

/**
 * Main generation orchestrator
 */
async function generateData(options: CliOptions): Promise<void> {
  const mode = options.additive ? "additive" : options.wipe ? "wipe" : "default";

  console.log("\n=== TwinEngine Data Generation ===");
  console.log(`Mode: ${mode}`);
  console.log(`Seed: ${options.seed}`);
  if (!options.additive) console.log(`Target HCPs: ${options.hcps}`);
  console.log(`Months: ${options.months}`);
  console.log("");

  // Initialize RNG
  initializeRng(options.seed);
  const rng = getRng();

  // Check existing data
  if (!options.additive) {
    const existing = await checkExistingData(options.hcps);
    if (existing.exists && !options.wipe) {
      console.log(`Data already exists (${existing.count} HCPs). Use --wipe to regenerate.`);
      return;
    }
  }

  // Wipe data
  if (options.additive) {
    await wipeActivityOnly();
  } else if (options.wipe) {
    await wipeData();
  }

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - options.months);

  // =========================================================================
  // Step 1: Generate or read HCP Profiles
  // =========================================================================
  let insertedHcps: (typeof hcpProfiles.$inferSelect)[];

  if (options.additive) {
    console.log("\n[1/7] Reading existing HCP profiles...");
    insertedHcps = await db.select().from(hcpProfiles);
    if (insertedHcps.length === 0) {
      console.error("  No existing HCPs found. Use full generation mode (--wipe) instead.");
      return;
    }
    console.log(`  Found ${insertedHcps.length} existing HCPs`);
  } else {
    console.log("\n[1/7] Generating HCP profiles...");
    const hcps = generateHCPBatch(options.hcps);
    await batchInsert(hcpProfiles, hcps, "hcp_profiles");
    insertedHcps = await db.select().from(hcpProfiles);
    console.log(`  Generated ${insertedHcps.length} HCPs`);
  }

  // =========================================================================
  // Step 2: Generate Territory Assignments
  // =========================================================================
  console.log("\n[2/7] Generating territory assignments...");
  const hcpLocations: HCPLocation[] = insertedHcps.map((h) => ({
    hcpId: h.id,
    city: h.city,
    state: h.state,
  }));

  const { reps, assignments } = generateTerritoryAssignments(hcpLocations, startDate);
  await batchInsert(territoryAssignments, assignments, "territory_assignments");
  console.log(`  Generated ${assignments.length} assignments for ${reps.length} reps`);

  // =========================================================================
  // Step 3: Generate Campaigns
  // =========================================================================
  console.log("\n[3/7] Generating campaigns...");
  const generatedCampaigns = generateCampaigns(startDate, options.months);

  // Insert campaigns and get IDs
  const campaignInserts = generatedCampaigns.map((c) => {
    const { generatedId, ...rest } = c;
    return rest;
  });
  await batchInsert(campaigns, campaignInserts, "campaigns");

  const insertedCampaigns = await db.select().from(campaigns);
  console.log(`  Generated ${insertedCampaigns.length} campaigns`);

  // Generate campaign participation
  const hcpDetails = insertedHcps.map((h) => ({
    hcpId: h.id,
    specialty: h.specialty,
    tier: h.tier,
    segment: h.segment,
  }));

  const campaignInfoForParticipation = insertedCampaigns.map((c) => ({
    id: c.id,
    campaignId: c.id,
    targetSegments: c.targetSegments,
    targetSpecialties: c.targetSpecialties,
    targetTiers: c.targetTiers,
    startDate: c.startDate ? new Date(c.startDate) : new Date(),
  }));

  const participations = generateCampaignParticipation(
    campaignInfoForParticipation,
    hcpDetails
  );
  await batchInsert(campaignParticipation, participations, "campaign_participation");
  console.log(`  Generated ${participations.length} campaign participations`);

  // =========================================================================
  // Step 4: Generate Stimuli Events
  // =========================================================================
  console.log("\n[4/7] Generating stimuli events...");
  const hcpProfiles_: HCPProfile[] = insertedHcps.map((h) => ({
    hcpId: h.id,
    tier: h.tier,
    segment: h.segment,
    channelPreference: h.channelPreference as any,
  }));

  const campaignInfoForStimuli: CampaignInfo[] = insertedCampaigns.map((c) => ({
    campaignId: c.id,
    startDate: c.startDate ? new Date(c.startDate) : new Date(),
    endDate: c.endDate ? new Date(c.endDate) : null,
    primaryChannel: c.primaryChannel,
    targetSegments: c.targetSegments,
  }));

  const assignmentsForStimuli: TerritoryAssignment[] = assignments.map((a) => ({
    hcpId: a.hcpId,
    repId: a.repId,
  }));

  const stimuli = generateStimuliEvents(
    hcpProfiles_,
    campaignInfoForStimuli,
    assignmentsForStimuli,
    startDate,
    options.months
  );
  await batchInsert(stimuliEvents, stimuli, "stimuli_events");
  console.log(`  Generated ${stimuli.length} stimuli events`);

  // Get inserted stimuli with IDs
  const insertedStimuli = await db.select().from(stimuliEvents);

  // =========================================================================
  // Step 5: Generate Outcome Events
  // =========================================================================
  console.log("\n[5/7] Generating outcome events...");

  // Create stimulus lookup by position (since IDs are generated at insert)
  const stimulusForOutcomes: StimulusEvent[] = insertedStimuli.map((s, idx) => {
    const original = stimuli[idx];
    const hcp = insertedHcps.find((h) => h.id === s.hcpId);
    return {
      stimulusId: s.id,
      hcpId: s.hcpId,
      stimulusType: s.stimulusType,
      channel: s.channel as any,
      campaignId: s.campaignId,
      eventDate: new Date(s.eventDate),
      tier: hcp?.tier || "Tier 2",
      segment: hcp?.segment || "Growth Potential",
    };
  });

  const outcomes = generateOutcomeEvents(stimulusForOutcomes);
  await batchInsert(outcomeEvents, outcomes, "outcome_events");
  console.log(`  Generated ${outcomes.length} outcome events`);

  // =========================================================================
  // Step 6: Generate Prescribing History
  // =========================================================================
  console.log("\n[6/7] Generating prescribing history...");
  const hcpPrescribingProfiles: HCPPrescribingProfile[] = insertedHcps.map((h) => ({
    hcpId: h.id,
    specialty: h.specialty,
    tier: h.tier,
    segment: h.segment,
    monthlyRxVolume: h.monthlyRxVolume,
    marketSharePct: h.marketSharePct,
  }));

  // Get inserted outcomes for Rx correlation
  const insertedOutcomes = await db.select().from(outcomeEvents);
  const outcomeSummary = aggregateOutcomesForRx(
    insertedOutcomes.map((o) => ({
      hcpId: o.hcpId,
      eventDate: new Date(o.eventDate),
      outcomeType: o.outcomeType,
    }))
  );

  const rxHistory = generatePrescribingHistory(
    hcpPrescribingProfiles,
    outcomeSummary,
    startDate,
    options.months
  );
  await batchInsert(prescribingHistory, rxHistory, "prescribing_history");
  console.log(`  Generated ${rxHistory.length} prescribing records`);

  // =========================================================================
  // Step 7: Recalculate Aggregations
  // =========================================================================
  console.log("\n[7/7] Recalculating aggregations...");

  const engagementResult = await recalculateEngagementMetrics();
  console.log(`  Updated ${engagementResult.updated} HCP engagement scores`);

  const campaignResult = await updateCampaignMetrics();
  console.log(`  Updated ${campaignResult.updated} campaign metrics`);

  const participationResult = await updateCampaignParticipation();
  console.log(`  Updated ${participationResult.updated} participation records`);

  console.log("\n=== Generation Complete ===\n");
}

/**
 * Validate existing data
 */
async function runValidation(): Promise<ValidationResult> {
  console.log("\n=== Running Data Validation ===\n");
  const result = await validateDataIntegrity();

  for (const check of result.checks) {
    const status = check.passed ? "✓" : "✗";
    console.log(`${status} ${check.name}`);
    if (check.value !== undefined) {
      console.log(`    Value: ${check.value}`);
    }
    if (!check.passed && check.expected) {
      console.log(`    Expected: ${check.expected}`);
    }
    if (check.error) {
      console.log(`    Error: ${check.error}`);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total: ${result.summary.total}`);
  console.log(`Passed: ${result.summary.passed}`);
  console.log(`Failed: ${result.summary.failed}`);
  console.log(`Overall: ${result.passed ? "PASSED" : "FAILED"}\n`);

  return result;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const options = parseArgs();

  try {
    if (options.validateOnly) {
      const result = await runValidation();
      process.exit(result.passed ? 0 : 1);
    } else {
      await generateData(options);

      // Run validation after generation
      console.log("\nRunning post-generation validation...");
      const result = await runValidation();

      if (!result.passed) {
        console.error("Validation failed after generation!");
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("Generation failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
