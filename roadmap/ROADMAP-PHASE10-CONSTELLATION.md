# ROADMAP: TwinEngine Phase 10 — Constellation Visualization

**Goal:** Build a high-performance 3D ecosystem visualization enabling pharma clients to explore promotional networks from 30,000-foot ecosystem views down to individual HCP engagement granularity  
**Target:** Demo-ready "Nebula" visualization with semantic zoom, diagnostic overlays, and scroll-linked storytelling  
**Mode:** Milestone-based (Supervised Autonomous)  
**Prerequisite:** None (standalone visual layer, can integrate with existing data later)  
**Generated:** 2025-01-17

---

## Executive Summary

Phase 10 introduces a WebGL-powered constellation visualization that renders 2,500+ HCP nodes at 60fps. This is the "wow factor" differentiator that positions TwinEngine as the "Figma of pharma marketing" rather than another clinical dashboard.

The architecture prioritizes:
1. **Performance** — InstancedMesh renders thousands of nodes as a single GPU call
2. **Responsiveness** — d3-force-3d physics runs in a Web Worker, never blocking the main thread
3. **Scalability** — Pattern supports 150K+ nodes with progressive loading
4. **Brand Differentiation** — Custom ShaderMaterial creates the "neural/synapse" aesthetic

---

## Architecture: Constellation Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CONSTELLATION VISUALIZATION                         │
│                         (Phase 10 Addition)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        React Layer                               │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │    │
│  │  │  Zustand    │  │  Story Mode │  │    HCP Detail Panel     │  │    │
│  │  │   Store     │  │  Controller │  │   (Glassmorphic HUD)    │  │    │
│  │  │             │  │             │  │                         │  │    │
│  │  │ • hovered   │  │ • scroll    │  │ • Name, Specialty       │  │    │
│  │  │ • selected  │  │ • progress  │  │ • Engagement Score      │  │    │
│  │  │ • zoomLevel │  │ • narrative │  │ • Channel Breakdown     │  │    │
│  │  │ • filters   │  │ • autoplay  │  │ • Diagnostic Flags      │  │    │
│  │  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │    │
│  │         │                │                      │                │    │
│  └─────────┼────────────────┼──────────────────────┼────────────────┘    │
│            │                │                      │                     │
│            ▼                ▼                      ▼                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   React Three Fiber Canvas                       │    │
│  │                                                                  │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │    │
│  │  │  InstancedMesh │  │  Edge Lines    │  │   Environment    │  │    │
│  │  │  (2,500 nodes) │  │  (BufferGeom)  │  │   (Fog, HDRI)    │  │    │
│  │  │                │  │                │  │                  │  │    │
│  │  │  ShaderMaterial│  │  Pulse Anim    │  │  OrbitControls   │  │    │
│  │  │  • Glow halo   │  │  • Flow speed  │  │  • Zoom limits   │  │    │
│  │  │  • Status color│  │  • Opacity     │  │  • Pan bounds    │  │    │
│  │  │  • Shiver FX   │  │  • Dash array  │  │                  │  │    │
│  │  └───────┬────────┘  └───────┬────────┘  └──────────────────┘  │    │
│  │          │                   │                                  │    │
│  │          └─────────┬─────────┘                                  │    │
│  │                    │                                            │    │
│  │             ┌──────▼──────┐                                     │    │
│  │             │  Raycaster  │ ← Hover detection on instanced mesh │    │
│  │             └─────────────┘                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│                                 ▲                                        │
│                                 │ postMessage (positions only)           │
│                                 │                                        │
│  ┌─────────────────────────────┴───────────────────────────────────┐    │
│  │                        Web Worker                                │    │
│  │                                                                  │    │
│  │  ┌────────────────────────────────────────────────────────────┐ │    │
│  │  │                    d3-force-3d Simulation                   │ │    │
│  │  │                                                            │ │    │
│  │  │  • forceManyBody() — node repulsion                        │ │    │
│  │  │  • forceLink() — edge attraction                           │ │    │
│  │  │  • forceCenter() — gravity toward origin                   │ │    │
│  │  │  • forceCollide() — prevent overlap                        │ │    │
│  │  │                                                            │ │    │
│  │  │  Outputs: Float32Array of [x, y, z] per node               │ │    │
│  │  └────────────────────────────────────────────────────────────┘ │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## New Dependencies

| Package | Purpose | Bundle Size | Risk |
|---------|---------|-------------|------|
| `three` | 3D rendering engine | ~150KB gzipped | Low (industry standard) |
| `@react-three/fiber` | React renderer for Three.js | ~40KB | Low (maintained by Poimandres) |
| `@react-three/drei` | R3F helpers (OrbitControls, etc.) | ~30KB (tree-shakeable) | Low |
| `d3-force-3d` | 3D force simulation | ~25KB | Low (extension of d3-force) |
| `zustand` | Lightweight state management | ~3KB | Low (React team recommended) |

**Total Bundle Impact:** ~250KB gzipped (acceptable for visualization-heavy feature)

**Installation Command:**
```bash
npm install three @react-three/fiber @react-three/drei d3-force-3d zustand
npm install -D @types/three
```

---

## Hardcoded Demo Scenario

For the initial demo, we hardcode a pharma-realistic scenario representing "Digital Fatigue vs. Physical Access":

| Level | Channel Focus | Status | Node Count | Visual Treatment |
|-------|---------------|--------|------------|------------------|
| L1 | Conferences & Webinars | Healthy (60%) | ~1,500 | Green pulsing halo, thick flow lines |
| L2 | Email / Digital | Warning (25%) | ~625 | Amber static glow, thin flow lines |
| L2 | Field Force / MSLs | Critical (15%) | ~375 | Red shivering nodes, broken/dashed lines |
| L3 | Individual HCPs | Mixed | 2,500 total | Inherits parent channel status |

---

## Phase 10A: Foundation Infrastructure

**Goal:** Establish React Three Fiber canvas, Web Worker physics loop, and dedicated navigation entry  
**Effort Estimate:** 10-12 hours  
**Dependencies:** None

### Why This First

The physics simulation and rendering pipeline are the architectural foundation. Everything else (semantic zoom, diagnostics, storytelling) builds on this.

---

### M10A.1: Project Setup & Dependencies

