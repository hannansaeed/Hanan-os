import React, { useState } from 'react';
import { CTF_CHALLENGES } from '../../data/portfolioData';
import { CTFChallenge } from '../../types';
import { soundEngine } from '../../audio/soundEngine';
import { X, Flag, Code2, Check, ShieldAlert, Award, Copy, CheckCircle } from 'lucide-react';

interface CTFWallModalProps {
  onClose: () => void;
}

export const CTFWallModal: React.FC<CTFWallModalProps> = ({ onClose }) => {
  const [selectedChallenge, setSelectedChallenge] = useState<CTFChallenge>(CTF_CHALLENGES[0]);
  const [userFlagInput, setUserFlagInput] = useState('');
  const [flagStatus, setFlagStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleVerifyFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFlagInput.trim()) return;

    if (userFlagInput.trim() === selectedChallenge.flagFormat) {
      setFlagStatus('valid');
      soundEngine.playChirp('success');
    } else {
      setFlagStatus('invalid');
      soundEngine.playChirp('alert');
    }
  };

  const copyExploit = () => {
    soundEngine.playKeyClick();
    navigator.clipboard.writeText(selectedChallenge.exploitScriptSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#090b14] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/40 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#060810]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                CTF RESEARCH WALL · PINNED EVIDENCE
              </div>
              <h2 className="text-lg font-bold text-white font-display">Vulnerability Writeups & Exploitation PoCs</h2>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Lab Wall (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Challenge Selection Row */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800/80 bg-[#05070e] overflow-x-auto">
          {CTF_CHALLENGES.map((ch) => {
            const isSel = ch.id === selectedChallenge.id;
            return (
              <button
                key={ch.id}
                onClick={() => {
                  soundEngine.playKeyClick();
                  setSelectedChallenge(ch);
                  setFlagStatus('idle');
                  setUserFlagInput('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
                  isSel
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <span>{ch.title}</span>
                <span className="text-[10px] text-cyan-400">[{ch.points} pts]</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Challenge Headline */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
                <span>{selectedChallenge.event}</span>
                <span>·</span>
                <span>{selectedChallenge.solvedDate}</span>
                <span>·</span>
                <span className="text-emerald-400">{selectedChallenge.difficulty}</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight font-display">{selectedChallenge.title}</h1>
              <p className="text-sm font-mono text-cyan-300/90 mt-1">{selectedChallenge.vulnerability}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-right">
                <div className="text-[10px] font-mono text-cyan-400 uppercase">Points Awarded</div>
                <div className="text-xl font-bold font-mono text-white">{selectedChallenge.points} PTS</div>
              </div>
            </div>
          </div>

          {/* Overview & Methodology */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider">
              Vulnerability Overview & Attack Vector
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">{selectedChallenge.overview}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {selectedChallenge.writeupSummary.map((step, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex gap-3 text-xs font-mono text-slate-300">
                  <span className="text-cyan-400 font-bold">0{idx + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exploit PoC Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>Exploit Script Proof-of-Concept</span>
              </h3>
              <button
                onClick={copyExploit}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-cyan-400 hover:border-cyan-500 transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied to Clipboard' : 'Copy PoC'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#04060c] border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
              {selectedChallenge.exploitScriptSnippet}
            </pre>
          </div>

          {/* Flag Submission Challenge Simulator */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-cyan-400 font-bold uppercase flex items-center gap-2">
                <Flag className="w-4 h-4" />
                <span>Interactive Flag Verification Simulator</span>
              </div>
              <button
                onClick={() => setUserFlagInput(selectedChallenge.flagFormat)}
                className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 underline"
              >
                Autofill Valid Flag
              </button>
            </div>

            <form onSubmit={handleVerifyFlag} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={userFlagInput}
                onChange={(e) => {
                  setUserFlagInput(e.target.value);
                  setFlagStatus('idle');
                }}
                placeholder="Enter flag (e.g. flag{...} or HTB{...})"
                className="flex-1 px-4 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-semibold transition-colors"
              >
                Submit Flag
              </button>
            </form>

            {flagStatus === 'valid' && (
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 pt-1">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>[FLAG ACCEPTED] Congratulations! Challenge points verified into CTF vault.</span>
              </div>
            )}
            {flagStatus === 'invalid' && (
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 pt-1">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>[INCORRECT HASH] Verification failed. Check flag formatting or use 'Autofill'.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
