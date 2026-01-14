
import React, { useState, useRef, useEffect } from 'react';

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
  const isIntentRecording = useRef<boolean>(false);
  // Fix: Replaced NodeJS.Timeout with any for browser environment compatibility
  const timerRef = useRef<any>(null);
  // Fix: Replaced NodeJS.Timeout with any for browser environment compatibility
  const countdownIntervalRef = useRef<any>(null);

  const stopAllTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    timerRef.current = null;
    countdownIntervalRef.current = null;
  };

  const forceStopRecording = () => {
    isIntentRecording.current = false;
    stopAllTimers();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'de-DE';

    recognition.onstart = () => {
      console.log("Speech engine active");
      setIsProcessing(false);
    };

    recognition.onresult = (event: any) => {
      let currentInterim = "";
      let newFinal = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal += transcript + " ";
        } else {
          currentInterim += transcript;
        }
      }

      if (newFinal) {
        finalTranscriptRef.current += newFinal;
      }
      setInterimText(currentInterim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      if (event.error === 'network' || event.error === 'not-allowed') {
        isIntentRecording.current = false;
        setIsRecording(false);
        stopAllTimers();
      }
    };

    recognition.onend = () => {
      // If user still wants to record AND we haven't hit the 10s limit, restart
      if (isIntentRecording.current && timeLeft > 0) {
        console.log("Engine paused, restarting to reach intent...");
        try {
          recognition.start();
        } catch (e) {
          console.error("Restart failed:", e);
          setIsRecording(false);
          isIntentRecording.current = false;
        }
      } else {
        // User manually stopped or 10s limit reached
        const totalResult = (finalTranscriptRef.current + " " + interimText).trim();
        setIsRecording(false);
        setInterimText("");
        stopAllTimers();
        
        if (totalResult) {
          onRecordingComplete(totalResult);
          setIsProcessing(true);
        } else {
          setIsProcessing(false);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      forceStopRecording();
    };
  }, [onRecordingComplete, interimText, timeLeft]);

  const toggleRecording = () => {
    if (isRecording) {
      forceStopRecording();
    } else {
      // Reset and Start
      onStart?.();
      finalTranscriptRef.current = "";
      setInterimText("");
      setTimeLeft(MAX_RECORDING_SECONDS);
      isIntentRecording.current = true;
      setIsRecording(true);

      // Start Countdown
      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            forceStopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Hard Limit Safety Timeout
      timerRef.current = setTimeout(() => {
        forceStopRecording();
      }, MAX_RECORDING_SECONDS * 1000);

      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Start error:", e);
        setIsRecording(false);
        isIntentRecording.current = false;
        stopAllTimers();
      }
    }
  };

  useEffect(() => {
    if (!disabled) setIsProcessing(false);
  }, [disabled]);

  return (
    <div className="flex flex-col items-center justify-center w-full py-6">
      {/* Live Preview & Safety Timer */}
      <div className="h-14 w-full max-w-xs mb-4 text-center px-4 flex flex-col items-center justify-center">
        {isRecording && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                Auto-Stop in {timeLeft}s
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 italic interim-text">
              {interimText || (finalTranscriptRef.current ? "..." : "Speaking...")}
            </p>
          </>
        )}
      </div>

      <div className="relative">
        {(isRecording || isProcessing) && (
          <div className={`absolute inset-0 rounded-full border-4 ${
            isProcessing ? 'border-sky-200 animate-pulse' : 'border-rose-400 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]'
          }`} />
        )}
        <button
          onClick={toggleRecording}
          disabled={disabled || isProcessing}
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-xl ${
            isRecording 
              ? 'bg-rose-500 text-white shadow-rose-200' 
              : isProcessing 
                ? 'bg-slate-200 text-slate-400'
                : 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-200'
          } ${(disabled || isProcessing) && !isRecording ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {isRecording ? (
            <div className="w-8 h-8 bg-white rounded-sm shadow-inner" />
          ) : isProcessing ? (
            <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>
      
      <span className={`mt-4 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
        isRecording ? 'text-rose-600' : isProcessing ? 'text-slate-400' : 'text-slate-400'
      }`}>
        {isRecording ? 'Tap to Submit Now' : isProcessing ? 'Clinical Processing...' : 'Tap to Respond'}
      </span>
    </div>
  );
};

export default Recorder;
