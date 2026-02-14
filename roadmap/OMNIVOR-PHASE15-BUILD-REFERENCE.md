# OMNIVOR — Phase 15+ Integrated Build Reference

> **Status:** Active Build Document  
> **Created:** 2026-02-11  
> **Sources:** Design Analogues Map, Design Analogues Supplement, Dual-Mode Architecture, Completion Animation Prototype  
> **Purpose:** Single source of truth for the next phased build — every module's design intent, Discover/Direct mode specs, prioritized "steals," and implementation notes.

---

## How to Use This Document

Each module section contains four layers:

1. **UX Verb & Design Intent** — What the module is *for* at a human level
2. **Discover / Direct Mode Specs** — What renders in each mode (from DUAL-MODE-ARCHITECTURE.md)
3. **Design Analogues** — Specific patterns to steal, with impact/complexity ratings
4. **Build Notes** — Implementation guidance, component references, and CC CLI instructions

### Grading Key

| Dimension | Scale | Meaning |
|-----------|-------|---------|
| **Impact** | ★☆☆ to ★★★ | Differentiation from pharma-standard UX |
| **Complexity** | 🔧 to 🔧🔧🔧 | Implementation effort to adapt the pattern |

### Priority Tiers

- **P0** — Build in Phase 15 Leg 1. Highest ROI (★★★ impact, 🔧–🔧🔧 complexity).
- **P1** — Build in Phase 15 Leg 2. High impact or enables P0 features.
- **P2** — Phase 16+. Ambitious or dependent on engine-level changes.

---

## Architecture Foundation: Discover / Direct Mode System

Before building any module, the mode infrastructure must exist.

### Core Concept

| | **Discover Mode** | **Direct Mode** |
|---|---|---|
| **User** | Analysts, data-curious marketers, strategists | Brand leads, field managers, executives |
| **Ethos** | "Let me dig in and find the story" | "Tell me the story and what to do about it" |
| **Design analogy** | The workshop — tools everywhere | The gallery — everything chosen, nothing wasted |
| **Information philosophy** | Show the data, let me decide | Show less than you know, lead with judgment |

### The Curation Principle

Direct Mode embodies OmniVor's core differentiator: **every screen shows less than it knows.** The act of restraint — choosing what *not* to show — is the product intelligence. Discover Mode provides the escape hatch.

### Brand Alignment

- **Discover** = The forager. Patient, thorough, finds value in the process.
- **Direct** = The hunter. Decisive, focused, values speed and certainty.
- Both are OmniVOR. The platform metabolizes complexity either way — one lets you watch the digestion, the other hands you the nutrients.

### Mode Toggle

- Global nav, persistent across sessions (stored in user preferences)
- Clean segmented control: `[ Discover | Direct ]`
- Route stays the same; page component renders the appropriate variant
- No data loss on switch — filters, selections, state persist
- Transition: gentle crossfade (200–300ms)
- First-time tooltip: "Discover shows you everything. Direct shows you what matters."
- Default new users to **Direct Mode**

### CC CLI Preservation Rules

**No Overwrites, Only Alternatives.** Existing components are implicitly Discover Mode. New Direct Mode components use a `-direct` suffix:

```
# Existing (DO NOT MODIFY without explicit instruction)
client/src/pages/action-queue.tsx
client/src/pages/audience-builder.tsx
client/src/pages/hcp-explorer.tsx

# New (create alongside existing)
client/src/pages/action-queue-direct.tsx
client/src/pages/audience-builder-direct.tsx
client/src/pages/hcp-explorer-direct.tsx
```

**Mode-Aware Page Router:**

```typescript
// client/src/lib/mode-context.tsx
export type PlatformMode = 'discover' | 'direct';

export const ModeContext = React.createContext<{
  mode: PlatformMode;
  setMode: (mode: PlatformMode) => void;
}>({ mode: 'direct', setMode: () => {} });
```

```typescript
// client/src/components/mode-page.tsx
export function ModePage({ 
  discover: DiscoverComponent, 
  direct: DirectComponent 
}: { 
  discover: React.ComponentType; 
  direct: React.ComponentType; 
}) {
  const { mode } = useMode();
  return mode === 'discover' ? <DiscoverComponent /> : <DirectComponent />;
}
```

**Shared State:** Both modes share API endpoints, React Query cache, filter state, selection state, and navigation context. Mode affects only **presentation and information density**, never data access or business logic.

**Component Extraction Before Modification:**

```bash
# Step 1: Extract shared logic FIRST → hooks/use-[module]-data.ts
# Step 2: Refactor existing component to use shared hook (minimal changes)
# Step 3: Build Direct Mode component using same shared hook
```

**Preservation Checklist (before every build session):**
- [ ] Existing page component file is untouched
- [ ] New `-direct` variant is a separate file
- [ ] Shared hooks and data-fetching logic extracted (not duplicated)
- [ ] Mode toggle state persists in user preferences
- [ ] Both modes accessible — Discover never disabled

