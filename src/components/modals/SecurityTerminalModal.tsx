import React, { useState, useEffect } from 'react';
import { CERTIFICATIONS } from '../../data/portfolioData';
import { soundEngine } from '../../audio/soundEngine';
import { X, Shield, Radio, Terminal, Award, FileCode, CheckCircle, Pause, Play, Filter } from 'lucide-react';

interface SecurityTerminalModalProps {
  onClose: () => void;
}

interface SimulatedPacket {
  id: string;
  timestamp: string;
  source: string;
  dest: string;
  protocol: 'TCP' | 'UDP' | 'TLS 1.3' | 'eBPF-XDP' | 'WireGuard';
  length: number;
  info: string;
  flagged: boolean;
}

const INITIAL_PACKETS: SimulatedPacket[] = [
  { id: 'pkt-01', timestamp: '00:00:01.042', source: '192.168.1.104:54420', dest: '10.0.0.1:443', protocol: 'TLS 1.3', length: 1420, info: 'Application Data [Encrypted Session]', flagged: false },
  { id: 'pkt-02', timestamp: '00:00:01.088', source: '10.244.0.12:9090', dest: '172.18.0.2:9090', protocol: 'TCP', length: 256, info: 'CTF_FLAG_SUBMIT payload=flag{...} [VERIFIED]', flagged: true },
  { id: 'pkt-03', timestamp: '00:00:01.120', source: '192.168.1.88:22', dest: '10.0.0.5:22', protocol: 'TCP', length: 78, info: 'SSH-2.0-OpenSSH Key Exchange Init', flagged: false },
  { id: 'pkt-04', timestamp: '00:00:01.155', source: '172.16.1.44:4118', dest: '0.0.0.0:4118', protocol: 'eBPF-XDP', length: 64, info: 'Ringbuf syscall dump: sys_enter_binder_transaction', flagged: false },
  { id: 'pkt-05', timestamp: '00:00:01.210', source: '10.8.0.2:51820', dest: '10.8.0.1:51820', protocol: 'WireGuard', length: 128, info: 'Encrypted tunnel handshake initiator', flagged: false },
];

