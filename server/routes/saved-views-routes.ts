import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import {
  savedViews,
  createSavedViewRequestSchema,
  updateSavedViewRequestSchema,
} from "@shared/schema";

export const savedViewsRouter = Router();

// ============================================================================
// LIST VIEWS BY TYPE
// GET /api/views?type=hcp_list
// ============================================================================

savedViewsRouter.get("/", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { type } = req.query;
    if (!type || typeof type !== "string") {
      return res.status(400).json({ error: "view type is required" });
    }

    const views = await db
      .select()
      .from(savedViews)
      .where(
        and(
          eq(savedViews.userId, userId),
          eq(savedViews.viewType, type)
        )
      )
      .orderBy(desc(savedViews.isDefault), desc(savedViews.updatedAt));

    const response = views.map((view) => ({
      id: view.id,
      userId: view.userId,
      name: view.name,
      viewType: view.viewType,
      filters: view.filters || {},
      columns: view.columns,
      sort: view.sort,
      isDefault: view.isDefault,
      shared: view.shared,
      createdAt: view.createdAt.toISOString(),
      updatedAt: view.updatedAt.toISOString(),
    }));

    res.json({ views: response, total: response.length });
  } catch (error) {
    console.error("Error fetching saved views:", error);
    res.status(500).json({ error: "Failed to fetch saved views" });
  }
});

// ============================================================================
// CREATE VIEW
// POST /api/views
// ============================================================================

savedViewsRouter.post("/", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = createSavedViewRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { name, viewType, filters, columns, sort, isDefault, shared } = parsed.data;

    // If setting as default, unset other defaults for this view type
    if (isDefault) {
      await db
        .update(savedViews)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(savedViews.userId, userId),
            eq(savedViews.viewType, viewType),
            eq(savedViews.isDefault, true)
          )
        );
    }

    const [view] = await db
      .insert(savedViews)
      .values({
        userId,
        name,
        viewType,
        filters: filters || {},
        columns: columns || null,
        sort: sort || null,
        isDefault: isDefault || false,
        shared: shared || false,
      })
      .returning();

    res.status(201).json({
      id: view.id,
      userId: view.userId,
      name: view.name,
      viewType: view.viewType,
      filters: view.filters || {},
      columns: view.columns,
      sort: view.sort,
      isDefault: view.isDefault,
      shared: view.shared,
      createdAt: view.createdAt.toISOString(),
      updatedAt: view.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating saved view:", error);
    res.status(500).json({ error: "Failed to create saved view" });
  }
});

// ============================================================================
// UPDATE VIEW
// PUT /api/views/:id
// ============================================================================

savedViewsRouter.put("/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const parsed = updateSavedViewRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(savedViews)
      .where(and(eq(savedViews.id, id), eq(savedViews.userId, userId)));

    if (!existing) {
      return res.status(404).json({ error: "View not found" });
    }

    const { name, filters, columns, sort, isDefault, shared } = parsed.data;

    // If setting as default, unset other defaults for this view type
    if (isDefault) {
      await db
        .update(savedViews)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(savedViews.userId, userId),
            eq(savedViews.viewType, existing.viewType),
            eq(savedViews.isDefault, true)
          )
        );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (filters !== undefined) updateData.filters = filters;
    if (columns !== undefined) updateData.columns = columns;
    if (sort !== undefined) updateData.sort = sort;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (shared !== undefined) updateData.shared = shared;

    const [updated] = await db
      .update(savedViews)
      .set(updateData)
      .where(eq(savedViews.id, id))
      .returning();

    res.json({
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      viewType: updated.viewType,
      filters: updated.filters || {},
      columns: updated.columns,
      sort: updated.sort,
      isDefault: updated.isDefault,
      shared: updated.shared,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating saved view:", error);
    res.status(500).json({ error: "Failed to update saved view" });
  }
});

// ============================================================================
// DELETE VIEW
// DELETE /api/views/:id
// ============================================================================

savedViewsRouter.delete("/:id", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(savedViews)
      .where(and(eq(savedViews.id, id), eq(savedViews.userId, userId)));

    if (!existing) {
      return res.status(404).json({ error: "View not found" });
    }

    await db.delete(savedViews).where(eq(savedViews.id, id));

    res.json({ success: true, deleted: id });
  } catch (error) {
    console.error("Error deleting saved view:", error);
    res.status(500).json({ error: "Failed to delete saved view" });
  }
});

// ============================================================================
// SET AS DEFAULT
// POST /api/views/:id/default
// ============================================================================

savedViewsRouter.post("/:id/default", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    // Verify ownership and get view type
    const [existing] = await db
      .select()
      .from(savedViews)
      .where(and(eq(savedViews.id, id), eq(savedViews.userId, userId)));

    if (!existing) {
      return res.status(404).json({ error: "View not found" });
    }

    // Unset all other defaults for this view type
    await db
      .update(savedViews)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(savedViews.userId, userId),
          eq(savedViews.viewType, existing.viewType),
          eq(savedViews.isDefault, true)
        )
      );

    // Set this one as default
    const [updated] = await db
      .update(savedViews)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(savedViews.id, id))
      .returning();

    res.json({
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      viewType: updated.viewType,
      filters: updated.filters || {},
      columns: updated.columns,
      sort: updated.sort,
      isDefault: updated.isDefault,
      shared: updated.shared,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error setting default view:", error);
    res.status(500).json({ error: "Failed to set default view" });
  }
});
