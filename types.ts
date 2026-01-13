
export enum Screen {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  SIMULATION = 'SIMULATION',
  REPORT = 'REPORT'
}

export interface Scenario {
  id: string;
  title: string;
  patientName: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  hook: string;
  icon: string;
  goal: string;
}

export interface Feedback {
  score_grammar: number;
  score_politeness: number;
  score_medical: number;
  critique: string;
  better_phrase: string;
}

export interface ChatMessage {
  role: 'nurse' | 'patient';
  text: string;
  audio?: string; // base64 pcm
  feedback?: Feedback;
}

export interface SimulationState {
  scenario: Scenario | null;
  turns: number;
  history: ChatMessage[];
  isEnding: boolean;
}
