# ROADMAP: TwinEngine Phase 11 — HCP-Centric Visualization Hierarchy

**Status:** ✅ **COMPLETE** (2026-01-18)

**Goal:** Reorient Ecosystem Explorer from channel-centric to HCP-centric model, encoding a customer-first ontology where HCPs are the nucleus and channels/campaigns orbit as layers of influence
**Target:** Demo-ready "Solar System" visualization with three semantic levels (L1→L2→L3) and contextual tooltips
**Mode:** Milestone-based (Supervised Autonomous)
**Prerequisite:** Phase 10A-10G Complete
**Generated:** 2026-01-18
**Completed:** 2026-01-18

### Completion Summary

All 6 sub-phases completed:
- ✅ **11A**: Data Layer & Mock Generation
- ✅ **11B**: L1 Solar System View
- ✅ **11C**: L2 Campaign Orbit View
- ✅ **11D**: L3 HCP Constellation View
- ✅ **11E**: Navigation & Transitions
- ✅ **11F**: Story Mode Integration

**Build Status:** TypeScript clean, production build successful

---

## Executive Summary

Phase 11 is not a visual refactor — it's a **conceptual reorientation**.

### The Shift

| Dimension | Phase 10 (Current) | Phase 11 (Target) |
|-----------|-------------------|-------------------|
| **Mental Model** | "Where are we reaching people?" | "What does this HCP believe, and what pressure acts on that belief?" |
| **Center of Gravity** | Channels | HCPs |
| **Navigation Flow** | Ecosystem → Channel → HCP | HCP Nucleus → Channel → Campaign → HCP Constellation |
| **Edge Semantics** | Visual grouping | Actual HCP overlap (shared audience) |
| **Tooltip Purpose** | Identify | Diagnose |

### Why This Matters

Most "omnichannel" tools think like media planners: *"How many impressions did we serve?"*

TwinEngine thinks like a strategist: *"What belief state is this HCP in, and what orchestrated pressure is moving them?"*

The nucleus isn't a design choice — it's a **statement about who matters**.

---

## Architecture: Three-Level Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              L1: SOLAR SYSTEM                               │
│                         (HCP Nucleus + Channel Planets)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              [Paid Digital]                                 │
│                                   ○                                         │
│                                  /                                          │
│                    [Congress]   /                                           │
│                        ○───────/─────○ [Webinar]                            │
│                         \     /     /                                       │
│                          \   /     /                                        │
│                      ┌────●────┐  /                                         │
│                      │  2,500  │ /                                          │
│                      │  HCPs   │/                                           │
│                      │ ░░░░░░░ │───────○ [Email]                            │
│                      │ ░░░░░░░ │        \                                   │
│                      └────●────┘         \                                  │
│                           |               ○ [Field/MSL]                     │
│                           |                                                 │
│                    Shader noise texture                                     │
│                    shows "many" HCPs                                        │
│                                                                             │
│   Click channel → Zoom to L2                                                │
│   Edges = HCP overlap (shared audience)                                     │
│   Planet size = Reach                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Click [Email]
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           L2: CAMPAIGN ORBIT                                │
│                    (Channel Context: Email, 1,925 HCPs)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    [RWE Outcomes]     [Safety Profile]                      │
│                         ○                  ○                                │
│                          \                /                                 │
│                           \   ┌──────┐   /                                  │
│                            \  │ 1,925│  /                                  │
│                             \ │ HCPs │ /                                    │
│                              \│░░░░░░│/                                     │
│         [Access Update]○──────│░░░░░░│──────○[ONC Launch Wave 1]            │
│                              /│░░░░░░│\                                     │
│                             / └──────┘ \                                    │
│                            /            \                                   │
│                           ○              ○                                  │
│                    [NCCN Push]    [Biomarker Testing]                       │
│                                                                             │
│   Node size = HCP reach                                                     │
│   Node color = Primary theme                                                │
│   Hover = Channel-specific KPIs (Open Rate, CTR, Fatigue)                   │
│   Click campaign → Zoom to L3                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Click [ONC Launch Wave 1]
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          L3: HCP CONSTELLATION                              │
│                    (Campaign Context: C001, 840 HCPs)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│              🩺        🩺              🩺                                    │
│           Dr. Smith  Dr. Chen      Dr. Patel                                │
│              ●          ●             ●                                     │
│             /          / \           /                                      │
│            ●    🩺    ●   ●    🩺   ●                                        │
│           / \        /     \        \                                       │
│          ●   ●      ●       ●        ●                                      │
│        🩺    🩺     🩺       🩺       🩺                                      │
│                                                                             │
│   Nodes = Individual HCPs                                                   │
│   Icon = Specialty (ONC, CARD, PULM, etc.)                                  │
│   Size = Engagement score                                                   │
│   Hover = Signal Index tooltip:                                             │
│           • Name + Specialty                                                │
│           • Engagement Score (sparkline)                                    │
│           • Rx Trend (↑↓→)                                                  │
│           • Channel Affinity                                                │
│           • Adoption Stage                                                  │
│           • Last Touch Date                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### New Schema Additions

