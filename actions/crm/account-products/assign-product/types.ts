import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { AssignProduct } from "./schema";

type Assignment = { id: string };

export type InputType = z.infer<typeof AssignProduct>;
export type ReturnType = ActionState<InputType, Assignment>;
