/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WorkstationCanvas } from './components/canvas/WorkstationCanvas';
import { NavigationHUD } from './components/hud/NavigationHUD';
import { MiniMap } from './components/hud/MiniMap';
import { BootScreen } from './components/hud/BootScreen';
import { RoomScene, RaycastHitInfo } from './scene/RoomScene';
import { WhiteboardModal } from './components/modals/WhiteboardModal';
import { ServerRackModal } from './components/modals/ServerRackModal';
import { StationId } from './types';
import { soundEngine } from './audio/soundEngine';

export default function App() {
  const [showEntranceBanner, setShowEntranceBanner] = useState(false);
  const [activeStation, setActiveStation] = useState<StationId>('overview');
  const [hoverInfo, setHoverInfo] = useState<RaycastHitInfo | null>(null);
  const [isWalkMode, setIsWalkMode] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const sceneRef = useRef<RoomScene | null>(null);

  // Handle station zoom selection (Direct 3D in-room camera zoom)
  const handleSelectStation = useCallback((stationId: StationId) => {
    setShowEntranceBanner(false);

    if (
      stationId === 'social_linkedin' ||
      stationId === 'social_github' ||
      stationId === 'social_steam'
    ) {
      let url = 'https://linkedin.com/in/hanan-saeed';
      if (stationId === 'social_github') url = 'https://github.com/hannansaeed';
      if (stationId === 'social_steam') url = 'https://steamcommunity.com/id/xcthine';

      try {
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win) {
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.click();
        }
      } catch {
        try {
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.click();
        } catch {
          // Fallback for sandboxed context
        }
      }
      soundEngine.playChirp('success');
      return;
    }

    setActiveStation(stationId);
    sceneRef.current?.goToStation(stationId);

    if (stationId !== 'overview') {
      setIsWalkMode(false);
    } else {
      setIsWalkMode(true);
    }
  }, []);

  const handleStepBackToWalk = useCallback(() => {
    setActiveStation('overview');
    setIsWalkMode(true);
    sceneRef.current?.stepBackToWalk();
  }, []);

  const handleToggleWalkMode = useCallback(() => {
    setShowEntranceBanner(false);
    setIsWalkMode((prev) => {
      const next = !prev;
      sceneRef.current?.setWalkMode(next);
      return next;
    });
  }, []);

  const handleToggleAudio = useCallback(() => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      setShowEntranceBanner(false);

      if (e.key === 'm' || e.key === 'M') {
        // Prevent opening map when active in terminal station
        if (activeStation !== 'vertical_monitor') {
          soundEngine.playKeyClick();
          setIsMapOpen((prev) => !prev);
        }
      } else if (e.key === 'Escape') {
        setShowEntranceBanner(false);
        setIsMapOpen(false);
        if (activeStation !== 'overview') {
          handleStepBackToWalk();
        }
      }
    };

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [activeStation, handleStepBackToWalk]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#06080e] select-none text-slate-100">
      {/* Three.js 3D Room Canvas */}
      <WorkstationCanvas
        sceneRef={sceneRef}
        onStationSelect={handleSelectStation}
        onHoverChange={setHoverInfo}
      />

      {/* Primary Navigation & HUD Overlay */}
      <NavigationHUD
        activeStation={activeStation}
        isWalkMode={isWalkMode}
        isMuted={isMuted}
        hoverInfo={hoverInfo}
        onSelectStation={handleSelectStation}
        onToggleWalkMode={handleToggleWalkMode}
        onToggleAudio={handleToggleAudio}
        onOpenMap={() => setIsMapOpen(true)}
        onOpenTerminal={() => handleSelectStation('vertical_monitor')}
      />

      {/* Dismissible entrance intro banner */}
      {showEntranceBanner && (
        <BootScreen
          onEnter={() => {
            setShowEntranceBanner(false);
            sceneRef.current?.goToStation('overview');
          }}
          onQuickJump={handleSelectStation}
        />
      )}

      {/* Tactical Blueprint Mini-Map */}
      {isMapOpen && (
        <MiniMap
          activeStation={activeStation}
          onSelectStation={handleSelectStation}
          onClose={() => setIsMapOpen(false)}
        />
      )}

      {/* Direct 3D Whiteboard 4-Color Marker Toolbar Overlay */}
      {activeStation === 'whiteboard' && (
        <WhiteboardModal
          sceneRef={sceneRef}
          onClose={handleStepBackToWalk}
        />
      )}



      {/* Primary Server Rack Diagnostics Modal */}
      {activeStation === 'server_rack' && (
        <ServerRackModal
          onClose={handleStepBackToWalk}
        />
      )}
    </div>
  );
}
