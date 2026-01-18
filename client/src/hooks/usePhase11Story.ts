/**
 * usePhase11Story - Synchronizes story mode with Phase 11 level navigation
 *
 * Phase 11F: Handles beat transitions across L1/L2/L3 hierarchy.
 * When story mode advances to a new beat:
 * - Navigates to the appropriate level
 * - Sets visual focus for channel/campaign highlighting
 * - Coordinates camera animations with level changes
 */

import { useEffect, useCallback } from 'react';
import { useStoryStore, selectCurrentBeat } from '@/stores/storyStore';
import { useConstellationStore } from '@/stores/constellationStore';
import { getChannelConfig } from '@/lib/constellation/channelColors';

export function usePhase11Story() {
  const currentBeat = useStoryStore(selectCurrentBeat);
  const storyModeActive = useConstellationStore((s) => s.storyModeActive);
  const viewMode = useConstellationStore((s) => s.viewMode);
  const navigationContext = useConstellationStore((s) => s.navigationContext);
  const navigateToL1 = useConstellationStore((s) => s.navigateToL1);
  const navigateToL2 = useConstellationStore((s) => s.navigateToL2);
  const navigateToL3 = useConstellationStore((s) => s.navigateToL3);

  // Transition to a new beat's level
  const transitionToBeat = useCallback(() => {
    if (!currentBeat || !storyModeActive || viewMode !== 'phase11') return;

    const { level, channelContext, campaignContext } = currentBeat;

    // Skip if no level specified (legacy beats)
    if (!level) return;

    // Navigate to appropriate level based on beat configuration
    switch (level) {
      case 'L1':
        // Only navigate if not already at L1
        if (navigationContext.level !== 'L1') {
          navigateToL1();
        }
        break;

      case 'L2':
        if (channelContext) {
          // Navigate to L2 with channel context
          const channelConfig = getChannelConfig(channelContext);
          if (navigationContext.level !== 'L2' || navigationContext.channelId !== channelContext) {
            navigateToL2(channelContext, channelConfig.displayName);
          }
        }
        break;

      case 'L3':
        if (channelContext && campaignContext) {
          // Navigate to L3 with campaign context
          const channelConfig = getChannelConfig(channelContext);
          if (
            navigationContext.level !== 'L3' ||
            navigationContext.campaignId !== campaignContext
          ) {
            navigateToL3(
              channelContext,
              channelConfig.displayName,
              campaignContext,
              getCampaignName(campaignContext)
            );
          }
        }
        break;
    }
  }, [
    currentBeat,
    storyModeActive,
    viewMode,
    navigationContext,
    navigateToL1,
    navigateToL2,
    navigateToL3,
  ]);

  // Effect to handle beat changes
  useEffect(() => {
    transitionToBeat();
  }, [transitionToBeat, currentBeat?.id]);

  // Return current beat info for visual focus application
  return {
    currentBeat,
    channelFocus: currentBeat?.channelFocus,
    visualState: currentBeat?.visualState,
    isActive: storyModeActive && viewMode === 'phase11',
  };
}

// Helper to get campaign name from ID
function getCampaignName(campaignId: string): string {
  // Campaign name mapping from mock data
  const campaignNames: Record<string, string> = {
    C001: 'ONC Launch Wave 1',
    C002: 'ASCO Booth Activation',
    C003: 'Pulm Adherence Push',
    C004: 'Rare Dx Webinar Series',
    C005: 'Access Update Q1',
    C006: 'RWE Outcomes Digest',
    C007: 'Safety Profile Series',
    C008: 'KOL Field Deep-Dive',
    C009: 'Community Onc Outreach',
    C010: 'NCCN Update Push',
  };
  return campaignNames[campaignId] || campaignId;
}

/**
 * Visual focus state for channels
 * Used by L1 components to apply opacity/glow based on story beat
 */
export function getChannelVisualState(
  channelId: string,
  focusChannel: string | undefined,
  visualState: string | undefined
): {
  opacity: number;
  highlighted: boolean;
  warning: boolean;
} {
  // No story focus - all channels normal
  if (!focusChannel) {
    return { opacity: 1, highlighted: false, warning: false };
  }

  // This channel is the focus
  if (channelId === focusChannel) {
    return {
      opacity: 1,
      highlighted: true,
      warning: visualState === 'warning' || visualState === 'critical',
    };
  }

  // Other channels are dimmed
  return { opacity: 0.2, highlighted: false, warning: false };
}
