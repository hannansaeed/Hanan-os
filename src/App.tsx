/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WorkstationCanvas } from './components/canvas/WorkstationCanvas';
import { NavigationHUD } from './components/hud/NavigationHUD';
import { MiniMap } from './components/hud/MiniMap';
import { BootScreen } from './components/hud/BootScreen';
import { ProjectModal } from './components/modals/ProjectModal';
import { SecurityTerminalModal } from './components/modals/SecurityTerminalModal';
import { TerminalModal } from './components/modals/TerminalModal';
import { CTFWallModal } from './components/modals/CTFWallModal';
import { TimelineModal } from './components/modals/TimelineModal';
import { ServerRackModal } from './components/modals/ServerRackModal';
import { ExitDoorModal } from './components/modals/ExitDoorModal';
import { RoomScene, RaycastHitInfo } from './scene/RoomScene';
import { StationId } from './types';
import { soundEngine } from './audio/soundEngine';

export default function App() {
  const [showEntranceBanner, setShowEntranceBanner] = useState(false);
  const [activeStation, setActiveStation] = useState<StationId>('overview');
  const [hoverInfo, setHoverInfo] = useState<RaycastHitInfo | null>(null);
  const [isWalkMode, setIsWalkMode] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Modals
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isCTFModalOpen, setIsCTFModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const sceneRef = useRef<RoomScene | null>(null);

  // Handle station selection
  const handleSelectStation = useCallback((stationId: StationId) => {
    setShowEntranceBanner(false);
    setActiveStation(stationId);
    sceneRef.current?.goToStation(stationId);

    // If walk mode was active, switch back to camera target focus
    if (isWalkMode) {
      setIsWalkMode(false);
      sceneRef.current?.setWalkMode(false);
    }

    // Automatically open corresponding detail inspector when station is inspected
    if (stationId === 'horizontal_monitor') {
      setIsProjectModalOpen(true);
    } else if (stationId === 'vertical_monitor') {
      setIsTerminalOpen(true);
    } else if (stationId === 'desk') {
      setIsTerminalOpen(true);
    } else if (stationId === 'server_rack') {
      setIsServerModalOpen(true);
    } else if (stationId === 'social_linkedin') {
      window.open('https://www.linkedin.com', '_blank');
      handleStepBackToWalk();
    } else if (stationId === 'social_github') {
      window.open('https://github.com', '_blank');
      handleStepBackToWalk();
    } else if (stationId === 'social_steam') {
      window.open('https://store.steampowered.com', '_blank');
      handleStepBackToWalk();
    }
  }, [isWalkMode]);

  const handleStepBackToWalk = useCallback(() => {
    setIsProjectModalOpen(false);
    setIsTerminalOpen(false);
    setIsSecurityModalOpen(false);
    setIsServerModalOpen(false);
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

  // Keyboard shortcut listeners
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Any navigation key dismisses entrance banner
      setShowEntranceBanner(false);

      if (e.key === 'm' || e.key === 'M') {
        soundEngine.playKeyClick();
        setIsMapOpen((prev) => !prev);
      } else if (e.key === 't' || e.key === 'T') {
        soundEngine.playKeyClick();
        setIsTerminalOpen((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        soundEngine.playKeyClick();
        handleToggleWalkMode();
      } else if (e.key === 'Escape') {
        setShowEntranceBanner(false);
        setIsMapOpen(false);
        setIsTerminalOpen(false);
        setIsProjectModalOpen(false);
        setIsSecurityModalOpen(false);
        setIsCTFModalOpen(false);
        setIsTimelineModalOpen(false);
        setIsServerModalOpen(false);
        setIsExitModalOpen(false);
      }
    };

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [handleToggleWalkMode]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#06080e] select-none text-slate-100">
      {/* Three.js 3D Room Canvas */}
      <WorkstationCanvas
        sceneRef={sceneRef}
        onStationSelect={handleSelectStation}
        onHoverChange={setHoverInfo}
      />

      {/* Primary Navigation & HUD Overlay (ALWAYS active and clickable) */}
      <NavigationHUD
        activeStation={activeStation}
        isWalkMode={isWalkMode}
        isMuted={isMuted}
        hoverInfo={hoverInfo}
        onSelectStation={handleSelectStation}
        onToggleWalkMode={handleToggleWalkMode}
        onToggleAudio={handleToggleAudio}
        onOpenMap={() => setIsMapOpen(true)}
        onOpenTerminal={() => setIsTerminalOpen(true)}
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

      {/* Horizontal Monitor (Projects & Workstation) Modal */}
      {isProjectModalOpen && (
        <ProjectModal
          initialProjectId={selectedProjectId}
          onClose={() => {
            setIsProjectModalOpen(false);
            setSelectedProjectId(undefined);
          }}
        />
      )}

      {/* Vertical Monitor (Cybersecurity & Packet Sniffer) Modal */}
      {isSecurityModalOpen && (
        <SecurityTerminalModal
          onClose={() => setIsSecurityModalOpen(false)}
        />
      )}

      {/* Interactive CLI Terminal Shell Modal */}
      {isTerminalOpen && (
        <TerminalModal
          onClose={() => setIsTerminalOpen(false)}
          onOpenProject={(pId) => {
            setIsTerminalOpen(false);
            setSelectedProjectId(pId);
            setIsProjectModalOpen(true);
          }}
        />
      )}

      {/* CTF Lab Wall Writeups Modal */}
      {isCTFModalOpen && (
        <CTFWallModal
          onClose={() => setIsCTFModalOpen(false)}
        />
      )}

      {/* Career & Research Timeline Wall Modal */}
      {isTimelineModalOpen && (
        <TimelineModal
          onClose={() => setIsTimelineModalOpen(false)}
        />
      )}

      {/* 42U Server Rack Infrastructure Modal */}
      {isServerModalOpen && (
        <ServerRackModal
          onClose={() => setIsServerModalOpen(false)}
        />
      )}

      {/* Exit Door & Secure Comms Dispatch Modal */}
      {isExitModalOpen && (
        <ExitDoorModal
          onClose={() => setIsExitModalOpen(false)}
          onReturnToEntrance={() => {
            setIsExitModalOpen(false);
            handleSelectStation('overview');
          }}
        />
      )}
    </div>
  );
}
