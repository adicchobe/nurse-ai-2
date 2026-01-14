
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Feedback } from "../types";

const SYSTEM_INSTRUCTION = `
You are a dual-engine medical simulation brain for migrating nurses in Germany.

Engine A (Patient): 
Act as the patient. Respond naturally to the user.
CONSTRAINT: Max 20 words. Speak only German. No stage directions like *coughs*.

Engine B (Grader): 
Analyze the user's German medical communication.
Evaluate:
1. Grammar (1-10)
2. Politeness (1-10)
3. Medical Accuracy (1-10)
4. Critique (Short, actionable advice in English)
5. Better Phrase (Professional native-level German alternative)

Output format must be STRICT JSON:
{
  "patient_reply": "German response",
  "feedback": {
    "score_grammar": Number,
    "score_politeness": Number,
    "score_medical": Number,
    "critique": "English string",
    "better_phrase": "German string"
  }
}
`;

export const processInteraction = async (
  scenarioTitle: string,
  patientName: string,
  userInput: string,
  history: { role: string; text: string }[]
): Promise<{ reply: string; feedback: Feedback }> => {
  // Initialize inside the function to ensure the latest API key is used from environment variables
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{
      role: 'user',
      parts: [{ text: `Scenario: ${scenarioTitle}. Patient: ${patientName}. Nurse says: "${userInput}". Context: ${JSON.stringify(history.slice(-3))}` }]
    }],
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

  try {
    const data = JSON.parse(response.text || "{}");
    return {
      reply: data.patient_reply,
      feedback: data.feedback
    };
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw e;
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanText = text.replace(/[*_\[\]()]/g, '');
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly in German: ${cleanText}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }
        }
      }
    }
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio generation failed");
  return base64Audio;
};
