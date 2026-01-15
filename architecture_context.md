# HCP Digital Twin Simulation Engine - Technical Architecture Context

**Generated:** December 16, 2025  
**System:** HCP Digital Twin Simulation Engine for Pharmaceutical Marketing  
**Status:** Production-Ready with Advanced Predictive Capabilities

---

## 1. Tech Stack & Dependencies

### Core Languages & Runtime
- **Primary Language:** TypeScript (strict mode)
- **Runtime:** Node.js with Express.js
- **Frontend Framework:** React 18.3.1
- **Frontend Build:** Vite 5.4.20 (with HMR support)
- **Frontend Routing:** Wouter (lightweight client-side routing)

### Backend Framework & Server
- **HTTP Server:** Express.js 4.21.2
- **Request Validation:** Zod 3.24.2 with zod-validation-error
- **Session Management:** express-session + connect-pg-simple (configured but not active)
- **Authentication Scaffolding:** Passport.js + passport-local (not yet integrated)

### Database & ORM
- **Database:** PostgreSQL (Neon serverless, via @neondatabase/serverless 0.10.4)
- **ORM:** Drizzle ORM 0.39.1
- **ORM Utilities:** drizzle-zod (automatic Zod schema generation from Drizzle)
- **Migrations:** drizzle-kit 0.31.4 (schema-first approach)

### UI Component System
- **Component Library:** shadcn/ui (New York style, built on Radix UI primitives)
- **Radix UI Primitives:** 40+ packages (accordion, dialog, dropdown, select, etc.)
- **Styling:** Tailwind CSS 3.4.17 with CSS custom properties for theming
- **Styling Utilities:** class-variance-authority, clsx, tailwind-merge
- **Icons:** lucide-react (UI icons), react-icons (company logos)
- **Animations:** Framer Motion, tailwindcss-animate

### State Management & Data Fetching
- **Server State:** TanStack Query v5.60.5 (React Query)
- **Form Management:** React Hook Form 7.55.0
- **Form Validation:** @hookform/resolvers (Zod integration)

### Data Visualization
- **Charts Library:** Recharts 2.15.2
- **Carousel:** embla-carousel-react 8.6.0
- **Command Palette:** cmdk 1.1.1
- **Date Utilities:** date-fns 3.6.0

### Development & Build Tools
- **Server Bundler:** esbuild 0.25.0 (with selective dependency bundling)
- **TypeScript Compiler:** TypeScript 5.6.3
- **Type Checking:** tsx 4.20.5 (TypeScript executor)
- **CSS Processing:** PostCSS 8.4.47 with Autoprefixer
- **Replit Plugins:** vite-plugin-cartographer, vite-plugin-dev-banner, vite-plugin-runtime-error-modal

### Additional Libraries
- **WebSocket Support:** ws 8.18.0
- **OTP Input:** input-otp 1.4.2
- **Theme System:** next-themes 0.4.6
- **UI Layouts:** react-resizable-panels 2.1.7
- **Drawer Component:** vaul 1.1.2

---

## 2. Database Schema (HCP & Tactic Focused)

### 2.1 HCP_Profile Table

**Table Name:** `hcp_profiles`

