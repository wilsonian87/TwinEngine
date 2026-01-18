/**
 * Territory Generator
 * Generates sales rep assignments and territory mappings
 */

import { getRng } from "../rng";
import { REGIONS, REP_FIRST_NAMES, REP_LAST_NAMES } from "../config";
import type { InsertTerritoryAssignment } from "@shared/schema";

interface Rep {
  repId: string;
  repName: string;
  repEmail: string;
  territory: string;
  region: string;
  district: string;
  hcpIds: string[];
}

interface HCPLocation {
  hcpId: string;
  city: string;
  state: string;
}

/**
 * Generate territory assignments for all HCPs
 * Creates ~200 reps with 10-12 HCPs each
 */
export function generateTerritoryAssignments(
  hcpLocations: HCPLocation[],
  startDate: Date
): { reps: Rep[]; assignments: InsertTerritoryAssignment[] } {
  const rng = getRng();

  // Map states to regions
  const stateToRegion: Record<string, string> = {
    NY: "Northeast", NJ: "Northeast", PA: "Northeast", MA: "Northeast",
    CT: "Northeast", RI: "Northeast", VT: "Northeast", NH: "Northeast",
    ME: "Northeast", MD: "Northeast", DE: "Northeast", DC: "Northeast",
    FL: "Southeast", GA: "Southeast", NC: "Southeast", SC: "Southeast",
    VA: "Southeast", TN: "Southeast", AL: "Southeast", MS: "Southeast",
    KY: "Southeast", LA: "Southeast",
    IL: "Midwest", OH: "Midwest", MI: "Midwest", IN: "Midwest",
    WI: "Midwest", MN: "Midwest", IA: "Midwest", MO: "Midwest",
    NE: "Midwest", KS: "Midwest", ND: "Midwest", SD: "Midwest",
    TX: "Southwest", AZ: "Southwest", NM: "Southwest", OK: "Southwest",
    CO: "Southwest", UT: "Southwest", NV: "Southwest",
    CA: "West", WA: "West", OR: "West", HI: "West",
  };

  // Group HCPs by region
  const hcpsByRegion: Record<string, HCPLocation[]> = {};
  for (const hcp of hcpLocations) {
    const region = stateToRegion[hcp.state] || "West";
    if (!hcpsByRegion[region]) {
      hcpsByRegion[region] = [];
    }
    hcpsByRegion[region].push(hcp);
  }

  const reps: Rep[] = [];
  const assignments: InsertTerritoryAssignment[] = [];
  let repCounter = 1;

  // Generate reps for each region
  for (const regionData of REGIONS) {
    const regionHcps = hcpsByRegion[regionData.name] || [];
    if (regionHcps.length === 0) continue;

    // Calculate number of reps needed (target 10-12 HCPs per rep)
    const avgHcpsPerRep = 11;
    const numReps = Math.max(1, Math.ceil(regionHcps.length / avgHcpsPerRep));

    // Shuffle HCPs for random distribution
    const shuffledHcps = rng.shuffle([...regionHcps]);

    // Distribute HCPs across territories
    for (let i = 0; i < numReps; i++) {
      const territory = rng.pick(regionData.territories);
      const district = `${territory} District ${rng.int(1, 3)}`;

      // Generate rep details
      const firstName = rng.pick(REP_FIRST_NAMES);
      const lastName = rng.pick(REP_LAST_NAMES);
      const repId = `REP-${String(repCounter++).padStart(4, "0")}`;
      const repName = `${firstName} ${lastName}`;
      const repEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`;

      // Assign HCPs to this rep
      const startIdx = Math.floor((i * shuffledHcps.length) / numReps);
      const endIdx = Math.floor(((i + 1) * shuffledHcps.length) / numReps);
      const repHcps = shuffledHcps.slice(startIdx, endIdx);

      const rep: Rep = {
        repId,
        repName,
        repEmail,
        territory,
        region: regionData.name,
        district,
        hcpIds: repHcps.map((h) => h.hcpId),
      };
      reps.push(rep);

      // Create primary assignments
      for (const hcp of repHcps) {
        assignments.push({
          repId,
          repName,
          repEmail,
          hcpId: hcp.hcpId,
          assignmentType: "primary",
          territory,
          region: regionData.name,
          district,
          effectiveFrom: startDate,
          effectiveTo: null,
          isActive: true,
        });
      }
    }
  }

  // Add some secondary assignments (20% of HCPs have a backup rep)
  const hcpsWithPrimary = assignments.filter((a) => a.assignmentType === "primary");
  const numSecondary = Math.floor(hcpsWithPrimary.length * 0.2);
  const shuffledForSecondary = rng.shuffle([...hcpsWithPrimary]);

  for (let i = 0; i < numSecondary; i++) {
    const primaryAssignment = shuffledForSecondary[i];

    // Find a different rep in the same region
    const sameRegionReps = reps.filter(
      (r) => r.region === primaryAssignment.region && r.repId !== primaryAssignment.repId
    );

    if (sameRegionReps.length > 0) {
      const backupRep = rng.pick(sameRegionReps);

      assignments.push({
        repId: backupRep.repId,
        repName: backupRep.repName,
        repEmail: backupRep.repEmail,
        hcpId: primaryAssignment.hcpId,
        assignmentType: "secondary",
        territory: backupRep.territory,
        region: backupRep.region,
        district: backupRep.district,
        effectiveFrom: startDate,
        effectiveTo: null,
        isActive: true,
      });
    }
  }

  return { reps, assignments };
}

/**
 * Get rep assignment for an HCP
 */
export function getRepForHCP(
  assignments: InsertTerritoryAssignment[],
  hcpId: string
): InsertTerritoryAssignment | undefined {
  return assignments.find(
    (a) => a.hcpId === hcpId && a.assignmentType === "primary" && a.isActive
  );
}

export type { Rep, HCPLocation };
