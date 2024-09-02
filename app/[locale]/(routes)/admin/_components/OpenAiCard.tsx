import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { z } from "zod";

import { prismadb } from "@/lib/prisma";

import { revalidatePath } from "next/cache";
import { Input } from "@/components/ui/input";
import CopyKeyComponent from "./copy-key";

const OpenAiCard = async () => {
  const setOpenAiKey = async (formData: FormData) => {
    "use server";
    const schema = z.object({
      id: z.string(),
      serviceKey: z.string(),
    });
    const parsed = schema.parse({
      id: formData.get("id"),
      serviceKey: formData.get("serviceKey"),
    });

    //console.log(parsed.id, "id");
    //console.log(parsed.serviceKey, "serviceKey");

    if (!parsed.id) {
      await prismadb.systemServices.create({
        data: {
          v: 0,
          name: "openAiKey",
          serviceKey: parsed.serviceKey,
        },
      });
      revalidatePath("/admin");
    } else {
      await prismadb.systemServices.update({
        where: {
          id: parsed.id,
        },
        data: {
          serviceKey: parsed.serviceKey,
        },
      });
      revalidatePath("/admin");
    }
  };

  const openAi_key = await prismadb.systemServices.findFirst({
    where: {
      name: "openAiKey",
    },
  });

  return (
    <Card className="min-w-[350px]  max-w-[450px]">
      <CardHeader className="text-lg">
        <CardTitle>OpenAi - API Key</CardTitle>
        <CardDescription className="text-xs overflow-hidden">
          {/*  Here will be actual settings */}
          <p>ENV API key:</p>
          <p>
            {process.env.OPENAI_API_KEY ? (
              <CopyKeyComponent
                envValue={process.env.OPENAI_API_KEY}
                message="OpenAi - API Key"
              />
            ) : (
              "not enabled"
            )}
          </p>
          <p>API key from DB:</p>
          {openAi_key?.serviceKey ? (
            <CopyKeyComponent
              keyValue={openAi_key.serviceKey}
              message="OpenAi - API Key"
            />
          ) : (
            "not enabled"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <form action={setOpenAiKey}>
          <div>
            <input type="hidden" name="id" value={openAi_key?.id} />
            <Input type="text" name="serviceKey" placeholder="Your API key" />
          </div>
          <div className="flex justify-end pt-2 gap-2">
            <Button type={"reset"}>Reset</Button>
            <Button type="submit">Set OpenAi key</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default OpenAiCard;
