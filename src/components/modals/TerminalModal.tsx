import React, { useState, useRef, useEffect } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import { PROJECTS, CTF_CHALLENGES, CERTIFICATIONS, SKILLS_SUMMARY } from '../../data/portfolioData';
import { X, Terminal as TerminalIcon, CornerDownLeft } from 'lucide-react';

interface TerminalModalProps {
  onClose: () => void;
  onOpenProject?: (projectId: string) => void;
}

interface CommandHistoryItem {
  command: string;
  output: React.ReactNode;
}

export const TerminalModal: React.FC<TerminalModalProps> = ({ onClose, onOpenProject }) => {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<CommandHistoryItem[]>([
    {
      command: 'init',
      output: (
        <div className="space-y-1 text-slate-300">
          <div className="text-rose-400 font-bold">HANAN//OS Workstation Shell [Version 3.8.4-x86_64]</div>
          <div>Type <span className="text-rose-300 font-semibold">'help'</span> for a list of available diagnostic commands.</div>
          <div className="text-xs text-slate-500">Security Invariants: Enforced · eBPF audit active.</div>
        </div>
      ),
    },
  ]);
  const [commandIndex, setCommandIndex] = useState<number>(-1);
  const [enteredCommands, setEnteredCommands] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    soundEngine.playKeyClick();
    setEnteredCommands((prev) => [...prev, trimmed]);
    setCommandIndex(-1);

    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    let output: React.ReactNode = null;

    switch (cmd) {
      case 'help':
        output = (
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="text-rose-400 font-bold mb-1">AVAILABLE SYSTEM COMMANDS:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <div><span className="text-rose-300 font-semibold">whoami</span> — Identity & operator summary</div>
              <div><span className="text-rose-300 font-semibold">about</span> — Bio & DedSec engineering background</div>
              <div><span className="text-rose-300 font-semibold">cv</span> — Display full Curriculum Vitae</div>
              <div><span className="text-rose-300 font-semibold">projects</span> — List production systems & research</div>
              <div><span className="text-rose-300 font-semibold">project &lt;id&gt;</span> — Inspect specific project</div>
              <div><span className="text-rose-300 font-semibold">ctf</span> — High-impact CTF writeups & exploits</div>
              <div><span className="text-rose-300 font-semibold">skills</span> — Technical proficiency tree</div>
              <div><span className="text-rose-300 font-semibold">certs</span> — Verified security certifications</div>
              <div><span className="text-rose-300 font-semibold">nmap &lt;target&gt;</span> — Simulated TCP SYN stealth scan</div>
              <div><span className="text-rose-300 font-semibold">clear</span> — Clear console buffer</div>
              <div><span className="text-rose-300 font-semibold">exit</span> — Terminate shell session</div>
            </div>
          </div>
        );
        break;

      case 'about':
        output = (
          <div className="space-y-2 text-xs text-slate-300">
            <div className="text-white font-semibold">Hanan Saeed :: Cyber Security Researcher & Python Developer</div>
            <p className="text-slate-400 leading-relaxed">
              Cyber security researcher and Python developer with a strong interest in offensive and defensive security, vulnerability assessment, and AI-powered automation. Experienced in building security tooling, working with APIs and databases, and applying practical penetration testing techniques. Passionate about ethical hacking, secure software development, and emerging AI-driven security systems.
            </p>
          </div>
        );
        break;

      case 'cv':
      case 'resume':
        // Trigger opening their actual portfolio/CV PDF link in a new tab!
        try {
          window.open('https://hannansaeed.github.io/portfolio', '_blank', 'noopener,noreferrer');
        } catch {
          // Fallback for isolated sandbox environments
        }
        output = (
          <div className="space-y-3 text-xs text-slate-300">
            <div className="text-rose-400 font-bold border-b border-slate-800 pb-1">
              CURRICULUM VITAE — HANAN SAEED
            </div>
            <div>
              <span className="text-white font-bold">Profile:</span> Cybersecurity Researcher & Python Developer
            </div>
            <div>
              <span className="text-white font-bold">Contact:</span> hanansaeed609@yahoo.com · +92 3700626055 · Pakistan
            </div>
            <div>
              <span className="text-white font-bold">Education:</span>
              <div className="pl-3 text-slate-400 space-y-0.5 mt-1">
                <div>• B.S. in Information Technology — Bahauddin Zakariya University (10/2023 - Present)</div>
                <div>• Govt. Graduate College of Science — Pre-Engineering / ICS (09/2021 - 09/2023)</div>
              </div>
            </div>
            <div>
              <span className="text-white font-bold">Key Projects:</span>
              <div className="pl-3 text-slate-400 space-y-1 mt-1">
                <div>• Network Vulnerability Scanner (Python, Nmap, CVE databases auto-mapper)</div>
                <div>• Web Application Pentesting Toolkit (Forms crawling, OWASP Top 10 auditing)</div>
                <div>• Security Automation & Incident Bot (Linux syslog parsing & Discord alerts)</div>
                <div>• Secure Mobile Application (Hardened Android MVVM with SQLCipher cache)</div>
              </div>
            </div>
            <div>
              <span className="text-emerald-400 font-bold">Accreditations:</span> BZU Vulnerability Assessment Specialist · Independent Web Pentesting
            </div>
            <div>
              <span className="text-purple-400 font-bold">Links:</span> github.com/hannansaeed · linkedin.com/in/hanan-saeed · [Warped to Portfolio!]
            </div>
          </div>
        );
        break;

      case 'whoami':
        output = (
          <div className="space-y-2 text-xs text-slate-300">
            <div className="text-white font-semibold">Hanan — Cybersecurity Researcher & Systems Software Developer</div>
            <p className="text-slate-400 leading-relaxed">
              Specialized in low-level systems, offensive security (binary exploitation, glibc heap internals, Android Binder IPC security), and real-time 3D spatial WebGL systems.
            </p>
            <div className="text-rose-400">
              Focus: Zero-Trust Telemetry · eBPF Kernel Probes · Post-Quantum Cryptography · 3D Workstations
            </div>
          </div>
        );
        break;

      case 'projects':
        output = (
          <div className="space-y-2 text-xs">
            <div className="text-rose-400 font-bold">PRODUCTION PROJECTS & RESEARCH:</div>
            {PROJECTS.map((p, i) => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-300 py-1 border-b border-slate-800/40">
                <div>
                  <span className="text-rose-300 font-semibold">[{i + 1}] {p.title}</span>
                  <span className="text-slate-500 ml-2">({p.category})</span>
                </div>
                <button
                  onClick={() => {
                    if (onOpenProject) onOpenProject(p.id);
                  }}
                  className="text-rose-400 hover:underline text-left sm:text-right mt-0.5 sm:mt-0"
                >
                  open project {p.id}
                </button>
              </div>
            ))}
          </div>
        );
        break;

      case 'project':
        if (!arg) {
          output = <span className="text-amber-400">Usage: project &lt;id&gt; (e.g. project android-sec-mon)</span>;
        } else {
          const found = PROJECTS.find((p) => p.id === arg || p.title.toLowerCase().includes(arg.toLowerCase()));
          if (found) {
            output = (
              <div className="space-y-1 text-xs text-slate-300">
                <div className="text-rose-400 font-bold">{found.title} [{found.year}]</div>
                <div>{found.description}</div>
                <div className="text-emerald-400">Status: {found.status} · Impact: {found.impact}</div>
              </div>
            );
            if (onOpenProject) onOpenProject(found.id);
          } else {
            output = <span className="text-red-400">Project not found: '{arg}'. Type 'projects' for listing.</span>;
          }
        }
        break;

      case 'ctf':
        output = (
          <div className="space-y-2 text-xs">
            <div className="text-rose-400 font-bold">NOTABLE CTF WRITEUPS & SOLVES:</div>
            {CTF_CHALLENGES.map((c) => (
              <div key={c.id} className="text-slate-300 py-1 border-b border-slate-800/40">
                <span className="text-emerald-400 font-semibold">[{c.category}]</span>{' '}
                <span className="text-white font-medium">{c.title}</span>{' '}
                <span className="text-slate-500">· {c.event} · {c.difficulty}</span>
                <div className="text-slate-400 text-[11px] mt-0.5">{c.vulnerability}</div>
              </div>
            ))}
          </div>
        );
        break;

      case 'skills':
        output = (
          <div className="space-y-2 text-xs text-slate-300">
            <div>
              <span className="text-rose-400 font-bold">Languages:</span>{' '}
              {SKILLS_SUMMARY.languages.join(' · ')}
            </div>
            <div>
              <span className="text-rose-400 font-bold">Offensive Cyber:</span>{' '}
              {SKILLS_SUMMARY.offensive.join(' · ')}
            </div>
            <div>
              <span className="text-rose-400 font-bold">Systems & Infra:</span>{' '}
              {SKILLS_SUMMARY.systems.join(' · ')}
            </div>
            <div>
              <span className="text-rose-400 font-bold">Defense & Verification:</span>{' '}
              {SKILLS_SUMMARY.defense.join(' · ')}
            </div>
          </div>
        );
        break;

      case 'certs':
        output = (
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="text-rose-400 font-bold">ACCREDITATIONS:</div>
            {CERTIFICATIONS.map((cert) => (
              <div key={cert.name} className="flex justify-between border-b border-slate-800/40 py-1">
                <span>{cert.name} ({cert.issuer})</span>
                <span className="text-emerald-400 font-mono">{cert.badgeCode}</span>
              </div>
            ))}
          </div>
        );
        break;

      case 'nmap': {
        const targetHost = arg || '127.0.0.1';
        output = (
          <div className="space-y-1 text-xs font-mono text-slate-300">
            <div className="text-rose-400">Starting Nmap 7.94 ( https://nmap.org ) at 2026-09-26 01:05</div>
            <div>Nmap scan report for {targetHost}</div>
            <div>Host is up (0.00042s latency).</div>
            <div className="text-slate-400 py-1">
              <div>PORT     STATE SERVICE       VERSION</div>
              <div className="text-emerald-400">22/tcp   open  ssh           OpenSSH 9.2p1 Debian</div>
              <div className="text-emerald-400">80/tcp   open  http          Caddy web server</div>
              <div className="text-emerald-400">443/tcp  open  ssl/https     HTTP/3 QUIC (HANAN//OS)</div>
              <div className="text-emerald-400">8443/tcp open  grpc-tls      hanan-core-daemon v3.8</div>
              <div className="text-emerald-400">9090/tcp open  sentinel-jail Docker Ephemeral CTF</div>
            </div>
            <div className="text-rose-400">Nmap done: 1 IP address (1 host up) scanned in 0.28 seconds</div>
          </div>
        );
        break;
      }

      case 'clear':
        setHistory([]);
        setInputVal('');
        return;

      case 'exit':
        onClose();
        return;

      default:
        output = (
          <span className="text-red-400">
            Command not recognized: '{trimmed}'. Type 'help' for available commands.
          </span>
        );
    }

    setHistory((prev) => [...prev, { command: trimmed, output }]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (enteredCommands.length === 0) return;
      const nextIdx = commandIndex === -1 ? enteredCommands.length - 1 : Math.max(0, commandIndex - 1);
      setCommandIndex(nextIdx);
      setInputVal(enteredCommands[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (enteredCommands.length === 0 || commandIndex === -1) return;
      const nextIdx = commandIndex + 1;
      if (nextIdx >= enteredCommands.length) {
        setCommandIndex(-1);
        setInputVal('');
      } else {
        setCommandIndex(nextIdx);
        setInputVal(enteredCommands[nextIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab complete
      const commands = ['help', 'whoami', 'projects', 'project', 'ctf', 'skills', 'certs', 'nmap', 'clear', 'exit'];
      const match = commands.find((c) => c.startsWith(inputVal.trim()));
      if (match) {
        setInputVal(match);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 pointer-events-none select-none animate-fade-in">
      <div className="pointer-events-auto relative w-full max-w-4xl bg-[#060a12]/95 border border-rose-500/40 rounded-2xl shadow-2xl shadow-rose-950/80 flex flex-col h-[80vh] overflow-hidden">
        {/* Titlebar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-[#090e1a]">
          <div className="flex items-center gap-3">
            <TerminalIcon className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-mono font-bold text-slate-200">hanan@workstation-os:~ (tty1)</span>
          </div>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Exit Shell (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Console Body */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-4">
          {history.map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center gap-2 text-rose-400">
                <span className="text-slate-500">hanan@workstation-os:~$</span>
                <span className="text-white font-semibold">{item.command}</span>
              </div>
              <div className="pl-4 border-l border-slate-800/80">{item.output}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Command Input Prompt */}
        <div className="flex items-center gap-3 px-6 py-3 border-t border-slate-800 bg-[#04070e]">
          <span className="text-xs font-mono text-rose-400">hanan@workstation-os:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command (e.g. 'help', 'whoami', 'projects')..."
            className="flex-1 bg-transparent text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none"
          />
          <button
            onClick={() => handleCommand(inputVal)}
            className="p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
            title="Execute (Enter)"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
