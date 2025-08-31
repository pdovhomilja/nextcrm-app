import { Tool } from "ai";
import { getProjectToolkit } from "./project-toolkit";
import { getTaskToolkit } from "./task-toolkit";
import { getProgressToolkit } from "./progress-toolkit";
import { getBoardWizardToolkit } from "./board-wizard-toolkit";
import { AgentContext } from "../agent-core";

// A mapping from the toolkit names used by the routing agent to the actual tool objects.
export const allToolkits: Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (context: AgentContext) => Record<string, Tool<any, any>>
> = {
  projectAnalyzer: getProjectToolkit,
  taskManager: getTaskToolkit, // Assuming taskToolkit handles creation, recommendations etc.
  reporting: getProgressToolkit, // Assuming progressToolkit handles reporting
  // The router schema includes 'userDirectory', but we haven't created a toolkit for it.
  // We can add it here when it's created.
  userDirectory: () => ({}),
  boardWizard: getBoardWizardToolkit,
};

/**
 * Retrieves a collection of tools based on a list of required toolkit names.
 * @param names The names of the required toolkits (e.g., ['projectAnalyzer', 'taskManager']).
 * @param context The agent context to pass to the toolkits.
 * @returns An object containing all the tools from the requested toolkits.
 */
export function getToolkits(
  names: (keyof typeof allToolkits)[],
  context: AgentContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, Tool<any, any>> {
  if (!names) {
    return {};
  }

  return names.reduce((acc, name) => {
    const toolkitGetter = allToolkits[name];
    if (toolkitGetter) {
      const toolkit = toolkitGetter(context);
      return { ...acc, ...toolkit };
    }
    return acc;
  }, {});
}
