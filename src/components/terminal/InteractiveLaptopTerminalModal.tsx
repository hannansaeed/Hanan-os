import React, { useState, useRef, useEffect, useCallback } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import { PROJECTS, CTF_CHALLENGES, CERTIFICATIONS, SKILLS_SUMMARY } from '../../data/portfolioData';
import {
  Terminal as TerminalIcon,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Shield,
} from 'lucide-react';

interface InteractiveLaptopTerminalModalProps {
  onClose: () => void;
  onOpenProject?: (projectId: string) => void;
}

interface CommandOutput {
  id: string;
  command: string;
  cwd: string;
  output: React.ReactNode;
  timestamp: string;
}

type TerminalTheme = 'rose' | 'emerald' | 'amber' | 'violet';

const THEME_STYLES: Record<
  TerminalTheme,
  {
    border: string;
    text: string;
    prompt: string;
    accent: string;
    bg: string;
    glow: string;
    badge: string;
  }
> = {
  rose: {
    border: 'border-rose-500/40',
    text: 'text-rose-300',
    prompt: 'text-rose-400',
    accent: 'text-rose-200',
    bg: 'bg-[#040810]/95',
    glow: 'shadow-rose-950/80',
    badge: 'bg-rose-950/50 text-rose-300 border-rose-800/50 hover:bg-rose-900/60',
  },
  emerald: {
    border: 'border-emerald-500/40',
    text: 'text-emerald-300',
    prompt: 'text-emerald-400',
    accent: 'text-emerald-200',
    bg: 'bg-[#030a06]/95',
    glow: 'shadow-emerald-950/80',
    badge: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/60',
  },
  amber: {
    border: 'border-amber-500/40',
    text: 'text-amber-300',
    prompt: 'text-amber-400',
    accent: 'text-amber-200',
    bg: 'bg-[#0a0702]/95',
    glow: 'shadow-amber-950/80',
    badge: 'bg-amber-950/50 text-amber-300 border-amber-800/50 hover:bg-amber-900/60',
  },
  violet: {
    border: 'border-purple-500/40',
    text: 'text-purple-300',
    prompt: 'text-purple-400',
    accent: 'text-purple-200',
    bg: 'bg-[#08030d]/95',
    glow: 'shadow-purple-950/80',
    badge: 'bg-purple-950/50 text-purple-300 border-purple-800/50 hover:bg-purple-900/60',
  },
};

const VIRTUAL_FS: Record<string, { type: 'file' | 'dir'; content?: string }> = {
  'about.md': {
    type: 'file',
    content: `# Hanan Saeed // Cyber Security Researcher & Python Developer\n\nCyber security researcher and Python developer with a strong interest in offensive and defensive security, vulnerability assessment, and AI-powered automation. Passionate about ethical hacking, secure software development, and emerging AI-driven security systems.`,
  },
  'cv.txt': {
    type: 'file',
    content: `CURRICULUM VITAE — HANAN SAEED\n========================================\nRole: Cyber Security Researcher & Python Developer\nEmail: hanansaeed609@yahoo.com\nPhone: +92 3700626055\nLocation: Multan, Pakistan\nEducation: B.S. in Information Technology (BZU, 10/2023 - Present)\nSkills: Penetration Testing, Nmap, Wireshark, OWASP Top 10, Python, C/C++, Kotlin`,
  },
  'skills.json': {
    type: 'file',
    content: `{\n  "languages": ["Rust", "C/C++", "TypeScript", "Python", "Go", "x86_64 ASM"],\n  "security": ["eBPF / XDP", "Kernel Debugging", "Heap Exploitation", "Fuzzing (AFL++)"],\n  "cryptography": ["Kyber-768", "Dilithium-3", "Zero-Knowledge SNARKs", "TLS 1.3"],\n  "infrastructure": ["Linux / FreeBSD", "Docker / K8s", "QEMU / KVM", "eBPF Tracing"]\n}`,
  },
  'notes.txt': {
    type: 'file',
    content: `TODO & Research Vectors:\n[x] eBPF ringbuf syscall auditing engine.\n[x] Post-quantum Key Encapsulation Mechanism benchmark.\n[/] Android AOSP Binder IPC memory boundary fuzzer.\n[ ] Zero-Knowledge Proof verify node optimization.`,
  },
  'Cyfex': {
    type: 'file',
    content: `Project: Cyfex\n========================================\nDescription: The best and broadest on-device Android threat monitoring and security platform using Jetpack Compose and privileged system telemetry (Shizuku) for explainable, zero-cloud risk scoring.\nTechnologies: Kotlin, Jetpack Compose, Shizuku API, Android Security`,
  },
  'Hanan-os': {
    type: 'file',
    content: `Project: Hanan-os\n========================================\nDescription: In production 3D portfolio. Features procedural room geometry, real-time dynamic canvas display textures, CRT phosphor scanline shaders, and Web Audio API synthesized feedback.\nTechnologies: Three.js, WebGL 2.0, GLSL, React, TypeScript, Web Audio API`,
  },
  'Portfolio': {
    type: 'file',
    content: `Project: Portfolio\n========================================\nDescription: A premium, cybersecurity portfolio built with pure HTML/CSS/JS, featuring a glassmorphism terminal UI, Matrix animation, and an interactive Linux-style CLI.\nTechnologies: HTML5, CSS3, JavaScript`,
  },
  'Sheffer': {
    type: 'file',
    content: `Project: Sheffer\n========================================\nDescription: A real-time, cross-platform shared space and instant messaging application built using Flutter and powered by Firebase backend services.\nTechnologies: Flutter, Dart, Firebase Auth, Firestore, Cloud Functions`,
  },
  'Zeel': {
    type: 'file',
    content: `Project: Zeel\n========================================\nDescription: A modular, extensible Discord bot built with Python and discord.py, utilizing a clean Cogs architecture for easy feature deployment.\nTechnologies: Python, discord.py, Cogs Architecture`,
  },
};

