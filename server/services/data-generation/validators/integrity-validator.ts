/**
 * Integrity Validator
 * Validates generated data for FK integrity, temporal consistency, and uniqueness
 */

import { db } from "../../../db";
import { sql } from "drizzle-orm";

export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

export interface ValidationCheck {
  name: string;
  description: string;
  passed: boolean;
  value?: number | string;
  expected?: string;
  error?: string;
}

/**
 * Run all integrity validations
 */
export async function validateDataIntegrity(): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];

  // Record count checks
  checks.push(await checkRecordCounts());

  // FK integrity checks
  checks.push(await checkStimuliHcpFK());
  checks.push(await checkOutcomeStimuliFK());
  checks.push(await checkOutcomeHcpFK());
  checks.push(await checkTerritoryHcpFK());
  checks.push(await checkPrescribingHcpFK());
  checks.push(await checkCampaignParticipationFK());

  // Uniqueness checks
  checks.push(await checkNpiUniqueness());
  checks.push(await checkCampaignCodeUniqueness());

  // Temporal consistency checks
  checks.push(await checkOutcomeAfterStimulus());
  checks.push(await checkCampaignDateConsistency());

  // Response rate check
  checks.push(await checkResponseRate());

  // Calculate summary
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;

  return {
    passed: failed === 0,
    checks,
    summary: {
      total: checks.length,
      passed,
      failed,
    },
  };
}

/**
 * Check record counts - reports counts without failing
 * (Targets vary based on CLI args, so we just report the numbers)
 */
async function checkRecordCounts(): Promise<ValidationCheck> {
  try {
    const counts = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM hcp_profiles`),
      db.execute(sql`SELECT COUNT(*) as count FROM stimuli_events`),
      db.execute(sql`SELECT COUNT(*) as count FROM outcome_events`),
      db.execute(sql`SELECT COUNT(*) as count FROM prescribing_history`),
      db.execute(sql`SELECT COUNT(*) as count FROM territory_assignments`),
      db.execute(sql`SELECT COUNT(*) as count FROM campaigns`),
    ]);

    const hcpCount = Number(counts[0].rows[0]?.count || 0);
    const stimuliCount = Number(counts[1].rows[0]?.count || 0);
    const outcomeCount = Number(counts[2].rows[0]?.count || 0);
    const rxCount = Number(counts[3].rows[0]?.count || 0);
    const territoryCount = Number(counts[4].rows[0]?.count || 0);
    const campaignCount = Number(counts[5].rows[0]?.count || 0);

    const summary = `HCPs: ${hcpCount}, Stimuli: ${stimuliCount}, Outcomes: ${outcomeCount}, Rx: ${rxCount}, Territories: ${territoryCount}, Campaigns: ${campaignCount}`;

    // Just verify data exists (targets vary based on CLI args)
    const hasData = hcpCount > 0 && stimuliCount > 0 && outcomeCount > 0 && rxCount > 0;

    return {
      name: "Record Counts",
      description: "Check all tables have data populated",
      passed: hasData,
      value: summary,
      expected: "All tables have records",
    };
  } catch (error) {
    return {
      name: "Record Counts",
      description: "Check all tables have data populated",
      passed: false,
      error: String(error),
    };
  }
}

/**
 * Check stimuli_events.hcp_id references valid HCPs
 */
async function checkStimuliHcpFK(): Promise<ValidationCheck> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as orphan_count
      FROM stimuli_events s
      LEFT JOIN hcp_profiles h ON s.hcp_id = h.id
      WHERE h.id IS NULL
    `);
    const orphanCount = Number(result.rows[0]?.orphan_count || 0);

    return {
      name: "Stimuli HCP FK",
      description: "All stimuli_events.hcp_id reference valid HCPs",
      passed: orphanCount === 0,
      value: orphanCount,
      expected: "0 orphaned records",
    };
  } catch (error) {
    return {
      name: "Stimuli HCP FK",
      description: "All stimuli_events.hcp_id reference valid HCPs",
      passed: false,
      error: String(error),
    };
  }
}

