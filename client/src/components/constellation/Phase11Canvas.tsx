/**
 * Phase11Canvas - Three-level constellation visualization
 *
 * Phase 11: New HCP-centric visualization with L1 Solar System,
 * L2 Campaign Orbit, and L3 HCP Constellation views.
 */

import { Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useConstellationStore } from '@/stores/constellationStore';
import { L1SolarSystem } from './L1SolarSystem';
import { L2CampaignOrbit } from './L2CampaignOrbit';
import { L3HCPConstellation } from './L3HCPConstellation';
import { Phase11CameraController } from './Phase11CameraController';
import { Phase11ErrorBoundary } from './Phase11ErrorBoundary';
import { Environment } from './Environment';
import { getChannelConfig } from '@/lib/constellation/channelColors';

// Camera settings for each level
const CAMERA_CONFIG = {
  L1: { position: [0, 80, 200] as [number, number, number], fov: 60 },
  L2: { position: [0, 40, 100] as [number, number, number], fov: 55 },
  L3: { position: [0, 30, 80] as [number, number, number], fov: 50 },
};

/**
 * Phase 11 Scene Component
 */
function Phase11Scene() {
  const {
    navigationContext,
    navigateToL1,
    navigateToL2,
    navigateToL3,
  } = useConstellationStore();

  // Handle channel selection in L1
  const handleChannelSelect = useCallback((channelId: string) => {
    const config = getChannelConfig(channelId);
    navigateToL2(channelId, config.displayName);
  }, [navigateToL2]);

  // Handle campaign selection in L2
  const handleCampaignSelect = useCallback((campaignId: string, campaignName: string) => {
    if (navigationContext.level === 'L2') {
      navigateToL3(
        navigationContext.channelId,
        navigationContext.channelLabel,
        campaignId,
        campaignName
      );
    }
  }, [navigationContext, navigateToL3]);

  // Handle back from L3 to L2
  const handleBackToL2 = useCallback(() => {
    if (navigationContext.level === 'L3') {
      navigateToL2(navigationContext.channelId, navigationContext.channelLabel);
    }
  }, [navigationContext, navigateToL2]);

  // Render view based on current level
  const renderView = () => {
    switch (navigationContext.level) {
      case 'L1':
        return (
          <L1SolarSystem
            onChannelSelect={handleChannelSelect}
          />
        );
      case 'L2':
        return (
          <L2CampaignOrbit
            channelId={navigationContext.channelId}
            channelLabel={navigationContext.channelLabel}
            onCampaignSelect={handleCampaignSelect}
            onBack={navigateToL1}
          />
        );
      case 'L3':
        return (
          <L3HCPConstellation
            campaignId={navigationContext.campaignId}
            campaignName={navigationContext.campaignName}
            channelId={navigationContext.channelId}
            channelLabel={navigationContext.channelLabel}
            onBack={handleBackToL2}
          />
        );
      default:
        return null;
    }
  };

  const cameraConfig = CAMERA_CONFIG[navigationContext.level];

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={cameraConfig.position}
        fov={cameraConfig.fov}
      />
      <Phase11CameraController />
      <Suspense fallback={null}>
        <Environment />
        {renderView()}
      </Suspense>
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={30}
        maxDistance={400}
        zoomSpeed={0.8}
        rotateSpeed={0.5}
        panSpeed={0.8}
      />
    </>
  );
}

/**
 * Phase 11 Canvas Wrapper
 */
export function Phase11Canvas() {
  // Get reset function directly from store to avoid hook dependency issues
  const handleReset = useCallback(() => {
    useConstellationStore.getState().navigateToL1();
  }, []);

  return (
    <Phase11ErrorBoundary onReset={handleReset}>
      <div className="w-full h-full bg-slate-100">
        <Canvas
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 2]}
          style={{ background: '#f1f5f9' }}
        >
          <Phase11Scene />
        </Canvas>
      </div>
    </Phase11ErrorBoundary>
  );
}
