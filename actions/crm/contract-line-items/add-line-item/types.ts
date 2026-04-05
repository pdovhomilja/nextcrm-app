import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { AddContractLineItem } from "./schema";

type LineItem = { id: string };

export type InputType = z.infer<typeof AddContractLineItem>;
export type ReturnType = ActionState<InputType, LineItem>;