/**
 * Check outcome_events.stimulus_id references valid stimuli
 */
async function checkOutcomeStimuliFK(): Promise<ValidationCheck> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as orphan_count
      FROM outcome_events o
      LEFT JOIN stimuli_events s ON o.stimulus_id = s.id
      WHERE o.stimulus_id IS NOT NULL AND s.id IS NULL
    `);
    const orphanCount = Number(result.rows[0]?.orphan_count || 0);

    return {
      name: "Outcome Stimulus FK",
      description: "All outcome_events.stimulus_id reference valid stimuli",
      passed: orphanCount === 0,
      value: orphanCount,
      expected: "0 orphaned records",
    };
  } catch (error) {
    return {
      name: "Outcome Stimulus FK",
      description: "All outcome_events.stimulus_id reference valid stimuli",
      passed: false,
      error: String(error),
    };
  }
}

/**
 * Check outcome_events.hcp_id references valid HCPs
 */
async function checkOutcomeHcpFK(): Promise<ValidationCheck> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as orphan_count
      FROM outcome_events o
      LEFT JOIN hcp_profiles h ON o.hcp_id = h.id
      WHERE h.id IS NULL
    `);
    const orphanCount = Number(result.rows[0]?.orphan_count || 0);

    return {
      name: "Outcome HCP FK",
      description: "All outcome_events.hcp_id reference valid HCPs",
      passed: orphanCount === 0,
      value: orphanCount,
      expected: "0 orphaned records",
    };
  } catch (error) {
    return {
      name: "Outcome HCP FK",
      description: "All outcome_events.hcp_id reference valid HCPs",
      passed: false,
      error: String(error),
    };
  }
}

/**
 * Check territory_assignments.hcp_id references valid HCPs
 */
async function checkTerritoryHcpFK(): Promise<ValidationCheck> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as orphan_count
      FROM territory_assignments t
      LEFT JOIN hcp_profiles h ON t.hcp_id = h.id
      WHERE h.id IS NULL
    `);
    const orphanCount = Number(result.rows[0]?.orphan_count || 0);

    return {
      name: "Territory HCP FK",
      description: "All territory_assignments.hcp_id reference valid HCPs",
      passed: orphanCount === 0,
      value: orphanCount,
      expected: "0 orphaned records",
    };
  } catch (error) {
    return {
      name: "Territory HCP FK",
      description: "All territory_assignments.hcp_id reference valid HCPs",
      passed: false,
      error: String(error),
    };
  }
}

/**
 * Check prescribing_history.hcp_id references valid HCPs
 */
async function checkPrescribingHcpFK(): Promise<ValidationCheck> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as orphan_count
      FROM prescribing_history p
      LEFT JOIN hcp_profiles h ON p.hcp_id = h.id
      WHERE h.id IS NULL
    `);
    const orphanCount = Number(result.rows[0]?.orphan_count || 0);

    return {
      name: "Prescribing HCP FK",
      description: "All prescribing_history.hcp_id reference valid HCPs",
      passed: orphanCount === 0,
      value: orphanCount,
      expected: "0 orphaned records",
    };
  } catch (error) {
    return {
      name: "Prescribing HCP FK",
      description: "All prescribing_history.hcp_id reference valid HCPs",
      passed: false,
      error: String(error),
    };
  }
}

/**
 * Check campaign_participation FKs
 */
