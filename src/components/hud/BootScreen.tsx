import React from 'react';
import { soundEngine } from '../../audio/soundEngine';
import { Terminal, Shield, ArrowRight, X, Monitor, ChevronRight } from 'lucide-react';
import { StationId } from '../../types';

interface BootScreenProps {
  onEnter: () => void;
  onQuickJump?: (stationId: StationId) => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onEnter, onQuickJump }) => {
  const handleStart = () => {
    try {
      soundEngine.playChirp('success');
      soundEngine.startAmbient();
    } catch {
      // Audio safety
    }
    onEnter();
  };

  return (
    <div
      onClick={handleStart}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#080d1a]/95 border border-rose-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-rose-950/70 space-y-6 text-center"
      >
        {/* Close / Skip button */}
        <button
          onClick={handleStart}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Dismiss (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Minimal Identity Banner */}
        <div className="space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-[11px] font-mono text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span>SYSTEM ONLINE · 3D WORKSTATION</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
            HANAN
          </h1>

          <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
            <span>CYBERSECURITY</span>
            <span>·</span>
            <span>LOW-LEVEL SYSTEMS</span>
            <span>·</span>
            <span>SPATIAL WEBGL</span>
          </div>
        </div>

        {/* Room Brief */}
        <div className="p-4 rounded-xl bg-[#040711] border border-slate-800 text-left text-xs font-mono space-y-2">
          <div className="text-slate-500 flex justify-between pb-1 border-b border-slate-800/80">
            <span>ENVIRONMENT</span>
            <span className="text-emerald-400 font-bold">READY</span>
          </div>
          <div className="text-slate-300">
            You are standing in the doorway of Hanan's cyber workstation. Every terminal, wall, and server bay is an interactive physical object.
          </div>
          <div className="text-slate-400 text-[11px]">
            • Dual-screen displays with real-time CRT shaders<br />
            • Offensive security terminal &amp; live packet sniffer<br />
            • 42U Server rack telemetry &amp; CTF research wall
          </div>
        </div>

        {/* Enter Button */}
        <div className="space-y-3">
          <button
            onClick={handleStart}
            className="w-full py-3 px-6 rounded-xl font-mono text-xs font-bold tracking-wider uppercase bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer scale-100 hover:scale-[1.02]"
          >
            <span>Enter Workstation</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick jump shortcuts */}
          {onQuickJump && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => {
                  handleStart();
                  onQuickJump('horizontal_monitor');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-500/50 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
              >
                <Monitor className="w-3.5 h-3.5 text-rose-400" />
                <span>Jump to Projects</span>
              </button>
              <button
                onClick={() => {
                  handleStart();
                  onQuickJump('vertical_monitor');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-500/50 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Security Terminal</span>
              </button>
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="text-[11px] font-mono text-slate-500">
          Click anywhere outside this card or press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Esc</kbd> to explore freely
        </div>
      </div>
    </div>
  );
};
