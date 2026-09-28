import React, { useState, useEffect } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import { PROJECTS, CTF_CHALLENGES, CERTIFICATIONS, SKILLS_SUMMARY, SERVER_METRICS } from '../../data/portfolioData';
import { ProjectItem, ServerMetric } from '../../types';
import {
  Monitor,
  FolderGit2,
  FileText,
  Shield,
  Server,
  Terminal as TerminalIcon,
  Settings,
  X,
  Minus,
  Square,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  Code2,
  Download,
  CheckCircle,
  Edit3,
} from 'lucide-react';

interface DesktopOSModalProps {
  onClose: () => void;
  onOpenTerminal?: () => void;
}

type WindowId = 'projects' | 'cv' | 'ctf' | 'servers' | 'notes' | 'settings';

interface OSWindow {
  id: WindowId;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

export const DesktopOSModal: React.FC<DesktopOSModalProps> = ({ onClose, onOpenTerminal }) => {
  // Desktop windows state
  const [windows, setWindows] = useState<Record<WindowId, OSWindow>>({
    projects: {
      id: 'projects',
      title: 'Projects & Systems Architecture',
      icon: <FolderGit2 className="w-4 h-4 text-rose-400" />,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: 10,
    },
    cv: {
      id: 'cv',
      title: 'Curriculum Vitae — Hanan',
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 9,
    },
    ctf: {
      id: 'ctf',
      title: 'Offensive Security & CTF Hub',
      icon: <Shield className="w-4 h-4 text-amber-400" />,
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 8,
    },
    servers: {
      id: 'servers',
      title: 'Cluster Node 01 Telemetry',
      icon: <Server className="w-4 h-4 text-indigo-400" />,
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 7,
    },
    notes: {
      id: 'notes',
      title: 'Cyber Research Scratchpad',
      icon: <Edit3 className="w-4 h-4 text-purple-400" />,
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 6,
    },
    settings: {
      id: 'settings',
      title: 'System Preferences & Appearance',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 5,
    },
  });

  const [topZ, setTopZ] = useState(20);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeProject, setActiveProject] = useState<ProjectItem>(PROJECTS[0]);
  const [projectCategory, setProjectCategory] = useState<string>('All');
  const [isMuted, setIsMuted] = useState(false);
  const [accentTheme, setAccentTheme] = useState<'rose' | 'emerald' | 'amber' | 'violet'>('rose');

  // Interactive notes state
  const [userNotes, setUserNotes] = useState<string>(
    `# Research Vectors // DedSec Workstation\n\n- [x] eBPF ringbuf syscall auditing engine.\n- [x] Post-quantum Key Encapsulation Mechanism benchmark.\n- [/] Android AOSP Binder IPC memory boundary fuzzer.\n- [ ] Zero-Knowledge Proof verify node optimization.\n\nKey finding: eBPF socket filter drops malicious TCP SYN packets in 12ns with zero kernel memory allocations.`
  );

