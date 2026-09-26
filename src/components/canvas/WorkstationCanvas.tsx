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

  onStationSelectRef.current = onStationSelect;
  onHoverChangeRef.current = onHoverChange;

  useEffect(() => {
    if (!mountRef.current) return;

    const roomScene = new RoomScene(mountRef.current);
    roomScene.onStationSelect = (id) => onStationSelectRef.current?.(id);
    roomScene.onHoverChange = (hit) => onHoverChangeRef.current?.(hit);
    sceneRef.current = roomScene;

    return () => {
      roomScene.dispose();
      sceneRef.current = null;
    };
  }, [sceneRef]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-[#06080d]"
      tabIndex={0}
      aria-label="3D Workstation Interactive Viewport"
    />
  );
};