### Future: Remix Mode (Phase 16+)

Per-module Discover/Direct preference. Simple map from module name to mode. No plugin system needed.

```typescript
export interface RemixConfig {
  hcpExplorer: 'discover' | 'direct';
  audienceBuilder: 'discover' | 'direct';
  // ... all modules
}
```

---

## Module 1: Action Queue

**UX Verb:** Triage — making fast, confident decisions on a stream of recommendations

### Current State Problem

Visual monotony. Every row shows ~90% confidence, "High" urgency, "Expand" action. When everything is high priority, nothing is. The Reasoning column truncates to uselessness. The flat list of 1,610 actions is paralyzing.

**Cross-cutting prerequisite:** Before investing in UI, the NBO engine's scoring needs recalibration so recommendations have genuine variance — a power-law distribution with a few critical items, a medium bucket, and a long tail. UI investment and engine calibration should happen in parallel.

### Discover / Direct Mode Specs

| Element | Discover | Direct |
|---------|----------|--------|
| Layout | Full table, all columns sortable | **Things 3 temporal buckets**: Act Now / This Week / Backlog |
| Card density | Dense table rows | Breathing-room cards for Act Now; compact rows for lower buckets |
| Reasoning | Full text visible in table | Full reasoning on card; expandable Evidence panel (Channel Health, CPI, MSI) |
| Bulk actions | Multi-select with checkboxes | Same + keyboard triage shortcuts |
| Completion UX | Row disappears | **Animated completion** with Intake Diamond micro-interaction + progress counter |
| Daily Brief | Not available | **Wordle pattern**: "You have 5 critical decisions today" focused review mode |
| Filters | All dropdowns | Pre-set to Act Now bucket; manual override available |

### Design Analogues

#### P0: Things 3 — Temporal Bucketing ★★★ / 🔧🔧

The fix for "1,610 actions" → "12 actions for today."

**Steal:**
- **"Today / Upcoming / Someday" buckets** → "Act Now" (high urgency + high confidence), "This Week" (medium urgency), "Backlog" (low urgency, exploratory). Show 10–15 in Act Now; deeper buckets pull-on-demand.
- **Spatial breathing room.** Act Now uses cards with full context; lower buckets use compact rows. Tables are for scanning; cards are for deciding.
- **Project grouping.** Group by Channel, HCP Tier, Action Type, or Therapeutic Area. Different groupings serve different workflows (field rep → by HCP, brand manager → by channel).
- **Completion animation.** Deeply satisfying micro-interaction when approving/rejecting. Row slides away, counter updates, progress feels tangible.

#### P0: Linear — Keyboard Triage ★★★ / 🔧🔧

**Steal:**
- **Keyboard-first everything.** `↑↓` navigate, `A` approve, `R` reject, `D` defer, `Space` expand details, `Enter` open HCP profile. Subtle keyboard hint bar at bottom.
- **Saved views.** "My Tier 1 Actions," "Email Channel Only," "Deferred for Review" — persist across sessions.
- **Sub-grouping with counts.** `📧 Email (423) · 🎥 Webinar (312) · 📞 Phone (289)` — collapsible groups showing queue shape.
- **Named "Triage Mode."** Explicit entry: keyboard shortcuts activate, queue narrows to unreviewed, progress bar appears. Completion: "Queue clear. 47 approved, 12 deferred, 3 rejected."

#### P1: NYT Wordle / Daily Brief ★★★ / 🔧🔧

**Steal:**
- **Daily Brief ritual.** Top 5 highest-impact recommendations, framed as a bounded session: "5 critical decisions today. ~3 minutes." Track the streak: "14 days in a row."
- **Focus Mode.** One recommendation full-screen: HCP profile left, rationale center, supporting evidence right. All clues, one decision.
- **"Hard Mode" training toggle.** System shows recommendation *without* the suggested action; user decides first, then sees NBO's pick. "You agreed 78% of the time. When you disagreed, your alternative was better 31%." Builds trust and intuition.
- **Post-session debrief.** "Today: 4 approved, 1 deferred. Targets 3 Tier 1 HCPs across 2 channels. Estimated impact: +12 engagement points."

#### P0: Superhuman — Speed of Decision ★★★ / 🔧🔧

**Steal:**
- **Split inbox by confidence.** High Confidence actions top, Exploratory bottom. Never evaluate a flat list.
- **Progress psychology.** "47 of 82 recommendations reviewed" with completion bar. Inbox-zero satisfaction.

#### P1: Tinder — Binary Decision at Speed ★★☆ / 🔧

**Steal:**
- **One-at-a-time card view.** Full context per recommendation; force a decision before next. Prevents "I'll review later" procrastination.
- **Undo gesture.** Brief undo window after approve/reject. Reduces decision anxiety.
- **Batch vs. Focus toggle.** Table view for obvious batch decisions; card view for complex evaluation.

