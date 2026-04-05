import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { UpdateProduct } from "./schema";

type Product = { id: string; name: string };

export type InputType = z.infer<typeof UpdateProduct>;
export type ReturnType = ActionState<InputType, Product>;