async function checkCampaignParticipationFK(): Promise<ValidationCheck> {
  try {
    const result = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM campaign_participation cp
         LEFT JOIN campaigns c ON cp.campaign_id = c.id
         WHERE c.id IS NULL) as orphan_campaigns,
        (SELECT COUNT(*) FROM campaign_participation cp
         LEFT JOIN hcp_profiles h ON cp.hcp_id = h.id
         WHERE h.id IS NULL) as orphan_hcps
    `);
    const orphanCampaigns = Number(result.rows[0]?.orphan_campaigns || 0);
    const orphanHcps = Number(result.rows[0]?.orphan_hcps || 0);

    return {
      name: "Campaign Participation FK",
      description: "All campaign_participation references are valid",
      passed: orphanCampaigns === 0 && orphanHcps === 0,
      value: `Orphan campaigns: ${orphanCampaigns}, Orphan HCPs: ${orphanHcps}`,
      expected: "0 orphaned records",
    };
  } catch (error) {
    return {
      name: "Campaign Participation FK",
      description: "All campaign_participation references are valid",
      passed: false,
      error: String(error),
    };
  }
}

/**
 * Check NPI uniqueness
 */
async function checkNpiUniqueness(): Promise<ValidationCheck> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) - COUNT(DISTINCT npi) as duplicate_count
      FROM hcp_profiles
    `);
    const duplicateCount = Number(result.rows[0]?.duplicate_count || 0);

    return {
      name: "NPI Uniqueness",
      description: "All HCP NPIs are unique",
      passed: duplicateCount === 0,
      value: duplicateCount,
      expected: "0 duplicates",
    };
  } catch (error) {
    return {
      name: "NPI Uniqueness",
      description: "All HCP NPIs are unique",
      passed: false,
      error: String(error),
    };
  }
}

/**
 * Check campaign code uniqueness
 */
async function checkCampaignCodeUniqueness(): Promise<ValidationCheck> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) - COUNT(DISTINCT campaign_code) as duplicate_count
      FROM campaigns
      WHERE campaign_code IS NOT NULL
    `);
    const duplicateCount = Number(result.rows[0]?.duplicate_count || 0);

    return {
      name: "Campaign Code Uniqueness",
      description: "All campaign codes are unique",
      passed: duplicateCount === 0,
      value: duplicateCount,
      expected: "0 duplicates",
    };
  } catch (error) {
    return {
      name: "Campaign Code Uniqueness",
      description: "All campaign codes are unique",
      passed: false,
      error: String(error),
    };
  }
}

/**
 * Check outcomes occur after their triggering stimuli
 */
async function checkOutcomeAfterStimulus(): Promise<ValidationCheck> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as violation_count
      FROM outcome_events o
      JOIN stimuli_events s ON o.stimulus_id = s.id
      WHERE o.event_date < s.event_date
    `);
    const violationCount = Number(result.rows[0]?.violation_count || 0);

    return {
      name: "Temporal Consistency",
      description: "All outcomes occur after their triggering stimuli",
      passed: violationCount === 0,
      value: violationCount,
      expected: "0 violations",
    };
  } catch (error) {
    return {
      name: "Temporal Consistency",
      description: "All outcomes occur after their triggering stimuli",
      passed: false,
      error: String(error),
    };
  }
}

/**
 * Check campaign date consistency
 */
async function checkCampaignDateConsistency(): Promise<ValidationCheck> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as violation_count
      FROM campaigns
      WHERE end_date IS NOT NULL AND end_date < start_date
    `);
    const violationCount = Number(result.rows[0]?.violation_count || 0);

    return {
      name: "Campaign Date Consistency",
      description: "All campaigns have end_date >= start_date",
      passed: violationCount === 0,
      value: violationCount,
      expected: "0 violations",
    };
  } catch (error) {
    return {
      name: "Campaign Date Consistency",
      description: "All campaigns have end_date >= start_date",
      passed: false,
      error: String(error),
    };
  }
}

/**
 * Check response rate is in expected range (18-24%)
 */
async function checkResponseRate(): Promise<ValidationCheck> {
  try {
    const result = await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::float FROM outcome_events) /
        NULLIF((SELECT COUNT(*)::float FROM stimuli_events), 0) as response_rate
    `);
    const responseRate = Number(result.rows[0]?.response_rate || 0) * 100;

    return {
      name: "Response Rate",
      description: "Overall response rate is between 18-24%",
      passed: responseRate >= 18 && responseRate <= 24,
      value: `${responseRate.toFixed(2)}%`,
      expected: "18-24%",
    };
  } catch (error) {
    return {
      name: "Response Rate",
      description: "Overall response rate is between 18-24%",
      passed: false,
      error: String(error),
    };
  }
}
