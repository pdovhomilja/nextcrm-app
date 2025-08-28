# AI Board Wizard: Business & Technical Analysis

## 1\. Executive Summary

This document outlines the business and technical analysis for a new feature: the **AI Board Wizard**. This feature is designed to empower users by automatically generating comprehensive project boards from a simple, high-level goal description. By leveraging our new, sophisticated, toolkit-based AI agent, the wizard will create a structured board with relevant sections and actionable tasks.

The wizard's core innovation is a **conversational goal refinement process**. It engages the user in a brief, interactive dialog to transform their initial idea into a detailed, actionable project brief. Once the user approves this refined brief, the system takes over and handles the full board generation as a **robust, persistent, and asynchronous background job**. This ensures a high-quality result and a seamless user experience, with the ability to recover from failures.

The primary benefits of this feature include:

- **High-Quality Output**: The conversational refinement step ensures the AI has sufficient context, dramatically improving the relevance and quality of the generated board.
- **Enhanced User Experience & Reliability**: Blends interactive collaboration with a resilient, non-blocking background processing system.
- **Showcasing AI Collaboration**: Differentiates our platform by framing the AI as an intelligent partner that helps users think through their goals.
- **Increased Engagement**: Encourages deeper engagement by giving users ownership over the AI's final output.

## 2\. Current State Analysis

(No changes in this section)

The main boards page, located at `app/(app)/[cid]/tasks/page.tsx`, currently displays a grid of existing project boards. Users can manually create a new board by clicking the "Create Board" button, which opens a simple form to enter a name and description.

While functional, this manual process has limitations:

- It can be time-consuming and daunting for users setting up large or complex projects.
- It requires users to already have a clear idea of how to structure their project, which can be a barrier for those looking for guidance.

The project's AI agent infrastructure, located in `lib/ai/`, has recently been modernized to align with state-of-the-art agentic design patterns. This new foundation provides superior flexibility, composability, and performance, allowing us to implement the AI Board Wizard as a discrete, powerful new tool within this ecosystem.

## 3\. Proposed Feature: AI Board Wizard

### 3.1. User Flow

(No changes in this section)

1.  **Initiation**: The user clicks a new "AI Board Wizard" button located in the header of the tasks page.
2.  **Conversational Goal Refinement (Interactive Loop)**:
    a. A dialog appears with a chat-like interface. The user is prompted to describe their goal and select a role.
    b. After the user submits their initial goal (e.g., "Launch our new SaaS product"), the AI assistant analyzes it and responds with a targeted, clarifying question to gather more details (e.g., "Understood. To help me create the best plan, could you tell me what the target audience for this SaaS product is?").
    c. The user replies to the AI's question.
    d. This interactive, conversational loop continues for a few turns until the AI determines it has a clear and detailed understanding of the user's objective.
3.  **Final Brief Acceptance**:
    a. The AI ends the conversation by presenting a concise, summarized "Project Brief" based on the dialogue.
    b. The user reviews this final, AI-generated brief. They are then prompted to approve it by clicking an "Accept & Generate Board" button.
4.  **Asynchronous Generation Trigger**: Upon user acceptance, the dialog closes, and an initial toast notification appears: "Thank you! Your new board is being generated. We'll notify you when it's ready."
5.  **Background Processing**: An asynchronous background job is initiated, using the detailed, user-approved Project Brief to generate and persist the full board structure.
6.  **Completion & Notification**: Once the background job is complete, a final toast notification appears: "Your board '[Board Name]' has been created successfully!" This notification will include a link that takes the user directly to the new board.

### 3.2. UI/UX Components

(No changes in this section)

- **AI Wizard Button**: A new button in the `SiteHeader`.
- **Wizard Dialog**: A `Dialog` component containing a conversational UI.
- **Chat Interface**: Components for displaying the back-and-forth messages between the user and the AI, including a `Chat Input` for user replies.
- **Final Acceptance View**: A dedicated UI element within the dialog to display the summarized Project Brief and the final "Accept & Generate Board" button.
- **Feedback**: `Sonner` toasts for providing asynchronous feedback on the background generation process.

### 3.3. Backend & AI Integration

