import React, { useState } from 'react';
import { ProjectItem } from '../../types';
import { PROJECTS, RESUME_DATA, CERTIFICATIONS, SKILLS_SUMMARY } from '../../data/portfolioData';
import { soundEngine } from '../../audio/soundEngine';
import {
  X,
  ExternalLink,
  Github,
  Play,
  ShieldCheck,
  Activity,
  FolderGit2,
  User,
  FileText,
  Flag,
  Mail,
  Copy,
  CheckCircle,
  GraduationCap,
  Briefcase,
  Award,
  Layers,
  ChevronRight
} from 'lucide-react';

interface ProjectModalProps {
  onClose: () => void;
  initialProjectId?: string;
  initialApp?: 'projects' | 'about' | 'cv' | 'skills';
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ onClose, initialProjectId, initialApp = 'projects' }) => {
  const [activeApp, setActiveApp] = useState<'projects' | 'about' | 'cv' | 'skills'>(initialApp);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || PROJECTS[0].id);
  const [activeTab, setActiveTab] = useState<'overview' | 'architecture' | 'simulator' | 'metrics'>('overview');

  // Simulator state
  const [simRunning, setSimRunning] = useState(false);
  const [simOutput, setSimOutput] = useState<string[]>([]);
  const [copiedResume, setCopiedResume] = useState(false);

  const currentProject = PROJECTS.find((p) => p.id === selectedProjectId) || PROJECTS[0];

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

  const copyResumeToClipboard = () => {
    soundEngine.playKeyClick();
    const text = `
HANAN — CYBERSECURITY RESEARCHER & SYSTEMS DEVELOPER
Email: ${RESUME_DATA.email} | GitHub: ${RESUME_DATA.github}

SUMMARY:
${RESUME_DATA.summary}

EDUCATION:
${RESUME_DATA.education.map((e) => `${e.degree} - ${e.school} (${e.period})\nHonors: ${e.honors}`).join('\n')}

EXPERIENCE:
${RESUME_DATA.experience
  .map(
    (exp) =>
      `${exp.role} at ${exp.company} (${exp.period})\n` +
      exp.points.map((pt) => `• ${pt}`).join('\n')
  )
  .join('\n\n')}

CERTIFICATIONS:
${CERTIFICATIONS.map((c) => `• ${c.name} (${c.issuer}, ${c.year}) - ID: ${c.verificationId}`).join('\n')}

HONORS & AWARDS:
${RESUME_DATA.awards.map((a) => `• ${a}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedResume(true);
    setTimeout(() => setCopiedResume(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 pointer-events-none select-none animate-fade-in">
      <div className="pointer-events-auto relative w-full max-w-5xl bg-[#090e1a]/95 border border-rose-500/40 rounded-2xl shadow-2xl shadow-rose-950/80 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top OS Window Title Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-[#050912]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
            <div className="text-xs font-mono font-bold text-slate-200">
              HANAN//OS v3.8 — [HORIZONTAL WORKSTATION DESKTOP]
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundEngine.playKeyClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Desktop Window (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Desktop App Navigator (Tabs for Projects, About, CV, Skills) */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-slate-800/80 bg-[#03060c] overflow-x-auto">
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              setActiveApp('projects');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeApp === 'projects'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Projects &amp; Systems</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playKeyClick();
              setActiveApp('about');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeApp === 'about'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5 text-rose-400" />
            <span>About Me</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playKeyClick();
              setActiveApp('cv');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeApp === 'cv'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>CV &amp; Resume</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playKeyClick();
              setActiveApp('skills');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeApp === 'skills'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Skills &amp; Toolchains</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* =========================================================
              APP 1: PROJECTS & SYSTEMS BROWSER
          ========================================================= */}
          {activeApp === 'projects' && (
            <div className="space-y-6">
              {/* Project Sub-selector bar */}
              <div className="flex items-center gap-2 pb-2 overflow-x-auto border-b border-slate-800">
                {PROJECTS.map((proj) => {
                  const isSel = proj.id === selectedProjectId;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => {
                        soundEngine.playKeyClick();
                        setSelectedProjectId(proj.id);
                        setSimOutput([]);
                        setSimRunning(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
                        isSel
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <span>{proj.title}</span>
                      <span className="text-[10px] text-slate-500">[{proj.year}]</span>
                    </button>
                  );
                })}
              </div>

              {/* Project Title & Metadata Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-rose-400 mb-1">
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
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-rose-500 text-xs font-mono text-slate-200 hover:text-rose-400 transition-colors"
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
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-mono text-xs font-semibold transition-colors shadow-lg shadow-rose-500/20"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>Run Live Demo</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs for Project Details */}
              <div className="flex items-center gap-2 p-1 bg-slate-950/70 border border-slate-800/80 rounded-xl w-fit">
                <button
                  onClick={() => {
                    soundEngine.playKeyClick();
                    setActiveTab('overview');
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-rose-500/20 text-rose-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Overview &amp; Impact
                </button>
                <button
                  onClick={() => {
                    soundEngine.playKeyClick();
                    setActiveTab('architecture');
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'architecture'
                      ? 'bg-rose-500/20 text-rose-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Architecture &amp; Invariants
                </button>
                <button
                  onClick={() => {
                    soundEngine.playKeyClick();
                    setActiveTab('simulator');
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'simulator'
                      ? 'bg-rose-500/20 text-rose-300 font-semibold shadow-sm'
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
                      ? 'bg-rose-500/20 text-rose-300 font-semibold shadow-sm'
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
                    <div className="text-xs font-mono text-rose-400 uppercase tracking-wider mb-1">Impact &amp; Finding</div>
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
                    Engineering Blueprint &amp; Design Invariants
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentProject.architectureNotes.map((note, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex gap-3">
                        <span className="text-rose-400 font-mono text-sm font-bold">0{idx + 1}.</span>
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
                      className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-semibold transition-colors flex items-center gap-2"
                    >
                      <Activity className={`w-4 h-4 ${simRunning ? 'animate-spin' : ''}`} />
                      <span>{simRunning ? 'Simulating...' : 'Execute Suite'}</span>
                    </button>
                  </div>

                  <div className="bg-[#050811] border border-slate-800 rounded-xl p-4 font-mono text-xs min-h-[200px] max-h-[280px] overflow-y-auto space-y-2">
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
                            ? 'text-rose-300 font-semibold'
                            : 'text-slate-300'
                        }
                      >
                        {line}
                      </div>
                    ))}
                    {simRunning && (
                      <div className="flex items-center gap-2 text-rose-400">
                        <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
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
                        <span className="text-2xl font-bold font-mono text-rose-400 mt-2">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              APP 2: ABOUT ME
          ========================================================= */}
          {activeApp === 'about' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-500 p-1 shrink-0">
                  <div className="w-full h-full rounded-[14px] bg-[#090e1a] flex items-center justify-center text-white font-bold font-display text-3xl">
                    H//
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white font-display">Hanan</h2>
                  <div className="text-xs font-mono text-rose-400">
                    CYBERSECURITY RESEARCHER &amp; SYSTEMS SOFTWARE DEVELOPER
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                    I build low-level systems, kernel telemetry probes, and analyze complex software vulnerabilities. My background bridges hands-on offensive security (binary exploitation, heap allocators, Android IPC intent hijacking) with high-performance systems engineering (Rust, eBPF, WebGL 3D shaders, and post-quantum cryptographic primitives).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-rose-400 font-bold uppercase">DedSec &amp; Underground Ethos</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Inspired by decentralized hacker collectivism, open-source transparency, and rigorous technical craftsmanship. Rather than treating security as abstract compliance checkboxes, I break binaries down to the assembly and syscall layers to understand exactly how code executes in memory.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-rose-400 font-bold uppercase">Current Research Trajectory</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Investigating kernel-level zero-trust auditing using eBPF on modern Linux 6.x kernels, hardware-accelerated lattice cryptography for post-quantum defense, and real-time interactive 3D spatial workstations in the browser.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              APP 3: CURRICULUM VITAE (CV / RESUME)
          ========================================================= */}
          {activeApp === 'cv' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-white font-display">Curriculum Vitae</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Verified Career History, Credentials &amp; Education</p>
                </div>
                <button
                  onClick={copyResumeToClipboard}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-semibold hover:bg-emerald-500/30 transition-colors"
                >
                  {copiedResume ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedResume ? 'Copied Full CV Text' : 'Copy Plaintext CV'}</span>
                </button>
              </div>

              {/* Education */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase font-bold">
                  <GraduationCap className="w-4 h-4" />
                  <span>Education</span>
                </div>
                {RESUME_DATA.education.map((edu, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                      <span>{edu.school}</span>
                      <span>{edu.period}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{edu.degree}</h4>
                    <p className="text-xs text-emerald-300 font-mono">{edu.honors}</p>
                  </div>
                ))}
              </div>

              {/* Experience */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono text-rose-400 uppercase font-bold">
                  <Briefcase className="w-4 h-4" />
                  <span>Professional &amp; Research Experience</span>
                </div>
                {RESUME_DATA.experience.map((exp, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                      <span className="text-rose-400 font-bold">{exp.company}</span>
                      <span>{exp.period}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{exp.role}</h4>
                    <ul className="space-y-1.5 pt-1">
                      {exp.points.map((pt, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-rose-400 mt-1">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Certifications & Awards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase font-bold">
                    <Award className="w-4 h-4" />
                    <span>Verified Certifications</span>
                  </div>
                  <div className="space-y-2">
                    {CERTIFICATIONS.map((cert) => (
                      <div key={cert.name} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                        <div className="font-bold text-white">{cert.name}</div>
                        <div className="text-[11px] text-slate-400">{cert.issuer} · ID: {cert.verificationId}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-purple-400 uppercase font-bold">
                    <Flag className="w-4 h-4" />
                    <span>Competition Honors</span>
                  </div>
                  <div className="space-y-2">
                    {RESUME_DATA.awards.map((a, i) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-200">
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              APP 4: SKILLS & TOOLCHAINS
          ========================================================= */}
          {activeApp === 'skills' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white font-display">Technical Proficiency Matrix</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-rose-400 font-bold uppercase">Systems &amp; Languages</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SKILLS_SUMMARY.languages.map((l) => (
                      <span key={l} className="px-2.5 py-1 rounded bg-slate-800 text-xs font-mono text-slate-200">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-rose-400 font-bold uppercase">Offensive Cybersecurity</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SKILLS_SUMMARY.offensive.map((o) => (
                      <span key={o} className="px-2.5 py-1 rounded bg-slate-800 text-xs font-mono text-slate-200">
                        {o}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-emerald-400 font-bold uppercase">Kernel &amp; Mobile Internals</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SKILLS_SUMMARY.systems.map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded bg-slate-800 text-xs font-mono text-slate-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-amber-400 font-bold uppercase">Cryptographic &amp; Defense</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SKILLS_SUMMARY.defense.map((d) => (
                      <span key={d} className="px-2.5 py-1 rounded bg-slate-800 text-xs font-mono text-slate-200">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
