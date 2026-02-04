import { eq, and, or, desc, inArray, lt, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  approvalPolicies,
  approvalRequests,
  users,
  type ApprovalPolicy,
  type ApprovalRequest,
  type ApprovalStatus,
} from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

interface ApprovalCheckResult {
  required: boolean;
  policyId?: string;
  policyName?: string;
  reason?: string;
}

interface TriggerConditions {
  action?: string;
  contains_npi?: boolean;
  hcp_count_above?: number;
  destination?: string;
  [key: string]: unknown;
}

interface ApprovalContext {
  contains_npi?: boolean;
  hcp_count?: number;
  destination?: string;
  [key: string]: unknown;
}

// ============================================================================
// POLICY MATCHING
// ============================================================================

/**
 * Check if context matches policy trigger conditions
 */
function matchesTrigger(
  conditions: TriggerConditions,
  action: string,
  context: ApprovalContext
): boolean {
  // Check action matches
  if (conditions.action && conditions.action !== action) {
    return false;
  }

  // Check NPI condition
  if (conditions.contains_npi === true && context.contains_npi !== true) {
    return false;
  }

  // Check HCP count threshold
  if (
    conditions.hcp_count_above !== undefined &&
    (context.hcp_count === undefined || context.hcp_count <= conditions.hcp_count_above)
  ) {
    return false;
  }

  // Check destination
  if (conditions.destination && conditions.destination !== context.destination) {
    return false;
  }

  return true;
}

// ============================================================================
// APPROVAL CHECK
// ============================================================================

/**
 * Check if an action requires approval based on policies
 */
export async function checkApprovalRequired(
  userId: string,
  action: string,
  context: ApprovalContext
): Promise<ApprovalCheckResult> {
  // Get all enabled policies
  const policies = await db
    .select()
    .from(approvalPolicies)
    .where(eq(approvalPolicies.enabled, true));

  // Check each policy
  for (const policy of policies) {
    const conditions = policy.triggerConditions as TriggerConditions;

    if (matchesTrigger(conditions, action, context)) {
      return {
        required: true,
        policyId: policy.id,
        policyName: policy.name,
        reason: `Requires approval: ${policy.name}`,
      };
    }
  }

  return { required: false };
}

// ============================================================================
// APPROVAL REQUEST MANAGEMENT
// ============================================================================

/**
 * Create a new approval request
 */
export async function createApprovalRequest(
  requesterId: string,
  policyId: string,
  type: string,
  payload: Record<string, unknown>,
  justification?: string
): Promise<ApprovalRequest> {
  // Get policy for expiration settings
  const [policy] = await db
    .select()
    .from(approvalPolicies)
    .where(eq(approvalPolicies.id, policyId));

  if (!policy) {
    throw new Error("Approval policy not found");
  }

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (policy.autoExpireHours || 72));

  // Create request
  const [request] = await db
    .insert(approvalRequests)
    .values({
      policyId,
      requesterId,
      type,
      payload,
      justification,
      status: "pending",
      expiresAt,
    })
    .returning();

  // Create alerts for approvers
  await notifyApprovers(policy.approverRoles, request, policy.name);

  return request;
}

/**
 * Get approval request by ID
 */
export async function getApprovalRequest(
  requestId: string,
  userId: string
): Promise<ApprovalRequest | null> {
  const [request] = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, requestId));

  if (!request) {
    return null;
  }

  // Check access: must be requester, approver, or have approver role
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    return null;
  }

  // Get policy to check roles
  const [policy] = request.policyId
    ? await db.select().from(approvalPolicies).where(eq(approvalPolicies.id, request.policyId))
    : [null];

  const userRole = user.role || "user";
  const isRequester = request.requesterId === userId;
  const isApprover = policy?.approverRoles?.includes(userRole) || userRole === "admin";

  if (!isRequester && !isApprover) {
    return null;
  }

  return request;
}

/**
 * List approval requests for a user
 */
