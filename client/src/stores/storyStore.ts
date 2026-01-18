/**
 * Story Store - Zustand state for scroll-linked narrative storytelling
 *
 * Manages: story beats, navigation, deep dive toggle, auto-playback
 * Implements "Headline + Deep Dive" pattern to solve long text problem
 *
 * Phase 11F: Updated for L1/L2/L3 hierarchy navigation
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type VisualState = 'healthy' | 'warning' | 'critical' | 'bypass';
export type PanelPosition = 'bottom' | 'top' | 'right';
export type NavigationLevel = 'L1' | 'L2' | 'L3';

// Phase 11 Enhanced Story Beat with level-aware navigation
export interface StoryBeat {
  id: string;
  headline: string;        // Max 60 chars - The "Quick Look"
  deepDive: string;        // Detailed analysis - The "Long Text"
  cameraTarget: [number, number, number];
  cameraLookAt: [number, number, number];
  visualState: VisualState;
  nodeFocusId?: string;    // Optional: specific node/cluster to highlight
  channelFocus?: string;   // Optional: channel to emphasize

  // Phase 11: Level navigation
  level?: NavigationLevel;
  channelContext?: string;   // For L2 beats
  campaignContext?: string;  // For L3 beats
  autoAdvanceDelay?: number; // Custom timing per beat

  // Phase 11: Richer deep dive content
  deepDiveContent?: {
    paragraphs: string[];
    keyStats?: { label: string; value: string }[];
    campaignTable?: { name: string; openRate: string; status: 'healthy' | 'warning' | 'critical' }[];
    sampleHCPs?: { name: string; specialty: string; lastTouch: string; trend: 'up' | 'down' | 'flat' }[];
    actionItems?: string[];
  };
  diagnostic?: string;  // What insight this beat delivers
}

interface StoryState {
  // State
  currentBeatIndex: number;
  isDeepDiveOpen: boolean;
  isPlaying: boolean;
  beats: StoryBeat[];
  panelPosition: PanelPosition;

  // Actions
  nextBeat: () => void;
  prevBeat: () => void;
  setBeat: (index: number) => void;
  toggleDeepDive: () => void;
  togglePlayback: () => void;
  stopPlayback: () => void;
  setPanelPosition: (position: PanelPosition) => void;
}

// Phase 11: HCP-Centric Story Beats - "The Inverted Narrative"
// Tells a customer-pressure story, not a channel-first report
const DEMO_BEATS: StoryBeat[] = [
  // === BEAT 1: The Universe (L1 - Overview) ===
  {
    id: 'beat-1-universe',
    headline: "2,500 HCPs. Five Channels. One Truth.",
    deepDive: `This is your promotional universe — every Healthcare Professional your brand touches, and every channel carrying your message to them.

The nucleus represents 2,500 active HCPs across Oncology, Cardiology, and Respiratory. The orbiting bodies are your five engagement channels, sized by reach and connected by shared audience overlap.

From here, you can see the ecosystem breathing. But not all channels are breathing at the same rate.`,
    cameraTarget: [0, 120, 280],
    cameraLookAt: [0, 0, 0],
    visualState: 'healthy',
    level: 'L1',
    autoAdvanceDelay: 10000,
    deepDiveContent: {
      paragraphs: [
        "This is your promotional universe — every Healthcare Professional your brand touches, and every channel carrying your message to them.",
        "The nucleus represents 2,500 active HCPs across Oncology, Cardiology, and Respiratory. The orbiting bodies are your five engagement channels, sized by reach and connected by shared audience overlap.",
        "From here, you can see the ecosystem breathing. But not all channels are breathing at the same rate.",
      ],
      keyStats: [
        { label: 'Total HCPs', value: '2,500' },
        { label: 'Active Channels', value: '5' },
        { label: 'Avg Engagement', value: '67%' },
      ],
    },
    diagnostic: "Orientation — establish the customer-centric mental model",
  },

  // === BEAT 2: The Workhorse (L1 - Healthy Channel) ===
  {
    id: 'beat-2-workhorse',
    headline: "Webinars: Your Highest-Signal Channel",
    deepDive: `Webinars reach 690 HCPs with a 71% average engagement score — your highest-performing channel by signal quality.

Unlike passive channels, webinar attendees self-select for interest. When an oncologist spends 45 minutes in your MoA deep-dive, that's not an impression — that's intent.

Notice the strong overlap with Email (55%) — your webinar promotion engine is working. The moderate Congress connection (38%) suggests opportunity for post-event digital follow-through.`,
    cameraTarget: [-60, 80, 180],
    cameraLookAt: [-40, 0, 0],
    visualState: 'healthy',
    channelFocus: 'webinar',
    level: 'L1',
    autoAdvanceDelay: 9000,
    deepDiveContent: {
      paragraphs: [
        "Webinars reach 690 HCPs with a 71% average engagement score — your highest-performing channel by signal quality.",
        "Unlike passive channels, webinar attendees self-select for interest. When an oncologist spends 45 minutes in your MoA deep-dive, that's not an impression — that's intent.",
        "Notice the strong overlap with Email (55%) — your webinar promotion engine is working. The moderate Congress connection (38%) suggests opportunity for post-event digital follow-through.",
      ],
      keyStats: [
        { label: 'HCP Reach', value: '690' },
        { label: 'Avg Engagement', value: '71%' },
        { label: 'Email Overlap', value: '55%' },
      ],
    },
    diagnostic: "Identify strength — what channel is generating real signal",
  },

  // === BEAT 3: The Pressure Point (L1 - Struggling Channel) ===
  {
    id: 'beat-3-pressure',
    headline: "Email: 1,925 HCPs, But Fatigue is Building",
    deepDive: `Email is your largest channel by reach — 1,925 HCPs, 77% of your universe. But scale is masking a problem.

Average engagement has dropped to 62%, down from 71% twelve months ago. Open rates are declining 2-3% per quarter. You're not losing reach — you're losing attention.

The high overlap with Field (68%) and Paid Media (61%) means these HCPs are being touched from multiple directions. Some of that is orchestration. Some of it is noise.`,
    cameraTarget: [70, 60, 160],
    cameraLookAt: [50, 0, 0],
    visualState: 'warning',
    channelFocus: 'email',
    level: 'L1',
    autoAdvanceDelay: 10000,
    deepDiveContent: {
      paragraphs: [
        "Email is your largest channel by reach — 1,925 HCPs, 77% of your universe. But scale is masking a problem.",
        "Average engagement has dropped to 62%, down from 71% twelve months ago. Open rates are declining 2-3% per quarter. You're not losing reach — you're losing attention.",
        "The high overlap with Field (68%) and Paid Media (61%) means these HCPs are being touched from multiple directions. Some of that is orchestration. Some of it is noise.",
      ],
      keyStats: [
        { label: 'HCP Reach', value: '1,925' },
        { label: 'Avg Engagement', value: '62% ↓' },
        { label: 'YoY Trend', value: '-9pts' },
      ],
    },
    diagnostic: "Identify weakness — where is pressure creating resistance instead of movement",
  },

  // === BEAT 4: Inside the Machine (L2 - Email Campaign Orbit) ===
  {
    id: 'beat-4-campaigns',
    headline: "Six Campaigns. Uneven Performance.",
    deepDive: `Drilling into Email reveals six active campaigns — but they're not created equal.

Your Oncology launch wave (C001) is performing: 34% open rate, 8% CTR, healthy engagement. The RWE Digest (C006) is even stronger at 38% open rate — Cardiology HCPs are hungry for real-world data.

But look at Access Update (C005) and Safety Profile (C007). Open rates below 30%, fatigue indices above 0.50. These campaigns aren't informing — they're contributing to inbox blindness.`,
    cameraTarget: [0, 50, 120],
    cameraLookAt: [0, 0, 0],
    visualState: 'warning',
    channelFocus: 'email',
    level: 'L2',
    channelContext: 'email',
    autoAdvanceDelay: 12000,
    deepDiveContent: {
      paragraphs: [
        "Drilling into Email reveals six active campaigns — but they're not created equal.",
        "Your Oncology launch wave (C001) is performing: 34% open rate, 8% CTR, healthy engagement. The RWE Digest (C006) is even stronger at 38% open rate — Cardiology HCPs are hungry for real-world data.",
        "But look at Access Update (C005) and Safety Profile (C007). Open rates below 30%, fatigue indices above 0.50. These campaigns aren't informing — they're contributing to inbox blindness.",
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
  },

  // === BEAT 5: The Humans Behind the Data (L3 - Affected HCPs) ===
  {
    id: 'beat-5-hcps',
    headline: "560 HCPs. 40% Haven't Opened in 60 Days.",
    deepDive: `Behind every metric is a physician making decisions about your brand. Let's look at who's actually disengaging.

Of the 560 HCPs in your Access Update campaign, 224 haven't opened an email in 60+ days. These aren't lost causes — they're signals. Something about this message, this frequency, or this timing isn't working for them.

Notice the specialty pattern: 62% of disengaged HCPs are Oncologists. They're drowning in access communications from every brand. Your message isn't breaking through — it's blending in.`,
    cameraTarget: [0, 40, 90],
    cameraLookAt: [0, 0, 0],
    visualState: 'critical',
    level: 'L3',
    channelContext: 'email',
    campaignContext: 'C005',
    autoAdvanceDelay: 12000,
    deepDiveContent: {
      paragraphs: [
        "Behind every metric is a physician making decisions about your brand. Let's look at who's actually disengaging.",
        "Of the 560 HCPs in your Access Update campaign, 224 haven't opened an email in 60+ days. These aren't lost causes — they're signals. Something about this message, this frequency, or this timing isn't working for them.",
        "Notice the specialty pattern: 62% of disengaged HCPs are Oncologists. They're drowning in access communications from every brand. Your message isn't breaking through — it's blending in.",
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
  },

  // === BEAT 6: The Path Forward (L1 - Return with Insight) ===
  {
    id: 'beat-6-path',
    headline: "The Optimization: Shift Pressure, Recover Attention",
    deepDive: `You've now seen the full picture: a high-performing webinar channel, a fatiguing email program, and 224 oncologists who've stopped listening.

The insight isn't 'send less email.' It's 'redirect email's job.' Your Access Update content is important — but it's the wrong format for inbox-fatigued specialists. That content belongs in a 30-minute webinar where engagement is earned, not assumed.

Shift 30% of your Access messaging budget to webinar format. Use email to promote, not deliver. The 55% audience overlap means you already have the promotional engine — you're just using it to push content instead of pull attention.`,
    cameraTarget: [0, 100, 220],
    cameraLookAt: [0, 0, 0],
    visualState: 'bypass',
    level: 'L1',
    autoAdvanceDelay: 15000,
    deepDiveContent: {
      paragraphs: [
        "You've now seen the full picture: a high-performing webinar channel, a fatiguing email program, and 224 oncologists who've stopped listening.",
        "The insight isn't 'send less email.' It's 'redirect email's job.' Your Access Update content is important — but it's the wrong format for inbox-fatigued specialists. That content belongs in a 30-minute webinar where engagement is earned, not assumed.",
        "Shift 30% of your Access messaging budget to webinar format. Use email to promote, not deliver. The 55% audience overlap means you already have the promotional engine — you're just using it to push content instead of pull attention.",
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
  },
];

export const useStoryStore = create<StoryState>()(
  devtools(
    persist(
      (set, get) => ({
        currentBeatIndex: 0,
        isDeepDiveOpen: false,
        isPlaying: false,
        beats: DEMO_BEATS,
        panelPosition: 'bottom' as PanelPosition,

        nextBeat: () => set((state) => ({
          currentBeatIndex: Math.min(state.currentBeatIndex + 1, state.beats.length - 1),
          isDeepDiveOpen: false, // Reset detail view on transition
        }), false, 'nextBeat'),

        prevBeat: () => set((state) => ({
          currentBeatIndex: Math.max(state.currentBeatIndex - 1, 0),
          isDeepDiveOpen: false,
        }), false, 'prevBeat'),

        setBeat: (index) => set({
          currentBeatIndex: index,
          isDeepDiveOpen: false,
        }, false, 'setBeat'),

        toggleDeepDive: () => set((state) => ({
          isDeepDiveOpen: !state.isDeepDiveOpen,
        }), false, 'toggleDeepDive'),

        togglePlayback: () => set((state) => ({
          isPlaying: !state.isPlaying,
        }), false, 'togglePlayback'),

        stopPlayback: () => set({ isPlaying: false }, false, 'stopPlayback'),

        setPanelPosition: (position) => set({ panelPosition: position }, false, 'setPanelPosition'),
      }),
      {
        name: 'constellation-story',
        partialize: (state) => ({
          currentBeatIndex: state.currentBeatIndex,
          panelPosition: state.panelPosition,
        }),
      }
    ),
    { name: 'StoryStore' }
  )
);

// Computed selectors
export const selectCurrentBeat = (state: StoryState) =>
  state.beats[state.currentBeatIndex];

export const selectProgress = (state: StoryState) =>
  state.currentBeatIndex / (state.beats.length - 1);

export const selectIsFirstBeat = (state: StoryState) =>
  state.currentBeatIndex === 0;

export const selectIsLastBeat = (state: StoryState) =>
  state.currentBeatIndex === state.beats.length - 1;
