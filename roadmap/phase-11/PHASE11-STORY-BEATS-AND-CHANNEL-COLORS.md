# Phase 11: Story Mode Narrative & Channel Identity System

## Channel Brand Colors

Each channel has a fixed identity color — engagement health will be visualized separately (glow intensity, particle effects, or diagnostic overlays).

```typescript
// client/src/lib/constellation/channelColors.ts

export const CHANNEL_COLORS: Record<string, {
  primary: string;      // Main planet color
  glow: string;         // Emissive/hover glow
  label: string;        // Text/badge color
  icon: string;         // Lucide icon name
}> = {
  email: {
    primary: '#3B82F6',   // Blue - digital communication
    glow: '#60A5FA',
    label: '#1D4ED8',
    icon: 'Mail',
  },
  field: {
    primary: '#F97316',   // Orange - warm, personal, human
    glow: '#FB923C',
    label: '#EA580C',
    icon: 'Users',
  },
  congress: {
    primary: '#8B5CF6',   // Purple - premium, event, prestige
    glow: '#A78BFA',
    label: '#7C3AED',
    icon: 'Building2',
  },
  webinar: {
    primary: '#22C55E',   // Green - growth, engagement, live
    glow: '#4ADE80',
    label: '#16A34A',
    icon: 'Video',
  },
  paid_media: {
    primary: '#EC4899',   // Pink - attention, advertising
    glow: '#F472B6',
    label: '#DB2777',
    icon: 'Megaphone',
  },
  web: {
    primary: '#06B6D4',   // Cyan - information, self-service
    glow: '#22D3EE',
    label: '#0891B2',
    icon: 'Globe',
  },
};

// Engagement health is shown via separate visual treatments:
// - Healthy: Steady glow, smooth edges
// - Warning: Dimmed glow, slight flicker
// - Critical: No glow, particle decay effect, desaturated
```

---

## Story Beats: The Inverted Narrative

### Design Philosophy

The old model told a channel-first story: *"Here's Email performance, here's Field performance..."*

The new model tells a **customer-pressure story**:
1. Start with WHO (the HCP universe)
2. Reveal WHAT pressure is acting on them
3. Diagnose WHERE that pressure is breaking down
4. Show WHO specifically is affected
5. Illuminate the PATH forward

This mirrors how a strategist actually thinks, not how a media planner reports.

---

### Beat Structure

Each beat includes:
- **Level**: L1, L2, or L3
- **Headline**: Max 60 chars, punchy, always visible
- **Camera**: Position and target for smooth transition
- **Visual Focus**: What to highlight/dim
- **Deep Dive**: Expanded narrative (revealed on click)
- **Diagnostic**: What insight this beat delivers

---

## The 6-Beat Demo Narrative

### Beat 1: "The Universe" (L1 - Overview)

```typescript
{
  id: 'beat-1-universe',
  level: 'L1',
  headline: "2,500 HCPs. Five Channels. One Truth.",
  
  camera: {
    position: [0, 120, 280],
    target: [0, 0, 0],
    duration: 1.5,
  },
  
  visualFocus: {
    nucleus: 'highlight',
    channels: 'all-visible',
    edges: 'visible',
  },
  
  deepDive: {
    paragraphs: [
      "This is your promotional universe — every Healthcare Professional your brand touches, and every channel carrying your message to them.",
      "The nucleus represents 2,500 active HCPs across Oncology, Cardiology, and Respiratory. The orbiting bodies are your five engagement channels, sized by reach and connected by shared audience overlap.",
      "From here, you can see the ecosystem breathing. But not all channels are breathing at the same rate."
    ],
    keyStats: [
      { label: 'Total HCPs', value: '2,500' },
      { label: 'Active Channels', value: '5' },
      { label: 'Avg Engagement', value: '67%' },
    ],
  },
  
  diagnostic: "Orientation — establish the customer-centric mental model",
  
  autoAdvanceDelay: 10000, // 10 seconds
}
```

---

### Beat 2: "The Workhorse" (L1 - Healthy Channel)

