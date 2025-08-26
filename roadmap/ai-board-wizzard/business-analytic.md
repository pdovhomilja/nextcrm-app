# AI Board Wizard: Business & Technical Analysis

## 1. Executive Summary

This document outlines the business and technical analysis for a new feature: the **AI Board Wizard**. This feature is designed to empower users by automatically generating comprehensive project boards from a simple, high-level goal description. By leveraging a sophisticated AI agent, the wizard will create a structured board with relevant sections and actionable tasks, tailored to the user's specified role.

The primary benefits of this feature include:

- **Enhanced Productivity**: Drastically reduces the time and effort required to set up new projects.
- **Improved User Onboarding**: Provides new users with a powerful, guided starting point for their work.
- **Showcasing AI Capabilities**: Differentiates our platform by integrating cutting-edge AI to solve practical user problems.
- **Increased Engagement**: Encourages deeper engagement by providing users with a clear, actionable plan to achieve their goals.

## 2. Current State Analysis

The main boards page, located at `app/(app)/[cid]/tasks/page.tsx`, currently displays a grid of existing project boards. Users can manually create a new board by clicking the "Create Board" button, which opens a simple form to enter a name and description.

While functional, this manual process has limitations:

- It can be time-consuming and daunting for users setting up large or complex projects.
- It requires users to already have a clear idea of how to structure their project, which can be a barrier for those looking for guidance.

The project's existing codebase contains a robust AI agent infrastructure located in `lib/ai/`. This includes an `agent-orchestrator.ts` and `specialized-agents.ts`, which provide a solid foundation for building the new AI-powered wizard. This existing architecture will be leveraged to accelerate development.

## 3. Proposed Feature: AI Board Wizard

### 3.1. User Flow

1.  **Initiation**: The user clicks a new "AI Board Wizard" button located in the header of the tasks page.
2.  **Goal Definition**: A popover dialog appears, presenting the first step of the wizard. The user describes their goal in natural language (e.g., "Develop a go-to-market strategy for our new SaaS product").
3.  **Contextualization**: In the second step, the user selects a role from a dropdown list (e.g., "Product Manager," "Marketing Lead," "Lead Engineer"). This context will allow the AI to generate a more relevant and tailored plan.
4.  **Generation**: Upon submission, a loading indicator appears while the AI agent processes the request.
5.  **Completion**: Once the board is generated, the user receives a success notification. The new board, populated with sections and tasks, appears in their list of boards. For an enhanced experience, the user can be automatically redirected to the newly created board.

### 3.2. UI/UX Components

The user interface will be built using the existing `shadcn/ui` component library to ensure visual consistency.

- **AI Wizard Button**: A new button, placed next to the existing "Create Board" button in the `SiteHeader`.
- **Wizard Dialog**: A multi-step form housed within a `Dialog` component. It will gracefully handle the steps and user input.
- **Form Components**: The form will utilize `Input`, `Textarea`, and `Select` components for goal and role selection. State management will be handled by `react-hook-form`.
- **Feedback**: A `Skeleton` loader or similar will indicate processing, and `Sonner` toasts will be used for success and error notifications.

### 3.3. Backend & AI Integration

The core of this feature is the new AI agent.

- A new server action will be created to handle the form submission from the wizard.
- This action will invoke the existing `AgentOrchestrator` with a new specialized agent, `boardWizardAgent`.

**`boardWizardAgent` Details:**

- **Input**: `{ goal: string, role: string, userId: string, companyId: string }`
- **Process**:
  1.  **Prompt Engineering**: The agent will construct a detailed prompt for a large language model (LLM) like Gemini 1.5 Pro or Claude 3 Opus. The prompt will instruct the model to act as an expert project planner for the given `role` and generate a comprehensive project plan based on the `goal`.
  2.  **Structured Output**: The prompt will enforce a strict JSON output schema to ensure reliable parsing. Example schema:
      ```json
      {
        "boardName": "...",
        "boardDescription": "...",
        "sections": [
          {
            "name": "Phase 1: Research",
            "tasks": [
              { "name": "Competitor Analysis", "description": "..." },
              { "name": "Market Segmentation", "description": "..." }
            ]
          }
        ]
      }
      ```
  3.  **Data Persistence**: After receiving and validating the JSON response from the LLM, the agent will use existing server actions (`createBoard`, `createBoardSection`, `createTask`) to create the corresponding records in the database.
- **Output**: The agent will return the `id` of the newly created board.

## 4. Technical Implementation Plan

- **Frontend**:
  - `app/(app)/[cid]/tasks/_components/ai-board-wizard-button.tsx`: A new client component for the button that triggers the dialog.
  - `app/(app)/[cid]/tasks/_components/ai-board-wizard-dialog.tsx`: The client component containing the multi-step form and logic for calling the server action.
- **Backend**:
  - `actions/tasks/create-board-from-ai.ts`: A new server action to orchestrate the process, from input validation to invoking the AI agent.
- **AI**:
  - `lib/ai/specialized-agents.ts`: The new `boardWizardAgent` will be defined here, containing the core logic for prompt generation, LLM interaction, and data persistence.

## 5. Data Model Impact

No changes to the existing `Prisma` schema are required. The feature will utilize the existing `Board`, `BoardSection`, and `Task` tables.

## 6. Risks & Mitigations

- **Risk**: AI-generated content may be generic or low-quality.
  - **Mitigation**: Employ sophisticated prompt engineering techniques. Use a powerful, state-of-the-art LLM. Consider adding a "review" step where users can edit the generated plan before it's saved.
- **Risk**: The AI generation process could be slow, leading to a poor user experience.
  - **Mitigation**: Implement the generation as an asynchronous background job. Notify the user via toast or email when the board is ready. Use optimistic UI updates where appropriate.
- **Risk**: High cost associated with frequent LLM API calls.
  - **Mitigation**: Implement strict usage monitoring. Introduce rate limiting or tie the feature to specific premium subscription tiers to manage costs.

## 7. Success Metrics

The success of the AI Board Wizard will be measured by:

- **Feature Adoption Rate**: The percentage of new boards created using the wizard versus the manual method.
- **User Engagement**: The task completion rate on boards that were generated by the AI.
- **User Satisfaction**: Qualitative feedback gathered through in-app surveys or a simple rating mechanism.
