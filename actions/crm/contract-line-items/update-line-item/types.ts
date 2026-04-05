import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { UpdateContractLineItem } from "./schema";

type LineItem = { id: string };

export type InputType = z.infer<typeof UpdateContractLineItem>;
export type ReturnType = ActionState<InputType, LineItem>;
