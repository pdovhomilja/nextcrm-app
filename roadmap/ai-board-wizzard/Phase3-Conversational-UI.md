# AI Board Wizard: Phase 3 - Conversational UI Implementation

**Objective:** Build the user-facing dialog for the AI Board Wizard, including the conversational chat interface for the goal refinement process.

**Prerequisites:** None. This frontend work can be done in parallel with the backend phases, using mock data until the backend is ready.

## 1. Rationale

A high-quality user interface is critical for the success of the conversational refinement feature. The UI needs to feel intuitive, responsive, and guide the user through the process of clarifying their goal with the AI. This phase focuses exclusively on building these frontend components.

## 2. Step-by-Step Implementation Guide

### Step 2.1: Create the Wizard Trigger Button

This is the entry point for the user.

1.  **Create a new file** at `app/(app)/[cid]/tasks/_components/ai-board-wizard-button.tsx`.
2.  **Implement the button component**. This component will manage the open/closed state of the main wizard dialog.

    ```tsx
    // in app/(app)/[cid]/tasks/_components/ai-board-wizard-button.tsx
    'use client';

    import { useState } from 'react';
    import { Button } from '@/components/ui/button';
    import { Sparkles } from 'lucide-react';
    import { AiBoardWizardDialog } from './ai-board-wizard-dialog';

    export function AiBoardWizardButton() {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <>
          <Button onClick={() => setIsOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Board Wizard
          </Button>
          <AiBoardWizardDialog isOpen={isOpen} onOpenChange={setIsOpen} />
        </>
      );
    }
    ```

3.  **Integrate the button** into the main tasks page header, likely within `app/(app)/[cid]/tasks/page.tsx` or a shared header component.

### Step 2.2: Build the Main Dialog Component

This component will orchestrate the entire frontend experience.

1.  **Create a new file** at `app/(app)/[cid]/tasks/_components/ai-board-wizard-dialog.tsx`.
2.  **Set up the component structure**. It will use `shadcn/ui`'s `Dialog` component and manage the overall state of the wizard.

    ```tsx
    // in app/(app)/[cid]/tasks/_components/ai-board-wizard-dialog.tsx
    'use client';

    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
    import { useAiBoardWizard } from './use-ai-board-wizard';

    export function AiBoardWizardDialog({ isOpen, onOpenChange }) {
      const wizard = useAiBoardWizard({ onOpenChange });

      return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>AI Board Wizard</DialogTitle>
              <DialogDescription>
                Let's create a detailed project plan from your idea.
              </DialogDescription>
            </DialogHeader>
            
            {wizard.step === 'initial' && <InitialStepForm wizard={wizard} />}
            {wizard.step === 'refining' && <RefinementChatInterface wizard={wizard} />}
            {wizard.step === 'final_brief' && <FinalBriefView wizard={wizard} />}

          </DialogContent>
        </Dialog>
      );
    }
    ```

### Step 2.3: Implement the Logic Hook (`useAiBoardWizard`)

Separating the logic into a custom hook keeps the UI component clean. This is the most critical part of the UI implementation.

1.  **Create a new file** at `app/(app)/[cid]/tasks/_components/use-ai-board-wizard.ts`.
2.  **Define the hook**. It will manage state and handle communication with the backend.

    ```typescript
    // in app/(app)/[cid]/tasks/_components/use-ai-board-wizard.ts
    import { useState, useEffect } from 'react';
    import { useForm } from 'react-hook-form';
    import { refineGoalConversation, RefinementResult } from '@/actions/tasks/refine-goal-conversation';
    import { createBoardFromAi } from '@/actions/tasks/create-board-from-ai';
    import { toast } from 'sonner';

    interface Message {
      id: string;
      role: 'user' | 'assistant';
      content: string;
    }

    export function useAiBoardWizard({ onOpenChange }) {
      const [step, setStep] = useState('initial');
      const [messages, setMessages] = useState<Message[]>([]);
      const [finalBrief, setFinalBrief] = useState('');
      const [isPending, setIsPending] = useState(false);

      const form = useForm({ defaultValues: { goal: '', role: '' } });

      // Reset state when the dialog is closed
      useEffect(() => {
        if (!onOpenChange) {
          setStep('initial');
          setMessages([]);
          setFinalBrief('');
          form.reset();
        }
      }, [onOpenChange, form]);

      const processAssistantResponse = (response: RefinementResult) => {
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: response.content }]);
        if (response.isFinalBrief) {
          setFinalBrief(response.content);
          setStep('final_brief');
        }
      };

      const handleInitialSubmit = async (data) => {
        setIsPending(true);
        const initialMessage: Message = { id: Date.now().toString(), role: 'user', content: `My goal is: "${data.goal}". My role is: "${data.role}".` };
        setMessages([initialMessage]);
        setStep('refining');
        try {
          const response = await refineGoalConversation({ messages: [initialMessage] });
          processAssistantResponse(response);
        } catch (e) {
          toast.error('An error occurred during refinement.');
          setStep('initial');
        }
        setIsPending(false);
      };

      const handleSendMessage = async (messageContent: string) => {
        setIsPending(true);
        const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content: messageContent };
        const newMessages = [...messages, newUserMessage];
        setMessages(newMessages);
        try {
          const response = await refineGoalConversation({ messages: newMessages });
          processAssistantResponse(response);
        } catch (e) {
          toast.error('An error occurred during refinement.');
        }
        setIsPending(false);
      };

      const handleAcceptBrief = async () => {
        setIsPending(true);
        toast.info('Board generation has started! We will notify you upon completion.');
        try {
          await createBoardFromAi({ refinedPrompt: finalBrief, role: form.getValues('role') });
          onOpenChange(false); // Close dialog on success
        } catch (e) {
          toast.error('Failed to start board generation.');
        }
        setIsPending(false);
      };

      return {
        step, messages, finalBrief, isPending, form,
        handleInitialSubmit: form.handleSubmit(handleInitialSubmit),
        handleSendMessage,
        handleAcceptBrief,
      };
    }
    ```

### Step 2.4: Build the Child Components

Create the components for each step of the wizard, which will be rendered inside `AiBoardWizardDialog`.

1.  **`InitialStepForm`**: A simple form with `Input` (for goal) and `Select` (for role) using `react-hook-form` and `shadcn/ui` components. On submit, it calls the `handleInitialSubmit` function passed in its props.
2.  **`RefinementChatInterface`**: This component will:
    -   Render the `messages` array in a scrollable view.
    -   Display a `ChatInput` component for the user to type replies, which calls `handleSendMessage` on submit.
    -   Show a loading indicator (e.g., a spinner) when `isPending` is true.
3.  **`FinalBriefView`**: This component will:
    -   Display the `finalBrief` text in a formatted block (e.g., inside a `Card` or `blockquote`).
    -   Show the "Accept & Generate Board" button, which calls `handleAcceptBrief` on click. This button should be disabled when `isPending` is true.

## 3. Verification

-   Confirm the "AI Board Wizard" button appears and opens the dialog.
-   Test the initial form submission. The UI should transition to the 'refining' step and display the first assistant message.
-   Test the back-and-forth chat flow, ensuring user and assistant messages appear correctly.
-   Verify the UI transitions to the 'final_brief' step when the AI proposes the brief.
-   Test the final "Accept & Generate Board" button and confirm that the correct toast message appears and the dialog closes.
-   Ensure all loading states (`isPending`) are handled gracefully, disabling forms and buttons as needed.