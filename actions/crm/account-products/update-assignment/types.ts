import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { UpdateAssignment } from "./schema";

type Assignment = { id: string };

export type InputType = z.infer<typeof UpdateAssignment>;
export type ReturnType = ActionState<InputType, Assignment>;