### Build Notes: Completion Animation Component

A working prototype exists as `omnivor-completion-animation.jsx`. Key components:

- **IntakeDiamond** — Brand mark (outer diamond stroke, inner diamond fill, center dot) used as completion checkbox. Transitions from purple-idle to gold-active.
- **ParticleBurst** — 6 particles (alternating gold/purple) burst on completion.
- **ActionCard** — Card layout with HCP name, urgency badge, recommendation text, confidence bar, hover-reveal actions (Approve/Defer/Reject).
- **ProgressBar** — Shows `{reviewed} of {total} reviewed` with approved/deferred/rejected counts. Bar fills purple → purple-to-gold gradient at 100%.
- **QueueClearCelebration** — Full-screen celebration with enlarged IntakeDiamond: "Queue clear. All critical actions reviewed · 14-day streak 🔥"
- **Keyboard hint bar** — Fixed bottom: `A Approve · D Defer · R Reject · ↑↓ Navigate`

**Color constants:** `PURPLE: #6b21a8`, `PURPLE_LIGHT: #7c3aed`, `GOLD: #d97706`, `GOLD_LIGHT: #f59e0b`

**Animation keyframes:** `omni-particle` (burst outward + fade), `omni-fadeUp`, `omni-scaleIn`, `omni-shimmer`

This prototype is the reference implementation for the Direct Mode Action Queue card experience.

---

## Module 2: HCP Explorer

**UX Verb:** Discovery — browsing individual entities to build understanding

### Current State Problem

Cards are functional but uniform — same layout, same visual weight, same information density. Nothing makes one HCP "pop" over another. The user must read each card's metadata to evaluate. Nothing is scannable at a glance.

### Discover / Direct Mode Specs

| Element | Discover | Direct |
|---------|----------|--------|
| Card layout | Current full card with all metadata | **Airbnb-style**: sparkline hero, behavioral badges, engagement letter grade, quick-save gesture |
| Filtering | Full Manual Filters panel | Simplified smart filters + NLQ prominently featured |
| Profile drawer | Full data: all metrics, all engagement history, raw tables | Curated: key story, trend summary, top recommendation, similar HCPs |
| Bulk actions | Multi-select, CSV export, create audience, compare | Multi-select, create audience (fewer steps) |
| Data export | Full CSV/JSON with all fields | Summary export only |
| Pagination | Standard table pagination | Infinite scroll with progressive loading |

### Design Analogues

#### P0: Airbnb — The Card That Sells ★★★ / 🔧🔧

**Steal:**
- **Sparkline hero.** Lead each card with a compact engagement trend over last 6 months (rising/stable/declining). Instantly differentiates cards without reading text.
- **Behavioral badges.** Beyond Tier and Segment: `🔥 Rising Engagement`, `⚠️ At Risk`, `🎯 High Converter`, `🆕 New to Territory`. Primary visual differentiator between cards.
- **Competitive urgency signals.** Card-level: `⚡ Competitor activity detected` or `📈 3 other brands targeting`.
- **Engagement score as rating.** Small radial gauge or letter grade alongside the number. "A- (56)" is instantly comparable; "56 Engagement" is not.
- **Quick-save gesture.** Heart/bookmark icon → add to audience without leaving Explorer. One tap, choose audience, done.

#### P0: Zillow/Redfin — Property Exploration ★★★ / 🔧🔧

**Steal:**
- **Map + list hybrid view.** Split view (map left, list right) for geographic HCP browsing. Critical for field reps planning territory visits.
- **"Favoriting" vs. "Saving."** Lightweight star gesture for bookmarking during exploration, separate from "Create Audience" (intent).
- **Progressive disclosure profile scroll.** Key metrics → Engagement timeline → Channel affinity → Competitive pressure → Similar HCPs.
- **"Similar HCPs" / Lookalikes.** Bottom of every profile drawer — keeps the exploration loop going.

#### P1: VRBO — Match Reasoning ★★☆ / 🔧–🔧🔧

**Steal:**
- **"Why am I seeing this?" one-liner.** On every card in search/audience results: "Matched: Tier 1 Oncologist with declining email engagement." Turns Explorer from database browser into intelligent recommendation surface.
- **Match % concept.** When active filters/NLQ exist, show match score per card: "92% match." Helps with fuzzy NLQ results.
- **Compare tray.** Persistent bottom tray accumulating selected HCPs with "Compare These" button → mini-comparison without leaving Explorer.
- **"Similar HCPs" + "Often grouped with."** In expanded profile: same specialty/tier HCPs and frequently co-audienced HCPs.

#### P1: Hinge — Proactive Intelligence ★★☆ / 🔧🔧

