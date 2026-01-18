
import { GoogleGenAI, Modality } from "@google/genai";
import { ChatHistory, GroundingSource, AppMode } from "../types";

const ROAST_INSTRUCTION = `
You are 'buddyfor_life', a super-intelligent AI with a dual-personality.

CORE PERSONALITY:
- If the user asks complex, depressing, philosophical, or "venting" questions (e.g., "Why is life hard?", "I feel lonely", "What's the meaning of life?", "I failed my exam"):
- Respond with a comic, funny, "roast" vibe. Be witty, edgy, but supportive through humor. Make them laugh at the absurdity.
- If the user asks for pure facts, be accurate and professional.

IMAGE EDITING (Only when an image is provided):
- If the user provides an image and a request (like "add a hat", "make it retro"), perform the edit conceptually and describe the vibe in your roast.
`;

export async function sendMessageToGemini(
  prompt: string,
  history: ChatHistory[],
  mode: AppMode,
  imageData?: string
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  let model = "gemini-3-flash-preview";
  let config: any = {
    systemInstruction: ROAST_INSTRUCTION,
  };

  if (imageData) {
    model = "gemini-2.5-flash-image";
  } else if (mode === 'thinking') {
    model = "gemini-3-pro-preview";
    config.thinkingConfig = { thinkingBudget: 32768 };
  } else if (mode === 'fast') {
    model = "gemini-2.5-flash-lite-latest";
  } else {
    // Balanced/Default
    model = "gemini-3-pro-preview";
    config.tools = [{ googleSearch: {} }];
  }

  const parts: any[] = [];
  if (imageData) {
    parts.push({
      inlineData: {
        data: imageData.split(',')[1],
        mimeType: "image/jpeg"
      }
    });
  }
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        ...history,
        { role: 'user', parts }
      ],
      config: config,
    });

    let text = "";
    let sources: GroundingSource[] = [];
    let isRoast = false;

    // Handle image generation model output
    if (imageData) {
       for (const part of response.candidates?.[0].content.parts || []) {
        if (part.inlineData) {
          return {
            content: "Behold your new masterpiece. I fixed it, mostly by making it as weird as your request.",
            image: `data:image/png;base64,${part.inlineData.data}`,
            isRoast: true
          };
        } else if (part.text) {
          text += part.text;
        }
      }
    } else {
      text = response.text || "I'm buffering... much like your social skills.";
    }

    // Extract grounding sources if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      });
    }

    isRoast = text.length > 40 && !text.includes('1.') && !text.includes('Specifically');

    return {
      content: text,
      sources,
      isRoast
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
