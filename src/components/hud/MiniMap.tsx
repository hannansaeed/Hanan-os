import React, { useEffect, useState } from 'react';
import { StationId } from '../../types';
import { soundEngine } from '../../audio/soundEngine';
import { X, Crosshair, Monitor, Shield, Edit3, Share2 } from 'lucide-react';

interface MiniMapProps {
  activeStation: StationId;
  onSelectStation: (id: StationId) => void;
  onClose: () => void;
}

interface MapNode {
  id: StationId;
  label: string;
  xPercent: number; // Percentage on the map for pointer overlay
  yPercent: number;
  icon: React.ReactNode;
}

const MAP_NODES: MapNode[] = [
  { id: 'overview', label: 'Room Entrance', xPercent: 50, yPercent: 85, icon: <Crosshair className="w-3.5 h-3.5" /> },
  { id: 'horizontal_monitor', label: 'Workstation Monitor', xPercent: 66, yPercent: 59, icon: <Monitor className="w-3.5 h-3.5" /> },
  { id: 'vertical_monitor', label: 'Security Terminal', xPercent: 76, yPercent: 66, icon: <Shield className="w-3.5 h-3.5" /> },
  { id: 'social_github' as any, label: 'Social & Art Frames', xPercent: 27, yPercent: 44, icon: <Share2 className="w-3.5 h-3.5" /> },
  { id: 'whiteboard', label: 'Interactive Whiteboard', xPercent: 26, yPercent: 67, icon: <Edit3 className="w-3.5 h-3.5" /> },
];

