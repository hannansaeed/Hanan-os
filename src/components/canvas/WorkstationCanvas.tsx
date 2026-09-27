import React, { useEffect, useRef } from 'react';
import { RoomScene, RaycastHitInfo } from '../../scene/RoomScene';
import { StationId } from '../../types';

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
  const [webglError, setWebglError] = React.useState<string | null>(null);

  onStationSelectRef.current = onStationSelect;
  onHoverChangeRef.current = onHoverChange;

  useEffect(() => {
    if (!mountRef.current) return;

    let roomScene: RoomScene | null = null;
    try {
      roomScene = new RoomScene(mountRef.current);
      roomScene.onStationSelect = (id) => onStationSelectRef.current?.(id);
      roomScene.onHoverChange = (hit) => onHoverChangeRef.current?.(hit);
      sceneRef.current = roomScene;
    } catch (err) {
      console.error('WebGL initialization error:', err);
      setWebglError('WebGL is lost or not supported in this environment. Please refresh the page.');
    }

    return () => {
      if (roomScene) {
        roomScene.dispose();
      }
      sceneRef.current = null;
    };
  }, [sceneRef]);

  if (webglError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#06080d] text-slate-300 p-6 text-center">
        <div className="max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
          <h2 className="text-lg font-bold text-rose-400 mb-2">// WebGL Context Lost</h2>
          <p className="text-sm text-slate-400 mb-4">{webglError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors"
          >
            Reload Viewport
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