```typescript
export const hcpProfiles = pgTable("hcp_profiles", {
  // Identity
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  npi: varchar("npi", { length: 20 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),

  // Classification
  specialty: varchar("specialty", { length: 50 }).notNull(),
  tier: varchar("tier", { length: 20 }).notNull(),  // "Tier 1" | "Tier 2" | "Tier 3"
  segment: varchar("segment", { length: 50 }).notNull(),  // "High Prescriber" | "Growth Potential" | "New Target" | ...
  region: varchar("region", { length: 20 }).notNull(),  // "Region 1" - "Region 6"

  // Geographic
  organization: varchar("organization", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 10 }).notNull(),  // US state abbreviation

  // Engagement Metrics
  overallEngagementScore: integer("overall_engagement_score").notNull().default(0),  // 0-100
  channelPreference: varchar("channel_preference", { length: 20 }).notNull(),  // "email" | "rep_visit" | "webinar" | ...
  channelEngagements: jsonb("channel_engagements").notNull(),  // ChannelEngagement[]

  // Prescribing Data
  monthlyRxVolume: integer("monthly_rx_volume").notNull().default(0),
  yearlyRxVolume: integer("yearly_rx_volume").notNull().default(0),
  marketSharePct: real("market_share_pct").notNull().default(0),  // 0-100
  prescribingTrend: jsonb("prescribing_trend").notNull(),  // PrescribingTrend[] (6 months)

  // Prediction Scores
  conversionLikelihood: integer("conversion_likelihood").notNull().default(0),  // 0-100
  churnRisk: integer("churn_risk").notNull().default(0),  // 0-100

  // Metadata
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**ChannelEngagement (JSONB Structure):**
```typescript
{
  channel: "email" | "rep_visit" | "webinar" | "conference" | "digital_ad" | "phone",
  score: number (0-100),
  lastContact: string | null,  // e.g., "2 days ago"
  totalTouches: number,
  responseRate: number (0-100)
}
```

**PrescribingTrend (JSONB Structure):**
```typescript
{
  month: string,  // e.g., "Jul"
  rxCount: number,
  marketShare: number (0-100)
}
```

---

### 2.2 Campaign/Tactic Definition (Simulation Scenarios Table)

**Table Name:** `simulation_scenarios`

```typescript
export const simulationScenarios = pgTable("simulation_scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Scenario Identification
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),

  // Target Audience Definition
  targetHcpIds: jsonb("target_hcp_ids").notNull(),  // string[] - explicit HCP selection
  targetSegments: jsonb("target_segments"),  // Segment[] - optional segment targeting

  // Channel Mix (Tactic Parameters) - percentage allocation
  channelMix: jsonb("channel_mix").notNull(),  
  // {
  //   "email": 20,
  //   "rep_visit": 20,
  //   "webinar": 15,
  //   "conference": 15,
  //   "digital_ad": 15,
  //   "phone": 15
  // }

  // Campaign Parameters
  frequency: integer("frequency").notNull().default(4),  // touches per HCP (1-20)
  duration: integer("duration").notNull().default(3),  // months (1-12)
  budget: real("budget"),  // optional, USD

  // Content Strategy
  contentType: varchar("content_type", { length: 50 }).notNull().default("mixed"),
  // "educational" | "promotional" | "clinical_data" | "mixed"

  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**API Input Schema (Zod Validation):**
```typescript
export const insertSimulationScenarioSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  targetHcpIds: z.array(z.string()),
  targetSegments: z.array(z.enum(segments)).optional(),
  channelMix: z.record(z.enum(channels), z.number()),  // Channel → percentage
  frequency: z.number().min(1).max(20),
  duration: z.number().min(1).max(12),
  budget: z.number().optional(),
  contentType: z.enum(["educational", "promotional", "clinical_data", "mixed"]),
});
```

---

### 2.3 Simulation Result (Historical Tactic Analysis)

**Table Name:** `simulation_results`

```typescript
export const simulationResults = pgTable("simulation_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Reference to Scenario
  scenarioId: varchar("scenario_id").notNull(),
  scenarioName: varchar("scenario_name", { length: 200 }).notNull(),

  // Predicted Outcomes
  predictedEngagementRate: real("predicted_engagement_rate").notNull(),  // 0-100
  predictedResponseRate: real("predicted_response_rate").notNull(),  // 0-100
  predictedRxLift: real("predicted_rx_lift").notNull(),  // % lift in prescriptions
  predictedReach: integer("predicted_reach").notNull(),  // number of HCPs reached

  // Efficiency Metrics
  costPerEngagement: real("cost_per_engagement"),  // USD
  efficiencyScore: integer("efficiency_score").notNull().default(0),  // 0-100

  // Channel Breakdown
  channelPerformance: jsonb("channel_performance").notNull(),  // ChannelPerformance[]
  // [
  //   {
  //     "channel": "email",
  //     "allocation": 20,
  //     "predictedResponse": 32.5,
  //     "contribution": 15.2
  //   },
  //   ...
  // ]

  // Comparison to Baseline
  vsBaseline: jsonb("vs_baseline").notNull(),
  // {
  //   "engagementDelta": 12.5,
  //   "responseDelta": 8.3,
  //   "rxLiftDelta": 2.1
  // }

  runAt: timestamp("run_at").notNull().defaultNow(),
});
```

