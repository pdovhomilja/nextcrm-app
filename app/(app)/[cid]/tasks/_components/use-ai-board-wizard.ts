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

export function useAiBoardWizard({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState('initial');
  const [messages, setMessages] = useState<Message[]>([]);
  const [finalBrief, setFinalBrief] = useState('');
  const [isPending, setIsPending] = useState(false);

  const form = useForm({ defaultValues: { goal: '', role: '', language: 'English' } });

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

  const handleInitialSubmit = async (data: { goal: string; role: string; language: string }) => {
    setIsPending(true);
    const initialMessage: Message = { id: Date.now().toString(), role: 'user', content: `My goal is: "${data.goal}". My role is: "${data.role}".` };
    setMessages([initialMessage]);
    setStep('refining');
    try {
      const response = await refineGoalConversation({ messages: [initialMessage], language: data.language });
      processAssistantResponse(response);
    } catch {
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
      const response = await refineGoalConversation({ messages: newMessages, language: form.getValues('language') });
      processAssistantResponse(response);
    } catch {
      toast.error('An error occurred during refinement.');
    }
    setIsPending(false);
  };

  const handleAcceptBrief = async () => {
    setIsPending(true);
    toast.info('Board generation has started! We will notify you upon completion.');
    try {
      await createBoardFromAi({ refinedPrompt: finalBrief, role: form.getValues('role'), language: form.getValues('language') });
      onOpenChange(false); // Close dialog on success
    } catch {
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