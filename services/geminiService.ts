import { TimeEntry, Project, Task, Timesheet } from "../types";

// AI Features have been removed from TimeAudit.
// This file is kept as a placeholder to avoid breaking existing imports until refactored.

export const generateWeeklySummary = async (
  entries: TimeEntry[],
  projects: Project[],
  tasks: Task[]
): Promise<string> => {
  return "";
};

export const analyzeTeamProductivity = async (
  timesheets: Timesheet[],
  projects: Project[]
): Promise<string> => {
  return "";
};