export async function listApprovalRequests(
  userId: string,
  options: {
    status?: ApprovalStatus;
    asApprover?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ requests: ApprovalRequest[]; total: number }> {
  const { status, asApprover, limit = 50, offset = 0 } = options;

  // Get user role
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const userRole = user?.role || "user";

  // Build conditions
  const conditions = [];

  if (status) {
    conditions.push(eq(approvalRequests.status, status));
  }

  if (asApprover) {
    // Get policies where user can approve
    const approverPolicies = await db
      .select()
      .from(approvalPolicies)
      .where(eq(approvalPolicies.enabled, true));

    const approverPolicyIds = approverPolicies
      .filter((p) => p.approverRoles?.includes(userRole) || userRole === "admin")
      .map((p) => p.id);

    if (approverPolicyIds.length > 0) {
      conditions.push(
        or(
          inArray(approvalRequests.policyId, approverPolicyIds),
          isNull(approvalRequests.policyId)
        )!
      );
    } else {
      // User can't approve anything
      return { requests: [], total: 0 };
    }
  } else {
    // Show user's own requests
    conditions.push(eq(approvalRequests.requesterId, userId));
  }

  // Get total count
  const allRequests = await db
    .select()
    .from(approvalRequests)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const total = allRequests.length;

  // Get paginated results
  const requests = await db
    .select()
    .from(approvalRequests)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(approvalRequests.createdAt))
    .limit(limit)
    .offset(offset);

  return { requests, total };
}

/**
 * Process approval decision
 */
export async function processApproval(
  requestId: string,
  approverId: string,
  decision: "approved" | "rejected",
  notes?: string
): Promise<ApprovalRequest> {
  // Get request
  const [request] = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, requestId));

  if (!request) {
    throw new Error("Approval request not found");
  }

  if (request.status !== "pending") {
    throw new Error(`Request already ${request.status}`);
  }

  // Check if expired
  if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
    await db
      .update(approvalRequests)
      .set({ status: "expired" })
      .where(eq(approvalRequests.id, requestId));
    throw new Error("Request has expired");
  }

  // Verify approver has permission
  const [approver] = await db.select().from(users).where(eq(users.id, approverId));
  if (!approver) {
    throw new Error("Approver not found");
  }

  const [policy] = request.policyId
    ? await db.select().from(approvalPolicies).where(eq(approvalPolicies.id, request.policyId))
    : [null];

  const approverRole = approver.role || "user";
  const canApprove = policy?.approverRoles?.includes(approverRole) || approverRole === "admin";

  if (!canApprove) {
    throw new Error("User not authorized to approve this request");
  }

  // Update request
  const [updatedRequest] = await db
    .update(approvalRequests)
    .set({
      approverId,
      status: decision,
      decisionNotes: notes,
      decidedAt: new Date(),
    })
    .where(eq(approvalRequests.id, requestId))
    .returning();

  // Notify requester
  await notifyRequester(request, decision, notes);

  // If approved, execute the pending action
  if (decision === "approved") {
    await executePendingAction(updatedRequest);
  }

  return updatedRequest;
}

/**
 * Cancel an approval request (by requester)
 */
export async function cancelApprovalRequest(
  requestId: string,
  userId: string
): Promise<ApprovalRequest> {
  // Get request
  const [request] = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, requestId));

  if (!request) {
    throw new Error("Approval request not found");
  }

  if (request.requesterId !== userId) {
    throw new Error("Only requester can cancel");
  }

  if (request.status !== "pending") {
    throw new Error(`Request already ${request.status}`);
  }

  // Update status
  const [updatedRequest] = await db
    .update(approvalRequests)
    .set({
      status: "cancelled",
      decidedAt: new Date(),
    })
    .where(eq(approvalRequests.id, requestId))
    .returning();

  return updatedRequest;
}

/**
 * Expire old pending requests (called by scheduler)
 */
export async function expirePendingRequests(): Promise<number> {
  const result = await db
    .update(approvalRequests)
    .set({ status: "expired" })
    .where(
      and(
        eq(approvalRequests.status, "pending"),
        lt(approvalRequests.expiresAt, new Date())
      )
    )
    .returning();

  return result.length;
}

// ============================================================================
// POLICY MANAGEMENT
// ============================================================================

/**
 * List all approval policies
 */
export async function listApprovalPolicies(): Promise<ApprovalPolicy[]> {
  return db.select().from(approvalPolicies).orderBy(approvalPolicies.name);
}

/**
 * Get pending approval count for a user (as approver)
 */