```typescript
{
  id: 'beat-2-workhorse',
  level: 'L1',
  headline: "Webinars: Your Highest-Signal Channel",
  
  camera: {
    position: [-60, 80, 180],
    target: [-40, 0, 0], // Orbit toward webinar
    duration: 1.2,
  },
  
  visualFocus: {
    nucleus: 'dim',
    channels: {
      webinar: 'highlight',
      email: 'dim',
      field: 'dim',
      congress: 'dim',
      paid_media: 'dim',
    },
    edges: 'webinar-only', // Show webinar's connections
  },
  
  deepDive: {
    paragraphs: [
      "Webinars reach 690 HCPs with a 71% average engagement score — your highest-performing channel by signal quality.",
      "Unlike passive channels, webinar attendees self-select for interest. When an oncologist spends 45 minutes in your MoA deep-dive, that's not an impression — that's intent.",
      "Notice the strong overlap with Email (55%) — your webinar promotion engine is working. The moderate Congress connection (38%) suggests opportunity for post-event digital follow-through."
    ],
    keyStats: [
      { label: 'HCP Reach', value: '690' },
      { label: 'Avg Engagement', value: '71%' },
      { label: 'Email Overlap', value: '55%' },
    ],
  },
  
  diagnostic: "Identify strength — what channel is generating real signal",
  
  autoAdvanceDelay: 9000,
}
```

---

### Beat 3: "The Pressure Point" (L1 - Struggling Channel)

```typescript
{
  id: 'beat-3-pressure',
  level: 'L1',
  headline: "Email: 1,925 HCPs, But Fatigue is Building",
  
  camera: {
    position: [70, 60, 160],
    target: [50, 0, 0], // Orbit toward email
    duration: 1.2,
  },
  
  visualFocus: {
    nucleus: 'dim',
    channels: {
      email: 'highlight-warning', // Pulsing amber effect
      webinar: 'dim',
      field: 'dim',
      congress: 'dim',
      paid_media: 'dim',
    },
    edges: 'email-only',
  },
  
  deepDive: {
    paragraphs: [
      "Email is your largest channel by reach — 1,925 HCPs, 77% of your universe. But scale is masking a problem.",
      "Average engagement has dropped to 62%, down from 71% twelve months ago. Open rates are declining 2-3% per quarter. You're not losing reach — you're losing attention.",
      "The high overlap with Field (68%) and Paid Media (61%) means these HCPs are being touched from multiple directions. Some of that is orchestration. Some of it is noise."
    ],
    keyStats: [
      { label: 'HCP Reach', value: '1,925' },
      { label: 'Avg Engagement', value: '62% ↓' },
      { label: 'YoY Trend', value: '-9pts' },
    ],
  },
  
  diagnostic: "Identify weakness — where is pressure creating resistance instead of movement",
  
  autoAdvanceDelay: 10000,
}
```

---

### Beat 4: "Inside the Machine" (L2 - Email Campaign Orbit)

```typescript
{
  id: 'beat-4-campaigns',
  level: 'L2',
  channelContext: 'email',
  headline: "Six Campaigns. Uneven Performance.",
  
  camera: {
    position: [0, 50, 120],
    target: [0, 0, 0],
    duration: 1.0,
  },
  
  visualFocus: {
    nucleus: 'contextual', // Shows "1,925 Email HCPs"
    campaigns: 'all-visible',
    highlightCampaigns: ['C005', 'C007'], // The fatigued ones
  },
  
  deepDive: {
    paragraphs: [
      "Drilling into Email reveals six active campaigns — but they're not created equal.",
      "Your Oncology launch wave (C001) is performing: 34% open rate, 8% CTR, healthy engagement. The RWE Digest (C009) is even stronger at 38% open rate — Cardiology HCPs are hungry for real-world data.",
      "But look at Access Update (C005) and Safety Profile (C007). Open rates below 30%, fatigue indices above 0.50. These campaigns aren't informing — they're contributing to inbox blindness."
    ],
    keyStats: [
      { label: 'Active Campaigns', value: '6' },
      { label: 'Top Performer', value: 'RWE Digest (38% OR)' },
      { label: 'Fatigued', value: '2 campaigns' },
    ],
    campaignTable: [
      { name: 'ONC Launch Wave 1', openRate: '34%', status: 'healthy' },
      { name: 'RWE Outcomes Digest', openRate: '38%', status: 'healthy' },
      { name: 'Access Update Q1', openRate: '29%', status: 'warning' },
      { name: 'Safety Profile Series', openRate: '27%', status: 'warning' },
    ],
  },
  
  diagnostic: "Decompose channel performance into campaign-level contributors",
  
  autoAdvanceDelay: 12000,
}
```

---

### Beat 5: "The Humans Behind the Data" (L3 - Affected HCPs)

