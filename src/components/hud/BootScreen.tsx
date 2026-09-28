import React, { useEffect, useState } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import { Monitor, Shield, ArrowRight, Play, Terminal } from 'lucide-react';
import { StationId } from '../../types';

interface BootScreenProps {
  onEnter: () => void;
  onQuickJump?: (stationId: StationId) => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onEnter, onQuickJump }) => {
  const [progress, setProgress] = useState<number>(0);
  const [bootPhase, setBootPhase] = useState<string>('INIT_BOOT_SEQUENCE');
  const [blinkReady, setBlinkReady] = useState<boolean>(true);

  // Retro loading bar tick simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        
        // Dynamic loading phases based on progress
        const next = prev + Math.floor(Math.random() * 4) + 1;
        const capped = Math.min(next, 100);
        
        if (capped < 25) setBootPhase('MAPPING_GEOMETRY...');
        else if (capped < 50) setBootPhase('CACHING_RASTER_DATA...');
        else if (capped < 75) setBootPhase('RESOLVING_TERMINAL_IPC...');
        else if (capped < 95) setBootPhase('POLISHING_TACTICAL_MAP...');
        else setBootPhase('SYSTEM_ONLINE_READY.');
        
        return capped;
      });
    }, 45);

    return () => clearInterval(interval);
  }, []);

  // Flashing cursor / START prompt timer
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkReady((prev) => !prev);
    }, 450);
    return () => clearInterval(blinkInterval);
  }, []);

  const handleStart = () => {
    if (progress < 100) return; // Prevent early entry
    try {
      soundEngine.playChirp('success');
      soundEngine.startAmbient();
    } catch {
      // Audio safety
    }
    onEnter();
  };

  const isLoaded = progress === 100;

  return (
    <div
      onClick={isLoaded ? handleStart : undefined}
      className={`fixed inset-0 z-50 bg-[#060410]/95 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none transition-all duration-300 ${
        isLoaded ? 'cursor-pointer' : 'cursor-wait'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#0e0a24]/90 border-4 border-double border-rose-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/80 flex flex-col items-center space-y-6 text-center"
      >
        
        {/* CRT Scanline effect on boot container */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay rounded-3xl"
          style={{
            backgroundImage: 'repeating-linear-gradient(rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0.6) 2px, rgba(0, 0, 0, 0) 4px)'
          }}
        />

        {/* 1. Playful Retro Pixel-Art Computer Illustration matching user reference image exactly */}
        <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
          <svg
            viewBox="0 0 400 360"
            className="w-full h-full drop-shadow-[0_0_15px_rgba(244,63,94,0.15)]"
            style={{ shapeRendering: 'crispEdges' }}
          >
            {/* Ambient Shadow cast by the computer */}
            <ellipse cx="220" cy="305" rx="140" ry="25" fill="#04020a" opacity="0.6" />

            {/* A. COMPUTER MAIN UNIT BASE (Magenta Casing with floppy slots) */}
            {/* Top of Base */}
            <polygon points="90,205 240,242 360,205 210,168" fill="#c084fc" stroke="#581c87" strokeWidth="2" />
            {/* Front Left Casing */}
            <polygon points="90,205 240,242 240,275 90,238" fill="#e879f9" stroke="#581c87" strokeWidth="2" />
            {/* Front Right Casing */}
            <polygon points="240,242 360,205 360,238 240,275" fill="#a21caf" stroke="#581c87" strokeWidth="2" />

            {/* Floppy Drive Slot Detail */}
            <polygon points="170,225 225,238 225,248 170,235" fill="#1e1b4b" stroke="#581c87" strokeWidth="1.5" />
            <rect x="180" y="233" width="10" height="2" fill="#eab308" transform="rotate(5, 180, 233)" /> {/* Yellow floppy button */}

            {/* Ventilation vents on base side */}
            <line x1="280" y1="223" x2="280" y2="238" stroke="#4a044e" strokeWidth="2.5" />
            <line x1="290" y1="220" x2="290" y2="235" stroke="#4a044e" strokeWidth="2.5" />
            <line x1="300" y1="217" x2="300" y2="232" stroke="#4a044e" strokeWidth="2.5" />
            <line x1="310" y1="214" x2="310" y2="229" stroke="#4a044e" strokeWidth="2.5" />

            {/* B. RETRO MONITOR CASE (Lime/Green Casing) */}
            {/* Top of Monitor */}
            <polygon points="110,80 220,50 330,80 220,110" fill="#d9f99d" stroke="#3f6212" strokeWidth="2.5" />
            {/* Front Left Case */}
            <polygon points="110,80 220,110 220,230 110,200" fill="#bef264" stroke="#3f6212" strokeWidth="2.5" />
            {/* Side Right Case */}
            <polygon points="220,110 330,80 330,200 220,230" fill="#84cc16" stroke="#3f6212" strokeWidth="2.5" />

            {/* Ventilation Vents on Monitor Right Side */}
            <polygon points="265,115 300,105 300,111 265,121" fill="#3f6212" />
            <polygon points="265,130 300,120 300,126 265,136" fill="#3f6212" />

            {/* C. MONITOR FRONT BEZEL (Accent Pink Ring) */}
            <polygon points="125,95 210,117 210,215 125,193" fill="#f472b6" stroke="#3f6212" strokeWidth="2" />

            {/* D. MONITOR CRT SCREEN (Glowing Blue/Cyan) */}
            <polygon points="135,105 200,122 200,205 135,188" fill="#083344" stroke="#1e293b" strokeWidth="1.5" />

            {/* Glowing Screen Raster Grid */}
            <polygon points="137,107 198,123 198,203 137,186" fill="#06b6d4" opacity="0.18" />

            {/* Screen Content Render Block based on Loading/Loaded State */}
            {!isLoaded ? (
              <>
                {/* Simulated Loading Text on screen */}
                <text x="142" y="130" fill="#22d3ee" fontSize="7" fontFamily="monospace" fontWeight="bold">
                  LOAD:{progress}%
                </text>
                {/* Running pixel bar indicator on screen */}
                <rect x="142" y="145" width="45" height="4" fill="#0c4a6e" />
                <rect x="142" y="145" width={`${(progress / 100) * 45}`} height="4" fill="#22d3ee" />
                <text x="142" y="165" fill="#38bdf8" fontSize="5" fontFamily="monospace">
                  SEC_BOOT
                </text>
              </>
            ) : (
              <>
                {/* Start prompt on screen */}
                <polygon points="144,142 192,154 192,184 144,172" fill="#22c55e" opacity={blinkReady ? 1 : 0.4} />
                <text x="151" y="161" fill="#052e16" fontSize="9" fontFamily="monospace" fontWeight="extrabold">
                  START
                </text>
                <text x="144" y="125" fill="#4ade80" fontSize="6" fontFamily="monospace">
                  SYSTEM READY
                </text>
              </>
            )}

            {/* E. SEPARATE RETRO KEYBOARD (On green tray base) */}
            {/* Keyboard Tray Base (Green) */}
            <polygon points="40,250 190,300 220,290 70,240" fill="#a3e635" stroke="#3f6212" strokeWidth="1.5" />
            <polygon points="40,250 190,300 190,312 40,262" fill="#84cc16" stroke="#3f6212" strokeWidth="1.5" />
            <polygon points="190,300 220,290 220,302 190,312" fill="#4d7c0f" stroke="#3f6212" strokeWidth="1.5" />

            {/* Keyboard Keycap Blocks (Pink and White keys) */}
            {/* Main alphabet cluster */}
            <polygon points="55,258 145,288 145,296 55,266" fill="#f1f5f9" stroke="#3f6212" strokeWidth="1" />
            <polygon points="60,256 142,284 142,289 60,261" fill="#f472b6" opacity="0.8" />
            {/* Spacebar */}
            <polygon points="85,273 125,287 125,291 85,277" fill="#f472b6" stroke="#3f6212" strokeWidth="0.8" />
            {/* Numpad Block cluster */}
            <polygon points="152,288 180,298 180,305 152,295" fill="#f472b6" stroke="#3f6212" strokeWidth="1" />
            <polygon points="155,286 177,294 177,298 155,290" fill="#f1f5f9" />
          </svg>

          {/* Quick Click helper directly on the screen center for natural gaming UI feel */}
          {isLoaded && (
            <button
              onClick={handleStart}
              className="absolute w-[80px] h-[60px] top-[26%] left-[34%] transform rotate-[8deg] bg-transparent cursor-pointer"
              title="Click Monitor Screen to Start"
            />
          )}
        </div>

        {/* 2. Interactive Systems Loading Briefing */}
        <div className="w-full space-y-4">
          
          {/* Identity Header */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
              HANAN SAEED
            </h1>
            <div className="text-[10px] font-mono text-rose-400 font-bold tracking-[0.2em] uppercase">
              SECURITY RESEARCH PORTFOLIO
            </div>
          </div>

          {/* 3. Action Click to Start (Revealed only when fully rendered/loaded) */}
          <div className="min-h-[52px] flex items-center justify-center pt-2">
            {isLoaded ? (
              <button
                onClick={handleStart}
                className="w-full py-3.5 px-6 rounded-xl font-mono text-xs font-bold tracking-wider uppercase bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-lg shadow-rose-500/40 hover:shadow-rose-400/60 transition-all flex items-center justify-center gap-2 cursor-pointer scale-100 hover:scale-[1.02] border-b-4 border-rose-700 active:border-b-0 active:mt-1 animate-bounce"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>START WORKSTATION</span>
              </button>
            ) : (
              <div className="text-[11px] font-mono text-slate-400 animate-pulse tracking-wide">
                INITIALIZING COZY CYBER ENVIRONMENT... {progress}%
              </div>
            )}
          </div>
        </div>

        {/* Tip footer */}
        <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60 w-full flex items-center justify-between">
          <span>Hanan Saeed Portfolio v1.4.0</span>
          <span>Shortcut: [Space / Enter]</span>
        </div>
      </div>
    </div>
  );
};
