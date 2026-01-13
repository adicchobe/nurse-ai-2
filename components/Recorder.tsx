
import React, { useState, useRef, useEffect } from 'react';

interface RecorderProps {
  onRecordingComplete: (text: string) => void;
  disabled?: boolean;
}

const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'de-DE';

      recognitionRef.current.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        if (result) onRecordingComplete(result);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = () => setIsRecording(false);
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, [onRecordingComplete]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Mic error", e);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full py-6">
      <div className="relative">
        {isRecording && (
          <div className="absolute inset-0 rounded-full border-4 border-rose-400 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
        )}
        <button
          onClick={toggleRecording}
          disabled={disabled}
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-xl ${
            isRecording 
              ? 'bg-rose-500 text-white' 
              : 'bg-sky-500 text-white hover:bg-sky-600'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {isRecording ? (
            <div className="w-8 h-8 bg-white rounded-sm" />
          ) : (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>
      <span className={`mt-4 text-xs font-bold uppercase tracking-widest transition-colors ${isRecording ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
        {isRecording ? 'Listening...' : 'Tap to Respond'}
      </span>
    </div>
  );
};

export default Recorder;
