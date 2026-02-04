import { db } from "../db";
import { integrationCredentials } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

interface VeevaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  instanceUrl: string;
}

interface VeevaRecommendation {
  hcpId: string;
  npi?: string;
  firstName: string;
  lastName: string;
  action: string;
  rationale: string;
  confidence: number;
  priority: "high" | "medium" | "low";
}

interface VeevaPushResult {
  success: boolean;
  recordsCreated: number;
  recordsUpdated: number;
  errors: { hcpId: string; error: string }[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const VEEVA_AUTH_URL = process.env.VEEVA_AUTH_URL || "https://login.veevavault.com/auth/oauth";
const VEEVA_TOKEN_URL = process.env.VEEVA_TOKEN_URL || "https://login.veevavault.com/auth/oauth/token";
const VEEVA_API_VERSION = "v24.1";

function getVeevaConfig() {
  return {
    clientId: process.env.VEEVA_CLIENT_ID || "",
    clientSecret: process.env.VEEVA_CLIENT_SECRET || "",
    redirectUri: process.env.VEEVA_REDIRECT_URI || "http://localhost:5000/api/integrations/veeva/callback",
  };
}

// ============================================================================
// OAUTH FLOW
// ============================================================================

/**
 * Initiate Veeva OAuth flow by generating authorization URL
 */
export function initiateVeevaOAuth(userId: string): { authUrl: string; state: string } {
  const config = getVeevaConfig();

  if (!config.clientId) {
    throw new Error("Veeva client ID not configured");
  }

  // Generate state for CSRF protection
  const state = Buffer.from(JSON.stringify({
    userId,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2),
  })).toString("base64");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: "openid offline_access",
  });

  const authUrl = `${VEEVA_AUTH_URL}?${params.toString()}`;

  return { authUrl, state };
}

/**
 * Handle OAuth callback and exchange code for tokens
 */
export async function handleVeevaCallback(
  code: string,
  state: string
): Promise<{ userId: string; success: boolean }> {
  const config = getVeevaConfig();

  // Decode and validate state
  let stateData: { userId: string; timestamp: number };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64").toString());
  } catch {
    throw new Error("Invalid OAuth state");
  }

  // Check state age (15 minutes max)
  if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
    throw new Error("OAuth state expired");
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(VEEVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("Veeva token exchange failed:", error);
    throw new Error("Failed to exchange authorization code");
  }

  const tokenData = await tokenResponse.json();

  // Store credentials
  const tokens: VeevaTokens = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + (tokenData.expires_in * 1000),
    instanceUrl: tokenData.instance_url || "https://api.veevavault.com",
  };

  await saveVeevaCredentials(stateData.userId, tokens);

  return { userId: stateData.userId, success: true };
}

/**
 * Save Veeva credentials to database
 */
async function saveVeevaCredentials(userId: string, tokens: VeevaTokens): Promise<void> {
  const existing = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.userId, userId),
        eq(integrationCredentials.integrationType, "veeva")
      )
    )
    .limit(1);

  const credentialsData = tokens as unknown as Record<string, unknown>;

  if (existing.length > 0) {
    await db
      .update(integrationCredentials)
      .set({
        credentials: credentialsData,
        isValid: true,
        lastValidatedAt: new Date(),
      })
      .where(eq(integrationCredentials.id, existing[0].id));
  } else {
    await db.insert(integrationCredentials).values({
      userId,
      integrationType: "veeva",
      credentials: credentialsData,
      isValid: true,
      lastValidatedAt: new Date(),
    });
  }
}

/**
 * Get Veeva credentials for a user
 */
export async function getVeevaCredentials(userId: string): Promise<VeevaTokens | null> {
  const result = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.userId, userId),
        eq(integrationCredentials.integrationType, "veeva")
      )
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0].credentials as unknown as VeevaTokens;
}

/**
 * Refresh Veeva access token if expired
 */
async function refreshVeevaToken(userId: string, tokens: VeevaTokens): Promise<VeevaTokens> {
  const config = getVeevaConfig();

  // Check if token is still valid (with 5 minute buffer)
  if (tokens.expiresAt > Date.now() + 5 * 60 * 1000) {
    return tokens;
  }

  const tokenResponse = await fetch(VEEVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    // Mark credentials as invalid
    await db
      .update(integrationCredentials)
      .set({ isValid: false })
      .where(
        and(
          eq(integrationCredentials.userId, userId),
          eq(integrationCredentials.integrationType, "veeva")
        )
      );
    throw new Error("Failed to refresh Veeva token - please reconnect");
  }

  const tokenData = await tokenResponse.json();

  const newTokens: VeevaTokens = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || tokens.refreshToken,
    expiresAt: Date.now() + (tokenData.expires_in * 1000),
    instanceUrl: tokens.instanceUrl,
  };

  await saveVeevaCredentials(userId, newTokens);

  return newTokens;
}

// ============================================================================
// VEEVA API OPERATIONS
// ============================================================================

/**
 * Get Veeva connection status
 */
export async function getVeevaStatus(userId: string): Promise<{
  connected: boolean;
  instanceUrl?: string;
  expiresAt?: number;
  isValid?: boolean;
}> {
  const creds = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.userId, userId),
        eq(integrationCredentials.integrationType, "veeva")
      )
    )
    .limit(1);

  if (creds.length === 0) {
    return { connected: false };
  }

  const tokens = creds[0].credentials as unknown as VeevaTokens;
  return {
    connected: true,
    instanceUrl: tokens.instanceUrl,
    expiresAt: tokens.expiresAt,
    isValid: creds[0].isValid ?? false,
  };
}