```typescript
{
  id: 'beat-5-hcps',
  level: 'L3',
  channelContext: 'email',
  campaignContext: 'C005', // Access Update - the fatigued one
  headline: "560 HCPs. 40% Haven't Opened in 60 Days.",
  
  camera: {
    position: [0, 40, 90],
    target: [0, 0, 0],
    duration: 1.0,
  },
  
  visualFocus: {
    hcpStatus: {
      engaged: 'dim',        // 60% - these are fine
      disengaged: 'highlight', // 40% - these need attention
    },
    specialtyHighlight: ['ONC', 'CARD'], // Most affected specialties
  },
  
  deepDive: {
    paragraphs: [
      "Behind every metric is a physician making decisions about your brand. Let's look at who's actually disengaging.",
      "Of the 560 HCPs in your Access Update campaign, 224 haven't opened an email in 60+ days. These aren't lost causes — they're signals. Something about this message, this frequency, or this timing isn't working for them.",
      "Notice the specialty pattern: 62% of disengaged HCPs are Oncologists. They're drowning in access communications from every brand. Your message isn't breaking through — it's blending in."
    ],
    keyStats: [
      { label: 'Campaign Reach', value: '560' },
      { label: 'Disengaged (60d+)', value: '224 (40%)' },
      { label: 'Top Disengaged Specialty', value: 'Oncology (62%)' },
    ],
    sampleHCPs: [
      { name: 'Dr. Sarah Chen', specialty: 'ONC', lastTouch: '68 days', trend: 'down' },
      { name: 'Dr. James Wilson', specialty: 'ONC', lastTouch: '74 days', trend: 'down' },
      { name: 'Dr. Priya Sharma', specialty: 'CARD', lastTouch: '61 days', trend: 'flat' },
    ],
  },
  
  diagnostic: "Make it human — these aren't data points, they're physicians who stopped listening",
  
  autoAdvanceDelay: 12000,
}
```

---

### Beat 6: "The Path Forward" (L1 - Return with Insight)

```typescript
{
  id: 'beat-6-path',
  level: 'L1',
  headline: "The Optimization: Shift Pressure, Recover Attention",
  
  camera: {
    position: [0, 100, 220],
    target: [0, 0, 0],
    duration: 1.5,
  },
  
  visualFocus: {
    nucleus: 'highlight',
    channels: {
      email: 'highlight-opportunity', // Show the fix
      webinar: 'highlight',           // The redirect target
      field: 'dim',
      congress: 'dim',
      paid_media: 'dim',
    },
    edges: 'email-webinar', // Highlight the shift path
  },
  
  deepDive: {
    paragraphs: [
      "You've now seen the full picture: a high-performing webinar channel, a fatiguing email program, and 224 oncologists who've stopped listening.",
      "The insight isn't 'send less email.' It's 'redirect email's job.' Your Access Update content is important — but it's the wrong format for inbox-fatigued specialists. That content belongs in a 30-minute webinar where engagement is earned, not assumed.",
      "Shift 30% of your Access messaging budget to webinar format. Use email to promote, not deliver. The 55% audience overlap means you already have the promotional engine — you're just using it to push content instead of pull attention."
    ],
    keyStats: [
      { label: 'Recommended Shift', value: '30% budget → Webinar' },
      { label: 'Expected Recovery', value: '120-150 HCPs' },
      { label: 'Projected Engagement Lift', value: '+12-15%' },
    ],
    actionItems: [
      'Pause Access Update email series',
      'Develop Access webinar (30-min format)',
      'Use email for webinar promotion only',
      'Re-engage disengaged ONC segment via Field',
    ],
  },
  
  diagnostic: "Synthesize insight into action — this is what the platform is for",
  
  autoAdvanceDelay: 15000,
}
```

---

## Story Mode UI Updates

### Narrative Panel Content Structure

```typescript
// Update StoryNarrationHUD.tsx to handle richer content

interface StoryBeatContent {
  headline: string;                    // Always visible
  
  deepDive: {
    paragraphs: string[];              // Expandable narrative
    keyStats: { label: string; value: string }[];
    
    // Level-specific extras
    campaignTable?: CampaignRow[];     // L2 only
    sampleHCPs?: HCPSample[];          // L3 only
    actionItems?: string[];            // Final beat only
  };
  
  diagnostic: string;                  // What insight this delivers (subtle footer)
}
```

### Visual Treatment by Beat Type