**Steal:**
- **"Recommended for You" daily.** Top 3 HCPs based on user's recent audience-building and simulation patterns. Transforms Explorer from passive search to proactive recommendation.
- **Micro-tag on add.** When adding HCP to audience: "Added for: high conversion potential." Tags accumulate as audience metadata; filter audience by "why added." Self-documenting audiences.
- **"Standouts" flagging.** Visually distinguish outlier HCPs: Tier 3 with rising engagement, Tier 1 with sudden competitive pressure spike. The strategic gold.

#### P1: Discogs — Multi-Lens Profiles ★★☆ / 🔧🔧

**Steal:**
- **CPI as prominent market signal.** Like Discogs' "Last Sold" price — external signals layered onto HCP profiles. Make Competitive Pressure Index as intuitive as market data.
- **Lens-switching on profiles.** Toggle between engagement by therapeutic area, by time period, by campaign context. Same HCP, different "versions."
- **Collection as identity.** Saved Audiences panel should feel like a curated collection, not a file manager.

---

## Module 3: Audience Builder

**UX Verb:** Curation — building a list where composition matters

### Discover / Direct Mode Specs

| Element | Discover | Direct |
|---------|----------|--------|
| NLQ panel | Current layout with Refine/Parse, examples | NLQ as hero element, larger input, AI recommendations prominent |
| Manual Filters | Full panel expanded by default | Collapsed by default, expand on demand |
| Live Preview | Current table/list with all columns | Card grid (Airbnb pattern) with sparklines and badges |
| Saved Audiences | List with HCP counts + Simulate buttons | Enhanced cards with visual thumbnails (tier mosaic, sparkline), lifecycle badges (Active/Draft/Archived) |
| Stats bar | Total HCPs, Avg Engagement, Tier Split, Growth Potential | AI narrative: "2,500 HCPs. Engagement trending up 8%. Strongest: High Prescribers in Oncology." |
| Channel Health | Full expandable section | Collapsed; surfaced only on anomaly detection |

### Design Analogues

#### P0: Spotify — Playlist Creation ★★★ / 🔧🔧

**Steal:**
- **Persistent "Add to Queue" staging area.** Browse HCPs via Explorer, NLQ, or recommendations and accumulate into an audience without leaving context. Persistent across sessions and modules.
- **Smart Playlists / Auto-generated audiences.** "Based on your simulation results, here's a 'Reactivation Candidates' audience you haven't saved yet."
- **Collaborative audiences.** Multiple brand managers contributing to shared audiences with real-time visibility.
- **Cover art as identity.** Auto-generated visual thumbnails for saved audiences: specialty-color mosaic, tier distribution sparkline. Makes Saved Audiences feel like a collection.

#### P1: Letterboxd — Audience Lifecycle ★★☆ / 🔧

**Steal:**
- **Lifecycle states.** Draft → Active → Completed → Archived. Distinction between "targeting now" vs. "used in past campaigns."
- **"Add from anywhere" button.** On every HCP card, profile drawer, explorer row, simulation result. As frictionless as a bookmark.
- **Social proof.** "This HCP appears in 3 of your active audiences" — signals strategic concentration or potential over-targeting.

#### P2: Are.na — Intellectual Curation ★★☆ / 🔧

**Steal:**
- **Multi-audience membership visibility.** When viewing an HCP, show all audiences they belong to.
- **Annotation on inclusion.** Quick note when adding: "Added because she bridges nephrology and cardiology." Transforms audience from list into strategic document.
- **Audience overlap visualization.** Lightweight Venn showing intersection between audiences.

---

## Module 4: Audience Comparison

**UX Verb:** Juxtaposition — understanding difference through side-by-side contrast

### Current State Problem

Solid analytical bones (Overlap Analysis, Metrics Table, distribution charts) but the experience is flat. Every metric gets equal visual weight. Answers "what's different?" but not "so what?" or "what should I do?"

### Discover / Direct Mode Specs

| Element | Discover | Direct |
|---------|----------|--------|
| Header | Cohort selectors + Quick Presets | Same + **AI Verdict Banner**: synthesized 2–3 sentence narrative |
| Overlap | Numeric display | Same + Venn diagram micro-visualization |
| Metrics table | Full table, all rows | **Progressive-style impact translation** per difference + explainability tooltip |
| Distributions | All 4 charts visible | Top 2 most divergent; others collapsed under "Show more" |
| Post-comparison CTA | Export Report | "Use for Simulation" / "Merge into New Audience" / "Compare with another" |

### Design Analogues

#### P0: NerdWallet — Verdict + Narrative ★★★ / 🔧🔧

