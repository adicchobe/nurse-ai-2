
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface RecorderProps {
  onRecordingComplete: (text: string) => void;
  onStart?: () => void;
  disabled?: boolean;
}

const MAX_RECORDING_SECONDS = 10;

const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, onStart, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [timeLeft, setTimeLeft] = useState(MAX_RECORDING_SECONDS);
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");
  const currentInterimRef = useRef<string>("");
  const isIntentRecordingRef = useRef<boolean>(false);
  const timeLeftRef = useRef<number>(MAX_RECORDING_SECONDS);
  
  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }, []);

  const handleFinalSubmission = useCallback(() => {
    const result = (finalTranscriptRef.current + " " + currentInterimRef.current).trim();
    setIsRecording(false);
    setInterimText("");
    cleanup();

    if (result) {
      onRecordingComplete(result);
      setIsProcessing(true);
    } else {
      setIsProcessing(false);
    }
  }, [onRecordingComplete, cleanup]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'de-DE';

    recognition.onstart = () => {
      console.log("Recognition session started");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      if (final) finalTranscriptRef.current += final;
      currentInterimRef.current = interim;
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Error:", event.error);
      if (event.error !== 'no-speech') {
        isIntentRecordingRef.current = false;
        setIsRecording(false);
        cleanup();
      }
    };

    recognition.onend = () => {
      // Logic for auto-restart (to beat the 4s cutoff) vs final stop
      if (isIntentRecordingRef.current && timeLeftRef.current > 0) {
        try {
          recognition.start();
        } catch (e) {
          console.warn("Recognition restart attempt ignored - already running");
        }
      } else {
        handleFinalSubmission();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isIntentRecordingRef.current = false;
      recognition.abort();
      cleanup();
    };
  }, [handleFinalSubmission, cleanup]);

  const toggleRecording = () => {
    if (isRecording) {
      // Manual Stop
      isIntentRecordingRef.current = false;
      recognitionRef.current?.stop();
    } else {
      // Start Session
      onStart?.();
      finalTranscriptRef.current = "";
      currentInterimRef.current = "";
      setInterimText("");
      setTimeLeft(MAX_RECORDING_SECONDS);
      timeLeftRef.current = MAX_RECORDING_SECONDS;
      
      isIntentRecordingRef.current = true;
      setIsRecording(true);
      setIsProcessing(false);

      // 1. Timer Interval for UI
      intervalRef.current = setInterval(() => {
        timeLeftRef.current -= 1;
        setTimeLeft(timeLeftRef.current);
        if (timeLeftRef.current <= 0) {
          isIntentRecordingRef.current = false;
          recognitionRef.current?.stop();
          cleanup();
        }
      }, 1000);

      // 2. Hard Safety Stop
      timerRef.current = setTimeout(() => {
        isIntentRecordingRef.current = false;
        recognitionRef.current?.stop();
        cleanup();
      }, MAX_RECORDING_SECONDS * 1000);

      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Mic start failed:", e);
        setIsRecording(false);
        isIntentRecordingRef.current = false;
        cleanup();
      }
    }
  };

  useEffect(() => {
    if (!disabled) setIsProcessing(false);
  }, [disabled]);

  return (
    <div className="flex flex-col items-center justify-center w-full py-6">
      <div className="h-16 w-full max-w-xs mb-4 text-center px-4 flex flex-col items-center justify-center">
        {isRecording && (
          <div className="animate-[fadeInUp_0.2s_ease-out]">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">
                Recording: {timeLeft}s Left
              </span>
            </div>
            <p className="text-sm font-medium text-slate-400 italic truncate max-w-[280px]">
              {interimText || (finalTranscriptRef.current ? "..." : "Listening...")}
            </p>
          </div>
        )}
      </div>

      <div className="relative">
        {(isRecording || isProcessing) && (
          <div className={`absolute inset-[-8px] rounded-full border-2 ${
            isProcessing ? 'border-sky-200 animate-pulse' : 'border-rose-400 animate-[ping_2s_infinite]'
          }`} />
        )}
        <button
          onClick={toggleRecording}
          disabled={disabled || isProcessing}
          className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all transform active:scale-90 shadow-2xl ${
            isRecording 
              ? 'bg-rose-500 text-white' 
              : isProcessing 
                ? 'bg-slate-100 text-slate-300'
                : 'bg-sky-500 text-white hover:bg-sky-600'
          } ${(disabled || isProcessing) && !isRecording ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {isRecording ? (
            <div className="w-8 h-8 bg-white rounded-lg shadow-inner" />
          ) : isProcessing ? (
            <svg className="w-10 h-10 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>
      
      <span className={`mt-6 text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${
        isRecording ? 'text-rose-600' : isProcessing ? 'text-slate-400' : 'text-slate-500'
      }`}>
        {isRecording ? 'Tap to Submit' : isProcessing ? 'Clinical AI Working...' : 'Tap Mic to Respond'}
      </span>
    </div>
  );
};

export default Recorder;
