import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { CreateOrganization } from "./schema";

type Message = {
  id: string;
  name: string;
  slug: string;
};

export type InputType = z.infer<typeof CreateOrganization>;
export type ReturnType = ActionState<InputType, Message>;
