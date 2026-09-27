import React, { useState } from 'react';
import { SERVER_METRICS } from '../../data/portfolioData';
import { ServerMetric } from '../../types';
import { soundEngine } from '../../audio/soundEngine';
import { X, Server, Activity, Cpu, HardDrive, RefreshCw, CheckCircle, Wifi } from 'lucide-react';

interface ServerRackModalProps {
  onClose: () => void;
}

export const ServerRackModal: React.FC<ServerRackModalProps> = ({ onClose }) => {
  const [metrics, setMetrics] = useState<ServerMetric[]>(SERVER_METRICS);
  const [restartingService, setRestartingService] = useState<string | null>(null);

  const simulatePing = (serviceName: string) => {
    soundEngine.playKeyClick();
    setRestartingService(serviceName);
    setTimeout(() => {
      setRestartingService(null);
      soundEngine.playChirp('success');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 pointer-events-none select-none animate-fade-in">
      <div className="pointer-events-auto relative w-full max-w-5xl bg-[#090b14]/95 border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-950/80 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-950 bg-[#06070d]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
            <div>
              <div className="text-xs font-mono text-indigo-400 uppercase tracking-wider">
                PRIMARY CLUSTER NODE 01 · BARE-METAL SERVER ARRAY
              </div>
              <h2 className="text-lg font-bold text-white font-display">Active Server Daemons & Sandboxes</h2>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-indigo-950 transition-colors"
            title="Close Server Rack (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Overview Dashboard Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-indigo-950/80 bg-[#05060b]">
          <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>CPU UTILIZATION</span>
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono text-indigo-300 mt-2">4.2% <span className="text-xs text-slate-500">AVG</span></div>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>MEMORY COMMIT</span>
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono text-indigo-300 mt-2">1.8 / 32 GB</div>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>XDP BANDWIDTH</span>
              <Wifi className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono text-indigo-300 mt-2">8.4M pps</div>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>GLOBAL UPTIME</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-2">99.98%</div>
          </div>
        </div>

        {/* Server Process Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider">
              Containerized Microservices & Ephemeral Daemons
            </h3>
            <span className="text-xs font-mono text-slate-400">Kernel: Linux 6.9 x86_64</span>
          </div>

          <div className="bg-[#05070e] border border-indigo-950 rounded-xl overflow-hidden font-mono text-xs">
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-indigo-950/30 text-indigo-300 border-b border-indigo-950 font-bold">
              <span className="col-span-4">DAEMON SERVICE</span>
              <span className="col-span-2">PORT / PROTOCOL</span>
              <span className="col-span-2">STATE</span>
              <span className="col-span-2">LOAD / UPTIME</span>
              <span className="col-span-2 text-right">ACTION</span>
            </div>
            <div className="divide-y divide-indigo-950/40">
              {metrics.map((svc) => (
                <div key={svc.service} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-indigo-950/20 transition-colors">
                  <div className="col-span-4 flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold text-slate-100">{svc.service}</span>
                  </div>
                  <div className="col-span-2 text-slate-400">
                    :{svc.port} <span className="text-[11px] text-slate-500">({svc.protocol})</span>
                  </div>
                  <div className="col-span-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {svc.status}
                    </span>
                  </div>
                  <div className="col-span-2 text-slate-300">
                    {svc.load} · <span className="text-slate-500">{svc.uptime}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => simulatePing(svc.service)}
                      disabled={restartingService === svc.service}
                      className="px-2.5 py-1 rounded bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-[11px] font-mono text-indigo-200 transition-colors disabled:opacity-50"
                    >
                      {restartingService === svc.service ? 'Probing...' : 'Probe Socket'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
