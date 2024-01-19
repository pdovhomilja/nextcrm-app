import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { prismadb } from "@/lib/prisma";
import SetGptModel from "../forms/SetGptModel";

import OnTestButton from "./OnTestButton";
import { gpt_models } from "@prisma/client";

const GptCard = async () => {
  const gptModels: gpt_models[] = await prismadb.gpt_models.findMany();
  //console.log(gptModels, "gptModels");

  return (
    <Card className="min-w-[350px]  max-w-[450px]">
      <CardHeader className="text-lg">
        <CardTitle>AI assistant GPT model</CardTitle>
        <CardDescription className="text-xs">
          actual model:{" "}
          {
            //filter in gptModels where status = ACTIVE
            gptModels
              .filter((model: gpt_models) => model.status === "ACTIVE")
              .map((model: gpt_models) => model.model)
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <SetGptModel models={gptModels} />
        <OnTestButton />
      </CardContent>
    </Card>
  );
};

export default GptCard;
