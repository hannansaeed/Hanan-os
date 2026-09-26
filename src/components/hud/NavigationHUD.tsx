import React from 'react';
import { StationId } from '../../types';
import { STATIONS } from '../../data/portfolioData';
import { RaycastHitInfo } from '../../scene/RoomScene';
import { soundEngine } from '../../audio/soundEngine';
import { Volume2, VolumeX, Compass, Map, Terminal as TerminalIcon, Eye } from 'lucide-react';

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

const NAV_STATIONS: { id: StationId; label: string; shortcut: string }[] = [
  { id: 'overview', label: 'Entrance', shortcut: '0' },
  { id: 'horizontal_monitor', label: 'Workstation', shortcut: '1' },
  { id: 'vertical_monitor', label: 'Security', shortcut: '2' },
  { id: 'desk', label: 'Desk & CLI', shortcut: '3' },
  { id: 'ctf_wall', label: 'CTF Lab', shortcut: '4' },
  { id: 'timeline_wall', label: 'Timeline', shortcut: '5' },
  { id: 'server_rack', label: 'Dual Servers', shortcut: '6' },
  { id: 'exit_door', label: 'Comms / Exit', shortcut: '7' },
];

export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  activeStation,
  isWalkMode,
  isMuted,
  hoverInfo,
  onSelectStation,
  onToggleWalkMode,
  onToggleAudio,
  onOpenMap,
  onOpenTerminal,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 md:p-6">
      {/* ========================================================
          TOP BAR CONTRACT (Zone 1: Wordmark, Zone 2: Nav, Zone 3: Actions)
      ======================================================== */}
      <header className="pointer-events-auto flex items-center justify-between px-5 py-3 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-lg">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onSelectStation('overview');
            }}
            className="text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition-colors font-display flex items-center gap-2"
          >
            <span className="text-rose-500 font-extrabold">//</span>
            <span>HANAN//OS</span>
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>·</span>
            <span className="text-cyan-400">CYBERSPACE RIG</span>
          </div>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onSelectStation('horizontal_monitor');
            }}
            className={`hover:text-cyan-400 transition-colors ${
              activeStation === 'horizontal_monitor' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Workstation
          </button>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onSelectStation('vertical_monitor');
            }}
            className={`hover:text-cyan-400 transition-colors ${
              activeStation === 'vertical_monitor' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Security Terminal
          </button>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onSelectStation('ctf_wall');
            }}
            className={`hover:text-cyan-400 transition-colors ${
              activeStation === 'ctf_wall' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            CTF Lab
          </button>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onSelectStation('timeline_wall');
            }}
            className={`hover:text-cyan-400 transition-colors ${
              activeStation === 'timeline_wall' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Roadmap
          </button>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onSelectStation('server_rack');
            }}
            className={`hover:text-cyan-400 transition-colors ${
              activeStation === 'server_rack' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Dual Servers
          </button>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onSelectStation('exit_door');
            }}
            className={`hover:text-cyan-400 transition-colors ${
              activeStation === 'exit_door' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Contact
          </button>
        </nav>

        {/* Zone 3: Primary actions (Tactical Map, Terminal, Audio, Mode) */}
        <div className="flex items-center gap-2">
          {/* CLI Terminal Launcher */}
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onOpenTerminal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
            title="Launch Terminal CLI (T)"
          >
            <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">CLI</span>
          </button>

          {/* Blueprint Map Toggle */}
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onOpenMap();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
            title="Open Tactical Map (M)"
          >
            <Map className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Map</span>
          </button>

          {/* Mode Switcher: Orbit / Walk */}
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onToggleWalkMode();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
              isWalkMode
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white'
            }`}
            title="Toggle First-Person WASD Walk vs Focus Camera"
          >
            {isWalkMode ? <Compass className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isWalkMode ? 'Walk (WASD)' : 'Inspect'}</span>
          </button>

          {/* Audio Synthesizer Toggle */}
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onToggleAudio();
            }}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-cyan-400 transition-colors"
            title={isMuted ? 'Unmute Ambient Sound' : 'Mute Ambient Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* ========================================================
          CENTER SCREEN: Hover Prompts (NO Crosshair / Pointer)
      ======================================================== */}
      <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
        {/* Walking controls helper badge */}
        {isWalkMode && !hoverInfo && (
          <div className="absolute top-20 left-6 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300">
            <span className="text-cyan-400 font-bold">[W][A][S][D]</span>
            <span>Walk</span>
            <span>·</span>
            <span className="text-cyan-400 font-bold">Drag Mouse</span>
            <span>Look</span>
            <span>·</span>
            <span className="text-cyan-400 font-bold">[E]</span>
            <span>Interact</span>
          </div>
        )}

        {/* Hover Interactivity Badge */}
        {hoverInfo && (
          <div className="pointer-events-auto mt-6 px-5 py-2.5 rounded-xl bg-[#090e1a]/95 backdrop-blur-md border border-cyan-500/60 shadow-2xl shadow-cyan-950/80 text-center animate-fade-in ring-2 ring-cyan-500/20">
            <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">{hoverInfo.label}</div>
            <div className="text-xs font-mono text-white font-semibold mt-1 flex items-center justify-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold text-[10px]">[E]</span>
              <span>{hoverInfo.hint}</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          BOTTOM DOCK: Station Carousel & Viewport Coordinates
      ======================================================== */}
      <footer className="pointer-events-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-2.5 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-lg">
        {/* Station Navigation Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
          {NAV_STATIONS.map((st) => {
            const isActive = activeStation === st.id;
            return (
              <button
                key={st.id}
                onClick={() => {
                  soundEngine.playKeyClick();
                  onSelectStation(st.id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <span className="text-[10px] text-slate-500">[{st.shortcut}]</span>
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Station Description / Camera Indicator */}
        <div className="hidden md:flex items-center gap-3 text-xs font-mono text-slate-400 whitespace-nowrap">
          <span>STATION: {STATIONS[activeStation]?.shortCode}</span>
          <span>·</span>
          <span className="text-slate-300">{STATIONS[activeStation]?.description}</span>
        </div>
      </footer>
    </div>
  );
};
