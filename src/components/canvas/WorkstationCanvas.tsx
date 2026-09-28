import React, { useEffect, useRef, useState } from 'react';
import { RoomScene, RaycastHitInfo } from '../../scene/RoomScene';
import { StationId } from '../../types';
import { RefreshCw, AlertTriangle, Monitor, Shield, Map as MapIcon } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';

interface WorkstationCanvasProps {
  onStationSelect: (stationId: StationId) => void;
  onHoverChange: (hit: RaycastHitInfo | null) => void;
  sceneRef: React.MutableRefObject<RoomScene | null>;
}

export const WorkstationCanvas: React.FC<WorkstationCanvasProps> = ({
  onStationSelect,
  onHoverChange,
  sceneRef,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const onStationSelectRef = useRef(onStationSelect);
  const onHoverChangeRef = useRef(onHoverChange);
  const [webGlError, setWebGlError] = useState<string | null>(null);

  onStationSelectRef.current = onStationSelect;
  onHoverChangeRef.current = onHoverChange;

  useEffect(() => {
    if (!mountRef.current) return;

    let roomScene: RoomScene | null = null;

    try {
      setWebGlError(null);
      roomScene = new RoomScene(mountRef.current);
      roomScene.onStationSelect = (id) => onStationSelectRef.current?.(id);
      roomScene.onHoverChange = (hit) => onHoverChangeRef.current?.(hit);
      sceneRef.current = roomScene;
    } catch (err: unknown) {
      console.warn('WebGL Initialization Exception Caught:', err);
      const errMsg = err instanceof Error ? err.message : 'Unable to create 3D WebGL context.';
      setWebGlError(errMsg);
    }

    return () => {
      if (roomScene) {
        try {
          roomScene.dispose();
        } catch (e) {
          console.warn('Error during scene disposal:', e);
        }
      }
      sceneRef.current = null;
    };
  }, [sceneRef]);

  const handleReload = () => {
    window.location.reload();
  };

  if (webGlError) {
    return (
      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-[#070b16] p-6 text-center text-slate-200">
        <div className="relative w-full max-w-xl bg-[#0d1326] border-2 border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-5 animate-fade-in pointer-events-auto">
          
          {/* Safe-Mode Header */}
          <div className="flex items-center justify-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-400 animate-pulse" />
            <div className="text-left">
              <div className="text-[10px] font-mono text-amber-400 font-bold tracking-widest uppercase">
                WEBGL RENDERER SAFE-MODE ACTIVATED
              </div>
              <h3 className="text-base font-extrabold font-mono text-slate-100 mt-0.5">
                Low-Overhead 2D Tactical Interface
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-mono leading-relaxed max-w-md mx-auto">
            Your browser context has locked WebGL rendering due to system resource exhaustion or multiple hot-reloads. Don't worry—Hanan's workstation is fully equipped with an alternate high-performance 2D terminal feed!
          </p>

          {/* Quick Launch Buttons to 2D components */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => {
                soundEngine.playChirp('success');
                onStationSelect('horizontal_monitor');
              }}
              className="px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/60 font-mono text-xs font-bold transition-all flex flex-col items-center justify-center gap-2"
            >
              <Monitor className="w-5 h-5 text-rose-400" />
              <span>Launch Desktop GUI</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playChirp('success');
                onStationSelect('vertical_monitor');
              }}
              className="px-4 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 font-mono text-xs font-bold transition-all flex flex-col items-center justify-center gap-2"
            >
              <Shield className="w-5 h-5 text-emerald-400" />
              <span>Launch Terminal CLI</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playChirp('success');
                // Simulate an 'm' keydown to open map directly
                const event = new KeyboardEvent('keydown', { key: 'm' });
                window.dispatchEvent(event);
              }}
              className="px-4 py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 font-mono text-xs font-bold transition-all flex flex-col items-center justify-center gap-2"
            >
              <MapIcon className="w-5 h-5 text-indigo-400" />
              <span>Launch Room Map</span>
            </button>
          </div>

          <div className="w-full h-px bg-slate-800" />

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-[10px] font-mono text-slate-500 text-left">
              Context Error: {webGlError.substring(0, 50)}...
            </div>
            <button
              onClick={handleReload}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-colors shadow-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry WebGL Re-Init</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-[#06080d]"
      tabIndex={0}
      aria-label="3D Workstation Interactive Viewport"
    />
  );
};
