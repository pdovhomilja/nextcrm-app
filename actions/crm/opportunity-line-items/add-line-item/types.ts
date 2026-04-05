import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { AddOpportunityLineItem } from "./schema";

type LineItem = { id: string };

export type InputType = z.infer<typeof AddOpportunityLineItem>;
export type ReturnType = ActionState<InputType, LineItem>;
