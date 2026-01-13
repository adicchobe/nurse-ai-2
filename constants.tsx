
import React from 'react';
import { Scenario } from './types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'admission',
    title: 'Patient Admission',
    patientName: 'Herr Müller',
    difficulty: 'Easy',
    hook: 'Mr. Müller has just arrived for his scheduled hip surgery. Perform the initial check-in.',
    icon: '📋',
    goal: 'Complete the intake form and assess current pain levels.'
  },
  {
    id: 'medication',
    title: 'Medication Round',
    patientName: 'Frau Schneider',
    difficulty: 'Medium',
    hook: 'Frau Schneider is skeptical about her new medication. Explain the dosage and benefits.',
    icon: '💊',
    goal: 'Clarify the medication purpose and address her concerns politely.'
  },
  {
    id: 'emergency',
    title: 'Emergency Triage',
    patientName: 'Junge Patientin',
    difficulty: 'Hard',
    hook: 'A young patient is hyperventilating in the waiting area. Act quickly to stabilize her.',
    icon: '🚨',
    goal: 'Calm the patient down and gather vital symptom information immediately.'
  }
];

export const MAX_TURNS = 5;
