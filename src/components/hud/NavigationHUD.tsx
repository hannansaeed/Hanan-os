import React, { useState } from 'react';
import { StationId } from '../../types';
import { RaycastHitInfo } from '../../scene/RoomScene';
import { soundEngine } from '../../audio/soundEngine';
import {
  Volume2,
  VolumeX,
  Map,
  Terminal as TerminalIcon,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface NavigationHUDProps {
  activeStation: StationId;
  isWalkMode: boolean;
  isMuted: boolean;
  hoverInfo: RaycastHitInfo | null;
  onSelectStation: (id: StationId) => void;
  onToggleWalkMode: () => void;
  onToggleAudio: () => void;
  onOpenMap: () => void;
  onOpenTerminal: () => void;
}

export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  activeStation,
  isWalkMode,
  isMuted,
  hoverInfo,
  onSelectStation,
  onToggleAudio,
  onOpenMap,
  onOpenTerminal,
}) => {
  const [isOptionsExpanded, setIsOptionsExpanded] = useState<boolean>(false);

  const handleToggleOptions = () => {
    soundEngine.playKeyClick();
    setIsOptionsExpanded((prev) => !prev);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 md:p-6">
      {/* ========================================================
          TOP BAR:
          - When zoomed into objects: ONLY the [Esc] button!
          - When in overview mode: Compact badge (Name + Options)
      ======================================================== */}
      {activeStation !== 'overview' ? (
        <header className="pointer-events-auto w-fit rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800/90 shadow-2xl overflow-hidden animate-fade-in">
          <div className="flex items-center p-1.5">
            <button
              onClick={() => {
                soundEngine.playKeyClick();
                onSelectStation('overview');
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyan-500/50 transition-all shadow-md group"
              title="Step Back / Exit Zoom (Esc)"
            >
              <span className="text-slate-400 group-hover:text-cyan-400 transition-colors">← Exit</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800 text-[10px] font-bold">
                Esc
              </kbd>
            </button>
          </div>
        </header>
      ) : (
        <header
          className={`pointer-events-auto transition-all duration-200 rounded-xl bg-slate-950/90 backdrop-blur-md border shadow-2xl overflow-hidden ${
            isOptionsExpanded
              ? 'w-full max-w-4xl border-cyan-500/40 ring-1 ring-cyan-500/20'
              : 'w-fit border-slate-800/90'
          }`}
        >
          {/* Main Compact Row: Name + Divider + Options Button (Zero empty space) */}
          <div className="flex items-center gap-3 px-3.5 py-2">
            {/* Name */}
            <button
              onClick={() => {
                soundEngine.playKeyClick();
                onSelectStation('overview');
              }}
              className="text-sm font-bold tracking-tight text-white hover:text-cyan-400 transition-colors font-display flex items-center gap-1.5 shrink-0"
            >
              <span className="text-rose-500 font-extrabold">//</span>
              <span>NULL//OS</span>
            </button>

            <div className="w-px h-3.5 bg-slate-800 shrink-0" />

            {/* Options Button */}
            <button
              onClick={handleToggleOptions}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded-lg border transition-all shrink-0 ${
                isOptionsExpanded
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80 hover:border-slate-600'
              }`}
              title="Toggle Options & Controls"
              aria-expanded={isOptionsExpanded}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Options</span>
              {isOptionsExpanded ? (
                <ChevronUp className="w-3 h-3 text-cyan-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>
          </div>

          {/* Expanded Drawer: Revealed only when Options is clicked */}
          {isOptionsExpanded && (
            <div className="border-t border-slate-800/90 px-4 py-3 bg-slate-950/95 flex flex-col gap-3 animate-fade-in">
              {/* Row 1: Station Navigation Links & Utilities */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono">
                  <button
                    onClick={() => {
                      soundEngine.playKeyClick();
                      onSelectStation('overview');
                      setIsOptionsExpanded(false);
                    }}
                    className="px-2 py-1 rounded-md transition-colors bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playKeyClick();
                      onSelectStation('horizontal_monitor');
                      setIsOptionsExpanded(false);
                    }}
                    className="px-2 py-1 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-900"
                  >
                    Workstation GUI
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playKeyClick();
                      onSelectStation('vertical_monitor');
                      setIsOptionsExpanded(false);
                    }}
                    className="px-2 py-1 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-900"
                  >
                    Laptop Terminal
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playKeyClick();
                      onSelectStation('desk');
                      setIsOptionsExpanded(false);
                    }}
                    className="px-2 py-1 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-900"
                  >
                    Desk
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playKeyClick();
                      onSelectStation('server_rack');
                      setIsOptionsExpanded(false);
                    }}
                    className="px-2 py-1 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-900"
                  >
                    Dual Servers
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playKeyClick();
                      onSelectStation('whiteboard');
                      setIsOptionsExpanded(false);
                    }}
                    className="px-2 py-1 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-900"
                  >
                    Whiteboard
                  </button>
                </nav>

                {/* Utility Tools */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      soundEngine.playKeyClick();
                      onOpenTerminal();
                      setIsOptionsExpanded(false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md bg-slate-900 border border-slate-700/80 text-slate-200 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                    title="Terminal CLI (T)"
                  >
                    <TerminalIcon className="w-3 h-3 text-cyan-400" />
                    <span>CLI</span>
                  </button>

                  <button
                    onClick={() => {
                      soundEngine.playKeyClick();
                      onOpenMap();
                      setIsOptionsExpanded(false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md bg-slate-900 border border-slate-700/80 text-slate-200 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                    title="Tactical Map (M)"
                  >
                    <Map className="w-3 h-3 text-cyan-400" />
                    <span>Map</span>
                  </button>

                  <button
                    onClick={() => {
                      soundEngine.playKeyClick();
                      onToggleAudio();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-cyan-400 transition-colors"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="w-3 h-3 text-slate-400" />
                        <span>Muted</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 text-cyan-400" />
                        <span>Audio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Row 2: Controls folded inside the Options panel */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                <span className="text-cyan-400 flex items-center gap-1 font-semibold">
                  <Info className="w-3 h-3" /> Controls:
                </span>
                <span>
                  <strong className="text-slate-200">[W][A][S][D]</strong> Move
                </span>
                <span>·</span>
                <span>
                  <strong className="text-slate-200">Mouse</strong> Look around
                </span>
                <span>·</span>
                <span>
                  <strong className="text-slate-200">[E] / Click</strong> Interact
                </span>
                <span>·</span>
                <span>
                  <strong className="text-slate-200">[Esc]</strong> Step back / Zoom out
                </span>
              </div>
            </div>
          )}
        </header>
      )}

      {/* ========================================================
          CENTER SCREEN: Interaction Aim Reticle Dot
          Always present during overview walk mode so user can aim;
          glows cyan when hovering over an interactive station!
      ======================================================== */}
      {activeStation === 'overview' && isWalkMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`rounded-full transition-all duration-150 ${
              hoverInfo
                ? 'w-1.5 h-1.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] ring-1 ring-cyan-400/80 scale-110'
                : 'w-1.5 h-1.5 bg-white/35 shadow-[0_0_4px_rgba(255,255,255,0.25)]'
            }`}
          />
        </div>
      )}

      {/* ========================================================
          BOTTOM OF SCREEN: Interaction Indicator Overlay
      ======================================================== */}
      <div className="pointer-events-none flex flex-col items-center justify-end pb-2 md:pb-4">
        {/* Hover Interactivity Badge (ONLY in overview walk mode, positioned at bottom of screen) */}
        {activeStation === 'overview' && hoverInfo && (
          <div className="pointer-events-auto px-5 py-2.5 rounded-xl bg-[#090e1a]/95 backdrop-blur-md border border-cyan-500/60 shadow-2xl shadow-cyan-950/80 text-center animate-fade-in ring-2 ring-cyan-500/20">
            <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">{hoverInfo.label}</div>
            <div className="text-xs font-mono text-white font-semibold mt-1 flex items-center justify-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold text-[10px]">[E]</span>
              <span>{hoverInfo.hint}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
