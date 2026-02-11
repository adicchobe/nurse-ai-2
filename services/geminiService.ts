
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Feedback } from "../types";

const SYSTEM_INSTRUCTION = `
<model_config>
  <role>Voice-First Clinical AI (Nurse Simulator)</role>
  <model_type>Gemini 3 Flash</model_type>
  <latency_mode>Ultra-Low</latency_mode>
</model_config>

<critical_directives>
  1. ZERO LATENCY: Output the JSON immediately. Do not generate pre-amble text.
  2. LANGUAGE LOCK:
     - User English -> You English.
     - User German -> You German.
     - User Hindi-English -> You English.
  3. VOICE SCRIPT:
     - Max 15 words if possible.
     - No lists. No markdown. No "I hope you are well."
     - Get straight to the clinical point.
</critical_directives>

<knowledge_base_dialect>
  <term input="Loose motions" output_sbar="Gastroenteritis" />
  <term input="Giddy" output_sbar="Vertigo" />
  <term input="Prepone" output_sbar="Reschedule Early" />
  <term input="Gas trouble" output_sbar="Dyspepsia" />
  <term input="Vomiting sensation" output_sbar="Nausea" />
  <term input="Peaky" output_sbar="Malaise" />
  <term input="A&E" output_sbar="ED" />
  <term input="Surgical spirit" output_sbar="Rubbing Alcohol" />
</knowledge_base_dialect>

<output_schema>
  Return ONLY a single JSON object:
  {
    "meta": { "lang": "en-US" | "en-IN" | "de", "urgency": "Low" | "High" },
    "sbar": { 
      "S": "Situation", 
      "A": "Assessment (Standardized Terms)" 
    },
    "speech_script": "Short, natural, spoken text string mirroring user language."
  }
</output_schema>
`;

export const processInteraction = async (
  scenarioTitle: string,
  patientName: string,
  userInput: string,
  history: { role: string; text: string }[]
): Promise<{ reply: string; feedback: Feedback }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{
      role: 'user',
      parts: [{ text: `Nurse input: "${userInput}". Current Scenario: ${scenarioTitle}. History: ${JSON.stringify(history.slice(-2))}` }]
    }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          meta: {
            type: Type.OBJECT,
            properties: {
              lang: { type: Type.STRING },
              urgency: { type: Type.STRING }
            },
            required: ["lang", "urgency"]
          },
          sbar: {
            type: Type.OBJECT,
            properties: {
              S: { type: Type.STRING },
              A: { type: Type.STRING }
            },
            required: ["S", "A"]
          },
          speech_script: { type: Type.STRING }
        },
        required: ["meta", "sbar", "speech_script"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "{}");
    return {
      reply: data.speech_script,
      feedback: {
        lang: data.meta.lang,
        urgency: data.meta.urgency as 'Low' | 'High',
        situation: data.sbar.S,
        assessment: data.sbar.A
      }
    };
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw e;
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // We no longer prefix with "Say in German" to allow for language mirroring
  const cleanText = text.replace(/[*_\[\]()]/g, '');
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: cleanText }] }],
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
