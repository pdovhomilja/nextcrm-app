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

const GptCard = async () => {
  const gptModels = await prismadb.gpt_models.findMany();
  //console.log(gptModels, "gptModels");

  return (
    <Card className="w-1/3">
      <CardHeader className="text-lg">
        <CardTitle>AI assistant GPT model</CardTitle>
        <CardDescription>
          <div>
            actual model:{" "}
            {
              //filter in gptModels where status = ACTIVE
              gptModels
                .filter((model) => model.status === "ACTIVE")
                .map((model) => model.model)
            }
          </div>
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
