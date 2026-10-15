/** Default Kanban columns for new projects and the "Scrum" board template. */
export const SCRUM_BOARD_SECTIONS = [
  "Backlog",
  "To Do",
  "In Progress",
  "Review",
  "Done",
] as const;

export type BoardTemplateId = "scrum";

export function sectionsForTemplate(template: BoardTemplateId): readonly string[] {
  if (template === "scrum") return SCRUM_BOARD_SECTIONS;
  return SCRUM_BOARD_SECTIONS;
}