**Tasks:**
- [ ] Install Three.js ecosystem: `three`, `@react-three/fiber`, `@react-three/drei`
- [ ] Install physics: `d3-force-3d`
- [ ] Install state: `zustand`
- [ ] Install types: `@types/three`
- [ ] Create directory structure:
  ```
  client/src/
  ├── pages/
  │   └── ecosystem-explorer.tsx           # New dedicated page
  ├── components/
  │   └── constellation/
  │       ├── ConstellationCanvas.tsx      # R3F Canvas wrapper
  │       ├── NodeInstances.tsx            # InstancedMesh component
  │       ├── EdgeLines.tsx                # BufferGeometry edges
  │       ├── Environment.tsx              # Fog, lighting, controls
  │       ├── HoverDetector.tsx            # Raycaster logic
  │       ├── HCPDetailPanel.tsx           # Glassmorphic detail sidebar
  │       ├── StoryNarrationHUD.tsx        # Headline/DeepDive narrative
  │       └── StoryCameraController.tsx    # Beat-driven camera animation
  ├── workers/
  │   └── physics.worker.ts                # d3-force-3d simulation
  ├── stores/
  │   ├── constellationStore.ts            # Zustand state (nodes, zoom, hover)
  │   └── storyStore.ts                    # Zustand state (beats, narrative)
  └── lib/
      └── constellation/
          ├── types.ts                     # TypeScript interfaces
          ├── mockData.ts                  # Demo scenario data
          └── shaders/                     # GLSL shader files
              ├── nodeGlow.vert
              └── nodeGlow.frag
  ```
- [ ] Configure Vite for Web Worker bundling (verify `?worker` import works)
- [ ] Add `"skipLibCheck": true` to tsconfig if Three.js types conflict

**Acceptance Criteria:**
- All dependencies install without conflicts
- Empty R3F canvas renders without errors
- Web Worker can be instantiated from main thread

---

### M10A.2: Ecosystem Explorer Page & Navigation

**Goal:** Create dedicated section in platform navigation — this is a standalone feature, not embedded in existing modules

**Files:**
- `client/src/pages/ecosystem-explorer.tsx` — Main page component
- `client/src/components/layout/sidebar.tsx` — Navigation update (or equivalent nav component)

**Tasks:**
- [ ] Create new page at `client/src/pages/ecosystem-explorer.tsx`:
  ```typescript
  import { Suspense, lazy } from 'react';
  import { motion } from 'framer-motion';
  import { Compass, Play, Pause, Maximize2, Info } from 'lucide-react';
  import { useConstellationStore } from '@/stores/constellationStore';
  import { useStoryStore } from '@/stores/storyStore';
  import { Button } from '@/components/ui/button';
  import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
  
  // Lazy load the heavy 3D canvas to avoid blocking initial bundle
  const ConstellationCanvas = lazy(() => 
    import('@/components/constellation/ConstellationCanvas')
      .then(m => ({ default: m.ConstellationCanvas }))
  );
  const StoryNarrationHUD = lazy(() => 
    import('@/components/constellation/StoryNarrationHUD')
      .then(m => ({ default: m.StoryNarrationHUD }))
  );
  const HCPDetailPanel = lazy(() => 
    import('@/components/constellation/HCPDetailPanel')
      .then(m => ({ default: m.HCPDetailPanel }))
  );
  
  export default function EcosystemExplorerPage() {
    const { storyModeActive, toggleStoryMode } = useConstellationStore();
    const { isPlaying, togglePlayback } = useStoryStore();
    
    return (
      <div className="h-screen w-full bg-slate-950 relative overflow-hidden">
        {/* Header Bar */}
        <header className="absolute top-0 left-0 right-0 z-20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                <Compass className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Ecosystem Explorer</h1>
                <p className="text-xs text-slate-400">
                  {storyModeActive ? 'Story Mode' : 'Free Exploration'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Story Mode Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={storyModeActive ? "default" : "outline"}
                    size="sm"
                    onClick={toggleStoryMode}
                    className={storyModeActive 
                      ? "bg-purple-600 hover:bg-purple-700" 
                      : "border-slate-700 text-slate-300"
                    }
                  >
                    {storyModeActive ? (
                      <>
                        <Maximize2 className="w-4 h-4 mr-2" />
                        Exit Story
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Story Mode
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {storyModeActive 
                    ? 'Return to free exploration' 
                    : 'Start guided narrative tour'
                  }
                </TooltipContent>
              </Tooltip>
              
              {/* Info Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-slate-400">
                    <Info className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    <strong>Controls:</strong><br />
                    • Scroll to zoom<br />
                    • Click + drag to rotate<br />
                    • Right-click + drag to pan<br />
                    • Hover nodes for details
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>
        
        {/* 3D Canvas (Full Screen) */}
        <Suspense fallback={<ConstellationLoadingState />}>
          <ConstellationCanvas />
        </Suspense>
        
        {/* Overlays */}
        <Suspense fallback={null}>
          <HCPDetailPanel />
          {storyModeActive && <StoryNarrationHUD />}
        </Suspense>
        
        {/* Zoom Level Indicator (bottom left) */}
        <ZoomLevelIndicator />
      </div>
    );
  }
  
  function ConstellationLoadingState() {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <p className="text-slate-400">Initializing constellation...</p>
          <p className="text-xs text-slate-500 mt-1">Loading 2,500 HCP nodes</p>
        </motion.div>
      </div>
    );
  }
  
  function ZoomLevelIndicator() {
    const zoomLevel = useConstellationStore((s) => s.zoomLevel);
    
    const labels = {
      ecosystem: 'Ecosystem View',
      campaign: 'Campaign View',
      hcp: 'HCP Detail View',
    };
    
    return (
      <div className="absolute bottom-4 left-4 z-20">
        <div className="px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur border border-slate-700/50">
          <span className="text-xs text-slate-400">{labels[zoomLevel]}</span>
        </div>
      </div>
    );
  }
  ```

- [ ] Add route in `client/src/App.tsx` (or router config):
  ```typescript
  // Add to existing routes
  import { lazy } from 'react';
  
  const EcosystemExplorer = lazy(() => import('@/pages/ecosystem-explorer'));
  
  // In router configuration:
  <Route path="/ecosystem" component={EcosystemExplorer} />
  ```

- [ ] Add navigation entry in sidebar (find existing nav component):
  ```typescript
  // Add to navigation items array
  {
    label: 'Ecosystem Explorer',
    href: '/ecosystem',
    icon: Compass, // from lucide-react
    badge: 'New', // Optional: highlight as new feature
    description: 'Interactive 3D constellation view',
  }
  ```

- [ ] Position in navigation:
  - Place **after** Dashboard but **before** operational tools (Audiences, Campaigns, etc.)
  - This is a strategic/exploration tool, not a workflow tool
  - Consider grouping under "Insights" or "Analytics" section if nav is grouped

- [ ] Add feature flag (optional but recommended):
  ```typescript
  // In feature flags or config
  FEATURE_FLAGS.ECOSYSTEM_EXPLORER = true;
  
  // In nav, conditionally render:
  {FEATURE_FLAGS.ECOSYSTEM_EXPLORER && (
    <NavItem href="/ecosystem" icon={Compass} label="Ecosystem Explorer" />
  )}
  ```

**Acceptance Criteria:**
- New "Ecosystem Explorer" appears in sidebar navigation
- Route `/ecosystem` loads the page
- Page has header with title, story mode toggle, and controls info
- Loading state displays while 3D canvas initializes
- Zoom level indicator shows current view depth
- Page is isolated — does not interfere with existing modules

---

### M10A.3: Zustand State Store

**File:** `client/src/stores/constellationStore.ts`

