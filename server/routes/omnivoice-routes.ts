/**
 * Omni-Voice API Routes
 *
 * Enhanced mock backend for the Omni-Voice chat widget.
 * Provides health checks, streaming chat responses, and HCP data integration.
 *
 * NOTE: This is an enhanced mock implementation. For full AI capabilities,
 * see docs/OMNIVOICE-ROADMAP.md for Phase 2 implementation plan.
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import { hcps } from "@shared/schema";
import { ilike, or, eq } from "drizzle-orm";

export const omnivoiceRouter = Router();

// ============================================================================
// TYPES
// ============================================================================

interface ChatContext {
  page?: string;
  hcp?: {
    id?: string;
    name?: string;
    specialty?: string;
    tier?: string;
  };
  campaign?: {
    id?: string;
    name?: string;
  };
  therapeuticArea?: string;
  custom?: string;
}

interface HCPData {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  tier: string;
  overallEngagementScore: number;
  channelPreference: string | null;
  practiceType: string;
  city: string;
  state: string;
}

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
// HCP LOOKUP
// ============================================================================

async function findHCPByName(query: string): Promise<HCPData | null> {
  // Extract potential name parts from query
  const words = query.toLowerCase().split(/\s+/);
  const namePatterns: string[] = [];

  // Look for "Dr." or "Doctor" followed by a name
  for (let i = 0; i < words.length; i++) {
    if (words[i] === "dr." || words[i] === "dr" || words[i] === "doctor") {
      if (words[i + 1]) {
        namePatterns.push(words[i + 1]);
      }
    }
    // Also try any capitalized-looking words that might be names
    if (words[i].length > 2 && !["the", "and", "how", "can", "with", "for", "about", "what", "like"].includes(words[i])) {
      namePatterns.push(words[i]);
    }
  }

  if (namePatterns.length === 0) return null;

  // Search for HCPs matching any of the patterns
  const conditions = namePatterns.flatMap(pattern => [
    ilike(hcps.firstName, `%${pattern}%`),
    ilike(hcps.lastName, `%${pattern}%`),
  ]);

  const results = await db
    .select({
      id: hcps.id,
      firstName: hcps.firstName,
      lastName: hcps.lastName,
      specialty: hcps.specialty,
      tier: hcps.tier,
      overallEngagementScore: hcps.overallEngagementScore,
      channelPreference: hcps.channelPreference,
      practiceType: hcps.practiceType,
      city: hcps.city,
      state: hcps.state,
    })
    .from(hcps)
    .where(or(...conditions))
    .limit(1);

  return results[0] || null;
}

// ============================================================================
// RESPONSE TEMPLATES
// ============================================================================

const SPECIALTY_STRATEGIES: Record<string, string> = {
  pulmonologist: `**Pulmonologist Engagement Strategy**

Pulmonologists manage complex respiratory conditions and value clinical evidence. Here's how to maximize engagement:

**Key Insights:**
1. **Evidence-focused** - Lead with clinical trial data and real-world outcomes
2. **Peer-influenced** - Reference pulmonology KOL opinions and guidelines (GOLD, ATS)
3. **Time-pressured** - Respect clinic schedules, be concise and prepared

**Effective Channels:**
- Medical conferences (ATS, CHEST)
- Digital peer-to-peer programs
- Concise email summaries with data highlights
- In-clinic visits during administrative time

**Message Priorities:**
- Efficacy data for COPD/asthma management
- Safety profiles for long-term treatment
- Patient adherence support resources
- Real-world evidence from similar patient populations`,

  cardiologist: `**Cardiologist Engagement Strategy**

Cardiologists are data-driven specialists who value clinical rigor. Optimize your approach:

**Key Insights:**
1. **Outcomes-focused** - Emphasize cardiovascular outcomes data (MACE reduction)
2. **Guideline-aware** - Reference ACC/AHA guidelines and positioning
3. **Busy schedules** - Cath lab and procedure schedules limit availability

**Effective Channels:**
- ACC/AHA conferences and satellite symposiums
- Digital content (webinars during lunch/evenings)
- Peer-to-peer programs with respected KOLs
- Brief, scheduled in-person visits

**Message Priorities:**
- CV outcomes trial data
- Safety in high-risk populations
- Simplification of treatment regimens
- Cost-effectiveness for healthcare systems`,

  oncologist: `**Oncologist Engagement Strategy**

Oncologists have unique engagement preferences driven by complex treatment landscapes:

**Key Insights:**
1. **Data-driven** - Lead with clinical outcomes and real-world evidence
2. **Time-constrained** - Respect schedules, keep messages concise
3. **Peer-influenced** - Reference KOL opinions and conference presentations

**Best Channels:**
- Medical conferences (ASCO, ASH, ESMO)
- Peer-to-peer programs
- Digital content (webinars, on-demand)
- Brief in-person visits during clinic hours

**Message Priorities:**
- Survival and response rate data
- Quality of life improvements
- Biomarker and precision medicine aspects
- Supportive care integration`,

  neurologist: `**Neurologist Engagement Strategy**

Neurologists manage chronic, complex conditions requiring long-term relationships:

**Key Insights:**
1. **Science-oriented** - Deep interest in mechanism of action
2. **Patient-centered** - Focus on quality of life and disease modification
3. **Specialist networks** - Often part of MS/Parkinson's/headache centers

**Effective Channels:**
- AAN conference and regional meetings
- MS/movement disorder specialty conferences
- Digital education platforms
- Scheduled office visits (less time pressure than other specialties)

**Message Priorities:**
- Disease modification data
- Long-term safety profiles
- Patient support programs
- MRI/biomarker evidence`,

  default: `I understand you're asking about specialist engagement. Let me know which specialty you'd like strategies for:

- **Pulmonologists** - Respiratory disease management
- **Cardiologists** - Cardiovascular care
- **Oncologists** - Cancer treatment
- **Neurologists** - Neurological conditions
- **Endocrinologists** - Diabetes and metabolic disorders
- **Rheumatologists** - Autoimmune conditions

Or ask about a specific HCP by name if you'd like personalized recommendations.`,
};

const TOPIC_RESPONSES: Record<string, string> = {
  territory: `**Territory Prioritization Strategy**

When prioritizing a new territory, use this 3-tier framework:

**Tier 1 (High Priority - 60% of time):**
- High prescribers with growth potential
- Recent competitive switches (win-back opportunities)
- Strong engagement history and responsiveness

**Tier 2 (Medium Priority - 30% of time):**
- Moderate prescribers with positive trajectory
- New targets showing interest signals
- Academic leaders for influence building

**Tier 3 (Relationship Building - 10% of time):**
- Low current volume but high future potential
- New-to-practice physicians
- Residents about to graduate

**Action Items:**
1. Run territory analysis to identify top 20 Tier 1 targets
2. Review engagement history for recent activity signals
3. Cross-reference with competitive intelligence data
4. Build a 90-day contact plan with frequency by tier`,

  engagement: `**HCP Engagement Best Practices**

Driving meaningful engagement requires a multi-channel, personalized approach:

**Key Principles:**
1. **Right message** - Tailor content to specialty and patient population
2. **Right channel** - Use preferred communication methods (check HCP profiles)
3. **Right frequency** - Avoid over-saturation, respect preferences
4. **Right timing** - Align with clinical decision points

**High-Impact Tactics:**
- **Peer programs** - Leverage KOL influence for credibility
- **Digital touchpoints** - Webinars, on-demand content, email sequences
- **In-person visits** - Focus on high-value conversations
- **Conferences** - Targeted presence at specialty meetings

**Measurement:**
- Track engagement score trends over time
- Monitor channel preference shifts
- Measure conversion from engagement to prescribing
- Watch for saturation signals (declining response rates)`,

  access: `**Access Challenge Solutions**

Hard-to-see physicians require creative, value-first approaches:

**Common Barriers:**
- No-see policies or restricted access
- Limited time due to patient volume
- Gatekeepers (office staff, schedulers)
- Virtual-only preferences post-pandemic

**Proven Strategies:**

**1. Value-First Approach**
- Lead with patient support resources
- Offer practice efficiency tools
- Provide relevant clinical education

**2. Alternative Channels**
- Virtual meetings (often more accessible than in-person)
- Lunch-and-learns with the full office
- Conference booth appointments
- Peer-to-peer programs (they'll attend for CME)

**3. Gatekeeper Alignment**
- Build relationships with office staff
- Provide resources that help the whole practice
- Be respectful of scheduling constraints

**4. Digital First**
- Email with high-value content
- HCP portal engagement
- Targeted social media (LinkedIn, Doximity)`,

  competitive: `**Competitive Intelligence & Positioning**

Effective competitive positioning requires understanding the landscape:

**Competitive Assessment Framework:**
1. **Share of voice** - How much mind-share do competitors have?
2. **Prescribing trends** - Where is volume shifting?
3. **Message resonance** - What claims are landing?
4. **Channel presence** - Where are competitors active?

**Positioning Strategies:**

**When Behind:**
- Focus on differentiated clinical data
- Target dissatisfied competitor patients
- Highlight unique patient support programs
- Leverage KOL advocacy

**When Leading:**
- Reinforce leadership position with outcomes data
- Build deeper relationships with key accounts
- Expand into adjacent segments
- Maintain share of voice

**When New to Market:**
- Target unmet needs competitors don't address
- Focus on early adopters and innovators
- Build rapid awareness through high-impact channels
- Leverage launch excitement`,

  default: `I'm your field sales advisor with 20+ years of pharmaceutical experience. I can help you with:

**Strategy & Planning:**
- Territory prioritization and targeting
- Account planning for key HCPs
- Call planning optimization

**Engagement Tactics:**
- Specialty-specific engagement strategies
- Multi-channel approach recommendations
- Access solutions for hard-to-see physicians

**Intelligence:**
- Competitive positioning guidance
- Message delivery optimization
- Engagement trend analysis

**Ask me about:**
- A specific HCP by name for personalized recommendations
- Engagement strategies for a specialty
- Territory prioritization
- Competitive positioning

What would you like to discuss?`,
};

// ============================================================================
// RESPONSE GENERATION
// ============================================================================

function generateHCPResponse(hcp: HCPData, query: string): string {
  const engagementLevel = hcp.overallEngagementScore >= 70 ? "high" :
                          hcp.overallEngagementScore >= 40 ? "moderate" : "low";

  const tierDescription = hcp.tier === "Tier 1" ? "high-value target" :
                          hcp.tier === "Tier 2" ? "growth opportunity" : "relationship building";

  return `**Engagement Strategy for Dr. ${hcp.firstName} ${hcp.lastName}**

**Profile Summary:**
- **Specialty:** ${hcp.specialty}
- **Tier:** ${hcp.tier} (${tierDescription})
- **Practice Type:** ${hcp.practiceType}
- **Location:** ${hcp.city}, ${hcp.state}
- **Current Engagement Score:** ${hcp.overallEngagementScore}/100 (${engagementLevel})
- **Channel Preference:** ${hcp.channelPreference || "Not specified"}

**Recommended Approach:**

${getChannelRecommendation(hcp)}

${getEngagementStrategy(hcp, engagementLevel)}

**Next Steps:**
1. ${hcp.channelPreference === "Digital" ? "Send personalized email with relevant clinical content" : "Schedule in-person or virtual meeting"}
2. Review recent engagement history for conversation continuity
3. Prepare specialty-specific value proposition
4. Document interaction in CRM for follow-up tracking

Would you like me to elaborate on any aspect of this strategy?`;
}

function getChannelRecommendation(hcp: HCPData): string {
  switch (hcp.channelPreference) {
    case "Digital":
      return `**Channel Strategy (Digital Preference):**
- Primary: Email campaigns with clinical content
- Secondary: Webinar invitations and on-demand content
- Tertiary: Virtual 1:1 meetings for high-priority discussions`;
    case "In-Person":
      return `**Channel Strategy (In-Person Preference):**
- Primary: Scheduled office visits during optimal hours
- Secondary: Conference and medical meeting interactions
- Tertiary: Peer-to-peer program invitations`;
    case "Hybrid":
      return `**Channel Strategy (Hybrid Preference):**
- Primary: Mix of digital touchpoints and in-person visits
- Secondary: Virtual meetings for efficiency
- Tertiary: Conference presence for deeper engagement`;
    default:
      return `**Channel Strategy (Test & Learn):**
- Start with digital outreach to gauge responsiveness
- Follow up with in-person visit if digital response is positive
- Monitor engagement signals to identify preference`;
  }
}

function getEngagementStrategy(hcp: HCPData, level: string): string {
  if (level === "high") {
    return `**Engagement Strategy (High Engagement):**
This HCP is already well-engaged. Focus on:
- Maintaining regular touchpoints
- Deepening the relationship with advanced clinical discussions
- Exploring KOL/advocacy opportunities
- Protecting from competitive incursion`;
  } else if (level === "moderate") {
    return `**Engagement Strategy (Growth Opportunity):**
This HCP shows moderate engagement with room for growth:
- Increase touchpoint frequency strategically
- Identify specific content that resonates
- Address any barriers to deeper engagement
- Consider peer-to-peer program participation`;
  } else {
    return `**Engagement Strategy (Re-engagement Needed):**
This HCP has low engagement, requiring a fresh approach:
- Review past interactions for friction points
- Consider different channel or message approach
- Lead with high-value patient support resources
- Don't over-contact - quality over quantity`;
  }
}

function getResponse(message: string, context?: ChatContext): string {
  const lower = message.toLowerCase();

  // Check for specialty-specific queries
  if (lower.includes("pulmonolog") || lower.includes("respiratory") || lower.includes("copd") || lower.includes("asthma")) {
    return SPECIALTY_STRATEGIES.pulmonologist;
  }

  if (lower.includes("cardiolog") || lower.includes("heart") || lower.includes("cardiovascular")) {
    return SPECIALTY_STRATEGIES.cardiologist;
  }

  if (lower.includes("oncolog") || lower.includes("cancer") || lower.includes("tumor")) {
    return SPECIALTY_STRATEGIES.oncologist;
  }

  if (lower.includes("neurolog") || lower.includes("neuro") || lower.includes("brain") || lower.includes("ms ") || lower.includes("parkinson")) {
    return SPECIALTY_STRATEGIES.neurologist;
  }

  // Check for topic-specific queries
  if (lower.includes("territory") || lower.includes("prioritize") || lower.includes("new territory") || lower.includes("targeting")) {
    return TOPIC_RESPONSES.territory;
  }

  if (lower.includes("engag") || lower.includes("drive") || lower.includes("increase") || lower.includes("improve") || lower.includes("better")) {
    return TOPIC_RESPONSES.engagement;
  }

  if (lower.includes("access") || lower.includes("hard to see") || lower.includes("difficult") || lower.includes("no-see") || lower.includes("restricted")) {
    return TOPIC_RESPONSES.access;
  }

  if (lower.includes("compet") || lower.includes("position") || lower.includes("versus") || lower.includes("vs") || lower.includes("differentiat")) {
    return TOPIC_RESPONSES.competitive;
  }

  // Check for specialty engagement queries without specific specialty
  if (lower.includes("specialist") || lower.includes("specialty") || lower.includes("approach")) {
    return SPECIALTY_STRATEGIES.default;
  }

  return TOPIC_RESPONSES.default;
}

// ============================================================================
// CHAT ENDPOINT (SSE Streaming)
// ============================================================================

omnivoiceRouter.post("/chat", async (req: Request, res: Response) => {
  const { message, context, use_rag, use_mlr } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let response: string;
  let sources: Array<{ title: string; summary: string; similarity: number }> = [];

  // Try to find an HCP mentioned in the query
  const hcp = await findHCPByName(message);

  if (hcp) {
    // Generate personalized HCP response
    response = generateHCPResponse(hcp, message);
    sources = [
      {
        title: `HCP Profile: Dr. ${hcp.lastName}`,
        summary: `${hcp.specialty} - ${hcp.practiceType} - ${hcp.tier}`,
        similarity: 0.98,
      },
      {
        title: "Engagement History Analysis",
        summary: `Current engagement score: ${hcp.overallEngagementScore}/100`,
        similarity: 0.94,
      },
      {
        title: "Channel Preference Data",
        summary: hcp.channelPreference ? `Preferred: ${hcp.channelPreference}` : "Preference not specified",
        similarity: 0.89,
      },
    ];
  } else {
    // Generate topic-based response
    response = getResponse(message, context);
    sources = [
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
    ];
  }

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
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  // Send sources if RAG was requested
  if (use_rag) {
    const sourcesEvent = {
      type: "sources",
      sources,
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
