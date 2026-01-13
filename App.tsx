
import React, { useState, useEffect, useRef } from 'react';
import { Screen, Scenario, SimulationState, ChatMessage } from './types';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.history]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) setScreen(Screen.DASHBOARD);
  };

  const startScenario = (scenario: Scenario) => {
    setState({
      scenario,
      turns: 0,
      history: [{ role: 'patient', text: `Hallo, ich bin ${scenario.patientName}. Wie kann ich Ihnen helfen?` }],
      isEnding: false
    });
    setScreen(Screen.SIMULATION);
  };

  const handleUserResponse = async (text: string) => {
    if (!state.scenario || state.turns >= MAX_TURNS) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const historyForAi = state.history.map(m => ({ role: m.role, text: m.text }));
      const { reply, feedback } = await processInteraction(
        state.scenario.title,
        state.scenario.patientName,
        text,
        historyForAi
      );

      const audioBase64 = await generateSpeech(reply);

      const newUserMsg: ChatMessage = { role: 'nurse', text, feedback };
      const newPatientMsg: ChatMessage = { role: 'patient', text: reply, audio: audioBase64 };

      setState(prev => {
        const newTurns = prev.turns + 1;
        return {
          ...prev,
          turns: newTurns,
          history: [...prev.history, newUserMsg, newPatientMsg],
          isEnding: newTurns >= MAX_TURNS
        };
      });

      // Play patient audio
      const audio = new Audio(`data:audio/pcm;base64,${audioBase64}`);
      // Note: In real app we'd decode PCM as per instructions. For this demo we'll assume a wrapper or standard playback.
      // But standard browser Audio expects formats like MP3/WAV. 
      // Based on Gemini guidelines, let's use the provided decoding logic.
      await playPcm(audioBase64);

    } catch (err: any) {
      console.error(err);
      setErrorMessage("System hiccup. Please try responding again.");
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
      const frameCount = dataInt16.length;
      const buffer = audioCtx.createBuffer(1, frameCount, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i] / 32768.0;
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    } catch (e) {
      console.error("Audio playback error", e);
    }
  };

  if (screen === Screen.LOGIN) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4">📱</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">CareLingo</h1>
            <p className="text-slate-500 font-medium">The Clinical Standard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Shift Passcode</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter shift code..." 
                className="w-full h-14 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              />
            </div>
            <button className="w-full h-14 bg-sky-500 text-white rounded-xl font-bold text-lg hover:bg-sky-600 hover:-translate-y-1 transition-all shadow-lg active:scale-95">
              Start Shift
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (screen === Screen.DASHBOARD) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
        <header className="w-full max-w-2xl mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Shift Board</h2>
            <p className="text-slate-500">Pick a patient file to begin simulation</p>
          </div>
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">👩‍⚕️</div>
        </header>

        <div className="w-full max-w-2xl grid grid-cols-1 gap-6">
          {SCENARIOS.map((scenario) => (
            <button 
              key={scenario.id} 
              onClick={() => startScenario(scenario)}
              className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-left flex items-start gap-6"
            >
              <div className="text-5xl bg-slate-50 p-4 rounded-2xl group-hover:bg-sky-50 transition-colors">
                {scenario.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-slate-900">{scenario.title}</h3>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                    scenario.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
                    scenario.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {scenario.difficulty}
                  </span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-1 font-semibold">{scenario.patientName}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{scenario.hook}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === Screen.REPORT) {
    const avgScores = state.history.reduce((acc, msg) => {
      if (msg.feedback) {
        acc.grammar += msg.feedback.score_grammar;
        acc.politeness += msg.feedback.score_politeness;
        acc.medical += msg.feedback.score_medical;
        acc.count++;
      }
      return acc;
    }, { grammar: 0, politeness: 0, medical: 0, count: 0 });

    const total = avgScores.count || 1;

    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          <div className="text-center mb-8">
            <span className="text-5xl mb-4 block">📈</span>
            <h2 className="text-3xl font-bold text-slate-900">Shift Report</h2>
            <p className="text-slate-500">Performance Summary</p>
          </div>

          <div className="space-y-6 mb-8">
            {[
              { label: 'Grammar', score: avgScores.grammar / total },
              { label: 'Politeness', score: avgScores.politeness / total },
              { label: 'Medical Precision', score: avgScores.medical / total }
            ].map((stat) => (
              <div key={stat.label}>
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span>{stat.label}</span>
                  <span>{stat.score.toFixed(1)}/10</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${stat.score >= 8 ? 'bg-emerald-500' : stat.score >= 5 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${stat.score * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setScreen(Screen.DASHBOARD)}
            className="w-full h-14 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95"
          >
            Return to Shift Board
          </button>
        </div>
      </div>
    );
  }

  // Simulation Screen
  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Sticky Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-xl shadow-inner">
            {state.scenario?.icon}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 leading-none">{state.scenario?.patientName}</h3>
            <p className="text-[10px] text-sky-500 uppercase font-bold tracking-widest mt-1">Goal: {state.scenario?.goal}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Progress</div>
          <div className="flex gap-1 mt-1">
            {[...Array(MAX_TURNS)].map((_, i) => (
              <div 
                key={i} 
                className={`w-3 h-1.5 rounded-full transition-all ${i < state.turns ? 'bg-sky-500' : 'bg-slate-200'}`} 
              />
            ))}
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50/50">
        {state.history.map((msg, idx) => (
          <div key={idx} className="space-y-4">
            <div className={`flex ${msg.role === 'nurse' ? 'justify-end' : 'justify-start'} animate-[fadeInUp_0.4s_ease-out]`}>
              <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm border ${
                msg.role === 'nurse' 
                  ? 'bg-sky-500 text-white border-sky-600 rounded-tr-none' 
                  : 'bg-white text-slate-800 border-slate-200 rounded-tl-none'
              }`}>
                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
              </div>
            </div>
            {msg.feedback && <FeedbackCard feedback={msg.feedback} />}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none text-slate-400 italic text-sm">
              Patient is thinking...
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-600 text-xs text-center font-bold">
            {errorMessage}
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* Footer Cockpit */}
      <footer className="bg-white border-t border-slate-200 p-6 z-20">
        {state.isEnding ? (
          <button 
            onClick={() => setScreen(Screen.REPORT)}
            className="w-full h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            Complete Shift Report <span className="text-2xl">👉</span>
          </button>
        ) : (
          <div className="max-w-md mx-auto">
            <Recorder 
              onRecordingComplete={handleUserResponse} 
              disabled={isLoading}
            />
          </div>
        )}
      </footer>
    </div>
  );
};

export default App;
