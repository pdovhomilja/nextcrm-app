import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { DeleteContract } from "./schema";

type Message = { id: string };

export type InputType = z.infer<typeof DeleteContract>;
export type ReturnType = ActionState<InputType, Message>;