export const InteractiveLaptopTerminalModal: React.FC<InteractiveLaptopTerminalModalProps> = ({
  onClose,
}) => {
  const [theme, setTheme] = useState<TerminalTheme>('rose');
  const [currentPath, setCurrentPath] = useState<string>('~');
  const [inputVal, setInputVal] = useState<string>('');
  const [history, setHistory] = useState<CommandOutput[]>([
    {
      id: 'init-1',
      command: 'system --boot',
      cwd: '~',
      timestamp: '00:00:01',
      output: (
        <div className="space-y-1.5 text-xs text-slate-300">
          <div className="text-rose-400 font-bold font-mono">
            HANAN//OS Workstation Shell [Version 4.2.0-x86_64-hardened-linux]
          </div>
          <div className="text-slate-400">
            Host: <span className="text-white font-semibold">xcthine-node-alpha</span> · Kernel:{' '}
            <span className="text-rose-300 font-mono">6.8.9-dedsec-ebpf</span> · Uptime: 42 days
          </div>
          <div className="text-xs text-slate-400 pt-1">
            Type <span className="text-rose-300 font-bold font-mono underline cursor-pointer">'help'</span> to view available commands, or click any quick command chip below.
          </div>
        </div>
      ),
    },
    {
      id: 'init-2',
      command: 'help',
      cwd: '~',
      timestamp: '00:00:02',
      output: (
        <div className="space-y-3 text-xs">
          <div className="text-rose-400 font-bold border-b border-slate-800 pb-1 flex items-center gap-2">
            <span>HANAN//OS SHELL COMMAND DIRECTORY</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <div>
              <div className="text-white font-semibold mb-1 text-[11px] uppercase tracking-wider text-rose-300">
                Portfolio & Biography:
              </div>
              <div className="space-y-1 text-slate-300">
                <div><span className="text-rose-300 font-mono font-bold">whoami</span> — Identity & summary</div>
                <div><span className="text-rose-300 font-mono font-bold">about</span> — Bio & DedSec research</div>
                <div><span className="text-rose-300 font-mono font-bold">cv</span> — Full curriculum vitae</div>
                <div><span className="text-rose-300 font-mono font-bold">skills</span> — Proficiency matrix</div>
                <div><span className="text-rose-300 font-mono font-bold">certs</span> — Security certifications</div>
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1 text-[11px] uppercase tracking-wider text-emerald-300">
                Cyber & Diagnostic Tools:
              </div>
              <div className="space-y-1 text-slate-300">
                <div><span className="text-emerald-300 font-mono font-bold">nmap &lt;target&gt;</span> — Simulated TCP SYN scan</div>
                <div><span className="text-emerald-300 font-mono font-bold">submit &lt;flag&gt;</span> — Validate capture flag</div>
                <div><span className="text-emerald-300 font-mono font-bold">neofetch</span> — Hardware/OS specs</div>
                <div><span className="text-emerald-300 font-mono font-bold">ping &lt;host&gt;</span> — ICMP packet test</div>
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1 text-[11px] uppercase tracking-wider text-amber-300">
                Filesystem & Utilities:
              </div>
              <div className="space-y-1 text-slate-300">
                <div><span className="text-amber-300 font-mono font-bold">ls</span> — List GitHub repositories & files</div>
                <div><span className="text-amber-300 font-mono font-bold">cd &lt;dir&gt;</span> — Change directory</div>
                <div><span className="text-amber-300 font-mono font-bold">pwd</span> — Print current directory</div>
                <div><span className="text-amber-300 font-mono font-bold">cat &lt;file&gt;</span> — View file or repository details</div>
                <div><span className="text-amber-300 font-mono font-bold">tree</span> — Hierarchy tree view</div>
                <div><span className="text-amber-300 font-mono font-bold">calc &lt;expr&gt;</span> — Math calculator</div>
                <div><span className="text-amber-300 font-mono font-bold">date / uptime</span> — Clock telemetry</div>
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1 text-[11px] uppercase tracking-wider text-purple-300">
                Environment Controls:
              </div>
              <div className="space-y-1 text-slate-300">
                <div><span className="text-purple-300 font-mono font-bold">theme &lt;name&gt;</span> — rose|emerald|amber|violet</div>
                <div><span className="text-purple-300 font-mono font-bold">sound</span> — Toggle audio clicks</div>
                <div><span className="text-purple-300 font-mono font-bold">clear</span> (or Ctrl+L) — Clear buffer</div>
                <div><span className="text-purple-300 font-mono font-bold">exit</span> (or Esc) — Return to 3D room</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ]);
  const [cmdHistoryList, setCmdHistoryList] = useState<string[]>([]);
  const [cmdHistoryIndex, setCmdHistoryIndex] = useState<number>(-1);
  const [isMatrixRunning, setIsMatrixRunning] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);

  const tStyle = THEME_STYLES[theme];

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll to bottom on output updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isScanning]);

  // Matrix falling rain animation
  useEffect(() => {
    if (!isMatrixRunning) return;

    const canvas = matrixCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 450;

    const chars = '0123456789ABCDEF@#$%&*+-=<>~ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    let animId: number;
    const render = () => {
      ctx.fillStyle = 'rgba(4, 8, 16, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = theme === 'emerald' ? '#10b981' : theme === 'amber' ? '#f59e0b' : theme === 'violet' ? '#c084fc' : '#38bdf8';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isMatrixRunning, theme]);

  // Execute terminal command
  const executeCommand = useCallback(
    (rawCommand: string) => {
      const trimmed = rawCommand.trim();
      if (!trimmed) return;

      if (!isMuted) soundEngine.playKeyClick();

      setCmdHistoryList((prev) => [...prev, trimmed]);
      setCmdHistoryIndex(-1);

      const parts = trimmed.split(' ').filter(Boolean);
      const cmd = parts[0]?.toLowerCase();
      const args = parts.slice(1);
      const now = new Date().toTimeString().split(' ')[0];

      let output: React.ReactNode = null;

      switch (cmd) {
        case 'help':
        case '?':
          output = (
            <div className="space-y-3 text-xs">
              <div className="text-rose-400 font-bold border-b border-slate-800 pb-1 flex items-center gap-2">
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>HANAN//OS SHELL COMMAND DIRECTORY</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <div className="text-white font-semibold mb-1 text-[11px] uppercase tracking-wider text-rose-300">
                    Portfolio & Biography:
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <div><span className="text-rose-300 font-mono font-bold">whoami</span> — Identity & summary</div>
                    <div><span className="text-rose-300 font-mono font-bold">about</span> — Bio & DedSec research</div>
                    <div><span className="text-rose-300 font-mono font-bold">cv</span> — Full curriculum vitae</div>
                    <div><span className="text-rose-300 font-mono font-bold">skills</span> — Proficiency matrix</div>
                    <div><span className="text-rose-300 font-mono font-bold">projects</span> — List production systems</div>
                    <div><span className="text-rose-300 font-mono font-bold">project &lt;id&gt;</span> — Inspect specific project</div>
                    <div><span className="text-rose-300 font-mono font-bold">certs</span> — Security certifications</div>
                  </div>
                </div>
                <div>
                  <div className="text-white font-semibold mb-1 text-[11px] uppercase tracking-wider text-emerald-300">
                    Cyber & Diagnostic Tools:
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <div><span className="text-emerald-300 font-mono font-bold">nmap &lt;target&gt;</span> — Simulated TCP SYN scan</div>
                    <div><span className="text-emerald-300 font-mono font-bold">ctf</span> — CTF exploits & writeups</div>
                    <div><span className="text-emerald-300 font-mono font-bold">submit &lt;flag&gt;</span> — Validate capture flag</div>
                    <div><span className="text-emerald-300 font-mono font-bold">matrix</span> — Toggle digital glyph rain</div>
                    <div><span className="text-emerald-300 font-mono font-bold">neofetch</span> — Hardware/OS specs</div>
                    <div><span className="text-emerald-300 font-mono font-bold">top</span> — Live system processes</div>
                    <div><span className="text-emerald-300 font-mono font-bold">ping &lt;host&gt;</span> — ICMP packet test</div>
                  </div>
                </div>
                <div>
                  <div className="text-white font-semibold mb-1 text-[11px] uppercase tracking-wider text-amber-300">
                    Filesystem & Utilities:
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <div><span className="text-amber-300 font-mono font-bold">ls</span> — List directory contents</div>
                    <div><span className="text-amber-300 font-mono font-bold">cd &lt;dir&gt;</span> — Change directory</div>
                    <div><span className="text-amber-300 font-mono font-bold">pwd</span> — Print current directory</div>
                    <div><span className="text-amber-300 font-mono font-bold">cat &lt;file&gt;</span> — View file content</div>
                    <div><span className="text-amber-300 font-mono font-bold">tree</span> — Hierarchy tree view</div>
                    <div><span className="text-amber-300 font-mono font-bold">calc &lt;expr&gt;</span> — Math calculator</div>
                    <div><span className="text-amber-300 font-mono font-bold">date / uptime</span> — Clock telemetry</div>
                  </div>
                </div>
                <div>
                  <div className="text-white font-semibold mb-1 text-[11px] uppercase tracking-wider text-purple-300">
                    Environment Controls:
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <div><span className="text-purple-300 font-mono font-bold">theme &lt;name&gt;</span> — rose|emerald|amber|violet</div>
                    <div><span className="text-purple-300 font-mono font-bold">sound</span> — Toggle audio clicks</div>
                    <div><span className="text-purple-300 font-mono font-bold">clear</span> (or Ctrl+L) — Clear buffer</div>
                    <div><span className="text-purple-300 font-mono font-bold">exit</span> (or Esc) — Return to 3D room</div>
                  </div>
                </div>
              </div>
            </div>
          );
          break;

        case 'clear':
        case 'cls':
          setHistory([]);
          setInputVal('');
          return;

        case 'whoami':
          output = (
            <div className="text-xs space-y-1 text-slate-300">
              <div className="text-rose-400 font-bold">UID: 1000(hanan) GID: 1000(dedsec) GROUPS: 1000(dedsec),4(adm),27(sudo),998(wheel)</div>
              <div>Primary Role: <span className="text-white font-semibold">Senior Cybersecurity Research & Systems Engineer</span></div>
              <div>Specialization: <span className="text-emerald-300">eBPF Telemetry Probes · Binary Exploitation · Post-Quantum Crypto</span></div>
              <div>Station: <span className="text-rose-300">xcthine-workstation-laptop</span></div>
            </div>
          );
          break;

        case 'about':
          output = (
            <div className="space-y-2 text-xs text-slate-300">
              <div className="text-white font-bold text-sm">Hanan :: DedSec Systems & Cyber Research</div>
              <p className="text-slate-400 leading-relaxed">
                I build and break low-level systems, kernel observability agents, and high-assurance cryptographic protocols. My background bridges deep offensive security (glibc heap internals, binary exploitation, Android AOSP Binder IPC hijacking) with high-performance systems engineering (Rust, eBPF/XDP, WebGL 3D architectures, and post-quantum cryptographic primitives).
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 text-[11px]">Rust</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-[11px]">eBPF / XDP</span>
                <span className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-[11px]">C / C++ / ASM</span>
                <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300 text-[11px]">Kyber-768</span>
                <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300 text-[11px]">Binary Exploits</span>
              </div>
            </div>
          );
          break;

        case 'cv':
        case 'resume':
          try {
            window.open('https://hannansaeed.github.io/portfolio', '_blank', 'noopener,noreferrer');
          } catch {
            // Fallback
          }
          output = (
            <div className="space-y-3 text-xs text-slate-300">
              <div className="text-rose-400 font-bold border-b border-slate-800 pb-1 text-sm">
                CURRICULUM VITAE — HANAN SAEED
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-white font-semibold">EDUCATION</div>
                  <div className="text-slate-400">
                    <div className="text-rose-300 font-medium">B.S. in Information Technology</div>
                    <div>Bahauddin Zakariya University (BZU)</div>
                    <div className="text-xs text-slate-500">10/2023 – Present · Multan, Pakistan</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-white font-semibold">KEY FOCUS & PROJECTS</div>
                  <div className="text-slate-400">
                    <div className="text-emerald-300 font-medium">Cyber Security Researcher</div>
                    <div className="text-xs">Built automated Python Nmap scanners, OWASP Top 10 pentesting tools, secure Firebase Android apps, and custom Discord logging bots.</div>
                  </div>
                </div>
              </div>
            </div>
          );
          break;

        case 'skills':
          output = (
            <div className="space-y-3 text-xs">
              <div className="text-rose-400 font-bold border-b border-slate-800 pb-1">TECHNICAL PROFICIENCY DOMAINS:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-rose-300 font-bold text-[11px]">OFFENSIVE SECURITY</div>
                  <div className="text-slate-300 leading-relaxed">{SKILLS_SUMMARY.offensive.join(' · ')}</div>
                </div>
                <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-emerald-300 font-bold text-[11px]">LANGUAGES & COMPILERS</div>
                  <div className="text-slate-300 leading-relaxed">{SKILLS_SUMMARY.languages.join(' · ')}</div>
                </div>
                <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-indigo-300 font-bold text-[11px]">SYSTEMS & INFRASTRUCTURE</div>
                  <div className="text-slate-300 leading-relaxed">{SKILLS_SUMMARY.systems.join(' · ')}</div>
                </div>
                <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-amber-300 font-bold text-[11px]">DEFENSIVE & CRYPTO</div>
                  <div className="text-slate-300 leading-relaxed">{SKILLS_SUMMARY.defense.join(' · ')}</div>
                </div>
              </div>
            </div>
          );
          break;

        case 'certs':
        case 'certifications':
          output = (
            <div className="space-y-2 text-xs">
              <div className="text-rose-400 font-bold border-b border-slate-800 pb-1">VERIFIED SECURITY CREDENTIALS:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CERTIFICATIONS.map((cert) => (
                  <div key={cert.verificationId} className="p-2.5 rounded bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-[11px]">{cert.name}</div>
                      <div className="text-slate-400 text-[10px]">{cert.issuer} · <span className="text-rose-300 font-mono">{cert.badgeCode}</span></div>
                      <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Status: Verified ({cert.year})</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
          break;

        case 'submit':
          if (!args[0]) {
            output = <div className="text-xs text-amber-400">Usage: submit flag&#123;your_flag_here&#125;</div>;
          } else {
            const userFlag = args[0];
            if (userFlag.startsWith('flag{') || userFlag.includes('ebpf')) {
              if (!isMuted) soundEngine.playChirp('success');
              output = (
                <div className="p-3 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-2 text-emerald-200">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>FLAG ACCEPTED! +500 PTS AWARDED</span>
                  </div>
                  <div className="font-mono text-[11px]">Valid submission: {userFlag}</div>
                  <div className="text-[10px] text-emerald-400">Exploit verified. Added to leaderboard tally.</div>
                </div>
              );
            } else {
              output = (
                <div className="text-xs text-rose-400">
                  [-] Invalid flag hash. Review exploit primitives and try again.
                </div>
              );
            }
          }
          break;

        case 'nmap':
          const target = args[0] || '192.168.1.1';
          setIsScanning(true);
          output = (
            <div className="space-y-2 text-xs font-mono">
              <div className="text-rose-400">Starting Nmap 7.94 ( https://nmap.org ) at {now} UTC</div>
              <div className="text-slate-400">Initiating SYN Stealth Scan against {target} [1000 ports]...</div>
              <div className="text-slate-300 pl-2 border-l border-rose-500/40 space-y-1 py-1">
                <div>Discovered open port <span className="text-emerald-400 font-bold">22/tcp</span> on {target} (OpenSSH 9.6p1)</div>
                <div>Discovered open port <span className="text-emerald-400 font-bold">80/tcp</span> on {target} (nginx/1.24.0)</div>
                <div>Discovered open port <span className="text-emerald-400 font-bold">443/tcp</span> on {target} (TLS 1.3 / Kyber-768 Hybrid)</div>
                <div>Discovered open port <span className="text-emerald-400 font-bold">9090/tcp</span> on {target} (eBPF Prometheus Exporter)</div>
                <div>Discovered open port <span className="text-emerald-400 font-bold">51820/udp</span> on {target} (WireGuard Secure Tunnel)</div>
              </div>
              <div className="text-emerald-400 font-bold">
                Nmap done: 1 IP address (1 host up) scanned in 0.48 seconds. OS: Linux 6.8.x
              </div>
            </div>
          );
          setTimeout(() => setIsScanning(false), 600);
          break;

        case 'neofetch':
          output = (
            <div className="font-mono text-xs text-slate-300 flex flex-col sm:flex-row gap-4 py-2">
              <pre className="text-rose-400 font-bold text-[10px] leading-tight select-none">
{`       /\\
      /  \\
     / /\\ \\
    / /  \\ \\
   / /    \\ \\
  / /  __  \\ \\
  / /  /  \\  \\ \\
/ /__/ /\\ \\__\\ \\
\\____\\/  \\_____/`}
              </pre>
              <div className="space-y-1 text-[11px]">
                <div className="text-rose-300 font-bold">hanan@xcthine-workstation</div>
                <div className="text-slate-500">--------------------------</div>
                <div><span className="text-rose-400 font-semibold">OS:</span> HANAN//OS Hardened Linux x86_64</div>
                <div><span className="text-rose-400 font-semibold">Host:</span> DedSec Workstation Node 01</div>
                <div><span className="text-rose-400 font-semibold">Kernel:</span> 6.8.9-dedsec-ebpf-probes</div>
                <div><span className="text-rose-400 font-semibold">Uptime:</span> 42 days, 7 hours, 14 mins</div>
                <div><span className="text-rose-400 font-semibold">Shell:</span> dedsec-zsh 5.9 (x86_64)</div>
                <div><span className="text-rose-400 font-semibold">Resolution:</span> 2560x1440 (Horizontal) + 1920x1080 (Laptop)</div>
                <div><span className="text-rose-400 font-semibold">DE / WM:</span> HANAN Desktop v4.2</div>
                <div><span className="text-rose-400 font-semibold">CPU:</span> AMD Ryzen 9 7950X (32) @ 5.700GHz</div>
                <div><span className="text-rose-400 font-semibold">GPU:</span> NVIDIA RTX 4090 24GB [Vulkan / WebGL 2.0]</div>
                <div><span className="text-rose-400 font-semibold">Memory:</span> 12410MiB / 64230MiB (19%)</div>
              </div>
            </div>
          );
          break;

        case 'ls':
          output = (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <span className="text-rose-400 font-bold">📁 Cyfex/</span>
              <span className="text-rose-400 font-bold">📁 Hanan-os/</span>
              <span className="text-rose-400 font-bold">📁 Portfolio/</span>
              <span className="text-rose-400 font-bold">📁 Sheffer/</span>
              <span className="text-rose-400 font-bold">📁 Zeel/</span>
              <span className="text-slate-300">📄 about.md</span>
              <span className="text-slate-300">📄 cv.txt</span>
              <span className="text-slate-300">📄 skills.json</span>
              <span className="text-slate-300">📄 notes.txt</span>
            </div>
          );
          break;

        case 'pwd':
          output = <div className="text-xs font-mono text-rose-300">/home/hanan/{currentPath === '~' ? '' : currentPath.replace('~/', '')}</div>;
          break;

        case 'cd':
          const newDir = args[0] || '~';
          if (newDir === '~' || newDir === '/' || newDir === '..') {
            setCurrentPath('~');
            output = <div className="text-xs font-mono text-slate-400">Switched directory to ~</div>;
          } else {
            const normalizedDir = newDir.toLowerCase();
            const validDirs = ['cyfex', 'hanan-os', 'portfolio', 'sheffer', 'zeel'];
            if (validDirs.includes(normalizedDir)) {
              output = <div className="text-xs font-mono text-slate-400">Inspecting repository: {newDir}. Run 'cat {newDir}' to view details.</div>;
            } else {
              output = <div className="text-xs text-rose-400">cd: no such directory: {newDir}</div>;
            }
          }
          break;

        case 'cat':
          const fileToRead = args[0];
          if (!fileToRead) {
            output = <div className="text-xs text-amber-400">Usage: cat &lt;filename&gt; (e.g. 'cat about.md', 'cat Cyfex')</div>;
          } else {
            const normalizedFile = fileToRead.toLowerCase();
            const matchedKey = Object.keys(VIRTUAL_FS).find((k) => k.toLowerCase() === normalizedFile);
            if (matchedKey && VIRTUAL_FS[matchedKey].content) {
              output = (
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  {VIRTUAL_FS[matchedKey].content}
                </pre>
              );
            } else {
              output = <div className="text-xs text-rose-400">cat: {fileToRead}: No such file or directory</div>;
            }
          }
          break;

        case 'tree':
          output = (
            <pre className="text-xs font-mono text-rose-300 leading-relaxed select-none">
{`.
├── about.md
├── cv.txt
├── skills.json
├── notes.txt
├── Cyfex/
├── Hanan-os/
├── Portfolio/
├── Sheffer/
└── Zeel/`}
            </pre>
          );
          break;

        case 'calc':
          if (!args[0]) {
            output = <div className="text-xs text-amber-400">Usage: calc &lt;expression&gt; (e.g. 'calc 1024 * 768')</div>;
          } else {
            try {
              const expr = args.join(' ').replace(/[^0-9+\-*/().\s]/g, '');
              // eslint-disable-next-line no-eval
              const res = Function(`'use strict'; return (${expr})`)();
              output = <div className="text-xs font-mono text-emerald-400">{expr} = <span className="font-bold text-white">{res}</span></div>;
            } catch {
              output = <div className="text-xs text-rose-400">Invalid mathematical expression.</div>;
            }
          }
          break;

        case 'ping':
          const pingHost = args[0] || '1.1.1.1';
          output = (
            <div className="text-xs font-mono space-y-1 text-slate-300">
              <div className="text-rose-400">PING {pingHost} ({pingHost}) 56(84) bytes of data.</div>
              <div>64 bytes from {pingHost}: icmp_seq=1 ttl=58 time=12.4 ms</div>
              <div>64 bytes from {pingHost}: icmp_seq=2 ttl=58 time=11.8 ms</div>
              <div>64 bytes from {pingHost}: icmp_seq=3 ttl=58 time=12.1 ms</div>
              <div className="text-emerald-400 font-bold">--- {pingHost} ping statistics --- 3 packets transmitted, 3 received, 0% packet loss</div>
            </div>
          );
          break;

        case 'date':
          output = <div className="text-xs font-mono text-rose-300">{new Date().toUTCString()}</div>;
          break;

        case 'uptime':
          output = <div className="text-xs font-mono text-rose-300">up 42 days, 7:14, 2 users, load average: 0.12, 0.08, 0.04</div>;
          break;

        case 'theme':
          const nextTheme = args[0]?.toLowerCase() as TerminalTheme;
          if (nextTheme && THEME_STYLES[nextTheme]) {
            setTheme(nextTheme);
            output = <div className="text-xs text-emerald-400 font-mono">Theme switched to '{nextTheme}'.</div>;
          } else {
            output = <div className="text-xs text-amber-400">Usage: theme &lt;rose|emerald|amber|violet&gt;</div>;
          }
          break;

        case 'sound':
          setIsMuted((prev) => {
            const next = !prev;
            soundEngine.toggleMute();
            return next;
          });
          output = <div className="text-xs text-rose-300 font-mono">Audio clicks {isMuted ? 'ENABLED' : 'MUTED'}.</div>;
          break;

        case 'exit':
          if (!isMuted) soundEngine.playKeyClick();
          onClose();
          return;

        default:
          output = (
            <div className="text-xs text-rose-400">
              zsh: command not found: {cmd}. Type <span className="text-rose-300 underline font-mono cursor-pointer" onClick={() => executeCommand('help')}>'help'</span> for available commands.
            </div>
          );
      }

      setHistory((prev) => [
        ...prev,
        {
          id: `cmd-${Date.now()}`,
          command: trimmed,
          cwd: currentPath,
          output,
          timestamp: now,
        },
      ]);
      setInputVal('');
    },
    [currentPath, isMatrixRunning, isMuted, onClose]
  );

  // Key down handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistoryList.length === 0) return;
      const nextIdx = cmdHistoryIndex === -1 ? cmdHistoryList.length - 1 : Math.max(0, cmdHistoryIndex - 1);
      setCmdHistoryIndex(nextIdx);
      setInputVal(cmdHistoryList[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistoryIndex === -1) return;
      const nextIdx = cmdHistoryIndex + 1;
      if (nextIdx >= cmdHistoryList.length) {
        setCmdHistoryIndex(-1);
        setInputVal('');
      } else {
        setCmdHistoryIndex(nextIdx);
        setInputVal(cmdHistoryList[nextIdx] || '');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple autocompletion
      const cmds = ['help', 'about', 'whoami', 'cv', 'skills', 'certs', 'nmap', 'neofetch', 'clear', 'ls', 'cat', 'tree', 'theme', 'sound', 'exit', 'cyfex', 'hanan-os', 'portfolio', 'sheffer', 'zeel'];
      const match = cmds.find((c) => c.startsWith(inputVal.toLowerCase()));
      if (match) {
        setInputVal(match);
      }
    } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      setHistory([]);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      e.stopImmediatePropagation();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-black">
      <div
        className={`relative w-full h-full ${tStyle.bg} flex flex-col overflow-hidden`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Matrix Canvas Layer */}
        {isMatrixRunning && (
          <canvas
            ref={matrixCanvasRef}
            className="absolute inset-0 pointer-events-none opacity-40 z-0"
          />
        )}

        {/* Scrollable Terminal Output Body */}
        <div className="relative z-10 flex-1 p-6 overflow-y-auto space-y-4 font-mono select-text text-lg">
          {history.map((item) => (
            <div key={item.id} className="space-y-1.5">
              {/* Command Prompt Row */}
              <div className="flex items-center gap-3">
                <span className={`${tStyle.prompt} font-bold`}>hanan@xcthine</span>
                <span className="text-slate-500">:</span>
                <span className="text-blue-400 font-semibold">{item.cwd}</span>
                <span className="text-slate-500">$</span>
                <span className="text-white font-bold">{item.command}</span>
              </div>
              {/* Command Result */}
              <div className="pl-6 border-l-2 border-slate-800/80">{item.output}</div>
            </div>
          ))}

          {/* Active Input Row */}
          <div className="flex items-center gap-3 pt-1">
            <span className={`${tStyle.prompt} font-bold`}>hanan@xcthine</span>
            <span className="text-slate-500">:</span>
            <span className="text-blue-400 font-semibold">{currentPath}</span>
            <span className="text-slate-500">$</span>
            <div className="relative flex-1 flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-white font-mono font-semibold focus:outline-none placeholder-slate-600"
                placeholder="Type command..."
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </div>

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};
