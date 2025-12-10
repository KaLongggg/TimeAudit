import { GoogleGenAI } from "@google/genai";
import { TimeEntry, Project, Task, Timesheet } from "../types";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing from environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateWeeklySummary = async (
  entries: TimeEntry[],
  projects: Project[],
  tasks: Task[]
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI Service Unavailable: Missing API Key.";

  // Enrich data for the prompt
  const enrichedData = entries.map(e => {
    const proj = projects.find(p => p.id === e.projectId)?.name || 'Unknown Project';
    const tsk = tasks.find(t => t.id === e.taskId)?.name || 'Unknown Task';
    const total = e.hours.reduce((a, b) => a + b, 0);
    return `${proj} - ${tsk}: ${total} hours. Notes: ${e.notes}`;
  }).join('\n');

  const prompt = `
    You are a professional assistant. 
    Based on the following timesheet entries for this week, write a concise, professional weekly status report suitable for a manager.
    Highlight key achievements and time distribution.
    
    Data:
    ${enrichedData}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating summary. Please check your API key.";
  }
};

export const analyzeTeamProductivity = async (
  timesheets: Timesheet[],
  projects: Project[]
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI Service Unavailable: Missing API Key.";

  const dataSummary = timesheets.map(ts => {
    return `Timesheet ID: ${ts.id}, Status: ${ts.status}, Total Hours: ${ts.totalHours}, Entries: ${ts.entries.length}`;
  }).join('\n');

  const prompt = `
    Analyze the following team timesheet data. 
    Provide insights on:
    1. Overall team capacity utilization.
    2. Potential burnout risks (employees with very high hours, though specific names are not provided here).
    3. Suggestions for resource balancing.
    
    Data Summary:
    ${dataSummary}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error performing analysis.";
  }
};
