import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { TimeEntry } from '../types';

// FIX: Switched to the real Gemini API for generating time summaries.
/**
 * Generates a summary of time entries using the Google GenAI API.
 * @param entries - The list of time entries to summarize.
 * @returns A promise that resolves to an AI-generated string summary.
 */
export async function generateTimeSummary(entries: TimeEntry[]): Promise<string> {
  // Do not proceed if there are no entries to summarize.
  if (!entries || entries.length === 0) {
    return Promise.resolve("No time entries available to generate a summary.");
  }

  // Always use the latest API key from environment variables.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Format the time entries into a string for the model prompt.
  const entriesString = entries
    .map(e => `- ${e.activity}: ${Math.round(e.duration / 60)} minutes`)
    .join('\n');

  const prompt = `Based on the following time log, provide a brief, friendly summary of the work completed. Highlight the main activities and total time spent. The log is:\n${entriesString}`;
  
  try {
    // FIX: Using gemini-3-flash-preview as recommended for basic text tasks.
    // Call the Gemini API to generate content.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    // Extract and return the text from the response.
    return response.text || "Summary unavailable.";
  } catch (error) {
    console.error("Error generating time summary with Gemini API:", error);
    // Return a user-friendly error message.
    return "Failed to generate AI summary. Please check the API configuration and try again.";
  }
}