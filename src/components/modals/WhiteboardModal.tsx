import React, { useState, useEffect, useCallback } from 'react';
import { RoomScene } from '../../scene/RoomScene';
import { soundEngine } from '../../audio/soundEngine';

interface WhiteboardModalProps {
  sceneRef: React.RefObject<RoomScene | null>;
  onClose: () => void;
}

const FOUR_COLORS = [
  { name: 'Black', hex: '#18181b', bg: 'bg-zinc-900' },
  { name: 'Blue', hex: '#2563eb', bg: 'bg-blue-600' },
  { name: 'Red', hex: '#dc2626', bg: 'bg-red-600' },
  { name: 'Green', hex: '#16a34a', bg: 'bg-green-600' },
];

const DEFAULT_MEDIUM_THICKNESS = 10;

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({ sceneRef, onClose }) => {
  const [activeColor, setActiveColor] = useState<string>('#18181b');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  // Convert pointer event to normalized device coords & raycast 3D whiteboard surface
  const getRaycastPos = useCallback(
    (clientX: number, clientY: number) => {
      const normX = (clientX / window.innerWidth) * 2 - 1;
      const normY = -(clientY / window.innerHeight) * 2 + 1;
      return sceneRef.current?.raycastWhiteboard(normX, normY) || null;
    },
    [sceneRef]
  );

  const drawStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const sceneCanvas = sceneRef.current?.getWhiteboardCanvas();
      if (!sceneCanvas) return;

      const ctx = sceneCanvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = DEFAULT_MEDIUM_THICKNESS;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      sceneRef.current?.notifyWhiteboardUpdated();
    },
    [sceneRef, activeColor]
  );

  // Viewport pointer handlers for direct 3D raycast drawing
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // Ignore if clicking on interactive color toolbar
      if ((e.target as HTMLElement)?.closest('.pointer-events-auto')) {
        return;
      }

      const pos = getRaycastPos(e.clientX, e.clientY);
      if (pos) {
        setIsDrawing(true);
        setLastPos(pos);
        drawStroke(pos, pos);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawing || !lastPos) return;

      const pos = getRaycastPos(e.clientX, e.clientY);
      if (pos) {
        drawStroke(lastPos, pos);
        setLastPos(pos);
      }
    };

    const handlePointerUp = () => {
      if (isDrawing) {
        setIsDrawing(false);
        setLastPos(null);
        sceneRef.current?.saveWhiteboardToStorage();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDrawing, lastPos, getRaycastPos, drawStroke, sceneRef]);

  // Keyboard shortcut listener for Esc or E
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end p-6 pointer-events-none select-none">
      {/* Bottom Floating 4-Color Palette Toolbar ONLY */}
      <div className="pointer-events-auto mx-auto flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-md animate-fade-in">
        <span className="text-xs font-mono text-slate-400 font-semibold uppercase">COLOR:</span>
        <div className="flex items-center gap-2.5">
          {FOUR_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => {
                soundEngine.playKeyClick();
                setActiveColor(c.hex);
              }}
              className={`w-7 h-7 rounded-full transition-all ${c.bg} ${
                activeColor === c.hex
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg'
                  : 'opacity-70 hover:opacity-100 hover:scale-105'
              }`}
              title={c.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