```typescript
// shared/schema.ts additions

// Messaging Themes (separate taxonomy, many-to-many with campaigns)
export const messagingThemes = pgTable("messaging_themes", {
  id: varchar("id", { length: 10 }).primaryKey(), // MT01, MT02, etc.
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  lifecycleStage: varchar("lifecycle_stage", { length: 50 }),
  appliesToTAs: jsonb("applies_to_tas").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Campaign-Theme junction (many-to-many)
export const campaignThemes = pgTable("campaign_themes", {
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  themeId: varchar("theme_id").notNull().references(() => messagingThemes.id),
  isPrimary: boolean("is_primary").notNull().default(false),
}, (t) => ({
  pk: primaryKey({ columns: [t.campaignId, t.themeId] }),
}));

// Channel interconnections (HCP overlap)
export const channelOverlap = pgTable("channel_overlap", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceChannel: varchar("source_channel", { length: 50 }).notNull(),
  targetChannel: varchar("target_channel", { length: 50 }).notNull(),
  overlapIndex: real("overlap_index").notNull(), // 0-1, % of shared HCPs
  computedAt: timestamp("computed_at").notNull().defaultNow(),
});
```

### Mock Data Files

Located in `client/src/lib/constellation/mockData/`:

| File | Purpose |
|------|---------|
| `themes.json` | 10 messaging themes (MT01-MT10) |
| `campaigns.json` | 24 campaigns across all channels |
| `channelOverlap.json` | Interconnection matrix |
| `channelKPIs.json` | KPI definitions per channel |
| `specialtyIcons.json` | Icon mapping for 15 specialties |

---

## Channel-Specific KPIs (L2 Tooltips)

Each channel shows **3-4 relevant KPIs** — no false standardization.

| Channel | KPI 1 | KPI 2 | KPI 3 | KPI 4 |
|---------|-------|-------|-------|-------|
| **Email** | Open Rate | CTR | Reach | Fatigue Index |
| **Field/MSL** | Call Reach | Call Frequency | Access Rate | — |
| **Congress** | Attendance | Booth Engagement | Follow-Up Rate | — |
| **Webinar** | Registration Rate | Attendance % | Engagement Score | — |
| **Paid Digital** | CTR | Cost per Visit | Viewability | — |
| **Web** | Time on Site | Content Downloads | — | — |

---

## Specialty Icon Mapping (L3 Nodes)

```typescript
// client/src/lib/constellation/specialtyIcons.ts

import {
  Heart, Brain, Lung, Bone, Pill, Baby, Eye, Ear, 
  Stethoscope, Microscope, Radiation, Shield, Syringe
} from 'lucide-react';

export const SPECIALTY_ICONS: Record<string, { icon: LucideIcon; color: string; abbr: string }> = {
  'Oncology':       { icon: Radiation,   color: '#8B5CF6', abbr: 'ONC' },
  'Cardiology':     { icon: Heart,       color: '#EF4444', abbr: 'CARD' },
  'Neurology':      { icon: Brain,       color: '#3B82F6', abbr: 'NEU' },
  'Pulmonology':    { icon: Lung,        color: '#06B6D4', abbr: 'PULM' },
  'Rheumatology':   { icon: Bone,        color: '#F59E0B', abbr: 'RHEUM' },
  'Endocrinology':  { icon: Pill,        color: '#10B981', abbr: 'ENDO' },
  'Pediatrics':     { icon: Baby,        color: '#EC4899', abbr: 'PEDS' },
  'Ophthalmology':  { icon: Eye,         color: '#6366F1', abbr: 'OPH' },
  'ENT':            { icon: Ear,         color: '#14B8A6', abbr: 'ENT' },
  'Primary Care':   { icon: Stethoscope, color: '#64748B', abbr: 'PCP' },
  'Pathology':      { icon: Microscope,  color: '#A855F7', abbr: 'PATH' },
  'Immunology':     { icon: Shield,      color: '#22C55E', abbr: 'IMM' },
  'Dermatology':    { icon: Syringe,     color: '#F97316', abbr: 'DERM' },
  'Gastroenterology': { icon: Pill,      color: '#84CC16', abbr: 'GI' },
  'Nephrology':     { icon: Heart,       color: '#0EA5E9', abbr: 'NEPH' },
};

// For 3D rendering, use abbreviation badge instead of complex icons
// This reduces GPU load while maintaining specialty identification
```

---

## Phase 11A: Data Layer & Mock Generation

**Goal:** Establish data structures and generate demo-ready mock data  
**Effort:** 4-6 hours  
**Dependencies:** None

### M11A.1: Schema Updates

