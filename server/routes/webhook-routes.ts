import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import {
  webhookDestinations,
  webhookLogs,
  insertWebhookDestinationSchema,
} from "@shared/schema";

export const webhookRouter = Router();

// ============================================================================
// WEBHOOK DESTINATIONS CRUD
// ============================================================================

/**
 * List webhook destinations for the current user
 * GET /api/webhooks
 */
webhookRouter.get("/", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const destinations = await db
      .select()
      .from(webhookDestinations)
      .where(eq(webhookDestinations.userId, userId))
      .orderBy(desc(webhookDestinations.createdAt));

    res.json({ webhooks: destinations });
  } catch (error) {
    console.error("Error listing webhooks:", error);
    res.status(500).json({ error: "Failed to list webhooks" });
  }
});

/**
 * Get a single webhook destination
 * GET /api/webhooks/:id
 */
webhookRouter.get("/:id", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const [webhook] = await db
      .select()
      .from(webhookDestinations)
      .where(
        and(
          eq(webhookDestinations.id, id),
          eq(webhookDestinations.userId, userId)
        )
      );

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    res.json(webhook);
  } catch (error) {
    console.error("Error getting webhook:", error);
    res.status(500).json({ error: "Failed to get webhook" });
  }
});

/**
 * Create a new webhook destination
 * POST /api/webhooks
 */
webhookRouter.post("/", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, url, method, headers, payloadTemplate, isActive } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: "Name and URL are required" });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    const [webhook] = await db
      .insert(webhookDestinations)
      .values({
        userId,
        name,
        url,
        method: method || "POST",
        headers: headers || {},
        payloadTemplate: payloadTemplate || null,
        isActive: isActive !== false,
      })
      .returning();

    res.status(201).json(webhook);
  } catch (error) {
    console.error("Error creating webhook:", error);
    res.status(500).json({ error: "Failed to create webhook" });
  }
});

/**
 * Update a webhook destination
 * PUT /api/webhooks/:id
 */
webhookRouter.put("/:id", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { name, url, method, headers, payloadTemplate, isActive } = req.body;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(webhookDestinations)
      .where(
        and(
          eq(webhookDestinations.id, id),
          eq(webhookDestinations.userId, userId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }
    }

    const [webhook] = await db
      .update(webhookDestinations)
      .set({
        ...(name !== undefined && { name }),
        ...(url !== undefined && { url }),
        ...(method !== undefined && { method }),
        ...(headers !== undefined && { headers }),
        ...(payloadTemplate !== undefined && { payloadTemplate }),
        ...(isActive !== undefined && { isActive }),
      })
      .where(eq(webhookDestinations.id, id))
      .returning();

    res.json(webhook);
  } catch (error) {
    console.error("Error updating webhook:", error);
    res.status(500).json({ error: "Failed to update webhook" });
  }
});

/**
 * Delete a webhook destination
 * DELETE /api/webhooks/:id
 */
webhookRouter.delete("/:id", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(webhookDestinations)
      .where(
        and(
          eq(webhookDestinations.id, id),
          eq(webhookDestinations.userId, userId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    // Delete logs first (foreign key constraint)
    await db
      .delete(webhookLogs)
      .where(eq(webhookLogs.destinationId, id));

    // Delete webhook
    await db
      .delete(webhookDestinations)
      .where(eq(webhookDestinations.id, id));

    res.json({ success: true, message: "Webhook deleted" });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    res.status(500).json({ error: "Failed to delete webhook" });
  }
});

// ============================================================================
// WEBHOOK TESTING & LOGS
// ============================================================================

/**
 * Test a webhook destination
 * POST /api/webhooks/:id/test
 */
webhookRouter.post("/:id/test", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    // Get webhook
    const [webhook] = await db
      .select()
      .from(webhookDestinations)
      .where(
        and(
          eq(webhookDestinations.id, id),
          eq(webhookDestinations.userId, userId)
        )
      );

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    // Build test payload
    const testPayload = renderPayloadTemplate(webhook.payloadTemplate, {
      hcps: [
        {
          id: "test-hcp-001",
          npi: "1234567890",
          firstName: "Test",
          lastName: "HCP",
          specialty: "Cardiology",
          tier: "Tier 1",
        },
      ],
      hcp_ids: ["test-hcp-001"],
      npis: ["1234567890"],
      audience_name: "Test Audience",
      export_date: new Date().toISOString(),
      export_id: "test-export-001",
    });

    let statusCode: number;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;

    try {
      const response = await fetch(webhook.url, {
        method: webhook.method || "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhook.headers || {}),
        },
        body: JSON.stringify(testPayload),
      });

      statusCode = response.status;
      responseBody = await response.text().catch(() => null);
    } catch (err) {
      statusCode = 0;
      errorMessage = err instanceof Error ? err.message : "Network error";
    }

    // Log the test
    await db.insert(webhookLogs).values({
      destinationId: webhook.id,
      exportJobId: null,
      statusCode,
      responseBody,
      errorMessage,
    });

    res.json({
      success: statusCode >= 200 && statusCode < 300,
      statusCode,
      responseBody: responseBody?.substring(0, 500), // Truncate for response
      errorMessage,
    });
  } catch (error) {
    console.error("Error testing webhook:", error);
    res.status(500).json({ error: "Failed to test webhook" });
  }
});

/**
 * Get webhook logs
 * GET /api/webhooks/:id/logs
 */
webhookRouter.get("/:id/logs", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { limit = "20", offset = "0" } = req.query;

    // Verify ownership
    const [webhook] = await db
      .select()
      .from(webhookDestinations)
      .where(
        and(
          eq(webhookDestinations.id, id),
          eq(webhookDestinations.userId, userId)
        )
      );

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const logs = await db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.destinationId, id))
      .orderBy(desc(webhookLogs.sentAt))
      .limit(parseInt(String(limit)))
      .offset(parseInt(String(offset)));

    res.json({ logs });
  } catch (error) {
    console.error("Error getting webhook logs:", error);
    res.status(500).json({ error: "Failed to get webhook logs" });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Render a payload template with variable substitution
 */
function renderPayloadTemplate(
  template: string | null,
  variables: Record<string, unknown>
): unknown {
  if (!template) {
    // Default template
    return {
      source: "TwinEngine",
      timestamp: variables.export_date,
      data: variables.hcps,
    };
  }

  // Simple variable substitution: {{variable}}
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const replacement =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), replacement);
  }

  try {
    return JSON.parse(rendered);
  } catch {
    // If template isn't valid JSON after substitution, return as-is
    return rendered;
  }
}

// Export for use in export-hub-service
export { renderPayloadTemplate };