export const SecurityTerminalModal: React.FC<SecurityTerminalModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'sniffer' | 'matrix' | 'certs' | 'research'>('sniffer');
  const [isSniffing, setIsSniffing] = useState(true);
  const [packets, setPackets] = useState<SimulatedPacket[]>(INITIAL_PACKETS);
  const [selectedPacket, setSelectedPacket] = useState<SimulatedPacket | null>(INITIAL_PACKETS[1]);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (!isSniffing) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;
      const randomPort = Math.floor(10000 + Math.random() * 50000);
      const isSuspect = Math.random() > 0.8;

      const newPacket: SimulatedPacket = {
        id: `pkt-${Date.now().toString().slice(-4)}`,
        timestamp: timeStr,
        source: `192.168.1.${Math.floor(2 + Math.random() * 250)}:${randomPort}`,
        dest: isSuspect ? '10.0.0.99:1337' : '10.0.0.1:443',
        protocol: isSuspect ? 'TCP' : Math.random() > 0.5 ? 'TLS 1.3' : 'eBPF-XDP',
        length: Math.floor(54 + Math.random() * 1400),
        info: isSuspect
          ? 'PORT SCAN ATTEMPT [BLOCKED BY XDP FILTER]'
          : 'Normal encrypted stream segment',
        flagged: isSuspect,
      };

      setPackets((prev) => [newPacket, ...prev.slice(0, 24)]);
    }, 1200);

    return () => clearInterval(interval);
  }, [isSniffing]);

  const filteredPackets = packets.filter(
    (p) =>
      p.info.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.protocol.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.source.includes(filterQuery)
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 pointer-events-none select-none animate-fade-in">
      <div className="pointer-events-auto relative w-full max-w-5xl bg-[#07100c]/95 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/80 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-950 bg-[#050c09]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                VERTICAL MONITOR · CYBERSECURITY ENGINE
              </div>
              <h2 className="text-lg font-bold text-white font-display">Offensive Security & Network Telemetry</h2>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-950 transition-colors"
            title="Close Terminal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-emerald-950/80 bg-[#040907] overflow-x-auto">
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              setActiveTab('sniffer');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'sniffer'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Packet Sniffer</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              setActiveTab('matrix');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Offensive Matrix</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              setActiveTab('certs');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'certs'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Accreditations</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              setActiveTab('research');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'research'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Research Whitepapers</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Live Packet Sniffer */}
          {activeTab === 'sniffer' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundEngine.playKeyClick();
                      setIsSniffing(!isSniffing);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                      isSniffing
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {isSniffing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isSniffing ? 'Pause Capture' : 'Resume Capture'}</span>
                  </button>
                  <span className="text-xs font-mono text-slate-400">
                    Interface: eth0 [Promiscuous Mode]
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Filter packets (e.g. TCP, 9090, XDP)..."
                    className="px-3 py-1 text-xs font-mono bg-emerald-950/40 border border-emerald-900 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Packet Stream Table */}
              <div className="bg-[#040806] border border-emerald-950 rounded-xl overflow-hidden font-mono text-xs">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-emerald-950/40 text-emerald-400 border-b border-emerald-950 font-bold">
                  <span className="col-span-2">TIME</span>
                  <span className="col-span-3">SOURCE</span>
                  <span className="col-span-3">DESTINATION</span>
                  <span className="col-span-2">PROTOCOL</span>
                  <span className="col-span-2">LENGTH</span>
                </div>
                <div className="max-h-[260px] overflow-y-auto divide-y divide-emerald-950/40">
                  {filteredPackets.map((pkt) => (
                    <button
                      key={pkt.id}
                      onClick={() => {
                        soundEngine.playKeyClick();
                        setSelectedPacket(pkt);
                      }}
                      className={`w-full grid grid-cols-12 gap-2 px-4 py-2 text-left hover:bg-emerald-950/30 transition-colors ${
                        pkt.flagged ? 'text-amber-300 bg-amber-950/20' : 'text-slate-300'
                      } ${selectedPacket?.id === pkt.id ? 'bg-emerald-950/60 font-semibold' : ''}`}
                    >
                      <span className="col-span-2 text-slate-500">{pkt.timestamp}</span>
                      <span className="col-span-3 truncate">{pkt.source}</span>
                      <span className="col-span-3 truncate">{pkt.dest}</span>
                      <span className="col-span-2 text-emerald-400">{pkt.protocol}</span>
                      <span className="col-span-2 text-slate-400">{pkt.length} B</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Packet Inspector */}
              {selectedPacket && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/60 space-y-2">
                  <div className="text-xs font-mono text-emerald-400 font-semibold uppercase">
                    Packet Payload Analysis [{selectedPacket.id}]
                  </div>
                  <div className="text-xs font-mono text-slate-300">{selectedPacket.info}</div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Checksum: 0x8a9f [VALID] · TTL: 64 · Flags: [DF] · Window Size: 65535
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Offensive Matrix */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider">
                CTF & Offensive Security Competency Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { domain: 'Binary Exploitation (Pwn)', desc: 'Glibc 2.31-2.38 heap internals, tcache poison, House of Force, return-oriented programming (ROP), ret2libc, SROP.' },
                  { domain: 'Reverse Engineering', desc: 'x86_64, ARM64, MIPS assembly analysis. Deobfuscation of OLLVM control-flow flattening using angr and Ghidra symbolic execution.' },
                  { domain: 'Cryptography & PQC', desc: 'Lattice-based cryptography (Kyber/Dilithium), fault injection attacks on curve Edwards25519, Bleichenbacher padding oracle attacks.' },
                  { domain: 'Web & Protocol Security', desc: 'Blind time-based SQLi, SSRF through DNS rebinding, prototype pollution, OAuth misconfigurations, WebSocket race conditions.' },
                  { domain: 'Kernel & Mobile', desc: 'Linux eBPF verification escape, Android Binder IPC intent spoofing, SELinux policy bypassing, rootless runtime hooking via Frida.' },
                  { domain: 'Offensive Automation', desc: 'Custom exploit development in Python3/Pwntools, Dockerized tournament isolation, automated fuzzing harnesses with AFL++.' },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 space-y-1">
                    <div className="text-xs font-mono text-emerald-400 font-bold">{item.domain}</div>
                    <p className="text-xs font-mono text-slate-300 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Accreditations */}
          {activeTab === 'certs' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider">
                Industry Certifications & Verified Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CERTIFICATIONS.map((cert) => (
                  <div key={cert.name} className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-900/60 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-mono text-emerald-400 font-semibold mb-1">{cert.badgeCode}</div>
                      <h4 className="text-sm font-bold text-white">{cert.name}</h4>
                      <p className="text-xs text-slate-400 mt-1">Issued by {cert.issuer} · {cert.year}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-emerald-950/60 flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>ID: {cert.verificationId}</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Research Whitepapers */}
          {activeTab === 'research' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider">
                Low-Level Security Publications & Research Notes
              </h3>
              <div className="space-y-3">
                {[
                  {
                    title: 'Mitigating Dynamic Intent Interception in Android Binder IPC via eBPF Syscall Monitors',
                    date: '2025.12',
                    pages: '14 pages',
                    summary: 'Explores how attaching low-overhead eBPF probes directly to binder_transaction syscalls detects malicious third-party apps hijacking unexported BroadcastReceivers before framework delivery.'
                  },
                  {
                    title: 'Constant-Time Vectorized Polynomial Multiplication for ML-KEM on ARM Cortex-A78',
                    date: '2025.06',
                    pages: '19 pages',
                    summary: 'Details an optimized Number Theoretic Transform (NTT) implementation utilizing ARM NEON intrinsics, eliminating microarchitectural cache timing side-channels during key decapsulation.'
                  },
                  {
                    title: 'Bypassing Anti-Debugging Heuristics in Obfuscated Android Native Shared Libraries',
                    date: '2024.11',
                    pages: '11 pages',
                    summary: 'Case study demonstrating dynamic memory patching of /proc/self/status TracerPid checks and in-memory decryption of AES keys without triggering OLLVM integrity traps.'
                  }
                ].map((paper, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
                      <span>{paper.date}</span>
                      <span>{paper.pages}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100">{paper.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-mono">{paper.summary}</p>
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
