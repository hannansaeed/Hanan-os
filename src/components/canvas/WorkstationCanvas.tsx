import React, { useEffect, useRef, useState } from 'react';
import { RoomScene, RaycastHitInfo } from '../../scene/RoomScene';
import { StationId } from '../../types';
import { RefreshCw, AlertTriangle } from 'lucide-react';

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
      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-[#06080d] p-6 text-center text-slate-200">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 max-w-md space-y-3 shadow-2xl">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
          <h3 className="text-base font-bold font-display text-slate-100">3D WebGL Context Recovery</h3>
          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            The browser WebGL renderer context was reset or temporarily unavailable.
          </p>
          <button
            onClick={handleReload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-mono text-xs font-bold transition-colors shadow-lg mt-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Restore 3D Viewport</span>
          </button>
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