/**
 * Disconnect Veeva integration
 */
export async function disconnectVeeva(userId: string): Promise<boolean> {
  const result = await db
    .delete(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.userId, userId),
        eq(integrationCredentials.integrationType, "veeva")
      )
    );

  return true;
}

/**
 * Test Veeva connection
 */
export async function testVeevaConnection(userId: string): Promise<{
  success: boolean;
  message: string;
  vaultName?: string;
}> {
  const tokens = await getVeevaCredentials(userId);

  if (!tokens) {
    return { success: false, message: "Veeva not connected" };
  }

  try {
    const refreshedTokens = await refreshVeevaToken(userId, tokens);

    // Make a test API call to verify connection
    const response = await fetch(`${refreshedTokens.instanceUrl}/api/${VEEVA_API_VERSION}/metadata/vaults`, {
      headers: {
        Authorization: `Bearer ${refreshedTokens.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return { success: false, message: "Connection test failed - invalid response" };
    }

    const data = await response.json();

    // Update last validated timestamp
    await db
      .update(integrationCredentials)
      .set({
        isValid: true,
        lastValidatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationCredentials.userId, userId),
          eq(integrationCredentials.integrationType, "veeva")
        )
      );

    return {
      success: true,
      message: "Connection successful",
      vaultName: data.vaults?.[0]?.name || "Veeva Vault",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection test failed",
    };
  }
}

/**
 * Push NBA recommendations to Veeva CRM
 */
export async function pushToVeeva(
  userId: string,
  recommendations: VeevaRecommendation[]
): Promise<VeevaPushResult> {
  const tokens = await getVeevaCredentials(userId);

  if (!tokens) {
    throw new Error("Veeva not connected");
  }

  const refreshedTokens = await refreshVeevaToken(userId, tokens);

  const result: VeevaPushResult = {
    success: true,
    recordsCreated: 0,
    recordsUpdated: 0,
    errors: [],
  };

  // Process recommendations in batches
  const batchSize = 50;
  for (let i = 0; i < recommendations.length; i += batchSize) {
    const batch = recommendations.slice(i, i + batchSize);

    const veevaRecords = batch.map((rec) => ({
      Name: `NBA-${rec.hcpId}-${Date.now()}`,
      Account__c: rec.hcpId,
      NPI__c: rec.npi || null,
      HCP_Name__c: `${rec.firstName} ${rec.lastName}`,
      Suggested_Action__c: rec.action,
      Rationale__c: rec.rationale,
      Confidence_Score__c: Math.round(rec.confidence * 100),
      Priority__c: rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1),
      Status__c: "New",
      Source__c: "TwinEngine",
      Created_Date__c: new Date().toISOString(),
    }));

    try {
      const response = await fetch(
        `${refreshedTokens.instanceUrl}/api/${VEEVA_API_VERSION}/objects/NBA_Recommendation__c`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${refreshedTokens.accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ records: veevaRecords }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Veeva batch push failed:", errorText);

        // Add errors for all records in failed batch
        batch.forEach((rec) => {
          result.errors.push({
            hcpId: rec.hcpId,
            error: `Batch push failed: ${response.status}`,
          });
        });
        continue;
      }

      const responseData = await response.json();

      // Process individual record results
      if (responseData.results) {
        responseData.results.forEach((recordResult: any, index: number) => {
          if (recordResult.success) {
            if (recordResult.created) {
              result.recordsCreated++;
            } else {
              result.recordsUpdated++;
            }
          } else {
            result.errors.push({
              hcpId: batch[index].hcpId,
              error: recordResult.errors?.[0]?.message || "Unknown error",
            });
          }
        });
      } else {
        // Assume all succeeded if no detailed results
        result.recordsCreated += batch.length;
      }
    } catch (error) {
      console.error("Veeva batch push error:", error);
      batch.forEach((rec) => {
        result.errors.push({
          hcpId: rec.hcpId,
          error: error instanceof Error ? error.message : "Network error",
        });
      });
    }
  }

  result.success = result.errors.length === 0;

  // Log the push operation
  console.log(`Veeva push complete: ${result.recordsCreated} created, ${result.recordsUpdated} updated, ${result.errors.length} errors`);

  return result;
}

/**
 * Get Veeva field mappings for export
 */
export function getVeevaFieldMappings(): Record<string, string> {
  return {
    id: "Account__c",
    npi: "NPI__c",
    firstName: "First_Name__c",
    lastName: "Last_Name__c",
    specialty: "Specialty__c",
    tier: "Tier__c",
    segment: "Segment__c",
    organization: "Organization__c",
    city: "City__c",
    state: "State__c",
    overallEngagementScore: "Engagement_Score__c",
    channelPreference: "Channel_Preference__c",
    monthlyRxVolume: "Monthly_Rx_Volume__c",
    marketSharePct: "Market_Share__c",
    conversionLikelihood: "Conversion_Likelihood__c",
    churnRisk: "Churn_Risk__c",
    nbaAction: "Suggested_Action__c",
    nbaRationale: "Rationale__c",
    nbaConfidence: "Confidence_Score__c",
  };
}
