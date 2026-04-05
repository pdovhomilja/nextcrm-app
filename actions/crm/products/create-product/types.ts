import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { CreateProduct } from "./schema";

type Product = { id: string; name: string };

export type InputType = z.infer<typeof CreateProduct>;
export type ReturnType = ActionState<InputType, Product>;
