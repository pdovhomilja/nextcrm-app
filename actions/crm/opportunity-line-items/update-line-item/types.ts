import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { UpdateOpportunityLineItem } from "./schema";

type LineItem = { id: string };

export type InputType = z.infer<typeof UpdateOpportunityLineItem>;
export type ReturnType = ActionState<InputType, LineItem>;