**Tasks:**
- [ ] Create constellation store with Zustand:
  ```typescript
  import { create } from 'zustand';
  
  export type NodeStatus = 'healthy' | 'warning' | 'critical';
  export type ZoomLevel = 'ecosystem' | 'campaign' | 'hcp';
  
  export interface ConstellationNode {
    id: string;
    label: string;
    type: 'channel' | 'campaign' | 'hcp';
    status: NodeStatus;
    engagementScore: number;
    channel?: string;
    specialty?: string;
    // Position updated by worker
    position: [number, number, number];
  }
  
  export interface ConstellationEdge {
    id: string;
    source: string;
    target: string;
    weight: number;
  }
  
  interface ConstellationState {
    // Data
    nodes: ConstellationNode[];
    edges: ConstellationEdge[];
    
    // Interaction
    hoveredNodeId: string | null;
    selectedNodeId: string | null;
    zoomLevel: ZoomLevel;
    
    // Story Mode
    storyModeActive: boolean;
    storyProgress: number; // 0-1
    narrativeText: string;
    
    // Actions
    setNodes: (nodes: ConstellationNode[]) => void;
    updatePositions: (positions: Float32Array) => void;
    setHoveredNode: (id: string | null) => void;
    setSelectedNode: (id: string | null) => void;
    setZoomLevel: (level: ZoomLevel) => void;
    toggleStoryMode: () => void;
    setStoryProgress: (progress: number) => void;
  }
  
  export const useConstellationStore = create<ConstellationState>((set, get) => ({
    nodes: [],
    edges: [],
    hoveredNodeId: null,
    selectedNodeId: null,
    zoomLevel: 'ecosystem',
    storyModeActive: false,
    storyProgress: 0,
    narrativeText: '',
    
    setNodes: (nodes) => set({ nodes }),
    
    updatePositions: (positions) => {
      const nodes = get().nodes.map((node, i) => ({
        ...node,
        position: [
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2],
        ] as [number, number, number],
      }));
      set({ nodes });
    },
    
    setHoveredNode: (id) => set({ hoveredNodeId: id }),
    setSelectedNode: (id) => set({ selectedNodeId: id }),
    setZoomLevel: (level) => set({ zoomLevel: level }),
    toggleStoryMode: () => set((s) => ({ storyModeActive: !s.storyModeActive })),
    setStoryProgress: (progress) => set({ storyProgress: progress }),
  }));
  ```
- [ ] Export selectors for common queries (hoveredNode, nodesByStatus, etc.)
- [ ] Add devtools middleware for debugging: `devtools(persist(...))`

**Acceptance Criteria:**
- Store initializes without errors
- Can set/get all state properties
- Position updates don't cause full re-renders (verify with React DevTools)

---

### M10A.4: Mock Data Generator

**File:** `client/src/lib/constellation/mockData.ts`

**Tasks:**
- [ ] Create mock data generator matching demo scenario:
  ```typescript
  import { ConstellationNode, ConstellationEdge, NodeStatus } from '@/stores/constellationStore';
  
  const CHANNELS = {
    webinar: { name: 'Webinars & Conferences', status: 'healthy' as NodeStatus, weight: 0.6 },
    email: { name: 'Email / Digital', status: 'warning' as NodeStatus, weight: 0.25 },
    field: { name: 'Field Force / MSLs', status: 'critical' as NodeStatus, weight: 0.15 },
  };
  
  const SPECIALTIES = [
    'Oncology', 'Cardiology', 'Neurology', 'Endocrinology', 
    'Rheumatology', 'Gastroenterology', 'Pulmonology', 'Dermatology'
  ];
  
  export function generateMockConstellation(nodeCount: number = 2500): {
    nodes: ConstellationNode[];
    edges: ConstellationEdge[];
  } {
    const nodes: ConstellationNode[] = [];
    const edges: ConstellationEdge[] = [];
    
    // Create channel nodes (L1)
    Object.entries(CHANNELS).forEach(([key, channel]) => {
      nodes.push({
        id: `channel-${key}`,
        label: channel.name,
        type: 'channel',
        status: channel.status,
        engagementScore: channel.status === 'healthy' ? 0.85 : 
                         channel.status === 'warning' ? 0.45 : 0.15,
        position: [0, 0, 0],
      });
    });
    
    // Create HCP nodes (L3) with weighted distribution
    let hcpIndex = 0;
    Object.entries(CHANNELS).forEach(([channelKey, channel]) => {
      const count = Math.floor(nodeCount * channel.weight);
      
      for (let i = 0; i < count && hcpIndex < nodeCount; i++) {
        const hcpId = `hcp-${hcpIndex}`;
        
        // Add some variance to status within channel
        let status = channel.status;
        const variance = Math.random();
        if (channel.status === 'healthy' && variance < 0.1) status = 'warning';
        if (channel.status === 'warning' && variance < 0.2) status = 'critical';
        if (channel.status === 'critical' && variance < 0.1) status = 'warning';
        
        nodes.push({
          id: hcpId,
          label: `Dr. ${generateName(hcpIndex)}`,
          type: 'hcp',
          status,
          engagementScore: generateEngagementScore(status),
          channel: channelKey,
          specialty: SPECIALTIES[hcpIndex % SPECIALTIES.length],
          position: [0, 0, 0], // Will be computed by physics
        });
        
        // Connect HCP to their channel
        edges.push({
          id: `edge-${channelKey}-${hcpId}`,
          source: `channel-${channelKey}`,
          target: hcpId,
          weight: Math.random() * 0.5 + 0.5,
        });
        
        hcpIndex++;
      }
    });
    
    return { nodes, edges };
  }
  
  function generateName(index: number): string {
    const firstNames = ['Smith', 'Johnson', 'Chen', 'Garcia', 'Kim', 'Patel', 'Williams', 'Brown'];
    const lastInits = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];
    return `${firstNames[index % firstNames.length]} ${lastInits[index % lastInits.length]}.`;
  }
  
  function generateEngagementScore(status: NodeStatus): number {
    switch (status) {
      case 'healthy': return 0.7 + Math.random() * 0.3;
      case 'warning': return 0.3 + Math.random() * 0.4;
      case 'critical': return Math.random() * 0.3;
    }
  }
  ```
- [ ] Add type exports for downstream components
- [ ] Verify 2,500 nodes generate in <50ms

**Acceptance Criteria:**
- Generates correct distribution (60/25/15 split)
- Each HCP has channel assignment and status
- Edges connect HCPs to parent channels

---

### M10A.5: Physics Web Worker

**File:** `client/src/workers/physics.worker.ts`

