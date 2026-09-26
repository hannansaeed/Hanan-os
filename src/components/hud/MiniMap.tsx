import React from 'react';
import { StationId } from '../../types';
import { soundEngine } from '../../audio/soundEngine';
import { X, Crosshair, Monitor, Shield, Terminal, Server } from 'lucide-react';

interface MiniMapProps {
  activeStation: StationId;
  onSelectStation: (id: StationId) => void;
  onClose: () => void;
}

interface MapNode {
  id: StationId;
  label: string;
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  icon: React.ReactNode;
}

const MAP_NODES: MapNode[] = [
  { id: 'overview', label: 'Room Overview', xPercent: 50, yPercent: 78, icon: <Crosshair className="w-3.5 h-3.5" /> },
  { id: 'horizontal_monitor', label: 'Workstation Display', xPercent: 48, yPercent: 30, icon: <Monitor className="w-3.5 h-3.5" /> },
  { id: 'vertical_monitor', label: 'Security Terminal', xPercent: 60, yPercent: 30, icon: <Shield className="w-3.5 h-3.5" /> },
  { id: 'desk', label: 'Desk & Peripherals', xPercent: 50, yPercent: 38, icon: <Terminal className="w-3.5 h-3.5" /> },
  { id: 'server_rack', label: 'Dual Servers (Core Node)', xPercent: 26, yPercent: 28, icon: <Server className="w-3.5 h-3.5" /> },
];

export const MiniMap: React.FC<MiniMapProps> = ({ activeStation, onSelectStation, onClose }) => {
  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-[#0a0f1d] border border-cyan-500/30 rounded-xl p-6 shadow-2xl shadow-cyan-950/50">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-cyan-400 tracking-wider">3D ROOM BLUEPRINT</div>
            <h3 className="text-base font-semibold text-slate-100">Interactive Workstation & Lab</h3>
          </div>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Close Map (Esc / M)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tactical Map Grid */}
        <div className="relative w-full aspect-square my-6 bg-[#060a14] border border-slate-800/80 rounded-lg overflow-hidden p-4">
          {/* Blueprint Grid Lines */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'linear-gradient(to right, #0ea5e9 1px, transparent 1px), linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Room Outer Perimeter */}
          <div className="absolute inset-4 border-2 border-cyan-500/50 rounded pointer-events-none flex flex-col justify-between p-2 text-[10px] font-mono text-slate-400">
            <div className="flex justify-between border-b border-cyan-500/20 pb-1">
              <span className="text-cyan-400">BURGUNDY WALL</span>
              <span>WORKSTATION</span>
            </div>
            <div className="flex justify-between items-center my-auto">
              <span className="rotate-[-90deg] origin-left text-cyan-400">WINDOW</span>
              <div className="text-center opacity-30 text-[9px] tracking-widest text-slate-400">
                CYBERSPACE RIG<br/>DEV & RESEARCH LAB
              </div>
              <span className="rotate-[90deg] origin-right text-cyan-400">SHELVING</span>
            </div>
            <div className="flex justify-center border-t border-cyan-500/20 pt-1 text-cyan-300">
              <span>▲ ROOM VIEWPOINT ▲</span>
            </div>
          </div>

          {/* Central Desk Outline */}
          <div className="absolute left-[38%] top-[34%] w-[24%] h-[12%] border border-slate-600 bg-slate-900/80 rounded flex items-center justify-center pointer-events-none">
            <span className="text-[9px] font-mono text-slate-300">WORKSTATION</span>
          </div>

          {/* Station Hotspot Nodes */}
          {MAP_NODES.map((node) => {
            const isActive = activeStation === node.id;
            return (
              <button
                key={node.id}
                onClick={() => {
                  soundEngine.playChirp('enter');
                  onSelectStation(node.id);
                  onClose();
                }}
                style={{
                  left: `${node.xPercent}%`,
                  top: `${node.yPercent}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute group flex flex-col items-center justify-center p-2 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/30 scale-110'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-cyan-600 hover:text-white hover:scale-110'
                }`}
                title={node.label}
              >
                {node.icon}
                <span className="absolute whitespace-nowrap top-full mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-900/90 border border-slate-700 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  {node.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer Navigation Tip */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Select any node to warp camera</span>
          </div>
          <span className="text-slate-500">Shortcuts: 0-7 or [M]</span>
        </div>
      </div>
    </div>
  );
};