**Tasks:**
- [x] Add `messagingThemes` table to `shared/schema.ts`
- [x] Add `campaignThemes` junction table
- [x] Add `channelOverlap` table
- [x] Run migration: `npm run db:push`
- [x] Verify tables created

**Acceptance Criteria:**
- Schema compiles without errors
- Tables exist in database
- Foreign key relationships valid

---

### M11A.2: Mock Data Generation

**Tasks:**
- [x] Create `client/src/lib/constellation/mockData/themes.json`:
  ```json
  [
    { "id": "MT01", "name": "Efficacy", "color": "#22C55E" },
    { "id": "MT02", "name": "Safety & Tolerability", "color": "#EF4444" },
    { "id": "MT03", "name": "Mechanism of Action", "color": "#3B82F6" },
    { "id": "MT04", "name": "Differentiation", "color": "#8B5CF6" },
    { "id": "MT05", "name": "Patient Selection", "color": "#F59E0B" },
    { "id": "MT06", "name": "Dosing & Administration", "color": "#06B6D4" },
    { "id": "MT07", "name": "Access & Reimbursement", "color": "#EC4899" },
    { "id": "MT08", "name": "Guidelines & Evidence", "color": "#14B8A6" },
    { "id": "MT09", "name": "Real-World Evidence", "color": "#6366F1" },
    { "id": "MT10", "name": "Awareness / Disease State", "color": "#64748B" }
  ]
  ```

- [x] Create `campaigns.json` with 24 campaigns (from TABLE_B_EXPANDED)
- [x] Create `channelOverlap.json`:
  ```json
  {
    "interconnections": [
      { "source": "email", "target": "field", "overlapIndex": 0.68 },
      { "source": "email", "target": "webinar", "overlapIndex": 0.55 },
      { "source": "field", "target": "congress", "overlapIndex": 0.47 },
      { "source": "paid_media", "target": "email", "overlapIndex": 0.61 },
      { "source": "paid_media", "target": "field", "overlapIndex": 0.29 },
      { "source": "webinar", "target": "congress", "overlapIndex": 0.38 },
      { "source": "web", "target": "email", "overlapIndex": 0.72 }
    ]
  }
  ```

- [x] Create `channelKPIs.json` with channel-specific KPI definitions
- [x] Create `specialtyIcons.ts` with Lucide icon mapping