**Historical Tactic Data Structure:**
- Stores predicted vs. baseline performance for comparison
- Enables "what-if" analysis: compare actual historical outcomes vs. simulated scenarios
- Supports counterfactual backtesting: "What if we had used channel mix X instead of Y?"

---

## 3. Simulation Input Interface

### 3.1 Primary Simulation Endpoint

**HTTP Endpoint:**
```
POST /api/simulations/run
```

**Request Method:** `createSimulation(scenario: InsertSimulationScenario)`

**Request Payload Schema:**
```json
{
  "name": "Q1 Digital Push",
  "description": "Focus on digital channels for engagement",
  "targetHcpIds": [
    "hcp-uuid-1",
    "hcp-uuid-2",
    "hcp-uuid-3"
  ],
  "targetSegments": ["High Prescriber", "Growth Potential"],
  "channelMix": {
    "email": 40,
    "rep_visit": 15,
    "webinar": 20,
    "conference": 5,
    "digital_ad": 15,
    "phone": 5
  },
  "frequency": 5,
  "duration": 3,
  "budget": 50000,
  "contentType": "educational"
}
```

### 3.2 Core Simulation Function Signature

**TypeScript Function:**
```typescript
async createSimulation(scenario: InsertSimulationScenario): Promise<SimulationResult>
```

**Input Type:**
```typescript
type InsertSimulationScenario = {
  name: string;
  description?: string;
  targetHcpIds: string[];  // Array of HCP profile IDs
  targetSegments?: Segment[];
  channelMix: Record<Channel, number>;  // Channel → percentage allocation
  frequency: number;  // 1-20 touches per HCP
  duration: number;  // 1-12 months
  budget?: number;  // optional, USD
  contentType: "educational" | "promotional" | "clinical_data" | "mixed";
};
```

**Output Type (SimulationResult):**
```typescript
type SimulationResult = {
  id: string;
  scenarioId: string;
  scenarioName: string;
  
  // Predicted Outcomes
  predictedEngagementRate: number;
  predictedResponseRate: number;
  predictedRxLift: number;
  predictedReach: number;
  
  // Efficiency
  costPerEngagement?: number;
  efficiencyScore: number;
  
  // Breakdown by Channel
  channelPerformance: {
    channel: Channel;
    allocation: number;
    predictedResponse: number;
    contribution: number;
  }[];
  
  // Comparison to Baseline
  vsBaseline: {
    engagementDelta: number;
    responseDelta: number;
    rxLiftDelta: number;
  };
  
  runAt: string;  // ISO timestamp
};
```

### 3.3 Prediction Engine Implementation

**Core Function:** `predictStimuliImpact(hcp, stimulusType, channel, contentType?, callToAction?)`

**Prediction Logic:**
```typescript
// Base weights by stimulus type
stimulusWeights = {
  rep_visit: { engagement: 8, conversion: 5 },
  email_send: { engagement: 3, conversion: 1 },
  email_click: { engagement: 8, conversion: 4 },
  webinar_attend: { engagement: 12, conversion: 6 },
  conference_meeting: { engagement: 15, conversion: 8 },
  // ... 12 stimulus types total
}

// Modifiers applied:
- channelAffinityModifier (1.3x if matches HCP preference, 0.9x otherwise)
- tierModifier (Tier 1: 1.2x, Tier 2: 1.0x, Tier 3: 0.85x)
- engagementModifier (0.7 + engagement_score/100 * 0.6)
- contentModifier (clinical_data: 1.15x, educational: 1.1x, etc.)
- ctaModifier (savings terms: 1.15x, patient outcomes: 1.12x, etc.)
```