**Tasks:**
- [ ] Implement d3-force-3d simulation in Web Worker:
  ```typescript
  import { 
    forceSimulation, 
    forceManyBody, 
    forceLink, 
    forceCenter,
    forceCollide 
  } from 'd3-force-3d';
  
  interface WorkerNode {
    id: string;
    x?: number;
    y?: number;
    z?: number;
    fx?: number | null; // Fixed position (for pinned nodes)
    fy?: number | null;
    fz?: number | null;
  }
  
  interface WorkerEdge {
    source: string | WorkerNode;
    target: string | WorkerNode;
    weight: number;
  }
  
  interface InitMessage {
    type: 'init';
    nodes: WorkerNode[];
    edges: WorkerEdge[];
  }
  
  interface TickMessage {
    type: 'tick';
  }
  
  interface StopMessage {
    type: 'stop';
  }
  
  type IncomingMessage = InitMessage | TickMessage | StopMessage;
  
  let simulation: ReturnType<typeof forceSimulation> | null = null;
  let nodes: WorkerNode[] = [];
  
  self.onmessage = (e: MessageEvent<IncomingMessage>) => {
    const { type } = e.data;
    
    switch (type) {
      case 'init': {
        const { nodes: initNodes, edges } = e.data as InitMessage;
        nodes = initNodes.map(n => ({ ...n }));
        
        simulation = forceSimulation(nodes, 3) // 3D simulation
          .force('charge', forceManyBody().strength(-30).distanceMax(200))
          .force('link', forceLink(edges)
            .id((d: any) => d.id)
            .distance(50)
            .strength((link: any) => link.weight * 0.5))
          .force('center', forceCenter(0, 0, 0))
          .force('collide', forceCollide().radius(5).strength(0.7))
          .alphaDecay(0.02)
          .on('tick', () => {
            // Send positions back to main thread
            const positions = new Float32Array(nodes.length * 3);
            nodes.forEach((node, i) => {
              positions[i * 3] = node.x ?? 0;
              positions[i * 3 + 1] = node.y ?? 0;
              positions[i * 3 + 2] = node.z ?? 0;
            });
            self.postMessage({ type: 'positions', positions }, [positions.buffer]);
          })
          .on('end', () => {
            self.postMessage({ type: 'settled' });
          });
        
        break;
      }
      
      case 'tick': {
        simulation?.tick();
        break;
      }
      
      case 'stop': {
        simulation?.stop();
        break;
      }
    }
  };
  ```
- [ ] Add message types for position updates (transferable Float32Array)
- [ ] Add reheat/restart capability for zoom transitions
- [ ] Verify worker doesn't block main thread (test with performance.now())

**Acceptance Criteria:**
- Worker initializes with node/edge data
- Sends position updates via postMessage
- Positions converge to stable layout within 3 seconds
- Main thread stays at 60fps during simulation

---

### M10A.6: React Three Fiber Canvas Setup

**File:** `client/src/components/constellation/ConstellationCanvas.tsx`

**Tasks:**
- [ ] Create base R3F canvas component:
  ```typescript
  import { Canvas } from '@react-three/fiber';
  import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
  import { Suspense, useEffect, useRef } from 'react';
  import { useConstellationStore } from '@/stores/constellationStore';
  import { generateMockConstellation } from '@/lib/constellation/mockData';
  import { NodeInstances } from './NodeInstances';
  import { EdgeLines } from './EdgeLines';
  import { Environment } from './Environment';
  
  // Import worker
  import PhysicsWorker from '@/workers/physics.worker?worker';
  
  export function ConstellationCanvas() {
    const workerRef = useRef<Worker | null>(null);
    const { setNodes, updatePositions } = useConstellationStore();
    
    useEffect(() => {
      // Initialize worker
      workerRef.current = new PhysicsWorker();
      
      // Generate mock data
      const { nodes, edges } = generateMockConstellation(2500);
      setNodes(nodes);
      
      // Send to worker for physics
      workerRef.current.postMessage({
        type: 'init',
        nodes: nodes.map(n => ({ id: n.id })),
        edges: edges.map(e => ({ 
          source: e.source, 
          target: e.target, 
          weight: e.weight 
        })),
      });
      
      // Listen for position updates
      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'positions') {
          updatePositions(e.data.positions);
        }
      };
      
      return () => {
        workerRef.current?.postMessage({ type: 'stop' });
        workerRef.current?.terminate();
      };
    }, []);
    
    return (
      <div className="w-full h-full bg-slate-950">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 300]} fov={60} />
          <Suspense fallback={null}>
            <Environment />
            <NodeInstances />
            <EdgeLines />
          </Suspense>
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={50}
            maxDistance={500}
          />
        </Canvas>
      </div>
    );
  }
  ```
- [ ] Add loading state while physics settles
- [ ] Add error boundary for WebGL failures
- [ ] Verify canvas is responsive (fills parent container)

**Acceptance Criteria:**
- Canvas renders with dark background
- OrbitControls allow pan/zoom/rotate
- Worker connection established
- No console errors

---

## Phase 10B: Node Rendering

**Goal:** Render 2,500 nodes efficiently with status-based coloring  
**Effort Estimate:** 10-12 hours  
**Dependencies:** Phase 10A complete

---

### M10B.1: InstancedMesh Node Renderer

**File:** `client/src/components/constellation/NodeInstances.tsx`

**Tasks:**
- [ ] Implement InstancedMesh for all HCP nodes:
  ```typescript
  import { useRef, useMemo, useEffect } from 'react';
  import { InstancedMesh, Object3D, Color } from 'three';
  import { useFrame } from '@react-three/fiber';
  import { useConstellationStore } from '@/stores/constellationStore';
  
  const STATUS_COLORS = {
    healthy: new Color('#22c55e'),  // Green
    warning: new Color('#f59e0b'),  // Amber
    critical: new Color('#ef4444'), // Red
  };
  
  const tempObject = new Object3D();
  const tempColor = new Color();
  
  export function NodeInstances() {
    const meshRef = useRef<InstancedMesh>(null);
    const nodes = useConstellationStore((s) => s.nodes);
    const hcpNodes = useMemo(() => nodes.filter(n => n.type === 'hcp'), [nodes]);
    
    // Update instance matrices when positions change
    useEffect(() => {
      if (!meshRef.current) return;
      
      hcpNodes.forEach((node, i) => {
        tempObject.position.set(...node.position);
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
        
        // Set color based on status
        tempColor.copy(STATUS_COLORS[node.status]);
        meshRef.current!.setColorAt(i, tempColor);
      });
      
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }, [hcpNodes]);
    
    // Animate critical nodes (shiver effect)
    useFrame((state) => {
      if (!meshRef.current) return;
      
      hcpNodes.forEach((node, i) => {
        if (node.status === 'critical') {
          const shiver = Math.sin(state.clock.elapsedTime * 20 + i) * 0.5;
          tempObject.position.set(
            node.position[0] + shiver,
            node.position[1] + shiver * 0.5,
            node.position[2]
          );
          tempObject.updateMatrix();
          meshRef.current!.setMatrixAt(i, tempObject.matrix);
        }
      });
      
      meshRef.current.instanceMatrix.needsUpdate = true;
    });
    
    return (
      <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, hcpNodes.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>
    );
  }
  ```
