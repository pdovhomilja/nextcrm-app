import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { UpdateOrganization } from "./schema";

type Message = {
  name: string;
};

export type InputType = z.infer<typeof UpdateOrganization>;
export type ReturnType = ActionState<InputType, Message>;
