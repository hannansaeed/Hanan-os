import React, { useState } from 'react';
import { TIMELINE } from '../../data/portfolioData';
import { soundEngine } from '../../audio/soundEngine';
import { X, Calendar, Milestone, ArrowRight, CheckCircle2 } from 'lucide-react';

interface TimelineModalProps {
  onClose: () => void;
}

export const TimelineModal: React.FC<TimelineModalProps> = ({ onClose }) => {
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  const activeMilestone = TIMELINE.find((t) => t.year === selectedYear) || TIMELINE[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#0e0a17] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-950/40 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-950 bg-[#090610]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
            <div>
              <div className="text-xs font-mono text-purple-400 uppercase tracking-wider">
                CHRONOLOGICAL ROADMAP · CAREER WALL
              </div>
              <h2 className="text-lg font-bold text-white font-display">Systems, Cybersecurity & Spatial Journey</h2>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-purple-950 transition-colors"
            title="Close Roadmap (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Year Rail Selector */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-purple-950/80 bg-[#06040c] overflow-x-auto">
          {TIMELINE.map((item) => {
            const isSel = item.year === selectedYear;
            return (
              <button
                key={item.year}
                onClick={() => {
                  soundEngine.playKeyClick();
                  setSelectedYear(item.year);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
                  isSel
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 font-bold shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-sm font-display">{item.year}</span>
                <span className="text-[11px] text-purple-400">· {item.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="pb-4 border-b border-purple-950">
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400 mb-1">
              <span>{activeMilestone.period}</span>
              <span>·</span>
              <span>{activeMilestone.role}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-display">{activeMilestone.title}</h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">{activeMilestone.highlight}</p>
          </div>

          {/* Key Deliverables & Research */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider">
              Key Technical Milestones & Research Highlights
            </h3>
            <div className="space-y-2.5">
              {activeMilestone.details.map((detail, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <p className="text-xs font-mono text-slate-200 leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Core Competencies Acquired */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-slate-200 uppercase font-mono tracking-wider">
              Proficiencies & Toolchains Consolidated
            </h3>
            <div className="flex flex-wrap gap-2">
              {activeMilestone.skillsAcquired.map((skill) => (
                <span key={skill} className="px-3.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-900/60 text-xs font-mono text-purple-200">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