export const MiniMap: React.FC<MiniMapProps> = ({ activeStation, onSelectStation, onClose }) => {
  const [blinkActive, setBlinkActive] = useState<boolean>(true);

  // Blinking LED pulse timer for retro server lights in the isometric floorplan
  useEffect(() => {
    const timer = setInterval(() => {
      setBlinkActive(prev => !prev);
    }, 450);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#140e24] border-4 border-double border-rose-500/60 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-rose-950/60 flex flex-col">
        
        {/* Header (16-bit RPG styling) */}
        <div className="flex items-center justify-between pb-3.5 border-b-2 border-slate-700/60">
          <div>
            <div className="text-[10px] font-mono text-rose-400 font-bold tracking-[0.2em] uppercase">
              ISOMETRIC 16-BIT TACTICAL MAP
            </div>
            <h3 className="text-sm font-extrabold text-slate-100 font-mono tracking-tight flex items-center gap-1.5 mt-0.5">
              <span className="text-yellow-400 font-extrabold">//</span>
              <span>Hanan's Workstation Room</span>
            </h3>
          </div>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all border-2 border-transparent hover:border-rose-500/40"
            title="Close Map (Esc / M)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 16-Bit Isometric Vector Art Room */}
        <div className="relative w-full aspect-[5/4] my-5 bg-[#0a0614] border-4 border-slate-800/90 rounded-xl overflow-hidden shadow-inner flex flex-col">
          
          {/* Handcrafted Isometric Pixel-Art Styled Vector Blueprint */}
          <svg
            viewBox="0 0 500 400"
            className="w-full h-full"
            style={{ shapeRendering: 'crispEdges' }}
          >
            <defs>
              {/* Scanline pattern mask to enforce high-fidelity retro CRT monitor aesthetic */}
              <pattern id="pixel-lines" width="4" height="4" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="4" y2="0" stroke="#000" strokeWidth="1" opacity="0.18" />
                <line x1="0" y1="0" x2="0" y2="4" stroke="#000" strokeWidth="1" opacity="0.18" />
              </pattern>
            </defs>

            {/* Isometric Room Base Shadows / Outer Space */}
            <path d="M 250,5 L 495,128 L 250,250 L 5,128 Z" fill="#05030a" opacity="0.4" />

            {/* 1. Floor Plane - Cozied Tiled Wood Planks (Correctly projecting inwards) */}
            <polygon points="80,295 250,210 420,295 250,380" fill="#291b35" stroke="#170f20" strokeWidth="2" />
            
            {/* Wooden Floor Board Planks Lines (Isometric lines drawn at 30 deg) */}
            <line x1="122.5" y1="273.75" x2="292.5" y2="358.75" stroke="#1b1124" strokeWidth="1.5" />
            <line x1="165" y1="252.5" x2="335" y2="337.5" stroke="#1b1124" strokeWidth="1.5" />
            <line x1="207.5" y1="231.25" x2="377.5" y2="316.25" stroke="#1b1124" strokeWidth="1.5" />
            
            {/* 2. Left Wall - Burgundy Velvet Wall (Holding the custom frames - Inward Perspective) */}
            <polygon points="80,135 250,50 250,210 80,295" fill="#6b152d" stroke="#4a0f22" strokeWidth="2" />
            
            {/* Burgundy Wall highlight panels / stripes */}
            <polygon points="100,150 230,85 230,190 100,255" fill="#520e20" opacity="0.6" />

            {/* 3. Right Wall - Deep Slate/Charcoal Security Wall (Inward Perspective) */}
            <polygon points="250,50 420,135 420,295 250,210" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
            <polygon points="270,75 400,140 400,280 270,215" fill="#0f172a" opacity="0.45" />

            {/* Cozy window with purple curtains, matching the reference image style */}
            <polygon points="300,90 350,115 350,175 300,150" fill="#38bdf8" stroke="#1e293b" strokeWidth="1.5" /> {/* Window screen */}
            <polygon points="295,85 305,90 305,155 295,150" fill="#581c87" /> {/* Left Curtain */}
            <polygon points="345,110 355,115 355,180 345,175" fill="#581c87" /> {/* Right Curtain */}

            {/* 4. Cozy Anti-Static Carpet / Purple Rug in Room Center */}
            <polygon points="180,295 250,260 320,295 250,330" fill="#4c1d95" stroke="#ec4899" strokeWidth="1.5" opacity="0.85" />
            <polygon points="200,295 250,270 300,295 250,320" fill="#2e104e" />

            {/* 5. Mahogany Workstation Console Desk (Back Right Wall) */}
            {/* Desk Top */}
            <polygon points="300,265 350,240 400,265 350,290" fill="#451a03" stroke="#b45309" strokeWidth="1.5" />
            {/* Desk Legs */}
            <line x1="302" y1="267" x2="302" y2="310" stroke="#1c1917" strokeWidth="2.5" />
            <line x1="398" y1="267" x2="398" y2="310" stroke="#1c1917" strokeWidth="2.5" />
            <line x1="350" y1="290" x2="350" y2="332" stroke="#1c1917" strokeWidth="2.5" />
            
            {/* Keyboard (Pink glowing gaming keyboard) */}
            <polygon points="335,268 345,263 360,270 350,275" fill="#f43f5e" />
            
            {/* Straightened Dual Screens sitting on the desk */}
            {/* Left Screen Panel */}
            <rect x="306" y="196" width="34" height="23" fill="#1e293b" rx="2" stroke="#334155" strokeWidth="1" />
            <rect x="309" y="199" width="28" height="17" fill="#10b981" rx="0.5" opacity="0.9" /> {/* Terminal display */}
            <line x1="323" y1="219" x2="323" y2="248" stroke="#1e293b" strokeWidth="2.5" />
            
            {/* Right Screen Panel */}
            <rect x="348" y="186" width="34" height="23" fill="#1e293b" rx="2" stroke="#334155" strokeWidth="1" />
            <rect x="351" y="189" width="28" height="17" fill="#0284c7" rx="0.5" opacity="0.9" /> {/* Projects display */}
            <line x1="365" y1="209" x2="365" y2="248" stroke="#1e293b" strokeWidth="2.5" />

            {/* 6. Interactive Whiteboard (Front Left side of Floor - Straightened) */}
            {/* Stand */}
            <line x1="115" y1="310" x2="115" y2="350" stroke="#475569" strokeWidth="2" />
            <line x1="145" y1="310" x2="145" y2="350" stroke="#475569" strokeWidth="2" />
            <line x1="105" y1="350" x2="155" y2="350" stroke="#475569" strokeWidth="2" />
            {/* Board Surface */}
            <rect x="100" y="240" width="60" height="70" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" rx="1" />
            {/* Squeegly marker mock diagram (representing Low-level specs) */}
            <path d="M 115,260 Q 130,252 145,265" stroke="#f43f5e" strokeWidth="1.5" fill="none" />
            <path d="M 110,278 Q 125,285 145,270" stroke="#0284c7" strokeWidth="1.5" fill="none" />
            <rect x="120" y="300" width="8" height="3" fill="#1e293b" /> {/* Felt Eraser */}

            {/* 7. Art Frames on Burgundy Left Wall (Properly aligned to inside wall tilt) */}
            {/* Custom Frame 1 */}
            <polygon points="110,140 145,122 145,172 110,190" fill="#451a03" stroke="#eab308" strokeWidth="1.5" />
            <polygon points="113,142 142,126 142,168 113,185" fill="#f1f5f9" />
            <circle cx="127" cy="153" r="10" fill="#3b82f6" opacity="0.8" /> {/* Scaramouche chibi art circle mimic */}
            
            {/* Custom Frame 2 */}
            <polygon points="170,110 205,92 205,142 170,160" fill="#451a03" stroke="#eab308" strokeWidth="1.5" />
            <polygon points="173,112 202,96 202,138 173,155" fill="#f1f5f9" />
            <circle cx="187" cy="122" r="10" fill="#ec4899" opacity="0.8" />

            {/* 9. Cozy Plant (Right Front side of Floor) */}
            <polygon points="370,315 385,307 400,315 385,323" fill="#b45309" stroke="#78350f" strokeWidth="1.5" /> {/* Terracotta Pot Top */}
            {/* Plant Stem & Leafy Pixel Bush */}
            <path d="M 385,307 Q 385,295 385,290" stroke="#78350f" strokeWidth="2.5" fill="none" />
            <circle cx="385" cy="278" r="12" fill="#059669" opacity="0.9" />
            <circle cx="381" cy="274" r="5" fill="#34d399" opacity="0.9" />

            {/* 10. Room Doorway Indicator / Yellow Hazard Warning Threshold (Front Center Corner) */}
            <polygon points="225,367 250,355 275,367 250,380" fill="#eab308" stroke="#1e293b" strokeWidth="1.5" />
            <line x1="233" y1="363" x2="247" y2="375" stroke="#0f172a" strokeWidth="2.5" />
            <line x1="253" y1="363" x2="267" y2="375" stroke="#0f172a" strokeWidth="2.5" />

            {/* 11. Interactive Laptop Security Terminal Table (Right side of Floor) */}
            {/* Laptop Table */}
            <polygon points="360,285 385,272 410,285 385,298" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <line x1="360" y1="285" x2="360" y2="320" stroke="#0f172a" strokeWidth="2" />
            <line x1="410" y1="285" x2="410" y2="320" stroke="#0f172a" strokeWidth="2" />
            
            {/* Open Laptop on table */}
            <polygon points="372,282 388,274 396,278 380,286" fill="#cbd5e1" /> {/* Base Keyboard */}
            <polygon points="380,286 396,278 396,265 380,273" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" /> {/* Glowing monitor open */}
            <polygon points="382,284 394,278 394,267 382,273" fill="#a855f7" opacity="0.8" /> {/* Purple security scan active */}

            {/* Apply Scanline overlay directly onto SVG */}
            <rect width="500" height="400" fill="url(#pixel-lines)" pointerEvents="none" />
          </svg>

          {/* Interactive Radar Hotspots overlayed perfectly onto the Isometric 3D floorplan coordinates */}
          <div className="absolute inset-0 pointer-events-none z-20">
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
                  className={`absolute pointer-events-auto group flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-150 ${
                    isActive
                      ? 'bg-rose-500 border-yellow-300 text-slate-950 scale-110 shadow-[0_0_12px_#f43f5e] z-30 font-bold'
                      : 'bg-slate-950/95 border-slate-700/80 text-rose-400 hover:bg-rose-600 hover:text-slate-950 hover:border-yellow-300 hover:scale-115 hover:shadow-[0_0_8px_#f43f5e] z-20'
                  }`}
                  title={node.label}
                >
                  {node.icon}
                  
                  {/* Premium tooltip styled in pixel border-block format */}
                  <span className="absolute whitespace-nowrap top-full mt-2 px-2.5 py-1 rounded bg-[#090d16] border-2 border-slate-700 text-[10px] font-mono font-bold text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40 shadow-xl">
                    {node.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Retro Map Legend Status Panel */}
        <div className="grid grid-cols-4 gap-2 border-t-2 border-slate-700/60 pt-3.5 mt-1 text-[9px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#6b152d] border border-rose-500 rounded-xs shrink-0" />
            <span>Burgundy Wall</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#451a03] border border-amber-600 rounded-xs shrink-0" />
            <span>Console Desk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#4c1d95] border border-pink-500 rounded-xs shrink-0" />
            <span>Cozy Rug</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-slate-100 border border-slate-400 rounded-xs shrink-0" />
            <span>Whiteboard</span>
          </div>
        </div>

        {/* Footer Navigation Tip */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t-2 border-slate-700/60 pt-3.5 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span>Select any node to warp camera</span>
          </div>
          <span className="text-slate-500">Shortcut: [M]</span>
        </div>
      </div>
    </div>
  );
};
