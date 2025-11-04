import { GoogleGenAI } from "@google/genai";
import { TimeEntry } from "../types.ts";

// Obtener API_KEY del entorno global (window)
const API_KEY =
  (window as any)?.process?.env?.API_KEY ||
  "AIzaSyD2FS-gDuf7TYquc6Crb24dlpom5gZhQng"; // Valor por defecto opcional

if (!API_KEY) {
  throw new Error("API_KEY is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h > 0 ? `${h}h` : "", m > 0 ? `${m}m` : "", s > 0 ? `${s}s` : ""]
    .filter(Boolean)
    .join(" ");
}

export async function generateTimeSummary(entries: TimeEntry[]): Promise<string> {
  if (entries.length === 0) {
    return "No time entries to analyze. Clock in and out to generate a summary.";
  }

  const formattedEntries = entries
    .map((e) => `- Activity: ${e.activity}, Duration: ${formatDuration(e.duration)}`)
    .join("\n");

  const prompt = `
    As a productivity analyst, review the following time log and provide a concise, insightful summary.
    - Highlight the activity that took the most time.
    - Calculate the total time worked.
    - Offer one observation or piece of advice based on the work distribution.
    Keep the summary brief and encouraging.

    Time Log:
    ${formattedEntries}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating summary with Gemini API:", error);
    return "An error occurred while generating the summary. Please check the console for details.";
  }
}