**Steal:**
- **Verdict banner.** Before any data, a characterization: "Priority HCPs w/ Low Email Response is your **high-volume, broad-reach** audience. TX Webinar Engagers is your **high-engagement, concentrated** audience."
- **"Our Take" editorial layer.** AI-generated narrative between selectors and metrics table: "These audiences overlap by only 4% (64 HCPs)... TX Webinar Engagers shows 14.9% higher conversion despite being 23× smaller, ideal for high-touch pilots." Data table becomes *evidence* for the narrative.
- **"Winner" badges per dimension.** Visual highlight per metric row showing which audience wins. Eye scans left edge: "A wins 4, B wins 3."
- **Smart follow-up comparisons.** "You might also compare TX Webinar Engagers against Movable High Tier (similar size, different strategy)."

#### P0: Progressive — Impact Translation ★★★ / 🔧🔧

**Steal:**
- **"You could save" framing.** Not "+6.9 engagement" but "TX Webinar Engagers scores **14% higher**. Applied to 1,000 HCPs, this could mean ~69 additional engaged providers." Make differences tangible.
- **"Why is this different?" explainability.** Per-metric explanations: "Conversion Likelihood 14.9 points higher, likely driven by Tier 1 concentration (48% vs 31%) and webinar affinity."
- **"What matters to you" toggle.** Priority selector (Reach | Engagement | Conversion | Efficiency) that reorders and emphasizes metrics accordingly.
- **"Customize and re-compare" loop.** "What if I remove Tier 3 from Audience A?" → comparison updates dynamically. Inline audience refinement within comparison view.

#### P1: Google Flights — Tradeoff Visualization ★★☆ / 🔧🔧

**Steal:**
- **Tradeoff scatter plot.** 2×2 matrix, axes = user's two most important metrics. Each dot is an HCP, color-coded by audience. Instantly reveals strategic quadrants.
- **"Best for" tabs.** "Best for Reach" | "Best for Engagement" | "Best for ROI" — each highlights winner under that strategic lens.
- **"Watch" an audience.** "Notify me if Movable High Tier's engagement changes by >5 points." One-time comparison → ongoing intelligence.

#### P1: Apple Product Comparison ★★☆ / 🔧

**Steal:**
- **Highlight divergence, mute similarity.** Visually amplify differences (bold, color, size); suppress what's the same.
- **Sticky header.** Audience names pinned while scrolling comparison dimensions.
- **"Choose for me" CTA.** Comparison ends with action: "Use Audience A for Simulation" or "Merge into New Audience."

#### P2: Fantasy Sports Matchup ★★☆ / 🔧🔧

**Steal:**
- **Head-to-head per dimension.** Green/red win/loss visual per metric row.
- **Projected outcome.** "If simulated, Audience A projects 18% higher engagement lift." Connects comparison to Simulation Studio.

---

## Module 5: Dashboard

**UX Verb:** Orientation — understanding the state of the world at a glance

### Discover / Direct Mode Specs

| Element | Discover | Direct |
|---------|----------|--------|
| Layout | Full metric grid, all KPIs | **Stripe pattern**: single hero metric + narrative insight + supporting metrics |
| Charts | All charts, interactive drill-down | Top 2–3 only; "Explore more" for rest |
| Narrative | None | **Strava/Wrapped**: AI-generated insight paragraph |
| Drill-down | Click metric → filtered Explorer | Same + contextual recommendation: "Engagement dipped in Rheumatology. View 12 affected HCPs →" |

### Design Analogues

#### P0: Stripe Dashboard — Calm Density ★★★ / 🔧

**Steal:**
- **Single hero metric.** One number answers "Are we winning?" — Engagement Health Score or Portfolio Engagement Velocity.
- **Contextual time comparisons.** "+12.4% vs. last period" inline on every metric. Always show the delta.
- **The calm density.** Enormous data, compact space. Subtle borders, consistent type hierarchy, generous whitespace. No drop shadows. No screaming metrics. Restraint = "we're in control."

#### P0: Strava/Spotify Wrapped — Narrative Data ★★★ / 🔧🔧

**Steal:**
- **Insight sentences.** Not "Avg Engagement: 43" but "Engagement is up 12% since Q3, driven primarily by webinar attendance in Oncology."
- **Periodic digest.** Weekly auto-generated narrative summary that brand leads forward to VPs. "Here's what happened this week." Sticky retention feature.
- **Celebration moments.** Audience crosses threshold, simulation prediction proves accurate → platform acknowledges. Small dopamine hits build habit.

---

## Module 6: Channel Health

**UX Verb:** Diagnosis — understanding what's working and what's broken

### Discover / Direct Mode Specs

| Element | Discover | Direct |
|---------|----------|--------|
| Layout | Full channel-by-channel detail | **Datadog traffic lights**: Green/Yellow/Red per channel + one anomaly callout |
| Trend data | Full time-series charts | **Apple Health**: trend arrows + plain-English interpretation |
| Highlight | All channels equal weight | **One key takeaway**: "Webinars are your strongest channel this month, up 15%." |

### Design Analogues

