import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { CreateNewContract } from "./schema";

type Message = { title: string };

export type InputType = z.infer<typeof CreateNewContract>;
export type ReturnType = ActionState<InputType, Message>;