The architecture will be split into two distinct phases: a synchronous, interactive phase for refinement, and an asynchronous, background phase for generation.

1.  **Phase 1: Interactive Goal Refinement (Synchronous)**
    - A new server action, `refine-goal-conversation`, will manage the chat turns. It will receive the current conversation history and return the AI's next response.
    - This will leverage the `BaseAIAgent` with a system prompt that directs it to act as an expert project manager whose goal is to ask clarifying questions.

2.  **Phase 2: Asynchronous Board Generation**
    - Once the user accepts the final brief, the client will call a separate server action, `create-board-from-ai`.
    - **Persistence of Request**: This action will first create a new `AIGeneratedBoardRequest` record in the database, saving the user-approved `refinedPrompt` and setting the job `status` to `PENDING`.
    - **Job Trigger**: It will then trigger the asynchronous background job, passing the `id` of the newly created `AIGeneratedBoardRequest` record.
    - **Job Execution**: The background job will fetch the record, update its status to `PROCESSING`, run the `generateProjectBoard` tool, and finally update the status to `COMPLETED` or `FAILED` based on the outcome.

## 4\. Technical Implementation Plan

- **Frontend**:
  - `app/(app)/[cid]/tasks/_components/ai-board-wizard-dialog.tsx`: A stateful client component that manages the conversational UI and triggers the final `create-board-from-ai` action.
- **Backend**:
  - `actions/tasks/refine-goal-conversation.ts` **(New File)**: A server action to handle the synchronous, back-and-forth chat logic.
  - `actions/tasks/create-board-from-ai.ts`: This server action is now responsible for creating the `AIGeneratedBoardRequest` record in the database and then initiating the asynchronous background job.
- **Database**:
  - `prisma/schema.prisma`: The schema will be updated with the new `AIGeneratedBoardRequest` model and `AIGenerationStatus` enum to persist and track generation jobs.

## 5\. Data Model Impact

To support robust, retry-able background generation, a new model will be added to the `prisma/schema.prisma` file. This model will store the user-approved prompt and track the status of the generation job.

```prisma
// in prisma/schema.prisma

model AIGeneratedBoardRequest {
  id               String   @id @default(cuid())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  status           AIGenerationStatus @default(PENDING)
  refinedPrompt    String   @db.Text
  role             String

  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyId        String
  company          Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  generatedBoardId String?  @unique
  generatedBoard   Board?   @relation(fields: [generatedBoardId], references: [id], onDelete: SetNull)

  failureReason    String?
}

enum AIGenerationStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

## 6\. Risks & Mitigations

- **Risk**: The conversational refinement process could be tedious or frustrating for the user.
  - **Mitigation**: 1. Carefully engineer the AI's system prompt to be concise and ask only high-impact questions. 2. Limit the maximum number of clarification turns. 3. Provide a clear way for the user to bypass further questions and proceed with the information they've already provided.
- **Risk**: The asynchronous generation job could fail silently.
  - **Mitigation**: The new `AIGeneratedBoardRequest` model is the core of the mitigation strategy. By persisting the request and its status, we achieve:
    1.  **Visibility**: The system has a clear record of all pending, processing, and failed jobs.
    2.  **Retry-ability**: A failed job can be easily re-queued and run again, either automatically or manually by an administrator, using the stored `refinedPrompt`.
    3.  **Reliable User Notification**: If a job fails, its status is updated to `FAILED`, and a user notification can be reliably triggered, informing them of the issue.
- **Risk**: Without a final review of the *full board structure*, the generated board may still contain unexpected elements.
  - **Mitigation**: The primary mitigation is to ensure that the generated board is easily and quickly editable or deletable by the user after creation.

## 7\. Success Metrics

- **Feature Adoption Rate**: The percentage of new boards created using the wizard.
- **Refinement Funnel**: Metrics on the conversational step, such as the average number of turns and the percentage of users who complete the refinement process.
- **Job Reliability**: The success/failure rate of the background generation jobs, tracked via the `AIGeneratedBoardRequest` status.
- **Feature Satisfaction**: User feedback specifically on the quality of the AI's questions and the final generated board.
- **User Engagement**: The task completion rate on boards that were generated by the AI.