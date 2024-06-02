import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { UpdateContract } from "./schema";

type Message = {};

export type InputType = z.infer<typeof UpdateContract>;
export type ReturnType = ActionState<InputType, Message>;