| Beat Type | Nucleus | Focus Channel | Other Channels | Edges |
|-----------|---------|---------------|----------------|-------|
| Overview | Bright, pulsing | All visible | All visible | All visible, low opacity |
| Healthy Focus | Dim | Bright + glow | Very dim | Focus channel only |
| Warning Focus | Dim | Amber pulse | Very dim | Focus channel only |
| L2 Campaign | Contextual label | N/A (inside channel) | N/A | N/A |
| L3 HCP | N/A | N/A | N/A | N/A |
| Synthesis | Bright | Opportunity glow | Dim | Recommended path highlighted |

---

## Transition Animations

### L1 → L1 (Channel to Channel)
- Camera orbits around nucleus
- Duration: 1.2s
- Ease: power2.inOut
- Focus shifts with 0.3s opacity transition

### L1 → L2 (Drill into Channel)
- Camera zooms toward channel planet
- Planet "opens" (scale up + fade)
- Nucleus shrinks to contextual size
- Campaign nodes fade in from center
- Duration: 1.5s total

### L2 → L3 (Drill into Campaign)
- Camera continues zoom
- Campaign node "explodes" into HCP constellation
- Particle birth animation
- Duration: 1.2s

### L3 → L1 (Return to Overview)
- Reverse of above
- HCPs collapse back
- Zoom out with momentum
- Duration: 1.8s

---

## Auto-Advance Behavior

```typescript
// Story playback timing

const BEAT_TIMING = {
  'beat-1-universe': 10000,   // 10s - let them absorb
  'beat-2-workhorse': 9000,   // 9s - good news is quick
  'beat-3-pressure': 10000,   // 10s - problem setup
  'beat-4-campaigns': 12000,  // 12s - more detail to process
  'beat-5-hcps': 12000,       // 12s - human stories take time
  'beat-6-path': 15000,       // 15s - synthesis + action
};

// Total runtime: ~68 seconds
// With transitions: ~75 seconds

// Pause auto-advance when:
// - Deep dive is expanded
// - User interacts with canvas (pan/zoom/click)
// - User hovers on any interactive element
```

---

## Keyboard Shortcuts (Story Mode)

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `→` | Next beat |
| `←` | Previous beat |
| `E` | Expand/collapse deep dive |
| `Esc` | Exit story mode |
| `1-6` | Jump to beat N |

---

## Implementation Notes

### Beat Transition Logic

```typescript
// In useStoryMode.ts

function transitionToBeat(beat: StoryBeat) {
  const { level, channelContext, campaignContext } = beat;
  
  // 1. Update constellation store level
  if (level === 'L1') {
    navigateToL1();
  } else if (level === 'L2' && channelContext) {
    navigateToL2(channelContext);
  } else if (level === 'L3' && campaignContext) {
    navigateToL3(campaignContext);
  }
  
  // 2. Animate camera (handled by useLevelTransition)
  setCameraTarget(beat.camera);
  
  // 3. Apply visual focus
  setVisualFocus(beat.visualFocus);
  
  // 4. Update narrative content
  setCurrentBeat(beat);
}
```

### Visual Focus Application

```typescript
// In NodeInstances.tsx / ChannelPlanet.tsx

const visualFocus = useStoryStore((s) => s.currentBeat?.visualFocus);

// Apply opacity based on focus state
const getOpacity = (elementId: string, elementType: 'channel' | 'campaign' | 'hcp') => {
  if (!visualFocus) return 1;
  
  const focusState = visualFocus[elementType + 's']?.[elementId] 
    || visualFocus[elementType + 's'];
  
  switch (focusState) {
    case 'highlight': return 1;
    case 'highlight-warning': return 1; // + amber effect
    case 'highlight-opportunity': return 1; // + purple/teal effect
    case 'dim': return 0.15;
    case 'all-visible': return 0.8;
    default: return 1;
  }
};
```

---

## What This Narrative Accomplishes

1. **Establishes the inverted model** — HCPs are the center, channels orbit
2. **Shows both health and disease** — Webinar is working, Email is fatiguing
3. **Drills down with purpose** — Not just "more detail" but "why is this happening"
4. **Makes it human** — Beat 5 shows actual physicians, not just percentages
5. **Ends with action** — The platform isn't for reporting, it's for deciding

This is the demo that sells. It doesn't say "look at our visualization." It says "look at the insight you've been missing."

---

*Integrate this into Phase 11F (Story Mode Integration) of the main roadmap.*