#### P0: Datadog — Infrastructure Monitoring ★★★ / 🔧🔧

**Steal:**
- **Traffic light pattern.** Green/Yellow/Red at a glance per channel before any charts.
- **Proactive anomaly callouts.** "Email open rates dropped 40% WoW — investigate?" Proactive > passive.
- **Channel relationship map.** How email → webinar → rep visit receptivity. Engagement funnel as interconnected system.

#### P1: Apple Health — Empathetic Framing ★★☆ / 🔧

**Steal:**
- **Trend arrows.** ↑/↓ with plain English: "Email engagement is trending down this quarter."
- **Opportunity framing.** Never "email is below average." Instead: "Email has 23% headroom vs. benchmark."
- **One highlight card per day.** "Webinars are your strongest channel, up 15% vs. last quarter."

---

## Module 7: Message Saturation

**UX Verb:** Awareness of overload — knowing when you're doing too much

### Discover / Direct Mode Specs

| Element | Discover | Direct |
|---------|----------|--------|
| Heatmap | Full HCP × Theme matrix | Same + **GitHub-style** color scale with hover/click drill-down |
| Alerts | Full alert list | **Screen Time digest**: "23 HCPs crossed thresholds. Top theme: Efficacy Data." |
| Pre-campaign gating | Manual check | Proactive: surfaces automatically before launch if ceiling breached |

### Design Analogues

#### P1: GitHub Contribution Heatmap ★★☆ / 🔧

**Steal:**
- **Single-hue gradient.** Light-to-dark purple for healthy; amber/red shift for oversaturated. Color shift *is* the alert.
- **Hover context, click detail.** Cell hover → saturation score; click → specific message exposures.
- **"Streak" concept.** Consecutive weeks of oversaturation for an HCP — stronger signal than single week.

#### P1: Screen Time — Usage Awareness ★★★ / 🔧🔧

**Steal:**
- **Weekly saturation digest.** "Your portfolio: 23 HCPs crossed thresholds. Top: 'Efficacy Data' in Oncology."
- **Saturation ceiling configuration.** Set limits per theme per audience; alert before campaign breaches. Pre-campaign gating — diagnostic → preventive.
- **"Cooling off" periods.** "Dr. Ramirez: 14 touches this month. Recommend 2-week quiet period."

---

## Module 8: Simulation Studio

**UX Verb:** Experimentation — testing hypotheses before committing resources

### Discover / Direct Mode Specs

| Element | Discover | Direct |
|---------|----------|--------|
| Builder | Full parameter controls, all sliders | Guided wizard: Audience → Channel Mix presets → Run |
| Results | Full charts, all metrics, comparative | **Figma Presentation mode**: headline + 2 charts + recommendation |
| History | Full simulation history table | Recent 3 as cards with outcome summaries |

### Design Analogues

#### P1: Figma Prototyping — Present Mode ★★★ / 🔧🔧

**Steal:**
- **"Present" view.** One button → clean, shareable summary for VP review. Headline finding, key charts, recommendation. No parameters visible.
- **Simulation forking.** Keep audience, change channel mix. Visual tree of variants showing how tweaks affect outcomes.
- **Comments on results.** "Interesting — email-heavy outperforms despite fatigue assumption. Discuss with field team."

#### P2: Kerbal Space Program — Consequential Simulation ★★☆ / 🔧🔧🔧

**Steal:**
- **Cause-and-effect cascade.** Not just "projected +18%" but "Month 1–3: webinar ↑ → Month 4: rep receptivity ↑ → Month 6: engagement peaks." Visualize the cascade.
- **"Revert to launch."** One click resets to configuration with all parameters preserved.
- **Constructive failure framing.** Poor projection → "This underperforms because [reason]. Try adjusting [parameter]." Never just a red number.

---

## Module 9: Next Best Orbit

**UX Verb:** Guidance — receiving expert advice on what to do next

### Discover / Direct Mode Specs

| Element | Discover | Direct |
|---------|----------|--------|
| Recommendations | Full list, all weighted inputs | **Waze pattern**: top rec + rationale + 2 alternatives with tradeoffs |
| Rationale | Technical: %, MSI, CPI values | Narrative: "Recommend webinar because email dropped 30% while webinar increased." |
| Feedback | Full confidence scores, model metrics | Simple: "Was this helpful?" Yes/No + optional note |

### Design Analogues

#### P0: Waze — Routing with Context ★★★ / 🔧🔧

**Steal:**
- **Rationale as first-class content.** Lead with the "because": recommendation rationale is as prominent as the recommendation itself.
- **2–3 alternatives with explicit tradeoffs.** "Option B: Rep visit — higher impact, 3× cost. Option C: Hold — lower risk, but competitive pressure may increase."
- **Confidence as context.** "This recommendation has 78% historical accuracy for similar HCP profiles."