export async function getPendingApprovalCount(userId: string): Promise<number> {
  // Get user role
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const userRole = user?.role || "user";

  // Get policies where user can approve
  const policies = await db
    .select()
    .from(approvalPolicies)
    .where(eq(approvalPolicies.enabled, true));

  const approverPolicyIds = policies
    .filter((p) => p.approverRoles?.includes(userRole) || userRole === "admin")
    .map((p) => p.id);

  if (approverPolicyIds.length === 0 && userRole !== "admin") {
    return 0;
  }

  // Count pending requests
  const pendingRequests = await db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.status, "pending"),
        userRole === "admin"
          ? undefined
          : or(
              inArray(approvalRequests.policyId, approverPolicyIds),
              isNull(approvalRequests.policyId)
            )
      )
    );

  return pendingRequests.length;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Notify approvers about new request
 * In production, this would send emails, push notifications, or in-app alerts
 */
async function notifyApprovers(
  approverRoles: string[],
  request: ApprovalRequest,
  policyName: string
): Promise<void> {
  // Get users with approver roles
  const approvers = await db
    .select()
    .from(users)
    .where(
      or(
        inArray(users.role, approverRoles),
        eq(users.role, "admin")
      )
    );

  // Log notification (in production, would send actual notifications)
  console.log(`[APPROVAL] New request ${request.id} requires approval for policy "${policyName}"`);
  console.log(`[APPROVAL] Notifying ${approvers.length} approvers: ${approvers.map(a => a.username).join(", ")}`);

  // TODO: In production, integrate with:
  // - Email service (SendGrid, SES, etc.)
  // - Push notifications
  // - Slack/Teams integration
  // - In-app notification system
}

/**
 * Notify requester about decision
 * In production, this would send emails, push notifications, or in-app alerts
 */
async function notifyRequester(
  request: ApprovalRequest,
  decision: "approved" | "rejected",
  notes?: string
): Promise<void> {
  const message = decision === "approved"
    ? `Your ${request.type} request has been approved.`
    : `Your ${request.type} request has been rejected.${notes ? ` Reason: ${notes}` : ""}`;

  console.log(`[APPROVAL] Request ${request.id} ${decision}. Notifying requester ${request.requesterId}`);
  console.log(`[APPROVAL] Message: ${message}`);

  // TODO: In production, integrate with notification services
}

// ============================================================================
// ACTION EXECUTION
// ============================================================================

/**
 * Execute the pending action after approval
 */
async function executePendingAction(request: ApprovalRequest): Promise<void> {
  const payload = request.payload as Record<string, unknown>;

  switch (request.type) {
    case "export": {
      // Trigger export job creation
      const { createExportJob } = await import("./export-hub-service");

      await createExportJob(request.requesterId, {
        type: payload.type as any,
        destination: payload.destination as any,
        payload: payload.payload as any,
        destinationConfig: payload.destinationConfig as any,
      });
      break;
    }

    case "integration_push": {
      // Handle integration push actions
      console.log(`Executing integration push for request ${request.id}`);
      break;
    }

    default:
      console.log(`Unknown action type: ${request.type}`);
  }
}

// ============================================================================
// SEED DEFAULT POLICIES
// ============================================================================

/**
 * Seed default approval policies
 */
export async function seedApprovalPolicies(): Promise<void> {
  const existingPolicies = await db.select().from(approvalPolicies);

  if (existingPolicies.length > 0) {
    return; // Already seeded
  }

  const defaultPolicies = [
    {
      name: "NPI Export",
      description: "Requires approval when exporting data containing NPI (National Provider Identifier)",
      triggerConditions: { action: "export", contains_npi: true },
      approverRoles: ["admin", "compliance"],
      autoExpireHours: 72,
    },
    {
      name: "Large Export",
      description: "Requires approval when exporting more than 500 HCP records",
      triggerConditions: { action: "export", hcp_count_above: 500 },
      approverRoles: ["admin", "manager"],
      autoExpireHours: 48,
    },
    {
      name: "External Push",
      description: "Requires approval for pushing data to external integrations",
      triggerConditions: { action: "integration_push" },
      approverRoles: ["admin"],
      autoExpireHours: 24,
    },
  ];

  for (const policy of defaultPolicies) {
    await db.insert(approvalPolicies).values(policy);
  }

  console.log("Seeded default approval policies");
}