- [ ] Optimize with `frustumCulled={false}` for stable instancing
- [ ] Verify 60fps with 2,500 instances (check with Stats.js)
- [ ] Add size variation based on engagement score

**Acceptance Criteria:**
- All 2,500 nodes render
- Colors match status (green/amber/red)
- Critical nodes visibly "shiver"
- Stable 60fps on M1+ Mac / modern GPU

---

### M10B.2: Glow Shader Material

**Files:** 
- `client/src/lib/constellation/shaders/nodeGlow.vert`
- `client/src/lib/constellation/shaders/nodeGlow.frag`

**Tasks:**
- [ ] Create vertex shader for instanced geometry:
  ```glsl
  // nodeGlow.vert
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vColor;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vColor = instanceColor;
    
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
  ```
- [ ] Create fragment shader with soft glow/halo effect:
  ```glsl
  // nodeGlow.frag
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vColor;
  
  uniform float time;
  uniform float glowIntensity;
  
  void main() {
    // Calculate fresnel for edge glow
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);
    
    // Pulsing effect for healthy nodes
    float pulse = sin(time * 2.0) * 0.2 + 0.8;
    
    // Core color
    vec3 coreColor = vColor;
    
    // Glow color (brighter version)
    vec3 glowColor = vColor * 1.5;
    
    // Mix based on fresnel
    vec3 finalColor = mix(coreColor, glowColor, fresnel * glowIntensity * pulse);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
  ```
- [ ] Create ShaderMaterial wrapper component
- [ ] Add time uniform for animation
- [ ] Test with varying glowIntensity per status

**Acceptance Criteria:**
- Nodes have soft halo/aura effect
- Healthy nodes pulse gently
- Glow visible but not overwhelming
- No shader compilation errors

---

### M10B.3: Raycaster Hover Detection

**File:** `client/src/components/constellation/HoverDetector.tsx`

**Tasks:**
- [ ] Implement raycasting for InstancedMesh:
  ```typescript
  import { useRef, useCallback } from 'react';
  import { useFrame, useThree } from '@react-three/fiber';
  import { Raycaster, Vector2, InstancedMesh } from 'three';
  import { useConstellationStore } from '@/stores/constellationStore';
  
  export function HoverDetector({ meshRef }: { meshRef: React.RefObject<InstancedMesh> }) {
    const { camera, gl } = useThree();
    const raycaster = useRef(new Raycaster());
    const pointer = useRef(new Vector2());
    const nodes = useConstellationStore((s) => s.nodes);
    const setHoveredNode = useConstellationStore((s) => s.setHoveredNode);
    
    const onPointerMove = useCallback((event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }, [gl]);
    
    useFrame(() => {
      if (!meshRef.current) return;
      
      raycaster.current.setFromCamera(pointer.current, camera);
      const intersects = raycaster.current.intersectObject(meshRef.current);
      
      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const hcpNodes = nodes.filter(n => n.type === 'hcp');
        const hoveredNode = hcpNodes[intersects[0].instanceId];
        setHoveredNode(hoveredNode?.id ?? null);
      } else {
        setHoveredNode(null);
      }
    });
    
    // Attach listener
    useEffect(() => {
      gl.domElement.addEventListener('pointermove', onPointerMove);
      return () => gl.domElement.removeEventListener('pointermove', onPointerMove);
    }, [gl, onPointerMove]);
    
    return null;
  }
  ```
- [ ] Add visual highlight for hovered node (scale up, brighter)
- [ ] Debounce hover updates to prevent jitter
- [ ] Add click handler for selection

**Acceptance Criteria:**
- Hovering over a node updates Zustand store
- Correct node ID detected (not off-by-one)
- Performance stays at 60fps during hover

---

### M10B.4: HCP Detail Panel (HUD)

**File:** `client/src/components/constellation/HCPDetailPanel.tsx`