#### P2: Chess.com — Retrospective Analysis ★★★ / 🔧🔧🔧

**Steal:**
- **Campaign accuracy scoring.** "Your channel mix was 73% aligned with NBO. The 27% divergence cost ~12 engagement points."
- **Counterfactual "what if."** Post-campaign: "NBO recommended webinar in month 3. If adopted, projected +18% engagement."
- **Pattern recognition.** "Your team over-indexes email for Tier 3 where digital ads show 2× engagement."

---

## Module 10: Competitive Orbit / Portfolio Optimizer

**UX Verb:** Strategic awareness — understanding the competitive landscape

### Discover / Direct Mode Specs

| Element | Discover | Direct |
|---------|----------|--------|
| Visualization | Full orbit ring with all data | Simplified summary + **Bloomberg-style ambient alert bar** |
| Alerts | Full alert config and history | Top 3 proactively; "View all" for rest |

### Design Analogues

#### P0: Bloomberg Terminal — Ambient Intelligence ★★★ / 🔧–🔧🔧

**Steal:**
- **Ambient alert bar.** Persistent competitive ticker across all modules: "🔴 Competitor X increased digital spend 40% in Oncology this week." Competitive intelligence as atmosphere, not destination.
- **Competitive watchlists.** Custom HCP/TA watchlists with thresholds and alerts.
- **"Bloomberg density, Apple clarity."** Disciplined typography and layout enabling high data density without overwhelm.

---

## Priority Build Sequence

### Phase 15 Leg 1: Foundation + P0 Modules

**Infrastructure:**
1. ModeContext + ModePage wrapper
2. Global mode toggle in navigation
3. Shared hook extraction for Action Queue, HCP Explorer, Audience Comparison

**P0 Builds (Direct Mode variants):**

| Priority | Module | Key Pattern | Why First |
|----------|--------|-------------|-----------|
| 1 | Action Queue | Things 3 buckets + completion animation + keyboard triage | Most broken current UX; prototype exists |
| 2 | Dashboard | Stripe hero metric + narrative insight | First thing executives see; mostly layout |
| 3 | Audience Comparison | NerdWallet verdict + Progressive impact translation | High demo value; leverages existing LLM agents |
| 4 | Competitive Orbit | Bloomberg ambient alert bar | Simple, cross-module, high differentiation |

### Phase 15 Leg 2: P1 Modules + Enhancements

| Priority | Module | Key Pattern |
|----------|--------|-------------|
| 5 | HCP Explorer | Airbnb cards (sparkline, badges, quick-save) |
| 6 | Audience Builder | Spotify staging area + lifecycle states |
| 7 | Action Queue | Wordle Daily Brief + Focus Mode |
| 8 | Channel Health | Datadog traffic lights |
| 9 | NBO | Waze alternatives with tradeoffs |

### Phase 16+: P2 Ambitious Features

- Remix Mode (per-module Discover/Direct preference)
- Chess.com retrospective analysis for NBO
- KSP cause-and-effect cascade for Simulation Studio
- Are.na annotation and audience overlap visualization
- Fantasy Sports matchup framing for Audience Comparison

---

## Cross-Module Patterns

These patterns should be implemented as shared components, not per-module:

| Pattern | Description | Used In |
|---------|-------------|---------|
| **"Add to Audience" gesture** | One-tap add from any HCP appearance | Explorer, Audience Builder, NBO, Action Queue, Simulation results |
| **Behavioral badges** | 🔥 Rising, ⚠️ At Risk, 🎯 High Converter, 🆕 New | Explorer cards, Audience Builder preview, Action Queue cards |
| **Engagement sparkline** | 6-month compact trend line | Explorer cards, Audience Builder cards, Profile drawers |
| **AI narrative block** | LLM-generated insight paragraph | Dashboard, Audience Comparison verdict, Channel Health highlight |
| **Keyboard hint bar** | Fixed bottom bar showing active shortcuts | Action Queue triage, Explorer navigation |
| **Progress/completion UX** | IntakeDiamond + ParticleBurst + counter | Action Queue, Daily Brief, Simulation runs |
| **Ambient alert bar** | Competitive intelligence ticker | All modules (persistent in navigation) |

---

## Key Files Reference

| File | Role | Mode Integration |
|------|------|-----------------|
| `client/src/lib/brand-config.ts` | Brand configuration | Add `defaultMode` |
| `client/src/lib/white-label.ts` | White-label overrides | Per-client default mode |
| `client/src/components/brand/BrandContext.tsx` | Brand context provider | Extend with ModeContext |
| `client/src/components/theme-provider.tsx` | Theme management | Mode toggle near theme toggle |
| `client/src/components/app-sidebar.tsx` | Sidebar navigation | Mode indicator / toggle |

---

---

## Production Auth & Access (Priority: High)

