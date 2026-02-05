import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, approvalRequests, approvalPolicies } from "@shared/schema";
import {
  checkApprovalRequired,
  createApprovalRequest,
  getApprovalRequest,
  listApprovalRequests,
  processApproval,
  cancelApprovalRequest,
  listApprovalPolicies,
  getPendingApprovalCount,
} from "../services/approval-service";

export const approvalRouter = Router();

// ============================================================================
// APPROVAL REQUESTS
// ============================================================================

/**
 * List approval requests
 * GET /api/approvals
 * Query params: status, role (requester|approver), limit, offset
 */
approvalRouter.get("/", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { status, role = "requester", limit, offset } = req.query;

    const result = await listApprovalRequests(userId, {
      status: status as any,
      asApprover: role === "approver",
      limit: limit ? parseInt(String(limit)) : undefined,
      offset: offset ? parseInt(String(offset)) : undefined,
    });

    // Enrich with requester/approver names
    const enrichedRequests = await Promise.all(
      result.requests.map(async (request) => {
        const [requester] = await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(eq(users.id, request.requesterId));

        let approver = null;
        if (request.approverId) {
          const [approverData] = await db
            .select({ id: users.id, username: users.username })
            .from(users)
            .where(eq(users.id, request.approverId));
          approver = approverData;
        }

        let policy = null;
        if (request.policyId) {
          const [policyData] = await db
            .select()
            .from(approvalPolicies)
            .where(eq(approvalPolicies.id, request.policyId));
          policy = policyData;
        }

        return {
          ...request,
          requester,
          approver,
          policy: policy ? { id: policy.id, name: policy.name } : null,
        };
      })
    );

    res.json({
      requests: enrichedRequests,
      total: result.total,
    });
  } catch (error) {
    console.error("Error listing approvals:", error);
    res.status(500).json({ error: "Failed to list approvals" });
  }
});

/**
 * Get pending approval count (for badge)
 * GET /api/approvals/count
 */
approvalRouter.get("/count", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const count = await getPendingApprovalCount(userId);
    res.json({ count });
  } catch (error) {
    console.error("Error getting approval count:", error);
    res.status(500).json({ error: "Failed to get approval count" });
  }
});

/**
 * Get approval request details
 * GET /api/approvals/:id
 */
approvalRouter.get("/:id", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const request = await getApprovalRequest(id, userId);

    if (!request) {
      return res.status(404).json({ error: "Approval request not found" });
    }

    // Enrich with names
    const [requester] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.id, request.requesterId));

    let approver = null;
    if (request.approverId) {
      const [approverData] = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(eq(users.id, request.approverId));
      approver = approverData;
    }

    let policy = null;
    if (request.policyId) {
      const [policyData] = await db
        .select()
        .from(approvalPolicies)
        .where(eq(approvalPolicies.id, request.policyId));
      policy = policyData;
    }

    res.json({
      ...request,
      requester,
      approver,
      policy,
    });
  } catch (error) {
    console.error("Error getting approval:", error);
    res.status(500).json({ error: "Failed to get approval" });
  }
});

/**
 * Approve a request
 * POST /api/approvals/:id/approve
 */
approvalRouter.post("/:id/approve", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { notes } = req.body;

    const request = await processApproval(id, userId, "approved", notes);

    res.json({
      success: true,
      message: "Request approved",
      request,
    });
  } catch (error) {
    console.error("Error approving request:", error);
    res.status(400).json({
      error: "Failed to approve request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Reject a request
 * POST /api/approvals/:id/reject
 */
approvalRouter.post("/:id/reject", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const request = await processApproval(id, userId, "rejected", notes);

    res.json({
      success: true,
      message: "Request rejected",
      request,
    });
  } catch (error) {
    console.error("Error rejecting request:", error);
    res.status(400).json({
      error: "Failed to reject request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Cancel a request (by requester)
 * POST /api/approvals/:id/cancel
 */
approvalRouter.post("/:id/cancel", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const request = await cancelApprovalRequest(id, userId);

    res.json({
      success: true,
      message: "Request cancelled",
      request,
    });
  } catch (error) {
    console.error("Error cancelling request:", error);
    res.status(400).json({
      error: "Failed to cancel request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// APPROVAL POLICIES (Admin)
// ============================================================================

/**
 * List approval policies
 * GET /api/approvals/policies
 */
approvalRouter.get("/policies/list", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check admin role
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const policies = await listApprovalPolicies();
    res.json({ policies });
  } catch (error) {
    console.error("Error listing policies:", error);
    res.status(500).json({ error: "Failed to list policies" });
  }
});

/**
 * Toggle policy enabled status
 * POST /api/approvals/policies/:id/toggle
 */
approvalRouter.post("/policies/:id/toggle", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check admin role
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    // Get current state
    const [policy] = await db
      .select()
      .from(approvalPolicies)
      .where(eq(approvalPolicies.id, id));

    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }

    // Toggle
    const [updated] = await db
      .update(approvalPolicies)
      .set({ enabled: !policy.enabled })
      .where(eq(approvalPolicies.id, id))
      .returning();

    res.json({
      success: true,
      policy: updated,
    });
  } catch (error) {
    console.error("Error toggling policy:", error);
    res.status(500).json({ error: "Failed to toggle policy" });
  }
});

// ============================================================================
// APPROVAL CHECK ENDPOINT
// ============================================================================

/**
 * Check if action requires approval
 * POST /api/approvals/check
 */
approvalRouter.post("/check", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { action, context } = req.body;

    if (!action) {
      return res.status(400).json({ error: "Action is required" });
    }

    const result = await checkApprovalRequired(userId, action, context || {});
    res.json(result);
  } catch (error) {
    console.error("Error checking approval:", error);
    res.status(500).json({ error: "Failed to check approval" });
  }
});

/**
 * Create approval request
 * POST /api/approvals/request
 */
approvalRouter.post("/request", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { policyId, type, payload, justification } = req.body;

    if (!policyId || !type || !payload) {
      return res.status(400).json({
        error: "policyId, type, and payload are required",
      });
    }

    const request = await createApprovalRequest(
      userId,
      policyId,
      type,
      payload,
      justification
    );

    res.status(201).json(request);
  } catch (error) {
    console.error("Error creating approval request:", error);
    res.status(500).json({
      error: "Failed to create approval request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
