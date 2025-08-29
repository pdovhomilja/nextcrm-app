// in actions/tasks/create-board-from-ai.ts
'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import db from '@/lib/db';
import { getCurrentCompanyId } from '@/lib/auth-utils';
import { runBoardGenerationJob } from '@/lib/jobs/board-generation-job'; // We will create this next

const CreateBoardFromAiSchema = z.object({
  refinedPrompt: z.string().min(10, 'The project brief is too short.'),
  role: z.string(),
});

export async function createBoardFromAi(values: z.infer<typeof CreateBoardFromAiSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return { error: 'Company not found' };
  }

  const validatedFields = CreateBoardFromAiSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Invalid fields' };
  }

  const { refinedPrompt, role } = validatedFields.data;

  // 1. Persist the request to the database
  const boardRequest = await db.aIGeneratedBoardRequest.create({
    data: {
      userId: session.user.id,
      companyId,
      refinedPrompt,
      role,
      status: 'PENDING',
    },
  });

  // 2. Trigger the background job (fire-and-forget)
  // We do not `await` this call. The client gets an immediate response.
  runBoardGenerationJob({ boardRequestId: boardRequest.id });

  return { success: 'Board generation has started! We will notify you upon completion.' };
}