/**
 * Story Store - Zustand state for scroll-linked narrative storytelling
 *
 * Manages: story beats, navigation, deep dive toggle, auto-playback
 * Implements "Headline + Deep Dive" pattern to solve long text problem
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type VisualState = 'healthy' | 'warning' | 'critical' | 'bypass';

export interface StoryBeat {
  id: string;
  headline: string;        // Max 60 chars - The "Quick Look"
  deepDive: string;        // Detailed analysis - The "Long Text"
  cameraTarget: [number, number, number];
  cameraLookAt: [number, number, number];
  visualState: VisualState;
  nodeFocusId?: string;    // Optional: specific node/cluster to highlight
  channelFocus?: string;   // Optional: channel to emphasize
}

interface StoryState {
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
  stopPlayback: () => void;
}

// Hardcoded demo scenario: "Digital Fatigue vs. Physical Access"
const DEMO_BEATS: StoryBeat[] = [
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
];

export const useStoryStore = create<StoryState>()(
  devtools(
    persist(
      (set, get) => ({
        currentBeatIndex: 0,
        isDeepDiveOpen: false,
        isPlaying: false,
        beats: DEMO_BEATS,

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
      }),
      {
        name: 'constellation-story',
        partialize: (state) => ({
          currentBeatIndex: state.currentBeatIndex,
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
