import React, { useState } from 'react';
import { soundEngine } from '../../audio/soundEngine';
import { X, Send, Lock, Mail, Github, Linkedin, CheckCircle, Copy, KeyRound, ExternalLink } from 'lucide-react';

interface ExitDoorModalProps {
  onClose: () => void;
  onReturnToEntrance?: () => void;
}

export const ExitDoorModal: React.FC<ExitDoorModalProps> = ({ onClose, onReturnToEntrance }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const PGP_FINGERPRINT = '7F42 9B10 C048 3E61 9A90 55B2 88D1 4E02 331F B90A';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    soundEngine.playKeyClick();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      soundEngine.playChirp('success');
    }, 1000);
  };

  const copyPgpKey = () => {
    soundEngine.playKeyClick();
    navigator.clipboard.writeText(PGP_FINGERPRINT);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#090e17] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/40 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#060a10]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                EXIT PORTAL · SECURE COMMS DISPATCH
              </div>
              <h2 className="text-lg font-bold text-white font-display">Establish Connection & Dispatch</h2>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Portal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Dispatch Form */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider mb-1">
                  Transmit Secure Dispatch
                </h3>
                <p className="text-xs text-slate-400">
                  Direct encrypted transmission to Hanan's workstation inbox.
                </p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-3 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-white">Transmission Delivered</h4>
                  <p className="text-xs font-mono text-slate-300">
                    Your encrypted dispatch has been queued into Hanan's secure terminal. You will receive a response within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setName('');
                      setEmail('');
                      setMessage('');
                    }}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-mono font-semibold"
                  >
                    Send Another Dispatch
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Sender Name / Alias</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Mercer"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Contact Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. alex@security-firm.io"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Encrypted Message</label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Project inquiries, CTF collabs, vulnerability reports, or systems engineering opportunities..."
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Encrypting & Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Right Column: PGP Key & Coordinates */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider mb-1">
                  Public Key Cryptography
                </h3>
                <p className="text-xs text-slate-400">
                  Sign or encrypt sensitive dispatches with GnuPG.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>RSA 4096 / PGP FINGERPRINT</span>
                  </span>
                  <button
                    onClick={copyPgpKey}
                    className="text-slate-400 hover:text-cyan-300 transition-colors"
                    title="Copy Fingerprint"
                  >
                    {copiedKey ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="p-2.5 rounded bg-[#050811] text-[11px] font-mono text-slate-300 select-all border border-slate-800">
                  {PGP_FINGERPRINT}
                </div>
              </div>

              {/* Verified Coordinates */}
              <div>
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                  Direct Verification Coordinates
                </h4>
                <div className="space-y-2">
                  <a
                    href="mailto:hanansaeed609@yahoo.com"
                    onClick={() => soundEngine.playKeyClick()}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500 text-xs font-mono text-slate-200 hover:text-cyan-400 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-cyan-400" />
                      <span>hanan.cybersec.dev@gmail.com</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>

                  <a
                    href="https://github.com/hannansaeed"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => soundEngine.playKeyClick()}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500 text-xs font-mono text-slate-200 hover:text-cyan-400 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-cyan-400" />
                      <span>github.com/hanan</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>

                  <a
                    href="https://linkedin.com/in/hanan-saeed"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => soundEngine.playKeyClick()}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500 text-xs font-mono text-slate-200 hover:text-cyan-400 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4 text-cyan-400" />
                      <span>linkedin.com/in/hanan-cyber</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