> **Status:** Blocked — using `ALLOW_DEV_BYPASS=true` as interim workaround
> **Context:** First production deploy exposed that the auth flow has no usable registration path for new environments.

### Requirements

1. **Production Splash Page** — Functioning login/register page that works without dev bypass. Must support first-user registration flow for fresh deployments.

2. **Admin User Management** — Settings control panel needs a working user management section visible only to admin users. CRUD for user accounts, role assignment, ability to deactivate users.

3. **Invite System Integration** — The semi-built `InviteManager` component needs to be completed and wired into the registration flow. Invite codes gate new user registration; admin generates and manages codes from the control panel.

### Current Workaround

`SKIP_AUTH=true` set in Coolify env vars. Remove once the above is implemented.

---

## HCP Explorer — UX Refinement Pass (Priority: High)

> **Status:** Ready to build
> **Scope:** Multi-module UX pass — filtering, selection, profile expand, intent-based deep linking

### Direct Mode Filters
- **Tier**: multi-select filter
- **Segment**: multi-select filter
- **Specialty**: multi-select filter
- **Location**: multi-select filter
- All four nested neatly in a single row at top, near existing menu items (compact filter bar)

### Profile Expand
- Current profile panel uses ~1/3 of viewport width — wasteful
- Refactor to a smooth transition popout (slide-over or expanding panel) that reclaims more horizontal real estate
- Must be collapsible back into compact mode with a smooth animation

### Record Selection UX
- Add a minimalist checkbox (no label) on each HCP row/card — "select this record" universal gesture
- Works in both Discover and Direct modes
- Keep existing purple highlight hover state (renders beautifully)
- Bridges the gap for users who can't multi-select via existing means (click+drag, shift+click)

### Global Filters
- **Location** should be a near-global filter available across modules (not just Explorer/Audience)
- **Select All on/off toggle** globally — QoL for small segment or small exclusion workflows

### Intent-Based Deep Linking (Bio Card → Profile Tabs)
- **Segment badge** (bottom-left of HCP bio card) → deep link to **Channels** tab (currently redundant with "View Profile" → Overview)
- **Rx metric** (middle top row) → deep link to **Trends** tab
- **Design principle:** Every clickable element in the bio card should route to the most contextually relevant profile tab. Follow user intent — "what did they click? what do they probably want to see next?"
- Extend this pattern: Engagement Score → Health tab, channel icons → Channels tab, etc.

---

## Message Saturation — Left Column Fix (Priority: Medium)

> **Status:** Ready to build
> **Scope:** UI fix + data display improvement

The left column in the Message Saturation heatmap should default to a human-readable label (HCP name or audience name), not a raw ID or truncated hash. This module is designed for audience-level trend comparison, not 1:1 inspection — but even at aggregate level, the row labels need to be legible.

### Requirements
- Default row label: HCP name or audience segment name (human-readable string)
- No clipping/truncation — adjust padding, column width, or CSS as needed
- Restrained power: the 1:1 data is there, but the default view emphasizes audience-level patterns

---

## Content Journey Module (Priority: High — New Module)

> **Status:** Design phase
> **Scope:** New top-level module under ANALYZE, cross-linked from Message Saturation
> **Design intent:** Spot the trend, not connect the dots

### Concept

Longitudinal visualization of the most frequent content exposure sequences across audiences. Aggregates touchpoints by position in the journey (Touchpoint 1, Touchpoint 2, ... Touchpoint N) and shows:
- Most common channels/content types at each position
- Engagement metrics per position
- Early-touch vs late-touch channel patterns
- Progression patterns compared and contrasted across audiences

### Example Journey Sequence
```
Congress Booth → Email → MSL Visit → Banner Ad → Email → Rep Visit → Webinar
```

### What This Is NOT
- Not a Sankey diagram connecting individual journeys
- Not a 1:1 patient-journey tracker
- It's an **aggregate pattern detector**: "For Tier 1 Oncologists, the most common 3rd touchpoint is MSL Visit at 34% engagement"

### Visualization Direction
- Horizontal position axis (Touchpoint 1 → N)
- Stacked or ranked channel breakdown at each position
- Audience comparison overlay (e.g., Tier 1 vs Tier 2 progression patterns)
- Engagement/conversion metrics layered per position
- Variable journey length (some audiences have shorter/longer typical sequences)

### Cross-Links
- **Message Saturation** → link to journey context for saturated HCPs
- **Channel Health** → journey position informs channel effectiveness
- **NBO** → journey stage should inform next-best-orbit recommendations

### Data Requirements
- Exposure events with: HCP ID, channel/content type, timestamp, engagement signal
- Aggregation by audience segment + touchpoint position
- Needs the full activity data generation pipeline (`npm run generate:data`) to populate

---

*"The only art I'll ever study is stuff that I can steal from." — David Bowie*

*This document is the source of truth for Phase 15+ builds. CC CLI should reference this before any build session.*