**Acceptance Criteria:**
- All mock data files load without errors
- Theme colors render correctly
- Channel overlap matrix is symmetric-ish (real data won't be)

---

### M11A.3: Data Access Layer

**Tasks:**
- [x] Create `client/src/lib/constellation/dataService.ts`:
  ```typescript
  // Abstraction layer for constellation data
  // Currently returns mock data, later connects to API
  
  export async function getL1Data(): Promise<L1SolarSystemData> {
    return {
      nucleus: { totalHcps: 2500, texture: 'shader_noise' },
      channels: [...], // from mock
      interconnections: [...], // from mock
    };
  }
  
  export async function getL2Data(channelId: string): Promise<L2CampaignOrbitData> {
    // Filter campaigns by channel
    // Include channel-specific KPIs
  }
  
  export async function getL3Data(campaignId: string): Promise<L3HCPConstellationData> {
    // Generate HCP sample for campaign
    // Include Signal Index fields
  }
  ```

- [x] Define TypeScript interfaces for all data shapes
- [x] Add unit tests for data transformations

**Acceptance Criteria:**
- Data service returns typed data
- Transitions between levels preserve context
- Tests pass

---

## Phase 11B: L1 Solar System View

**Goal:** Build HCP nucleus with orbiting channel planets  
**Effort:** 10-14 hours  
**Dependencies:** Phase 11A

### M11B.1: HCP Nucleus Component

**Tasks:**
- [x] Create `HCPNucleus.tsx`:
  ```typescript
  // Central sphere with shader noise texture showing "many" HCPs
  
  export function HCPNucleus({ totalHcps }: { totalHcps: number }) {
    const shaderRef = useRef<THREE.ShaderMaterial>(null);
    
    // Custom shader for granular appearance
    const uniforms = useMemo(() => ({
      time: { value: 0 },
      noiseScale: { value: 3.0 },
      baseColor: { value: new THREE.Color('#64748B') },
      particleColor: { value: new THREE.Color('#94A3B8') },
    }), []);
    
    useFrame((state) => {
      if (shaderRef.current) {
        shaderRef.current.uniforms.time.value = state.clock.elapsedTime;
      }
    });
    
    return (
      <mesh>
        <sphereGeometry args={[30, 64, 64]} />
        <shaderMaterial
          ref={shaderRef}
          uniforms={uniforms}
          vertexShader={nucleusVertexShader}
          fragmentShader={nucleusFragmentShader}
        />
        {/* HCP count label */}
        <Html center>
          <div className="text-white text-lg font-semibold">
            {totalHcps.toLocaleString()} HCPs
          </div>
        </Html>
      </mesh>
    );
  }
  ```

- [x] Create GLSL shaders for granular noise effect:
  - `nucleusVertex.glsl` — Pass UV and position
  - `nucleusFragment.glsl` — Perlin noise with particle-like appearance

- [x] Add subtle pulsing animation (breathing effect)

**Acceptance Criteria:**
- Nucleus renders as textured sphere
- Texture shows granular "many particles" effect
- HCP count label visible
- Performance: No frame drops from shader

---

### M11B.2: Channel Planet Components

**Tasks:**
- [x] Create `ChannelPlanet.tsx`:
  ```typescript
  interface ChannelPlanetProps {
    channel: ChannelData;
    position: [number, number, number];
    onSelect: (channelId: string) => void;
  }
  
  export function ChannelPlanet({ channel, position, onSelect }: ChannelPlanetProps) {
    const [hovered, setHovered] = useState(false);
    
    // Size based on HCP reach (normalized)
    const radius = useMemo(() => {
      const minRadius = 8;
      const maxRadius = 20;
      const normalized = channel.hcpReach / 2000; // Normalize to max expected
      return minRadius + (maxRadius - minRadius) * Math.min(normalized, 1);
    }, [channel.hcpReach]);
    
    // Color based on engagement health
    const color = useMemo(() => {
      if (channel.avgEngagement >= 70) return '#22C55E'; // Healthy
      if (channel.avgEngagement >= 50) return '#F59E0B'; // Warning
      return '#EF4444'; // Critical
    }, [channel.avgEngagement]);
    
    return (
      <group position={position}>
        <mesh
          onClick={() => onSelect(channel.id)}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial 
            color={color} 
            emissive={hovered ? color : '#000000'}
            emissiveIntensity={hovered ? 0.3 : 0}
          />
        </mesh>
        
        {/* Channel label */}
        <Html position={[0, radius + 5, 0]} center>
          <button
            onClick={() => onSelect(channel.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              "bg-white/90 backdrop-blur-sm shadow-md",
              "hover:bg-white hover:shadow-lg",
              "border-2",
              hovered ? "border-current scale-105" : "border-transparent"
            )}
            style={{ color }}
          >
            <span className="flex items-center gap-2">
              <ChannelIcon channel={channel.id} className="w-4 h-4" />
              {channel.label}
            </span>
          </button>
        </Html>
      </group>
    );
  }
  ```

- [x] Create `ChannelIcon.tsx` with appropriate icons per channel:
  - Email → Mail
  - Field/MSL → Users
  - Congress → Building2
  - Webinar → Video
  - Paid Digital → Megaphone
  - Web → Globe

- [x] Position planets in orbital arrangement around nucleus

**Acceptance Criteria:**
- Planets sized by reach
- Planets colored by engagement health
- Labels are clickable (triggers L2 navigation)
- Hover state visible

---

### M11B.3: Channel Interconnection Edges

**Tasks:**
- [x] Create `ChannelEdges.tsx`:
  ```typescript
  // Edges between channels based on HCP overlap
  
  export function ChannelEdges({ 
    interconnections, 
    channelPositions 
  }: ChannelEdgesProps) {
    
    return (
      <group>
        {interconnections.map((edge) => {
          const startPos = channelPositions[edge.source];
          const endPos = channelPositions[edge.target];
          
          // Edge opacity based on overlap strength
          const opacity = 0.2 + (edge.overlapIndex * 0.6);
          
          // Edge thickness based on overlap
          const lineWidth = 1 + (edge.overlapIndex * 3);
          
          return (
            <Line
              key={`${edge.source}-${edge.target}`}
              points={[startPos, endPos]}
              color="#94A3B8"
              lineWidth={lineWidth}
              opacity={opacity}
              transparent
              dashed
              dashScale={50}
              dashSize={3}
              gapSize={2}
            />
          );
        })}
      </group>
    );
  }
  ```

- [x] Add hover effect: Highlight edge when either connected channel is hovered
- [x] Add tooltip on edge hover showing overlap percentage

**Acceptance Criteria:**
- Edges connect channels with shared HCP overlap
- Edge weight visually represents overlap strength
- Dashed style distinguishes from solid UI elements

---

### M11B.4: L1 Layout Algorithm

**Tasks:**
- [x] Implement radial positioning for channel planets:
  ```typescript
  // Position channels in elliptical orbit around nucleus
  
  function computeChannelPositions(channels: ChannelData[]): Record<string, [number, number, number]> {
    const positions: Record<string, [number, number, number]> = {};
    
    // Sort by reach (largest closest to nucleus? or furthest?)
    // Decision: Largest reach = closest (more gravitational pull)
    const sorted = [...channels].sort((a, b) => b.hcpReach - a.hcpReach);
    
    sorted.forEach((channel, index) => {
      const angle = (index / sorted.length) * Math.PI * 2;
      const distance = 60 + (index * 15); // Outer planets further
      
      positions[channel.id] = [
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 20, // Slight Y variation
        Math.sin(angle) * distance,
      ];
    });
    
    return positions;
  }
  ```

- [x] Add slow orbital animation (optional, may disable for perf)

**Acceptance Criteria:**
- Channels distributed around nucleus
- No overlapping labels
- Largest channels positioned prominently

---

### M11B.5: L1 Tooltip (Channel Hover)

**Tasks:**
- [x] Create `ChannelTooltip.tsx`:
  ```typescript
  interface ChannelTooltipProps {
    channel: ChannelData;
    position: { x: number; y: number };
  }
  
  export function ChannelTooltip({ channel, position }: ChannelTooltipProps) {
    return (
      <div
        className="fixed z-50 pointer-events-none"
        style={{ left: position.x + 10, top: position.y - 10 }}
      >
        <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-4 min-w-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <ChannelIcon channel={channel.id} className="w-5 h-5" />
            <span className="font-semibold text-slate-900">{channel.label}</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">HCP Reach</span>
              <span className="font-medium">{channel.hcpReach.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Avg Engagement</span>
              <span className="font-medium">{channel.avgEngagement}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Health Status</span>
              <HealthBadge score={channel.avgEngagement} />
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
            Click to explore campaigns →
          </div>
        </div>
      </div>
    );
  }
  ```

- [x] Track mouse position for tooltip placement
- [x] Show/hide on channel hover

**Acceptance Criteria:**
- Tooltip appears on channel hover
- Shows reach, engagement, health status
- Positioned near cursor, doesn't clip viewport

---

## Phase 11C: L2 Campaign Orbit View

**Goal:** Channel-specific view with campaign/messaging theme nodes orbiting HCP nucleus  
**Effort:** 8-10 hours  
**Dependencies:** Phase 11B

### M11C.1: L2 View Container

**Tasks:**
- [x] Create `L2CampaignOrbit.tsx`:
  ```typescript
  interface L2CampaignOrbitProps {
    channelId: string;
    onBack: () => void;
    onSelectCampaign: (campaignId: string) => void;
  }
  
  export function L2CampaignOrbit({ channelId, onBack, onSelectCampaign }: L2CampaignOrbitProps) {
    const { data, isLoading } = useL2Data(channelId);
    
    if (isLoading) return <LoadingSpinner />;
    
    return (
      <group>
        {/* Contextual nucleus (channel-specific HCP count) */}
        <HCPNucleus 
          totalHcps={data.nucleus.totalHcps} 
          label={`${channelId} HCPs`}
          size="medium" // Smaller than L1
        />
        
        {/* Campaign nodes orbiting */}
        {data.campaigns.map((campaign, i) => (
          <CampaignNode
            key={campaign.id}
            campaign={campaign}
            position={computeCampaignPosition(i, data.campaigns.length)}
            channelId={channelId}
            onSelect={onSelectCampaign}
          />
        ))}
        
        {/* Back button */}
        <Html position={[-80, 50, 0]}>
          <button onClick={onBack} className="...">
            ← Back to Ecosystem
          </button>
        </Html>
        
        {/* Breadcrumb */}
        <Html position={[0, 70, 0]} center>
          <Breadcrumb items={['Ecosystem', channelId]} />
        </Html>
      </group>
    );
  }
  ```

- [x] Animate transition from L1 → L2 (camera zoom + fade)

**Acceptance Criteria:**
- L2 view loads when channel clicked
- Nucleus shows channel-specific HCP count
- Back navigation works

---

### M11C.2: Campaign Node Component

**Tasks:**
- [x] Create `CampaignNode.tsx`:
  ```typescript
  interface CampaignNodeProps {
    campaign: CampaignData;
    position: [number, number, number];
    channelId: string;
    onSelect: (campaignId: string) => void;
  }
  
  export function CampaignNode({ campaign, position, channelId, onSelect }: CampaignNodeProps) {
    const [hovered, setHovered] = useState(false);
    
    // Size based on HCP reach
    const radius = useMemo(() => {
      const normalized = campaign.hcpReach / 1000;
      return 5 + (normalized * 10);
    }, [campaign.hcpReach]);
    
    // Color based on primary theme
    const themeColor = THEME_COLORS[campaign.primaryTheme] || '#64748B';
    
    return (
      <group position={position}>
        <mesh
          onClick={() => onSelect(campaign.id)}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[radius, 24, 24]} />
          <meshStandardMaterial
            color={themeColor}
            emissive={hovered ? themeColor : '#000000'}
            emissiveIntensity={hovered ? 0.4 : 0}
          />
        </mesh>
        
        {/* Campaign label */}
        <Html position={[0, radius + 3, 0]} center>
          <div className="text-xs font-medium text-slate-700 whitespace-nowrap">
            {campaign.name}
          </div>
        </Html>
        
        {/* Theme badge */}
        <Html position={[radius + 2, 0, 0]}>
          <div 
            className="px-2 py-0.5 rounded text-xs text-white"
            style={{ backgroundColor: themeColor }}
          >
            {campaign.primaryTheme}
          </div>
        </Html>
      </group>
    );
  }
  ```

**Acceptance Criteria:**
- Campaign nodes sized by reach
- Colored by messaging theme
- Label and theme badge visible

---

### M11C.3: Channel-Specific KPI Tooltip (L2)

**Tasks:**
- [x] Create `CampaignTooltip.tsx`:
  ```typescript
  // Tooltip content varies by channel
  
  export function CampaignTooltip({ campaign, channelId }: CampaignTooltipProps) {
    const kpiConfig = CHANNEL_KPI_CONFIG[channelId];
    
    return (
      <div className="bg-white rounded-lg shadow-xl border p-4 min-w-[240px]">
        <div className="font-semibold text-slate-900 mb-1">{campaign.name}</div>
        <div className="text-sm text-slate-500 mb-3">
          {campaign.brand} • {campaign.ta}
        </div>
        
        {/* Theme badges */}
        <div className="flex gap-2 mb-3">
          <ThemeBadge theme={campaign.primaryTheme} primary />
          {campaign.secondaryTheme && (
            <ThemeBadge theme={campaign.secondaryTheme} />
          )}
        </div>
        
        {/* Channel-specific KPIs */}
        <div className="space-y-2 text-sm">
          {kpiConfig.map((kpi) => (
            <div key={kpi.key} className="flex justify-between">
              <span className="text-slate-500">{kpi.label}</span>
              <span className="font-medium">
                {formatKPI(campaign.kpis[kpi.key], kpi.format)}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-3 pt-3 border-t text-xs text-slate-400">
          Click to view HCP constellation →
        </div>
      </div>
    );
  }
  
  // Channel-specific KPI configurations
  const CHANNEL_KPI_CONFIG: Record<string, KPIConfig[]> = {
    email: [
      { key: 'openRate', label: 'Open Rate', format: 'percent' },
      { key: 'ctr', label: 'CTR', format: 'percent' },
      { key: 'reach', label: 'Reach', format: 'number' },
      { key: 'fatigueIndex', label: 'Fatigue Index', format: 'percent' },
    ],
    field: [
      { key: 'callReach', label: 'Call Reach', format: 'number' },
      { key: 'callFrequency', label: 'Avg Frequency', format: 'decimal' },
      { key: 'accessRate', label: 'Access Rate', format: 'percent' },
    ],
    congress: [
      { key: 'attendance', label: 'Attendance', format: 'number' },
      { key: 'boothEngagement', label: 'Booth Scans', format: 'number' },
      { key: 'followUpRate', label: 'Follow-Up Rate', format: 'percent' },
    ],
    webinar: [
      { key: 'registrationRate', label: 'Registration Rate', format: 'percent' },
      { key: 'attendancePercent', label: 'Attendance %', format: 'percent' },
      { key: 'engagementScore', label: 'Engagement', format: 'number' },
    ],
    paid_media: [
      { key: 'ctr', label: 'CTR', format: 'percent' },
      { key: 'costPerVisit', label: 'Cost/Visit', format: 'currency' },
      { key: 'viewability', label: 'Viewability', format: 'percent' },
    ],
  };
  ```

**Acceptance Criteria:**
- Tooltip shows campaign name, brand, TA
- Theme badges with correct colors
- KPIs match channel type (NOT standardized)
- Proper formatting (%, $, numbers)

---

## Phase 11D: L3 HCP Constellation View

**Goal:** Individual HCP nodes for selected campaign with Signal Index tooltips  
**Effort:** 6-8 hours  
**Dependencies:** Phase 11C

### M11D.1: L3 View Container

**Tasks:**
- [x] Refactor existing `NodeInstances.tsx` to render specialty-aware HCP nodes
- [x] Accept campaign context for filtering
- [x] Add breadcrumb: Ecosystem → Channel → Campaign

**Acceptance Criteria:**
- L3 view loads when campaign clicked
- Shows HCPs reached by that campaign
- Back navigation works

---

### M11D.2: Specialty-Aware HCP Nodes

**Tasks:**
- [x] Replace black dots with specialty-coded nodes:
  ```typescript
  // In NodeInstances.tsx
  
  // Instead of uniform spheres, use specialty colors
  const specialtyColor = SPECIALTY_ICONS[node.specialty]?.color || '#64748B';
  
  // For instanced rendering, encode specialty as color
  tempColor.set(specialtyColor);
  mesh.setColorAt(i, tempColor);
  ```

- [x] Add specialty abbreviation as label (conditional on zoom level)
- [x] Size nodes by engagement score

**Acceptance Criteria:**
- Nodes colored by specialty
- Labels show abbreviation at high zoom
- Size reflects engagement score

---

### M11D.3: Signal Index Tooltip (L3)

**Tasks:**
- [x] Create `HCPTooltip.tsx`:
  ```typescript
  export function HCPTooltip({ hcp }: { hcp: HCPData }) {
    return (
      <div className="bg-white rounded-lg shadow-xl border p-4 min-w-[280px]">
        {/* Header: Name + Specialty */}
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: SPECIALTY_ICONS[hcp.specialty]?.color }}
          >
            {SPECIALTY_ICONS[hcp.specialty]?.abbr || '?'}
          </div>
          <div>
            <div className="font-semibold text-slate-900">{hcp.name}</div>
            <div className="text-sm text-slate-500">{hcp.specialty}</div>
          </div>
        </div>
        
        {/* Engagement Score + Sparkline */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-bold text-slate-900">{hcp.engagementScore}</div>
            <div className="text-xs text-slate-500">Engagement Score</div>
          </div>
          <Sparkline data={hcp.sparkline} width={80} height={30} />
        </div>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-slate-500">Rx Trend</div>
            <div className="font-medium flex items-center gap-1">
              <TrendIcon trend={hcp.rxTrend} />
              {hcp.rxTrend}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Channel Affinity</div>
            <div className="font-medium">{hcp.channelAffinity}</div>
          </div>
          <div>
            <div className="text-slate-500">Adoption Stage</div>
            <AdoptionBadge stage={hcp.adoptionStage} />
          </div>
          <div>
            <div className="text-slate-500">Last Touch</div>
            <div className="font-medium">{formatDate(hcp.lastTouchDate)}</div>
          </div>
        </div>
      </div>
    );
  }
  ```

- [x] Create `Sparkline.tsx` mini chart component
- [x] Create `TrendIcon.tsx` (↑ green, ↓ red, → gray)
- [x] Create `AdoptionBadge.tsx` (Aware, Trial, Regular color-coded)

**Acceptance Criteria:**
- Tooltip shows all 6 fields from spec
- Sparkline renders correctly
- Trend icons match direction
- Adoption stage color-coded

---

## Phase 11E: Navigation & Transitions

**Goal:** Smooth level transitions, breadcrumbs, keyboard shortcuts integration  
**Effort:** 4-6 hours  
**Dependencies:** Phase 11B, 11C, 11D

### M11E.1: Level State Management

**Tasks:**
- [x] Update `constellationStore.ts`:
  ```typescript
  interface ConstellationState {
    // Level navigation
    currentLevel: 'L1' | 'L2' | 'L3';
    l2Context: { channelId: string } | null;
    l3Context: { campaignId: string; channelId: string } | null;
    
    // Actions
    navigateToL1: () => void;
    navigateToL2: (channelId: string) => void;
    navigateToL3: (campaignId: string) => void;
    goBack: () => void;
  }
  ```

- [x] Wire up click handlers across all level components

**Acceptance Criteria:**
- State correctly tracks current level
- Context preserved for back navigation
- URL reflects current level (for shareability)

---

### M11E.2: Camera Transition Animations

**Tasks:**
- [x] Create `useLevelTransition.ts` hook:
  ```typescript
  // Animate camera between level-appropriate positions
  
  const LEVEL_CAMERAS = {
    L1: { position: [0, 80, 200], target: [0, 0, 0] },
    L2: { position: [0, 40, 100], target: [0, 0, 0] },
    L3: { position: [0, 30, 80], target: [0, 0, 0] },
  };
  
  export function useLevelTransition() {
    const { camera } = useThree();
    const { currentLevel } = useConstellationStore();
    
    useEffect(() => {
      const targetConfig = LEVEL_CAMERAS[currentLevel];
      
      // Animate with lerp
      gsap.to(camera.position, {
        x: targetConfig.position[0],
        y: targetConfig.position[1],
        z: targetConfig.position[2],
        duration: 0.8,
        ease: 'power2.inOut',
      });
    }, [currentLevel]);
  }
  ```

- [x] Add fade effect for non-relevant elements during transition

**Acceptance Criteria:**
- Camera smoothly animates between levels
- No jarring jumps
- Elements fade appropriately

---

### M11E.3: Breadcrumb Component

**Tasks:**
- [x] Create `ConstellationBreadcrumb.tsx`:
  ```typescript
  export function ConstellationBreadcrumb() {
    const { currentLevel, l2Context, l3Context, navigateToL1, navigateToL2 } = useConstellationStore();
    
    const items = [
      { label: 'Ecosystem', onClick: navigateToL1, active: currentLevel === 'L1' },
    ];
    
    if (l2Context) {
      items.push({
        label: CHANNEL_LABELS[l2Context.channelId],
        onClick: () => navigateToL2(l2Context.channelId),
        active: currentLevel === 'L2',
      });
    }
    
    if (l3Context) {
      items.push({
        label: getCampaignName(l3Context.campaignId),
        onClick: null, // Current level, no action
        active: true,
      });
    }
    
    return (
      <nav className="flex items-center gap-2 text-sm">
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
            <button
              onClick={item.onClick || undefined}
              className={cn(
                "transition-colors",
                item.active 
                  ? "text-slate-900 font-medium" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {item.label}
            </button>
          </React.Fragment>
        ))}
      </nav>
    );
  }
  ```

**Acceptance Criteria:**
- Breadcrumb shows current navigation path
- Clicking parent levels navigates back
- Current level not clickable

---

### M11E.4: Integration with Phase 10H Controls

**Tasks:**
- [x] Update `ZoomControlsOverlay.tsx` to work with new level system
- [x] Update `NorthStarButton.tsx`:
  - L1: Return to default L1 camera position
  - L2: Return to channel nucleus center
  - L3: Return to campaign center
- [x] Update keyboard shortcuts to navigate levels

**Acceptance Criteria:**
- +/- buttons work across all levels
- North star respects current level context
- Keyboard shortcuts functional

---

## Phase 11F: Story Mode Integration

**Goal:** Ensure existing story mode works with new hierarchy  
**Effort:** 3-4 hours  
**Dependencies:** Phase 11E

### M11F.1: Story Beat Updates

**Tasks:**
- [x] Update story beats to reference new hierarchy:
  ```typescript
  const STORY_BEATS: StoryBeat[] = [
    {
      id: 'beat-1',
      headline: 'Your HCP Universe at a Glance',
      level: 'L1',
      cameraPosition: [0, 80, 200],
      deepDive: '2,500 HCPs across 5 channels...',
    },
    {
      id: 'beat-2',
      headline: 'Email: Your Workhorse Channel',
      level: 'L2',
      channelFocus: 'email',
      cameraPosition: [0, 40, 100],
      deepDive: '1,925 HCPs, but fatigue is building...',
    },
    // ... etc
  ];
  ```

- [x] Story mode navigates through levels during playback
- [x] Visual focus highlights relevant elements at each level

**Acceptance Criteria:**
- Story mode plays through new hierarchy
- Camera transitions match story beats
- Back to free exploration returns to appropriate level

---

## Summary

| Phase | Description | Effort | Dependencies |
|-------|-------------|--------|--------------|
| 11A | Data Layer & Mock Generation | 4-6h | None |
| 11B | L1 Solar System View | 10-14h | 11A |
| 11C | L2 Campaign Orbit View | 8-10h | 11B |
| 11D | L3 HCP Constellation View | 6-8h | 11C |
| 11E | Navigation & Transitions | 4-6h | 11B, 11C, 11D |
| 11F | Story Mode Integration | 3-4h | 11E |
| **Total** | | **35-48h** | |

---

## Files Created/Modified

### New Files
```
client/src/lib/constellation/
├── mockData/
│   ├── themes.json
│   ├── campaigns.json
│   ├── channelOverlap.json
│   └── channelKPIs.json
├── dataService.ts
├── specialtyIcons.ts
└── shaders/
    ├── nucleusVertex.glsl
    └── nucleusFragment.glsl

client/src/components/constellation/
├── HCPNucleus.tsx
├── ChannelPlanet.tsx
├── ChannelEdges.tsx
├── ChannelTooltip.tsx
├── L2CampaignOrbit.tsx
├── CampaignNode.tsx
├── CampaignTooltip.tsx
├── HCPTooltip.tsx
├── ConstellationBreadcrumb.tsx
├── Sparkline.tsx
├── TrendIcon.tsx
└── AdoptionBadge.tsx
```

### Modified Files
```
shared/schema.ts (add messaging_themes, campaign_themes, channel_overlap)
client/src/stores/constellationStore.ts (level navigation state)
client/src/components/constellation/NodeInstances.tsx (specialty colors)
client/src/components/constellation/StoryNarrationHUD.tsx (level-aware beats)
client/src/pages/ecosystem-explorer.tsx (integrate new components)
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Performance regression with 3 render levels | Lazy load L2/L3 components, dispose unused geometries |
| Tooltip data fetching latency | Pre-load on hover intent (mousemove near node) |
| Shader complexity on nucleus | Start with simple noise, upgrade if GPU budget allows |
| State complexity across levels | Use Zustand persist for navigation history |
| Story mode conflicts with manual navigation | Pause story mode on any manual interaction |

---

## The Bigger Picture

You're not building a dashboard. You're building a **belief state visualizer**.

The nucleus isn't decoration — it's a statement: *"The HCP is the center of gravity. Everything else orbits in service of moving them."*

This inverts the typical pharma mindset of "how many impressions" to "what pressure is acting on this belief system."

That's the differentiation. That's what makes this not-Veeva.

---

*Ready for Claude Code CLI execution. Begin with Phase 11A (data layer) to establish foundation.*
