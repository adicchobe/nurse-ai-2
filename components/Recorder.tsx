
import React, { useState, useRef, useEffect } from 'react';

interface RecorderProps {
  onRecordingComplete: (text: string) => void;
  disabled?: boolean;
}

const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'de-DE'; // German for the user's input

      recognitionRef.current.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        onRecordingComplete(result);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [onRecordingComplete]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full py-4">
      <button
        onClick={toggleRecording}
        disabled={disabled}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 ${
          isRecording 
            ? 'bg-rose-500 text-white recording-pulse' 
            : 'bg-sky-500 text-white hover:bg-sky-600 shadow-lg'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isRecording ? (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>
      <span className="mt-3 text-sm font-semibold text-slate-500 animate-pulse">
        {isRecording ? 'Listening...' : 'Tap to Respond'}
      </span>
    </div>
  );
};

export default Recorder;
