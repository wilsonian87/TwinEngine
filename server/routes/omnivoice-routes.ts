/**
 * Omni-Voice API Routes
 *
 * Mock backend for the Omni-Voice chat widget.
 * Provides health checks and streaming chat responses.
 */

import { Router, Request, Response } from "express";

export const omnivoiceRouter = Router();

// ============================================================================
// HEALTH CHECK
// ============================================================================

omnivoiceRouter.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    agent_ready: true,
    rag_available: true,
    mlr_available: true,
  });
});

// ============================================================================
// CLEAR HISTORY
// ============================================================================

omnivoiceRouter.post("/clear", (req: Request, res: Response) => {
  res.json({ success: true });
});

// ============================================================================
// CHAT ENDPOINT (SSE Streaming)
// ============================================================================

const SALES_ADVISOR_RESPONSES: Record<string, string> = {
  territory: `Great question! When prioritizing a new territory, I recommend a 3-tier approach:

**Tier 1 (High Priority):**
- High prescribers with growth potential
- Recent competitive switches
- Strong engagement history

**Tier 2 (Medium Priority):**
- Moderate prescribers
- New targets showing interest
- Academic leaders for influence

**Tier 3 (Build Relationships):**
- Low current volume but high potential
- New-to-practice physicians
- Residents about to graduate

Focus 60% of your time on Tier 1, 30% on Tier 2, and 10% on Tier 3 for long-term pipeline.`,

  oncologist: `Oncologists have unique engagement preferences:

**Key Insights:**
1. **Data-driven** - Lead with clinical outcomes and real-world evidence
2. **Time-constrained** - Respect their schedules, keep messages concise
3. **Peer-influenced** - Reference KOL opinions and conference presentations

**Best Channels:**
- Medical conferences and symposiums
- Peer-to-peer programs
- Digital content (webinars, on-demand)
- Brief in-person visits during clinic hours

**Avoid:**
- Cold calls without appointment
- Lengthy promotional materials
- Generic messaging

What specific therapeutic area are you targeting?`,

  default: `I'm your field sales advisor with 20+ years of pharmaceutical experience. I can help you with:

- **Territory prioritization** - Who to focus on first
- **HCP engagement strategies** - Best approaches for different specialties
- **Competitive intelligence** - How to position against competitors
- **Access challenges** - Tips for hard-to-see physicians
- **Message delivery** - What resonates with different segments

What would you like to discuss today?`,
};

function getResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("territory") || lower.includes("prioritize") || lower.includes("new territory")) {
    return SALES_ADVISOR_RESPONSES.territory;
  }

  if (lower.includes("oncolog") || lower.includes("cancer")) {
    return SALES_ADVISOR_RESPONSES.oncologist;
  }

  return SALES_ADVISOR_RESPONSES.default;
}

omnivoiceRouter.post("/chat", async (req: Request, res: Response) => {
  const { message, context, use_rag, use_mlr } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const response = getResponse(message);
  const words = response.split(" ");

  // Stream response word by word
  for (let i = 0; i < words.length; i++) {
    const chunk = words[i] + (i < words.length - 1 ? " " : "");
    const event = {
      type: "chunk",
      content: chunk,
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);

    // Small delay for streaming effect
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  // Send sources if RAG was requested
  if (use_rag) {
    const sourcesEvent = {
      type: "sources",
      sources: [
        {
          title: "Field Sales Best Practices Guide",
          summary: "Internal training documentation on HCP engagement",
          similarity: 0.92,
        },
        {
          title: "Territory Management Playbook",
          summary: "Strategies for effective territory coverage",
          similarity: 0.87,
        },
      ],
    };
    res.write(`data: ${JSON.stringify(sourcesEvent)}\n\n`);
  }

  // Send completion
  const completeEvent = {
    type: "complete",
    mlrModified: false,
    complianceIssue: null,
  };
  res.write(`data: ${JSON.stringify(completeEvent)}\n\n`);

  res.end();
});
