
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Feedback } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are a dual-engine simulator for medical language training (German).
Target User: Migrating nurses learning German.

Engine A (Patient): Respond to the user's input naturally as the patient specified in the scenario.
CONSTRAINT: Max 20 words. No acting instructions or stage directions. Speak clearly and naturally.

Engine B (Grader): Analyze the User's input (ignore your own tone as the patient).
Evaluate:
1. Grammar (1-10)
2. Politeness (1-10)
3. Medical Accuracy (1-10)
4. Critique (Brief, actionable advice)
5. Better Phrase (How a native professional would say it)

Output strictly as JSON:
{
  "patient_reply": "String in German",
  "feedback": {
    "score_grammar": Number,
    "score_politeness": Number,
    "score_medical": Number,
    "critique": "String in English",
    "better_phrase": "String in German"
  }
}
`;

export const processInteraction = async (
  scenarioTitle: string,
  patientName: string,
  userInput: string,
  history: { role: string; text: string }[]
): Promise<{ reply: string; feedback: Feedback }> => {
  const contents = [
    {
      role: 'user',
      parts: [{ text: `Scenario: ${scenarioTitle}. Patient: ${patientName}. User says: "${userInput}". History: ${JSON.stringify(history)}` }]
    }
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          patient_reply: { type: Type.STRING },
          feedback: {
            type: Type.OBJECT,
            properties: {
              score_grammar: { type: Type.NUMBER },
              score_politeness: { type: Type.NUMBER },
              score_medical: { type: Type.NUMBER },
              critique: { type: Type.STRING },
              better_phrase: { type: Type.STRING }
            },
            required: ["score_grammar", "score_politeness", "score_medical", "critique", "better_phrase"]
          }
        },
        required: ["patient_reply", "feedback"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return {
    reply: data.patient_reply,
    feedback: data.feedback
  };
};

export const generateSpeech = async (text: string): Promise<string> => {
  // Clean text from markdown
  const cleanText = text.replace(/[*_\[\]()]/g, '');
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: cleanText }] }],
    config: {
      responseModalities: ["AUDIO" as any],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' } // Professional neutral voice
        }
      }
    }
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");
  return base64Audio;
};
