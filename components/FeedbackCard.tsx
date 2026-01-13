
import React from 'react';
import { Feedback } from '../types';

interface FeedbackCardProps {
  feedback: Feedback;
}

const ScoreBadge: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const getColor = (s: number) => {
    if (s >= 8) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s >= 5) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-rose-100 text-rose-700 border-rose-200';
  };

  return (
    <div className={`px-3 py-1 rounded-full border text-xs font-bold ${getColor(score)}`}>
      {label}: {score}/10
    </div>
  );
};

const FeedbackCard: React.FC<FeedbackCardProps> = ({ feedback }) => {
  return (
    <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-hidden transform animate-[fadeInUp_0.3s_ease-out]">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <span className="text-xl">📋</span>
        <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Teacher Feedback</h3>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <ScoreBadge label="Grammar" score={feedback.score_grammar} />
        <ScoreBadge label="Politeness" score={feedback.score_politeness} />
        <ScoreBadge label="Medical" score={feedback.score_medical} />
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Critique</h4>
          <p className="text-sm text-slate-700 leading-relaxed italic">"{feedback.critique}"</p>
        </div>
        
        <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
          <h4 className="text-xs font-semibold text-sky-600 uppercase mb-1">Pro Tip</h4>
          <p className="text-sm font-medium text-sky-900 leading-relaxed">{feedback.better_phrase}</p>
        </div>
      </div>
    </div>
  );
};

export default FeedbackCard;
