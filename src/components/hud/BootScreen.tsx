import React, { useState, useEffect } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import { Terminal, Shield, ArrowRight, Volume2 } from 'lucide-react';

interface BootScreenProps {
  onEnter: () => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onEnter }) => {
  const [bootProgress, setBootProgress] = useState(0);
  const [isBooted, setIsBooted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setBootProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsBooted(true);
          return 100;
        }
        return prev + 20;
      });
    }, 120);

    return () => clearInterval(timer);
  }, []);

  const handleStart = () => {
    soundEngine.playChirp('success');
    soundEngine.startAmbient();
    onEnter();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#06080e] flex flex-col items-center justify-center p-6 text-center select-none scanlines">
      <div className="relative w-full max-w-lg space-y-6">
        {/* Glowing Wordmark */}
        <div className="space-y-2">
          <div className="text-xs font-mono text-cyan-400 tracking-[0.3em] uppercase">
            SPATIAL 3D CYBER WORKSTATION
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-display">
            HANAN//OS
          </h1>
          <div className="text-xs font-mono text-slate-400">
            OFFENSIVE CYBERSECURITY · LOW-LEVEL SYSTEMS · SHADERS
          </div>
        </div>

        {/* Minimal Terminal Boot Telemetry */}
        <div className="p-4 rounded-xl bg-[#030509]/90 border border-slate-800/80 font-mono text-xs text-left space-y-1.5 shadow-2xl">
          <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-slate-800">
            <span>KERNEL: LINUX 6.9-SECURITY</span>
            <span className="text-cyan-400 font-bold">{bootProgress}%</span>
          </div>
          <div className="text-slate-400">&gt; Initializing Three.js procedural spatial environment...</div>
          <div className="text-slate-400">&gt; Loading CRT phosphor shaders &amp; dynamic canvas textures...</div>
          <div className="text-slate-400">&gt; Synthesizing procedural Web Audio ambient acoustic drone...</div>
          {isBooted && (
            <div className="text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>STATUS: SYSTEM ONLINE · ALL STATIONS READY</span>
            </div>
          )}
        </div>

        {/* Enter Button */}
        <div>
          <button
            onClick={handleStart}
            disabled={!isBooted}
            className={`w-full py-3.5 px-6 rounded-xl font-mono text-xs font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
              isBooted
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 cursor-pointer scale-100 hover:scale-[1.02]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>{isBooted ? 'Enter Workstation Room' : 'Booting Subsystems...'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Helper Note */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-slate-500">
          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Interactive audio & 3D navigation enabled upon entry</span>
        </div>
      </div>
    </div>
  );
};
