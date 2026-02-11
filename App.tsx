
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
  
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.history, isLoading]);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const startScenario = (scenario: Scenario) => {
    initAudio();
    setState({
      scenario,
      turns: 0,
      history: [{ role: 'patient', text: `Guten Tag. Ich bin ${scenario.patientName}. Wie kann ich Ihnen heute helfen?` }],
      isEnding: false
    });
    setScreen(Screen.SIMULATION);
  };

  const handleUserResponse = async (text: string) => {
    if (!state.scenario || state.turns >= MAX_TURNS || isLoading) return;

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
      setError("Clinical systems busy. Please repeat your instruction.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const playPcm = async (base64: string) => {
    try {
      initAudio();
      const ctx = audioCtxRef.current!;
      
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.warn("Audio playback failed:", e);
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
            <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">CareLingo</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Clinical Language Standard v2.0</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setScreen(Screen.DASHBOARD); }} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-4">
            <input 
              type="password" 
              placeholder="Shift Passcode" 
              className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-sky-100 outline-none transition-all font-bold text-center"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg">
              Check-In
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (screen === Screen.DASHBOARD) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 max-w-2xl mx-auto">
        <header className="py-8 flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Shift Assignments</h2>
            <p className="text-slate-400 text-sm font-medium">Select a patient for clinical simulation</p>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">🏥</div>
        </header>

        <div className="grid gap-4">
          {SCENARIOS.map((scenario) => (
            <button 
              key={scenario.id} 
              onClick={() => startScenario(scenario)}
              className="w-full group bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-sky-500 hover:shadow-xl hover:shadow-sky-100 transition-all text-left flex items-start gap-6 relative"
            >
              <div className="text-4xl">{scenario.icon}</div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                   <h3 className="text-lg font-black text-slate-800">{scenario.patientName}</h3>
                   <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{scenario.difficulty}</span>
                </div>
                <p className="text-slate-500 text-sm font-medium italic">"{scenario.hook}"</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === Screen.REPORT) {
    const totalTurns = state.history.filter(m => m.role === 'nurse').length;
    const highUrgencyCount = state.history.filter(m => m.feedback?.urgency === 'High').length;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 text-center space-y-8">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-inner">📄</div>
          <h2 className="text-3xl font-black text-slate-900">Clinical Handover Done</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'SBAR Interactions', val: totalTurns },
              { label: 'Critical Events', val: highUrgencyCount }
            ].map(s => (
              <div key={s.label} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-lg font-black text-slate-800">{s.val}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100">
             <div className="text-xs font-black text-sky-600 uppercase mb-1 tracking-widest">Readiness Status</div>
             <div className="text-sm font-bold text-slate-800">Standardized Medical Dialect Applied</div>
          </div>
          <button 
            onClick={() => setScreen(Screen.DASHBOARD)}
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all"
          >
            Finalize Shift Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <header className="bg-white border-b-2 border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl shadow-inner">{state.scenario?.icon}</div>
          <div>
            <h3 className="font-black text-slate-900 leading-none">{state.scenario?.patientName}</h3>
            <p className="text-[9px] text-sky-500 uppercase font-black tracking-widest mt-1.5">{state.scenario?.goal}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[...Array(MAX_TURNS)].map((_, i) => (
            <div key={i} className={`w-3 h-1.5 rounded-full transition-all duration-500 ${i < state.turns ? 'bg-sky-500' : 'bg-slate-200'}`} />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {state.history.map((msg, idx) => (
          <div key={idx} className="space-y-4">
            <div className={`flex ${msg.role === 'nurse' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-5 py-3 rounded-3xl animate-[fadeInUp_0.3s_ease-out] ${
                msg.role === 'nurse' 
                  ? 'bg-sky-500 text-white rounded-tr-none shadow-lg shadow-sky-100' 
                  : 'bg-white text-slate-800 border-2 border-slate-100 rounded-tl-none'
              }`}>
                <p className="text-sm font-bold">{msg.text}</p>
              </div>
            </div>
            {msg.feedback && <FeedbackCard feedback={msg.feedback} />}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border-2 border-slate-100 px-5 py-4 rounded-3xl rounded-tl-none flex gap-1 animate-pulse">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
            </div>
          </div>
        )}
        {error && <div className="text-center text-rose-500 text-xs font-bold uppercase">{error}</div>}
        <div ref={chatEndRef} />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t-2 border-slate-100 px-4 py-3">
        <div className="max-w-md mx-auto">
          {state.isEnding ? (
            <button 
              onClick={() => setScreen(Screen.REPORT)}
              className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl"
            >
              Sign Clinical Report
            </button>
          ) : (
            <Recorder onRecordingComplete={handleUserResponse} onStart={initAudio} disabled={isLoading} />
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
