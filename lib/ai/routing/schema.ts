import { z } from 'zod/v3';

export const IntentSchema = z.object({
  queryType: z.enum([
    "data_retrieval",       // Fetching information (e.g., 'get my tasks')
    "data_mutation",        // Changing data (e.g., 'create a task', 'update project status')
    "analytical_question",  // Requires analysis or insight (e.g., 'which project is behind schedule?')
    "general_conversation", // Chitchat or questions not related to data
  ]).describe('The overall category of the user\'s query.'),
  
  domain: z.enum(["tasks", "projects", "users", "metrics", "general"]).describe('The primary data domain the query pertains to.'),
  
  complexity: z.enum(["simple", "complex", "multi_step"]).describe('The estimated complexity of the query.'),
  
  requiredToolkits: z.array(z.enum(["taskManager", "projectAnalyzer", "userDirectory", "reporting"]))
    .describe('A list of specialized toolkits needed to fulfill the request.'),

  reasoningText: z.string().describe('A brief explanation of why these classifications were chosen.'),
});

export type Intent = z.infer<typeof IntentSchema>;
