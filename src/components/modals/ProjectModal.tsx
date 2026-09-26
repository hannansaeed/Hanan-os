import React, { useState } from 'react';
import { ProjectItem } from '../../types';
import { PROJECTS } from '../../data/portfolioData';
import { soundEngine } from '../../audio/soundEngine';
import { X, ExternalLink, Github, Terminal, Cpu, Play, CheckCircle2, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

interface ProjectModalProps {
  onClose: () => void;
  initialProjectId?: string;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ onClose, initialProjectId }) => {
  const [selectedId, setSelectedId] = useState<string>(initialProjectId || PROJECTS[0].id);
  const [activeTab, setActiveTab] = useState<'overview' | 'architecture' | 'simulator' | 'metrics'>('overview');

  // Simulator state
  const [simRunning, setSimRunning] = useState(false);
  const [simOutput, setSimOutput] = useState<string[]>([]);

  const currentProject = PROJECTS.find((p) => p.id === selectedId) || PROJECTS[0];

  const runSimulation = () => {
    soundEngine.playChirp('enter');
    setSimRunning(true);
    setSimOutput([`> Initializing runtime sandbox for [${currentProject.title}]...`]);

    const stepLogs = [
      `> Attaching eBPF kprobes and dynamic instrumentation hooks...`,
      `> Parsing binary headers and ELF segments (.text, .rodata, .got.plt)...`,
      `> Running symbolic execution and taint tracking verification...`,
      `> Zero privilege escalation vectors found. All invariants verified!`,
      `[STATUS 200 OK] Execution cycle completed cleanly in 14.8ms.`
    ];

    stepLogs.forEach((log, index) => {
      setTimeout(() => {
        setSimOutput((prev) => [...prev, log]);
        soundEngine.playKeyClick();
        if (index === stepLogs.length - 1) {
          setSimRunning(false);
          soundEngine.playChirp('success');
        }
      }, (index + 1) * 350);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#090e1a] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/40 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                MAIN WORKSTATION · HORIZONTAL DISPLAY
              </div>
              <h2 className="text-lg font-bold text-white font-display">Engineering Projects & Research</h2>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Inspector (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Selector Strip */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800/80 bg-[#060a12] overflow-x-auto">
          {PROJECTS.map((proj) => {
            const isSel = proj.id === selectedId;
            return (
              <button
                key={proj.id}
                onClick={() => {
                  soundEngine.playKeyClick();
                  setSelectedId(proj.id);
                  setSimOutput([]);
                  setSimRunning(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
                  isSel
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <span>{proj.title}</span>
                <span className="text-[10px] text-slate-500">[{proj.year}]</span>
              </button>
            );
          })}
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Project Title & Metadata Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
                <span>{currentProject.category}</span>
                <span>·</span>
                <span>{currentProject.year}</span>
                <span>·</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {currentProject.status}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight font-display">{currentProject.title}</h1>
              <p className="text-sm text-slate-400 mt-1 max-w-3xl">{currentProject.subtitle}</p>
            </div>

            <div className="flex items-center gap-3">
              {currentProject.githubUrl && (
                <a
                  href={currentProject.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => soundEngine.playKeyClick()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-xs font-mono text-slate-200 hover:text-cyan-400 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  <span>Source Code</span>
                </a>
              )}
              {currentProject.liveDemoUrl && (
                <button
                  onClick={() => {
                    setActiveTab('simulator');
                    runSimulation();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-semibold transition-colors shadow-lg shadow-cyan-500/20"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Run Live Demo</span>
                </button>
              )}
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-950/70 border border-slate-800/80 rounded-xl w-fit">
            <button
              onClick={() => {
                soundEngine.playKeyClick();
                setActiveTab('overview');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview & Impact
            </button>
            <button
              onClick={() => {
                soundEngine.playKeyClick();
                setActiveTab('architecture');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'architecture'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Architecture & Invariants
            </button>
            <button
              onClick={() => {
                soundEngine.playKeyClick();
                setActiveTab('simulator');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'simulator'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Interactive Sandbox
            </button>
            <button
              onClick={() => {
                soundEngine.playKeyClick();
                setActiveTab('metrics');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'metrics'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Performance Metrics
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider mb-2">
                  System Abstract
                </h3>
                <p className="text-slate-300 leading-relaxed text-sm">{currentProject.description}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">Impact & Finding</div>
                <div className="text-sm font-medium text-slate-100">{currentProject.impact}</div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider mb-3">
                  Core Technologies
                </h3>
                <div className="flex flex-wrap gap-2 text-xs font-mono text-slate-300">
                  {currentProject.technologies.map((t) => (
                    <span key={t} className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Architecture */}
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider">
                Engineering Blueprint & Design Invariants
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentProject.architectureNotes.map((note, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex gap-3">
                    <span className="text-cyan-400 font-mono text-sm font-bold">0{idx + 1}.</span>
                    <p className="text-xs font-mono text-slate-300 leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Interactive Sandbox */}
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider">
                    Interactive Verification Sandbox
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Execute simulated runtime assertions against {currentProject.title}
                  </p>
                </div>
                <button
                  disabled={simRunning}
                  onClick={runSimulation}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  <Activity className={`w-4 h-4 ${simRunning ? 'animate-spin' : ''}`} />
                  <span>{simRunning ? 'Simulating...' : 'Execute Suite'}</span>
                </button>
              </div>

              {/* Terminal Output Window */}
              <div className="bg-[#050811] border border-slate-800 rounded-xl p-4 font-mono text-xs min-h-[220px] max-h-[300px] overflow-y-auto space-y-2">
                <div className="text-slate-500">
                  // HANAN//OS Virtual Test Bed — Ready. Press 'Execute Suite' to run.
                </div>
                {simOutput.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.includes('OK')
                        ? 'text-emerald-400'
                        : line.includes('zero')
                        ? 'text-cyan-300 font-semibold'
                        : 'text-slate-300'
                    }
                  >
                    {line}
                  </div>
                ))}
                {simRunning && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>Processing syscall stream...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Performance Metrics */}
          {activeTab === 'metrics' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider">
                Production Benchmark Figures
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {currentProject.metrics.map((m, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                    <span className="text-xs font-mono text-slate-400">{m.label}</span>
                    <span className="text-2xl font-bold font-mono text-cyan-400 mt-2">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