  // CTF flags state
  const [submittedFlag, setSubmittedFlag] = useState('');
  const [flagFeedback, setFlagFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Server metrics restart simulation
  const [serverList] = useState<ServerMetric[]>(SERVER_METRICS);
  const [restartingService, setRestartingService] = useState<string | null>(null);

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const bringToFront = (id: WindowId) => {
    const nextZ = topZ + 1;
    setTopZ(nextZ);
    setWindows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isOpen: true,
        isMinimized: false,
        zIndex: nextZ,
      },
    }));
  };

  const openWindow = (id: WindowId) => {
    soundEngine.playKeyClick();
    bringToFront(id);
    setIsStartOpen(false);
  };

  const toggleMinimize = (id: WindowId, e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundEngine.playKeyClick();
    setWindows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isMinimized: !prev[id].isMinimized,
      },
    }));
  };

  const toggleMaximize = (id: WindowId, e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundEngine.playKeyClick();
    setWindows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isMaximized: !prev[id].isMaximized,
      },
    }));
  };

  const closeWindow = (id: WindowId, e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundEngine.playKeyClick();
    setWindows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isOpen: false,
        isMinimized: false,
      },
    }));
  };

  const handleFlagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittedFlag.trim()) return;

    if (submittedFlag.toLowerCase().includes('ebpf') || submittedFlag.toLowerCase().startsWith('flag{')) {
      soundEngine.playChirp('success');
      setFlagFeedback({
        msg: `FLAG VALIDATED: "${submittedFlag}"! +500 PTS AWARDED TO LEADERBOARD`,
        type: 'success',
      });
    } else {
      soundEngine.playKeyClick();
      setFlagFeedback({
        msg: `[-] Invalid flag hash. Try inspecting the glibc tcache writeup.`,
        type: 'error',
      });
    }
    setSubmittedFlag('');
  };

  const handleRestartService = (name: string) => {
    soundEngine.playKeyClick();
    setRestartingService(name);
    setTimeout(() => {
      setRestartingService(null);
      soundEngine.playChirp('success');
    }, 900);
  };

  const filteredProjects =
    projectCategory === 'All'
      ? PROJECTS
      : PROJECTS.filter((p) => p.category.toLowerCase().includes(projectCategory.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md select-none animate-fade-in">
      <div className="relative w-full max-w-7xl h-[94vh] bg-[#070b14] border border-rose-500/40 rounded-2xl shadow-2xl shadow-rose-950/80 flex flex-col overflow-hidden">
        {/* Desktop Screen Area */}
        <div
          className="relative flex-1 bg-gradient-to-br from-[#060913] via-[#091122] to-[#04060c] overflow-hidden p-4"
          onClick={() => setIsStartOpen(false)}
        >
          {/* Subtle Desktop Background Cyber Grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
            }}
          />

          {/* Desktop Wallpaper Watermark */}
          <div className="absolute right-8 bottom-16 pointer-events-none text-right opacity-15 select-none">
            <div className="text-6xl font-black font-display tracking-widest text-rose-400">HANAN//OS</div>
            <div className="text-sm font-mono text-rose-200 uppercase tracking-widest mt-1">
              Cybersecurity Research Workstation v4.2
            </div>
          </div>

          {/* Desktop Shortcut Icons */}
          <div className="relative z-10 grid grid-flow-row auto-rows-max gap-4 w-28">
            <DesktopIcon
              label="Projects"
              icon={<FolderGit2 className="w-8 h-8 text-rose-400 drop-shadow" />}
              badge={`${PROJECTS.length}`}
              onClick={() => openWindow('projects')}
            />
            <DesktopIcon
              label="CV & Resume"
              icon={<FileText className="w-8 h-8 text-emerald-400 drop-shadow" />}
              onClick={() => openWindow('cv')}
            />
            <DesktopIcon
              label="CTF Hub"
              icon={<Shield className="w-8 h-8 text-amber-400 drop-shadow" />}
              badge="4.4k"
              onClick={() => openWindow('ctf')}
            />
            <DesktopIcon
              label="Server Rack"
              icon={<Server className="w-8 h-8 text-indigo-400 drop-shadow" />}
              badge="LIVE"
              onClick={() => openWindow('servers')}
            />
            <DesktopIcon
              label="Scratchpad"
              icon={<Edit3 className="w-8 h-8 text-purple-400 drop-shadow" />}
              onClick={() => openWindow('notes')}
            />
            <DesktopIcon
              label="Terminal"
              icon={<TerminalIcon className="w-8 h-8 text-rose-400 drop-shadow" />}
              onClick={() => {
                if (onOpenTerminal) {
                  onClose();
                  onOpenTerminal();
                }
              }}
            />
            <DesktopIcon
              label="Settings"
              icon={<Settings className="w-8 h-8 text-slate-300 drop-shadow" />}
              onClick={() => openWindow('settings')}
            />
          </div>

          {/* ====================================================
              WINDOW 1: PROJECTS EXPLORER
             ==================================================== */}
          {windows.projects.isOpen && (
            <DesktopWindowFrame
              win={windows.projects}
              onFocus={() => bringToFront('projects')}
              onMinimize={(e) => toggleMinimize('projects', e)}
              onMaximize={(e) => toggleMaximize('projects', e)}
              onClose={(e) => closeWindow('projects', e)}
            >
              <div className="flex flex-col md:flex-row h-full">
                {/* Left Projects Sidebar */}
                <div className="w-full md:w-80 border-r border-slate-800 bg-[#060a14] flex flex-col">
                  {/* Category Filter Chips */}
                  <div className="p-3 border-b border-slate-800/80 flex flex-wrap gap-1.5 bg-black/30">
                    {['All', 'Cybersecurity', 'Systems', 'Mobile'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          soundEngine.playKeyClick();
                          setProjectCategory(cat);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                          projectCategory === cat
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Project Items List */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {filteredProjects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          soundEngine.playKeyClick();
                          setActiveProject(p);
                        }}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
                          activeProject.id === p.id
                            ? 'bg-rose-950/70 border-rose-500/60 shadow-lg shadow-rose-950/40 text-white'
                            : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-rose-400">{p.id}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {p.year}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-100 mt-1">{p.title}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{p.subtitle}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Project Detailed View */}
                <div className="flex-1 bg-[#090e1c] p-5 overflow-y-auto space-y-5">
                  <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                          {activeProject.category}
                        </span>
                        <span className="text-xs font-mono text-emerald-400">● {activeProject.status}</span>
                      </div>
                      <h3 className="text-xl font-bold font-display text-white mt-1.5">{activeProject.title}</h3>
                      <p className="text-xs text-rose-300 font-mono mt-0.5">{activeProject.subtitle}</p>
                    </div>
                  </div>

                  {/* Architecture & Description */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                      System Architecture & Specifications:
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{activeProject.description}</p>
                    <p className="text-xs text-rose-200/80 leading-relaxed font-mono mt-1">{activeProject.impact}</p>
                  </div>

                  {/* Technical Highlights */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                      Engineering Innovations:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeProject.architectureNotes.map((note, i) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Technologies Badges */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                      Technology Stack:
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {activeProject.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="px-2.5 py-1 rounded bg-slate-900 border border-rose-900/50 text-rose-300 font-mono text-xs"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </DesktopWindowFrame>
          )}

          {/* ====================================================
              WINDOW 2: CV & RESUME
             ==================================================== */}
          {windows.cv.isOpen && (
            <DesktopWindowFrame
              win={windows.cv}
              onFocus={() => bringToFront('cv')}
              onMinimize={(e) => toggleMinimize('cv', e)}
              onMaximize={(e) => toggleMaximize('cv', e)}
              onClose={(e) => closeWindow('cv', e)}
            >
              <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 bg-[#070c18]">
                {/* Header Profile */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-white">HANAN SAEED</h2>
                    <p className="text-rose-400 font-mono text-xs mt-0.5">
                      Cyber Security Researcher & Python Developer
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      Bahauddin Zakariya University (BZU) · Multan, Pakistan
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playChirp('success');
                      window.open('https://hannansaeed.github.io/portfolio', '_blank', 'noopener,noreferrer');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 flex items-center gap-2 font-mono font-bold transition-all shadow-lg shadow-rose-950/50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CV (PDF)</span>
                  </button>
                </div>

                {/* Profile Summary */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                  <h3 className="font-bold text-white font-mono text-xs text-rose-300">
                    PROFESSIONAL PROFILE
                  </h3>
                  <p className="text-slate-300 leading-relaxed font-sans">
                    Cyber security researcher and Python developer with a strong interest in offensive and defensive security, vulnerability assessment, and AI-powered automation. Experienced in building security tooling, working with APIs and databases, and applying practical penetration testing techniques. Passionate about ethical hacking, secure software development, and emerging AI-driven security systems.
                  </p>
                </div>

                {/* Core Domains */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <h3 className="font-bold text-white font-mono text-xs flex items-center gap-2 text-rose-300">
                      <Code2 className="w-4 h-4" />
                      DEVELOPMENT SKILLS
                    </h3>
                    <p className="text-slate-400 leading-relaxed font-mono">
                      {SKILLS_SUMMARY.languages.join(' · ')}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <h3 className="font-bold text-white font-mono text-xs flex items-center gap-2 text-emerald-300">
                      <Shield className="w-4 h-4" />
                      SECURITY EXPERIENCE
                    </h3>
                    <p className="text-slate-400 leading-relaxed font-mono">
                      {SKILLS_SUMMARY.offensive.join(' · ')}
                    </p>
                  </div>
                </div>

                {/* Verified Certifications */}
                <div className="space-y-3">
                  <h3 className="font-bold text-white font-mono text-sm border-b border-slate-800 pb-2">
                    ACCREDITATIONS & CERTIFICATIONS
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CERTIFICATIONS.map((cert) => (
                      <div key={cert.verificationId} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                        <div className="font-bold text-white text-xs">{cert.name}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{cert.issuer} · {cert.year}</div>
                        <div className="text-[10px] text-rose-400 font-mono mt-1">ID: {cert.verificationId} ({cert.badgeCode})</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DesktopWindowFrame>
          )}

          {/* ====================================================
              WINDOW 3: CTF HUB
             ==================================================== */}
          {windows.ctf.isOpen && (
            <DesktopWindowFrame
              win={windows.ctf}
              onFocus={() => bringToFront('ctf')}
              onMinimize={(e) => toggleMinimize('ctf', e)}
              onMaximize={(e) => toggleMaximize('ctf', e)}
              onClose={(e) => closeWindow('ctf', e)}
            >
              <div className="p-5 overflow-y-auto space-y-5 bg-[#080d19] text-xs">
                {/* Flag Submission Banner */}
                <form
                  onSubmit={handleFlagSubmit}
                  className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row items-center gap-3 justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">Live CTF Flag Verification Engine</div>
                      <div className="text-emerald-400/80 text-[11px]">Enter captured flag to claim points</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      value={submittedFlag}
                      onChange={(e) => setSubmittedFlag(e.target.value)}
                      placeholder="flag{your_exploit_flag_here}"
                      className="px-3 py-1.5 rounded-lg bg-black/60 border border-emerald-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-400 w-full sm:w-64"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold transition-colors shrink-0"
                    >
                      Submit
                    </button>
                  </div>
                </form>

                {flagFeedback && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono ${
                      flagFeedback.type === 'success'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                        : 'bg-rose-950/80 border-rose-500 text-rose-300'
                    }`}
                  >
                    {flagFeedback.msg}
                  </div>
                )}

                {/* Challenges Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CTF_CHALLENGES.map((ch) => (
                    <div key={ch.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{ch.title}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-800/60">
                          {ch.points} pts
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-rose-400 font-mono">[{ch.category}]</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-amber-400 font-mono">{ch.difficulty}</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed text-[11px]">{ch.overview}</p>
                      <div className="p-2 rounded bg-black/50 font-mono text-[11px] text-rose-300 border border-slate-800/80">
                        Vulnerability: {ch.vulnerability}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DesktopWindowFrame>
          )}

          {/* ====================================================
              WINDOW 4: SERVER TELEMETRY
             ==================================================== */}
          {windows.servers.isOpen && (
            <DesktopWindowFrame
              win={windows.servers}
              onFocus={() => bringToFront('servers')}
              onMinimize={(e) => toggleMinimize('servers', e)}
              onMaximize={(e) => toggleMaximize('servers', e)}
              onClose={(e) => closeWindow('servers', e)}
            >
              <div className="p-5 overflow-y-auto space-y-5 bg-[#060a14] text-xs">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-slate-400 text-[10px] font-mono uppercase">CPU Usage</div>
                    <div className="text-lg font-bold font-mono text-rose-300 mt-1">4.2% AVG</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-slate-400 text-[10px] font-mono uppercase">RAM Allocation</div>
                    <div className="text-lg font-bold font-mono text-emerald-300 mt-1">19.3% (12.4GB)</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-slate-400 text-[10px] font-mono uppercase">Throughput</div>
                    <div className="text-lg font-bold font-mono text-indigo-300 mt-1">1.24 Gbps</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-slate-400 text-[10px] font-mono uppercase">Uptime</div>
                    <div className="text-lg font-bold font-mono text-amber-300 mt-1">42d 7h</div>
                  </div>
                </div>

                {/* Daemons List */}
                <div className="space-y-2">
                  <div className="font-bold text-white font-mono text-xs uppercase tracking-wider">
                    Active Daemons & Kernel Sandboxes:
                  </div>
                  <div className="space-y-2">
                    {serverList.map((srv) => (
                      <div
                        key={srv.service}
                        className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              restartingService === srv.service ? 'bg-amber-400 animate-spin' : 'bg-emerald-400 animate-pulse'
                            }`}
                          />
                          <div>
                            <div className="font-bold text-white font-mono text-xs">{srv.service}</div>
                            <div className="text-slate-400 text-[11px]">{srv.protocol} · Port {srv.port}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-[11px] font-mono text-rose-300 hidden sm:inline-block">
                            Load: {srv.load} · Uptime: {srv.uptime}
                          </span>
                          <button
                            onClick={() => handleRestartService(srv.service)}
                            disabled={restartingService === srv.service}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition-colors"
                          >
                            {restartingService === srv.service ? 'Restarting...' : 'Restart'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DesktopWindowFrame>
          )}

          {/* ====================================================
              WINDOW 5: CYBER SCRATCHPAD
             ==================================================== */}
          {windows.notes.isOpen && (
            <DesktopWindowFrame
              win={windows.notes}
              onFocus={() => bringToFront('notes')}
              onMinimize={(e) => toggleMinimize('notes', e)}
              onMaximize={(e) => toggleMaximize('notes', e)}
              onClose={(e) => closeWindow('notes', e)}
            >
              <div className="flex flex-col h-full bg-[#050811] p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono border-b border-slate-800 pb-2">
                  <span>notes.md — Cyber Research Scratchpad</span>
                  <span className="text-emerald-400">● Auto-Saved</span>
                </div>
                <textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  className="flex-1 w-full bg-black/40 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500 leading-relaxed resize-none"
                  placeholder="Write your thoughts, exploit vectors, or notes here..."
                />
              </div>
            </DesktopWindowFrame>
          )}

          {/* ====================================================
              WINDOW 6: SETTINGS
             ==================================================== */}
          {windows.settings.isOpen && (
            <DesktopWindowFrame
              win={windows.settings}
              onFocus={() => bringToFront('settings')}
              onMinimize={(e) => toggleMinimize('settings', e)}
              onMaximize={(e) => toggleMaximize('settings', e)}
              onClose={(e) => closeWindow('settings', e)}
            >
              <div className="p-6 overflow-y-auto space-y-6 bg-[#070b16] text-xs text-slate-300">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono mb-2">Desktop Color Theme</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'rose', label: 'Cyan Cyber', color: 'bg-rose-500' },
                      { id: 'emerald', label: 'DedSec Emerald', color: 'bg-emerald-500' },
                      { id: 'amber', label: 'Cyberpunk Amber', color: 'bg-amber-500' },
                      { id: 'violet', label: 'Neon Violet', color: 'bg-purple-500' },
                    ].map((th) => (
                      <button
                        key={th.id}
                        onClick={() => {
                          soundEngine.playKeyClick();
                          setAccentTheme(th.id as any);
                        }}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                          accentTheme === th.id
                            ? 'bg-slate-800 border-white text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${th.color}`} />
                        <span>{th.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <h3 className="text-sm font-bold text-white font-mono">Audio & Feedback</h3>
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div>
                      <div className="font-bold text-white">System Sound Effects</div>
                      <div className="text-slate-400 text-[11px]">Keystrokes, chirps, and modal transitions</div>
                    </div>
                    <button
                      onClick={() => {
                        const m = soundEngine.toggleMute();
                        setIsMuted(m);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                        isMuted ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {isMuted ? 'MUTED' : 'ENABLED'}
                    </button>
                  </div>
                </div>
              </div>
            </DesktopWindowFrame>
          )}
        </div>

        {/* Start Menu Popup */}
        {isStartOpen && (
          <div
            className="absolute bottom-12 left-2 w-80 bg-[#060a16]/95 border border-rose-500/40 rounded-2xl shadow-2xl shadow-rose-950/90 p-4 z-50 backdrop-blur-xl animate-fade-in text-xs space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Profile Info */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-emerald-500 flex items-center justify-center font-bold text-white text-base">
                H
              </div>
              <div>
                <div className="font-bold text-white font-display">HANAN // OPERATOR</div>
                <div className="text-[11px] text-rose-400 font-mono">xcthine-node-01 · Superuser</div>
              </div>
            </div>

            {/* Quick App Launcher */}
            <div className="space-y-1">
              <StartMenuItem
                label="Projects & Repositories"
                icon={<FolderGit2 className="w-4 h-4 text-rose-400" />}
                onClick={() => openWindow('projects')}
              />
              <StartMenuItem
                label="Curriculum Vitae"
                icon={<FileText className="w-4 h-4 text-emerald-400" />}
                onClick={() => openWindow('cv')}
              />
              <StartMenuItem
                label="Offensive Security CTF"
                icon={<Shield className="w-4 h-4 text-amber-400" />}
                onClick={() => openWindow('ctf')}
              />
              <StartMenuItem
                label="Cluster Telemetry"
                icon={<Server className="w-4 h-4 text-indigo-400" />}
                onClick={() => openWindow('servers')}
              />
              <StartMenuItem
                label="Interactive Terminal"
                icon={<TerminalIcon className="w-4 h-4 text-rose-400" />}
                onClick={() => {
                  if (onOpenTerminal) {
                    onClose();
                    onOpenTerminal();
                  }
                }}
              />
              <StartMenuItem
                label="System Preferences"
                icon={<Settings className="w-4 h-4 text-slate-300" />}
                onClick={() => openWindow('settings')}
              />
            </div>

            {/* Step Back to 3D Room */}
            <div className="border-t border-slate-800 pt-2">
              <button
                onClick={onClose}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-2 font-mono text-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return to 3D Room [Esc]</span>
              </button>
            </div>
          </div>
        )}

        {/* Taskbar */}
        <div className="relative z-30 h-11 bg-[#04070f] border-t border-slate-800/80 px-3 flex items-center justify-between text-xs font-mono">
          {/* Left: Start Button + Active Windows */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
            {/* Start Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playKeyClick();
                setIsStartOpen((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold font-display transition-all ${
                isStartOpen
                  ? 'bg-rose-500 text-black shadow-lg shadow-rose-500/30'
                  : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/50'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>HANAN//OS</span>
            </button>

            {/* Window Tabs */}
            {Object.values(windows)
              .filter((w) => w.isOpen)
              .map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    if (w.isMinimized) {
                      bringToFront(w.id);
                    } else {
                      toggleMinimize(w.id);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-2 border transition-all text-xs shrink-0 ${
                    !w.isMinimized
                      ? 'bg-slate-800 border-rose-500/50 text-white font-bold'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {w.icon}
                  <span className="hidden sm:inline-block max-w-[120px] truncate">{w.title}</span>
                </button>
              ))}
          </div>

          {/* Right: System Tray & Clock */}
          <div className="flex items-center gap-3 pl-3 shrink-0 text-slate-400">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                const m = soundEngine.toggleMute();
                setIsMuted(m);
              }}
              className="p-1 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-rose-400" />}
            </button>

            {/* Return to 3D Room Button */}
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[11px] transition-colors"
            >
              Step Back [Esc]
            </button>

            {/* Clock */}
            <div className="text-right pl-2 border-l border-slate-800 text-[11px] text-rose-300 font-bold">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------
   Desktop Icon Component
---------------------------------------------------- */
interface DesktopIconProps {
  label: string;
  icon: React.ReactNode;
  badge?: string;
  onClick: () => void;
}

const DesktopIcon: React.FC<DesktopIconProps> = ({ label, icon, badge, onClick }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="group relative flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/10 transition-all text-center focus:outline-none focus:ring-1 focus:ring-rose-400/50"
    >
      <div className="relative transition-transform group-hover:scale-110">
        {icon}
        {badge && (
          <span className="absolute -top-1 -right-2 text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500 text-black font-bold shadow">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[11px] font-mono text-slate-200 group-hover:text-white mt-1.5 drop-shadow leading-tight line-clamp-1">
        {label}
      </span>
    </button>
  );
};

/* ----------------------------------------------------
   Desktop Window Frame Component
---------------------------------------------------- */
interface DesktopWindowFrameProps {
  win: OSWindow;
  onFocus: () => void;
  onMinimize: (e: React.MouseEvent) => void;
  onMaximize: (e: React.MouseEvent) => void;
  onClose: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

const DesktopWindowFrame: React.FC<DesktopWindowFrameProps> = ({
  win,
  onFocus,
  onMinimize,
  onMaximize,
  onClose,
  children,
}) => {
  if (win.isMinimized) return null;

  return (
    <div
      onClick={onFocus}
      style={{ zIndex: win.zIndex }}
      className={`absolute transition-all ${
        win.isMaximized
          ? 'inset-0 m-0 rounded-none'
          : 'top-6 left-6 right-6 bottom-6 sm:top-8 sm:left-28 sm:right-8 sm:bottom-8 rounded-2xl'
      } bg-[#080d19] border border-rose-500/40 shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-fade-in`}
    >
      {/* Window Titlebar */}
      <div className="h-9 px-4 bg-[#050810] border-b border-slate-800 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
          {win.icon}
          <span className="truncate">{win.title}</span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onMinimize}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMaximize}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={win.isMaximized ? 'Restore' : 'Maximize'}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
};

/* ----------------------------------------------------
   Start Menu Item Component
---------------------------------------------------- */
interface StartMenuItemProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const StartMenuItem: React.FC<StartMenuItemProps> = ({ label, icon, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-2 rounded-xl hover:bg-slate-900 text-slate-300 hover:text-white flex items-center gap-3 transition-colors text-left font-mono"
    >
      <div className="p-1.5 rounded-lg bg-black/40 border border-slate-800">{icon}</div>
      <span className="font-semibold text-xs">{label}</span>
    </button>
  );
};