**Returns:**
```typescript
{
  engagementDelta: number,
  conversionDelta: number,
  confidenceLower: number,  // Lower CI bound
  confidenceUpper: number   // Upper CI bound
}
```

### 3.4 Advanced Features

**Stimuli Impact Prediction:**
```
POST /api/stimuli
{
  "hcpId": "uuid",
  "stimulusType": "rep_visit" | "email_open" | "webinar_attend" | ...,
  "channel": "email" | "rep_visit" | ...,
  "contentType": "educational",
  "messageVariant": "A/B variant",
  "callToAction": "Learn how to save on patient costs"
}
```

**Counterfactual Backtesting:**
```
POST /api/counterfactuals
{
  "name": "Q3 2024 Retrospective",
  "targetHcpIds": [...],
  "changedVariables": [
    {
      "variableName": "channel_mix",
      "variableType": "channel_mix",
      "originalValue": { "email": 30, "rep_visit": 20, ... },
      "counterfactualValue": { "email": 40, "rep_visit": 10, ... }
    }
  ]
}
```

---

## 4. File Storage Configuration

**Current Implementation:** **No file storage configured**

### Details:

1. **Local File Upload:** Not implemented
2. **AWS S3 Integration:** Not configured
3. **Azure Blob Storage:** Not configured
4. **Cloud Storage:** Not integrated

### Existing Data Export Capability:

The application provides a JSON export endpoint for audit/compliance purposes:

```
GET /api/export/hcps
```

**Response:**
- Content-Type: `application/json`
- Content-Disposition: `attachment; filename=hcp-export.json`
- Returns: Complete HCP profile array as JSON
- Logged to audit trail with action: `"export"`

### Recommendation for File Storage:

If file uploads are needed in the future, consider:
- **For Development:** Local filesystem with `/uploads` directory
- **For Production:** AWS S3 with signed URLs or Azure Blob Storage
- **Libraries to Integrate:** `multer` (middleware) + `aws-sdk` or Azure SDK
- **Database Storage:** Would add file_path and file_metadata columns to relevant tables

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hcps` | GET | List all HCP profiles |
| `/api/hcps/:id` | GET | Get single HCP profile |
| `/api/hcps/filter` | POST | Filter HCPs by criteria |
| `/api/simulations/run` | POST | Run new simulation scenario |
| `/api/simulations/history` | GET | Get past simulations |
| `/api/stimuli` | POST | Create stimulus event |
| `/api/counterfactuals` | POST | Run counterfactual analysis |
| `/api/nl-query` | POST | Natural language query (GenAI ready) |
| `/api/model-evaluation` | POST | Run model evaluation |
| `/api/dashboard/metrics` | GET | Get dashboard metrics |
| `/api/audit-logs` | GET | Get audit trail |
| `/api/export/hcps` | GET | Export HCP data (JSON) |

---

## Key Design Decisions

1. **Schema-First Development:** Drizzle ORM with automatic Zod schema generation ensures type consistency across stack
2. **In-Memory Storage (Development):** Current storage layer can be swapped to database persistence via IStorage interface
3. **Prediction Engine:** Multi-factor weighting system considers HCP profile, stimulus type, channel affinity, tier, and content
4. **Audit Trail:** All actions logged with timestamps, user ID (optional), and IP address for compliance
5. **Closed-Loop Learning:** Predicted outcomes stored alongside actual outcomes for model evaluation
6. **No Authentication (Yet):** Scaffolding in place (Passport.js) for future integration

