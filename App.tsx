
import React, { useState, useEffect, useRef } from 'react';
import { Screen, Scenario, SimulationState, ChatMessage, Feedback } from './types';
import { SCENARIOS, MAX_TURNS } from './constants';
import { processInteraction, generateSpeech } from './services/geminiService';
import Recorder from './components/Recorder';
import FeedbackCard from './components/FeedbackCard';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>(Screen.LOGIN);
  const [password, setPassword] = useState('');
  const [state, setState] = useState<SimulationState>({
    scenario: null,
    turns: 0,
    history: [],
    isEnding: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.history, isLoading]);

  const startScenario = (scenario: Scenario) => {
    setState({
      scenario,
      turns: 0,
      history: [{ role: 'patient', text: `Guten Tag. Ich bin ${scenario.patientName}.` }],
      isEnding: false
    });
    setScreen(Screen.SIMULATION);
  };

  const handleUserResponse = async (text: string) => {
    if (!state.scenario || state.turns >= MAX_TURNS) return;

    setIsLoading(true);
    setError(null);

    try {
      const historyForAi = state.history.map(m => ({ role: m.role, text: m.text }));
      const { reply, feedback } = await processInteraction(
        state.scenario.title,
        state.scenario.patientName,
        text,
        historyForAi
      );

      const audioBase64 = await generateSpeech(reply);

      setState(prev => {
        const newTurns = prev.turns + 1;
        const updatedHistory: ChatMessage[] = [
          ...prev.history,
          { role: 'nurse', text, feedback },
          { role: 'patient', text: reply, audio: audioBase64 }
        ];
        return {
          ...prev,
          turns: newTurns,
          history: updatedHistory,
          isEnding: newTurns >= MAX_TURNS
        };
      });

      await playPcm(audioBase64);
    } catch (err) {
      setError("System connection interrupted. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const playPcm = async (base64: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  if (screen === Screen.LOGIN) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-['Inter']">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-sky-500 text-white rounded-[2rem] shadow-2xl shadow-sky-200 transform -rotate-6">
            <span className="text-4xl">🏥</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">CareLingo</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">The Clinical Standard v2.0</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setScreen(Screen.DASHBOARD); }} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-4">
            <input 
              type="password" 
              placeholder="Shift ID / Passcode" 
              className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-sky-100 outline-none transition-all font-bold text-center"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 hover:-translate-y-1 transition-all active:scale-95 shadow-lg">
              Start Shift
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (screen === Screen.DASHBOARD) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 max-w-2xl mx-auto flex flex-col">
        <header className="py-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Patient Board</h2>
            <p className="text-slate-400 text-sm font-medium">Ready for your simulation rounds?</p>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">🩺</div>
        </header>

        <div className="space-y-4">
          {SCENARIOS.map((scenario) => (
            <button 
              key={scenario.id} 
              onClick={() => startScenario(scenario)}
              className="w-full group bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-sky-500 hover:shadow-xl hover:shadow-sky-100 hover:-translate-y-1 transition-all text-left flex items-start gap-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                <span className="text-5xl">{scenario.icon}</span>
              </div>
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full border ${
                    scenario.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    scenario.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    {scenario.difficulty}
                  </span>
                  <h3 className="text-lg font-black text-slate-800">{scenario.title}</h3>
                </div>
                <p className="text-slate-900 font-bold">{scenario.patientName}</p>
                <p className="text-slate-500 text-sm leading-relaxed max-w-[80%] italic">"{scenario.hook}"</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === Screen.REPORT) {
    // Correctly reference Feedback type for scoring calculations
    const scores = state.history.filter(m => !!m.feedback).map(m => m.feedback!);
    const avg = (key: keyof Feedback) => scores.length ? (scores.reduce((a, b) => a + (b[key] as number), 0) / scores.length).toFixed(1) : "0";

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 text-center space-y-8">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-inner">🏆</div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900">Shift Complete</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">End-of-Shift Analytics</p>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Grammar', score: avg('score_grammar'), color: 'bg-sky-500' },
              { label: 'Politeness', score: avg('score_politeness'), color: 'bg-emerald-500' },
              { label: 'Clinical Accuracy', score: avg('score_medical'), color: 'bg-rose-500' }
            ].map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>{s.label}</span>
                  <span>{s.score}/10</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} transition-all duration-1000`} style={{ width: `${Number(s.score) * 10}%` }} />
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setScreen(Screen.DASHBOARD)}
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl active:scale-95"
          >
            Finalize & Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-['Inter']">
      <header className="bg-white border-b-2 border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-slate-100">
            {state.scenario?.icon}
          </div>
          <div>
            <h3 className="font-black text-slate-900 leading-none">{state.scenario?.patientName}</h3>
            <p className="text-[10px] text-sky-500 uppercase font-black tracking-widest mt-1.5 flex items-center gap-1">
              <span className="w-1 h-1 bg-sky-500 rounded-full animate-pulse" />
              {state.scenario?.goal}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Shift Progress</div>
          <div className="flex gap-1.5">
            {[...Array(MAX_TURNS)].map((_, i) => (
              <div 
                key={i} 
                className={`w-4 h-1.5 rounded-full transition-all duration-500 ${i < state.turns ? 'bg-sky-500 shadow-sm shadow-sky-200' : 'bg-slate-200'}`} 
              />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        {state.history.map((msg, idx) => (
          <div key={idx} className="space-y-6">
            <div className={`flex ${msg.role === 'nurse' ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-[85%] px-5 py-4 rounded-[1.75rem] shadow-sm border-2 animate-[fadeInUp_0.4s_ease-out] ${
                msg.role === 'nurse' 
                  ? 'bg-sky-500 text-white border-sky-400 rounded-tr-none' 
                  : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
              }`}>
                <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
              </div>
            </div>
            {msg.feedback && <FeedbackCard feedback={msg.feedback} />}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border-2 border-slate-100 px-5 py-4 rounded-3xl rounded-tl-none flex gap-1">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        {error && (
          <div className="bg-rose-50 text-rose-500 text-[10px] font-black uppercase text-center py-2 px-4 rounded-full border border-rose-100">
            ⚠️ {error}
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t-2 border-slate-100 p-6 z-50">
        <div className="max-w-md mx-auto">
          {state.isEnding ? (
            <button 
              onClick={() => setScreen(Screen.REPORT)}
              className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95"
            >
              Prepare Clinical Report
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          ) : (
            <Recorder 
              onRecordingComplete={handleUserResponse} 
              disabled={isLoading}
            />
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
