
import React from 'react';
import { Feedback } from '../types';

interface FeedbackCardProps {
  feedback: Feedback;
}

const StatBadge: React.FC<{ label: string; value: string; color?: 'emerald' | 'amber' | 'rose' | 'sky' }> = ({ label, value, color = 'sky' }) => {
  const getColors = () => {
    switch (color) {
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'amber': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'rose': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-sky-50 text-sky-700 border-sky-100';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl border ${getColors()}`}>
      <span className="text-[9px] uppercase font-bold tracking-tighter opacity-70">{label}</span>
      <span className="text-[13px] font-black leading-none truncate w-full text-center">{value}</span>
    </div>
  );
};

const FeedbackCard: React.FC<FeedbackCardProps> = ({ feedback }) => {
  const urgencyColor = feedback.urgency === 'High' ? 'rose' : 'emerald';

  return (
    <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm animate-[fadeInUp_0.3s_ease-out] overflow-hidden relative">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500" />
      
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-slate-50 rounded-lg">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Clinical Mapping</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatBadge label="Urgency" value={feedback.urgency} color={urgencyColor} />
        <StatBadge label="Language" value={feedback.lang} color="sky" />
        <StatBadge label="SBAR" value="Active" color="emerald" />
      </div>

      <div className="space-y-4">
        <div className="bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Situation (S)</h4>
          <p className="text-sm text-slate-700 leading-relaxed italic">"{feedback.situation}"</p>
        </div>
        
        <div className="bg-sky-500 p-4 rounded-xl text-white shadow-lg shadow-sky-100">
          <h4 className="text-[10px] font-bold text-sky-200 uppercase mb-1 tracking-widest">Assessment (A)</h4>
          <p className="text-sm font-bold leading-relaxed">{feedback.assessment}</p>
        </div>
      </div>
    </div>
  );
};

export default FeedbackCard;