**Tasks:**
- [ ] Create glassmorphic detail panel:
  ```typescript
  import { useConstellationStore } from '@/stores/constellationStore';
  import { cn } from '@/lib/utils';
  
  export function HCPDetailPanel() {
    const hoveredNodeId = useConstellationStore((s) => s.hoveredNodeId);
    const nodes = useConstellationStore((s) => s.nodes);
    const hoveredNode = nodes.find(n => n.id === hoveredNodeId);
    
    if (!hoveredNode || hoveredNode.type !== 'hcp') return null;
    
    const statusColors = {
      healthy: 'text-green-400 bg-green-500/20',
      warning: 'text-amber-400 bg-amber-500/20',
      critical: 'text-red-400 bg-red-500/20',
    };
    
    return (
      <div className={cn(
        "absolute top-4 right-4 w-80 p-4 rounded-xl",
        "bg-slate-900/80 backdrop-blur-xl border border-slate-700/50",
        "shadow-2xl shadow-black/50",
        "animate-in fade-in slide-in-from-right-4 duration-200"
      )}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{hoveredNode.label}</h3>
            <p className="text-sm text-slate-400">{hoveredNode.specialty}</p>
          </div>
          <span className={cn(
            "px-2 py-1 rounded-full text-xs font-medium capitalize",
            statusColors[hoveredNode.status]
          )}>
            {hoveredNode.status}
          </span>
        </div>
        
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              Engagement Score
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    hoveredNode.status === 'healthy' ? 'bg-green-500' :
                    hoveredNode.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${hoveredNode.engagementScore * 100}%` }}
                />
              </div>
              <span className="text-sm text-slate-300 tabular-nums">
                {Math.round(hoveredNode.engagementScore * 100)}%
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              Primary Channel
            </p>
            <p className="text-sm text-slate-300 capitalize">
              {hoveredNode.channel?.replace('-', ' ')}
            </p>
          </div>
        </div>
      </div>
    );
  }
  ```
- [ ] Add animation on appear/disappear
- [ ] Match glassmorphism to Omnivor Labs style guide
- [ ] Test with rapid hover changes (no flicker)

**Acceptance Criteria:**
- Panel appears when hovering over HCP node
- Shows name, specialty, status, engagement score, channel
- Smooth animation on enter/exit
- Glassmorphic styling matches brand

---

## Phase 10C: Edge Rendering & Flow Animation

**Goal:** Visualize connections between nodes with animated data flow  
**Effort Estimate:** 6-8 hours  
**Dependencies:** Phase 10B complete

---

### M10C.1: Edge BufferGeometry

**File:** `client/src/components/constellation/EdgeLines.tsx`

**Tasks:**
- [ ] Create efficient edge rendering with BufferGeometry:
  ```typescript
  import { useMemo, useRef } from 'react';
  import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial } from 'three';
  import { useFrame } from '@react-three/fiber';
  import { useConstellationStore } from '@/stores/constellationStore';
  
  export function EdgeLines() {
    const nodes = useConstellationStore((s) => s.nodes);
    const edges = useConstellationStore((s) => s.edges);
    const lineRef = useRef<THREE.LineSegments>(null);
    
    // Build position array from edges
    const positions = useMemo(() => {
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const posArray: number[] = [];
      
      edges.forEach(edge => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          posArray.push(...source.position, ...target.position);
        }
      });
      
      return new Float32Array(posArray);
    }, [nodes, edges]);
    
    // Update positions when nodes move
    useFrame(() => {
      if (!lineRef.current) return;
      
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const geo = lineRef.current.geometry;
      const posAttr = geo.getAttribute('position') as Float32BufferAttribute;
      
      let idx = 0;
      edges.forEach(edge => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          posAttr.setXYZ(idx++, ...source.position);
          posAttr.setXYZ(idx++, ...target.position);
        }
      });
      
      posAttr.needsUpdate = true;
    });
    
    return (
      <lineSegments ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color="#475569" 
          transparent 
          opacity={0.3} 
          linewidth={1}
        />
      </lineSegments>
    );
  }
  ```
- [ ] Add line color variation by edge weight
- [ ] Add dashed lines for critical status edges
- [ ] Optimize with frustum culling for off-screen edges

**Acceptance Criteria:**
- Edges connect all HCPs to their channel
- Lines update smoothly during physics simulation
- Critical edges are visually distinct (dashed/broken)

---

### M10C.2: Pulse Animation for Data Flow

**Tasks:**
- [ ] Add animated "particles" flowing along edges:
  ```typescript
  // Option A: ShaderMaterial with dash offset animation
  // Option B: Small spheres moving along edge paths
  ```
- [ ] Pulse speed correlates with edge weight (healthier = faster)
- [ ] Subtle effect that doesn't distract from nodes

**Acceptance Criteria:**
- Visible data flow animation
- Flow direction is outward from channel nodes
- Animation is performant (no FPS drop)

---

## Phase 10D: Environment & Polish

**Goal:** Cinematic visual environment and interaction polish  
**Effort Estimate:** 4-6 hours  
**Dependencies:** Phase 10B complete

---

### M10D.1: Environment Setup

**File:** `client/src/components/constellation/Environment.tsx`

**Tasks:**
- [ ] Add fog for depth and "focus" effect:
  ```typescript
  import { useThree } from '@react-three/fiber';
  import { useEffect } from 'react';
  import { Fog, Color } from 'three';
  
  export function Environment() {
    const { scene } = useThree();
    
    useEffect(() => {
      scene.background = new Color('#0a0a0f');
      scene.fog = new Fog('#0a0a0f', 100, 400);
    }, [scene]);
    
    return (
      <>
        <ambientLight intensity={0.2} />
        <pointLight position={[100, 100, 100]} intensity={0.5} />
      </>
    );
  }
  ```
- [ ] Test fog parameters for optimal "Fog of War" effect at different zoom levels
- [ ] Add subtle ambient particles (star field) for depth

**Acceptance Criteria:**
- Dark, cinematic background
- Distant nodes fade into background
- No harsh lighting, soft ambient feel

---

### M10D.2: Semantic Zoom System

**Tasks:**
- [ ] Implement zoom level detection:
  ```typescript
  // In OrbitControls onChange or useFrame:
  const distance = camera.position.distanceTo(new Vector3(0, 0, 0));
  
  if (distance > 250) setZoomLevel('ecosystem');
  else if (distance > 100) setZoomLevel('campaign');
  else setZoomLevel('hcp');
  ```
- [ ] Adjust visual density per zoom level:
  - L1 (ecosystem): Only channel nodes visible, HCPs as "dust cloud"
  - L2 (campaign): Channel + top 100 HCPs per channel
  - L3 (hcp): All HCPs visible with labels
- [ ] Smooth transitions between levels

**Acceptance Criteria:**
- Zoom level updates in store based on camera distance
- Visual complexity reduces at far zoom
- Transitions don't cause jarring visual changes

---

## Phase 10E: Story Mode Integration

**Goal:** Scroll-linked narrative exploration with split "Headline/Deep Dive" UX  
**Effort Estimate:** 8-10 hours  
**Dependencies:** Phase 10D complete

### Design Principle: Two-Layer Narrative

The "Long Text" problem is solved by splitting narrative into:
- **Headline** (max 60 chars): Punchy, immediate, always visible
- **Deep Dive**: Full analytical detail, revealed on demand

This keeps the 3D Nebula as the hero while ensuring orchestration intelligence isn't lost to a wall of text.

---

### M10E.1: Story Beat Store

**File:** `client/src/stores/storyStore.ts`

**Tasks:**
- [ ] Create dedicated story store (separate from constellation store for clarity):
  ```typescript
  import { create } from 'zustand';
  
  export interface StoryBeat {
    id: string;
    headline: string;      // Max 60 chars (The "Quick Look")
    deepDive: string;      // Detailed analysis (The "Long Text")
    cameraTarget: [number, number, number];
    cameraLookAt: [number, number, number];
    visualState: 'healthy' | 'warning' | 'critical' | 'bypass';
    nodeFocusId?: string;  // Optional: specific node/cluster to highlight
    channelFocus?: string; // Optional: channel to emphasize
  }
  
  interface StoryStore {
    // State
    currentBeatIndex: number;
    isDeepDiveOpen: boolean;
    isPlaying: boolean;
    beats: StoryBeat[];
    
    // Actions
    nextBeat: () => void;
    prevBeat: () => void;
    setBeat: (index: number) => void;
    toggleDeepDive: () => void;
    togglePlayback: () => void;
    
    // Computed
    currentBeat: () => StoryBeat | undefined;
    progress: () => number; // 0-1 based on current beat
  }
  
  export const useStoryStore = create<StoryStore>((set, get) => ({
    currentBeatIndex: 0,
    isDeepDiveOpen: false,
    isPlaying: false,
    
    beats: [
      // === BEAT 1: Ecosystem Overview ===
      {
        id: 'ecosystem-health',
        headline: "The Ecosystem is Breathing",
        deepDive: `At the 30,000-foot view, the ecosystem shows a robust 60% health rating. 
Conference and Webinar channels are over-performing by 15% against the Q1 benchmark. 
However, this macro-stability masks underlying 'vascular' friction in digital-to-field handoffs.
The green pulse you see represents healthy engagement velocity—but watch what happens as we zoom in.`,
        cameraTarget: [0, 50, 200],
        cameraLookAt: [0, 0, 0],
        visualState: 'healthy',
      },
      
      // === BEAT 2: Conference/Webinar Success ===
      {
        id: 'webinar-success',
        headline: "Conferences & Webinars: Your Growth Engine",
        deepDive: `This cluster represents 1,500 HCPs actively engaged through virtual and live events.
Key metrics:
• 78% attendance-to-engagement conversion
• 3.2x higher content recall vs. email
• 45% of these HCPs have increased Rx writing in the past 90 days

The bright green glow indicates sustained information flow. 
These HCPs are receiving, processing, and acting on medical updates.`,
        cameraTarget: [-40, 20, 80],
        cameraLookAt: [-40, 0, 0],
        visualState: 'healthy',
        channelFocus: 'webinar',
      },
      
      // === BEAT 3: Digital Fatigue Warning ===
      {
        id: 'digital-fatigue',
        headline: "Email Engagement Declining: Digital Fatigue",
        deepDive: `The amber glow signals declining engagement in your digital channels.
625 HCPs show classic fatigue patterns:
• Open rates dropped 23% over 6 months
• Click-through at historic low (2.1%)
• 40% haven't engaged with any email in 45+ days

This isn't failure—it's saturation. These HCPs need channel diversification, 
not more volume. The system is recommending webinar invites as the bypass route.`,
        cameraTarget: [30, -10, 60],
        cameraLookAt: [30, -10, 0],
        visualState: 'warning',
        channelFocus: 'email',
      },
      
      // === BEAT 4: Critical Field Blockage ===
      {
        id: 'field-blockage',
        headline: "Critical Blockage: Northeast MSL Cluster",
        deepDive: `We have detected a complete information 'stroke' in the NY/NJ Oncology segment.
Physical rep access has dropped 40% due to new institutional privacy guardrails.

2,500 HCPs are currently disconnected from medical updates, creating a high-risk 
information void during the launch window.

The red shivering nodes indicate HCPs who:
• Haven't had MSL contact in 90+ days
• Are in high-value prescribing segments
• Have no viable digital fallback channel

Recommended action: Deploy targeted webinar series with CME accreditation 
to bypass physical access barriers.`,
        cameraTarget: [45, -12, 30],
        cameraLookAt: [45, -10, 0],
        visualState: 'critical',
        channelFocus: 'field',
        nodeFocusId: 'cluster-ne-onc',
      },
      
      // === BEAT 5: The Bypass Strategy ===
      {
        id: 'bypass-strategy',
        headline: "The Bypass: Reallocate to High-Performing Channels",
        deepDive: `TwinEngine has identified an optimization path:

1. REDIRECT: Shift 30% of email budget to webinar production
2. BRIDGE: Create MSL-led virtual roundtables for blocked HCPs
3. MONITOR: Deploy real-time sentiment tracking on new touchpoints

Projected impact:
• +18% overall ecosystem health within 60 days
• +$2.4M incremental revenue from unblocked HCPs
• -40% wasted digital spend

The constellation will rebalance. Green will spread. 
The question is: do you want TwinEngine to execute automatically, 
or would you prefer to review each recommendation?`,
        cameraTarget: [0, 30, 120],
        cameraLookAt: [0, 0, 0],
        visualState: 'bypass',
      },
    ],
    
    // Actions
    nextBeat: () => set((state) => ({ 
      currentBeatIndex: Math.min(state.currentBeatIndex + 1, state.beats.length - 1),
      isDeepDiveOpen: false, // Reset detail view on transition
    })),
    
    prevBeat: () => set((state) => ({ 
      currentBeatIndex: Math.max(state.currentBeatIndex - 1, 0),
      isDeepDiveOpen: false,
    })),
    
    setBeat: (index) => set({ 
      currentBeatIndex: index, 
      isDeepDiveOpen: false,
    }),
    
    toggleDeepDive: () => set((state) => ({ 
      isDeepDiveOpen: !state.isDeepDiveOpen,
    })),
    
    togglePlayback: () => set((state) => ({ 
      isPlaying: !state.isPlaying,
    })),
    
    // Computed (as functions since Zustand doesn't have native computed)
    currentBeat: () => get().beats[get().currentBeatIndex],
    progress: () => get().currentBeatIndex / (get().beats.length - 1),
  }));
  ```
- [ ] Export beat type for downstream components
- [ ] Add localStorage persistence for demo resume capability

**Acceptance Criteria:**
- Store initializes with 5 hardcoded beats
- Navigation works (next/prev/setBeat)
- Deep dive toggle doesn't affect beat index
- Progress calculation is accurate

---

### M10E.2: Story Mode Camera Controller

**File:** `client/src/components/constellation/StoryCameraController.tsx`

**Tasks:**
- [ ] Implement camera animation between beats:
  ```typescript
  import { useRef, useEffect } from 'react';
  import { useFrame, useThree } from '@react-three/fiber';
  import { Vector3 } from 'three';
  import { useStoryStore } from '@/stores/storyStore';
  import { useConstellationStore } from '@/stores/constellationStore';
  
  export function StoryCameraController() {
    const { camera } = useThree();
    const currentBeat = useStoryStore((s) => s.beats[s.currentBeatIndex]);
    const storyModeActive = useConstellationStore((s) => s.storyModeActive);
    
    const targetPosition = useRef(new Vector3());
    const targetLookAt = useRef(new Vector3());
    const currentLookAt = useRef(new Vector3());
    
    // Update targets when beat changes
    useEffect(() => {
      if (!currentBeat || !storyModeActive) return;
      targetPosition.current.set(...currentBeat.cameraTarget);
      targetLookAt.current.set(...currentBeat.cameraLookAt);
    }, [currentBeat, storyModeActive]);
    
    // Smooth camera animation
    useFrame((_, delta) => {
      if (!storyModeActive) return;
      
      // Lerp position
      camera.position.lerp(targetPosition.current, delta * 2);
      
      // Lerp lookAt
      currentLookAt.current.lerp(targetLookAt.current, delta * 2);
      camera.lookAt(currentLookAt.current);
    });
    
    return null;
  }
  ```
- [ ] Add easing options (ease-in-out for cinematic feel)
- [ ] Disable OrbitControls during story mode
- [ ] Add "skip animation" for impatient viewers

**Acceptance Criteria:**
- Camera smoothly animates between beat positions
- LookAt target also animates (no jarring snaps)
- Transition completes in ~1.5 seconds

---

### M10E.3: Headline/Deep Dive HUD

**File:** `client/src/components/constellation/StoryNarrationHUD.tsx`

**Tasks:**
- [ ] Create split narrative UI:
  ```typescript
  import { motion, AnimatePresence } from 'framer-motion';
  import { useStoryStore } from '@/stores/storyStore';
  import { useConstellationStore } from '@/stores/constellationStore';
  import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
  import { cn } from '@/lib/utils';
  
  export function StoryNarrationHUD() {
    const storyModeActive = useConstellationStore((s) => s.storyModeActive);
    const { 
      currentBeatIndex, 
      beats, 
      isDeepDiveOpen, 
      isPlaying,
      nextBeat, 
      prevBeat, 
      toggleDeepDive,
      togglePlayback,
    } = useStoryStore();
    
    const currentBeat = beats[currentBeatIndex];
    
    if (!storyModeActive || !currentBeat) return null;
    
    const statusColors = {
      healthy: 'from-green-500/20 to-green-500/5 border-green-500/30',
      warning: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
      critical: 'from-red-500/20 to-red-500/5 border-red-500/30',
      bypass: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    };
    
    const statusGlow = {
      healthy: 'shadow-green-500/20',
      warning: 'shadow-amber-500/20',
      critical: 'shadow-red-500/20',
      bypass: 'shadow-purple-500/20',
    };
    
    return (
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-4">
          {beats.map((beat, i) => (
            <button
              key={beat.id}
              onClick={() => useStoryStore.getState().setBeat(i)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                i === currentBeatIndex 
                  ? "w-8 bg-white" 
                  : "bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
        
        {/* Main Card */}
        <motion.div
          layout
          className={cn(
            "rounded-2xl border backdrop-blur-xl",
            "bg-gradient-to-b",
            statusColors[currentBeat.visualState],
            "shadow-2xl",
            statusGlow[currentBeat.visualState]
          )}
        >
          {/* Headline Section */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {currentBeatIndex + 1} of {beats.length}
              </span>
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full capitalize",
                currentBeat.visualState === 'healthy' && 'bg-green-500/20 text-green-400',
                currentBeat.visualState === 'warning' && 'bg-amber-500/20 text-amber-400',
                currentBeat.visualState === 'critical' && 'bg-red-500/20 text-red-400',
                currentBeat.visualState === 'bypass' && 'bg-purple-500/20 text-purple-400',
              )}>
                {currentBeat.visualState}
              </span>
            </div>
            
            <motion.h2 
              key={currentBeat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-semibold text-white mb-2"
            >
              {currentBeat.headline}
            </motion.h2>
            
            {/* Expand/Collapse Toggle */}
            <button
              onClick={toggleDeepDive}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
            >
              {isDeepDiveOpen ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Hide details</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Show analysis</span>
                </>
              )}
            </button>
          </div>
          
          {/* Deep Dive Section (Collapsible) */}
          <AnimatePresence>
            {isDeepDiveOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 pt-2 border-t border-white/10">
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {currentBeat.deepDive}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Navigation Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
            <button
              onClick={prevBeat}
              disabled={currentBeatIndex === 0}
              className={cn(
                "flex items-center gap-1 text-sm transition-colors",
                currentBeatIndex === 0 
                  ? "text-slate-600 cursor-not-allowed" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            
            <button
              onClick={togglePlayback}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>
            
            <button
              onClick={nextBeat}
              disabled={currentBeatIndex === beats.length - 1}
              className={cn(
                "flex items-center gap-1 text-sm transition-colors",
                currentBeatIndex === beats.length - 1 
                  ? "text-slate-600 cursor-not-allowed" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }
  ```
- [ ] Add keyboard navigation (arrow keys, spacebar for play/pause)
- [ ] Add auto-advance timer when `isPlaying` is true (8 seconds per beat)
- [ ] Add "Exit Story Mode" button that returns to free exploration

**Acceptance Criteria:**
- Headline always visible, max 60 chars
- Deep dive expands/collapses smoothly
- Navigation controls work (prev/next/dots/play)
- Visual state indicator matches current beat
- Keyboard shortcuts functional

---

### M10E.4: Visual State Synchronization

**Tasks:**
- [ ] Connect story beat `visualState` to node rendering:
  ```typescript
  // In NodeInstances.tsx, add visual emphasis based on story state
  const currentBeat = useStoryStore((s) => s.beats[s.currentBeatIndex]);
  const channelFocus = currentBeat?.channelFocus;
  
  // Dim nodes not in focus
  const opacity = useMemo(() => {
    if (!channelFocus) return 1;
    return node.channel === channelFocus ? 1 : 0.15;
  }, [channelFocus, node.channel]);
  ```
- [ ] Add "bypass" visual state (purple glow, showing optimization path)
- [ ] Pulse/highlight `nodeFocusId` when specified in beat
- [ ] Smooth transitions between visual states (0.5s)

**Acceptance Criteria:**
- Non-focus nodes dim during story beats
- Focus nodes are visually prominent
- Bypass state has distinct purple treatment
- Transitions are smooth, not jarring

---

### M10E.5: Auto-Advance Playback

**Tasks:**
- [ ] Implement auto-advance timer:
  ```typescript
  // In StoryNarrationHUD or separate hook
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      const { currentBeatIndex, beats, nextBeat } = useStoryStore.getState();
      if (currentBeatIndex < beats.length - 1) {
        nextBeat();
      } else {
        // End of story, stop playback
        useStoryStore.getState().togglePlayback();
      }
    }, 8000); // 8 seconds per beat
    
    return () => clearInterval(timer);
  }, [isPlaying]);
  ```
- [ ] Pause auto-advance when deep dive is open
- [ ] Add progress bar showing time until next beat
- [ ] Reset timer when user manually navigates

**Acceptance Criteria:**
- Play button starts auto-advance
- Each beat displays for 8 seconds
- Deep dive pauses timer
- Stops at last beat

---

## Testing Requirements

### M10T.1: Performance Tests

**Tasks:**
- [ ] Verify 60fps with 2,500 nodes on:
  - M1 MacBook Air (baseline)
  - M1 Pro/Max MacBook Pro (target demo hardware)
  - Windows laptop with integrated graphics (accessibility)
- [ ] Verify Web Worker doesn't block main thread:
  ```typescript
  // Test: Main thread frame time stays <16ms during physics
  ```
- [ ] Verify memory doesn't leak during hover/selection cycles

---

### M10T.2: Visual Regression Tests

**Tasks:**
- [ ] Screenshot tests for:
  - Initial load state
  - Each zoom level
  - Hover state
  - Story mode at each beat
- [ ] Test color accuracy for status indicators

---

### M10T.3: Integration Tests

**Tasks:**
- [ ] Zustand store state transitions
- [ ] Web Worker message passing
- [ ] Raycaster accuracy with instanced geometry

---

## Risk Assessment

### Why This Works

| Strength | Rationale |
|----------|-----------|
| InstancedMesh | GPU-optimized; same pattern used in production games |
| Web Worker physics | Prevents jank; physics can run at higher tick rate |
| Zustand | Minimal, fast, doesn't fight React |
| Three.js ecosystem | Industry standard, excellent docs, active community |

### What to Watch

| Risk | Mitigation |
|------|------------|
| Screen share lag | Disable bloom/post-processing for video calls |
| WebGL compatibility | Fallback to 2D SVG for unsupported browsers |
| Bundle size (+250KB) | Code-split constellation as lazy-loaded route |
| Shader complexity | Start with meshBasicMaterial, add shaders incrementally |

---

## Summary

Phase 10 introduces a WebGL-powered constellation visualization that:
1. Renders 2,500+ nodes at 60fps using InstancedMesh
2. Runs physics in a Web Worker for butter-smooth interaction
3. Provides semantic zoom from ecosystem to individual HCP
4. Includes scroll-linked storytelling for demo presentations
5. Visualizes diagnostic states (healthy/warning/critical) with distinct visual treatments

**Total Effort Estimate:** 38-54 hours across 5 sub-phases

**Dependencies Added:**
- `three`, `@react-three/fiber`, `@react-three/drei` (3D rendering)
- `d3-force-3d` (physics)
- `zustand` (state)

---

*Ready for Claude Code CLI execution. Each milestone is independently testable.*
