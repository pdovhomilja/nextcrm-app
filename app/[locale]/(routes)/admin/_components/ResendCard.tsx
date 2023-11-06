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

const ResendCard = async () => {
  const setSMTP = async (formData: FormData) => {
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
          name: "resend_smtp",
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
    }
    revalidatePath("/admin");
  };

  const resend_key = await prismadb.systemServices.findFirst({
    where: {
      name: "resend_smtp",
    },
  });

  return (
    <Card className="w-1/3">
      <CardHeader className="text-lg">
        <CardTitle>Resend.com - API Key</CardTitle>
        <CardDescription>
          {/*  Here will be actual settings */}
          API key: {resend_key ? resend_key?.serviceKey : "Not set"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <form action={setSMTP}>
          <div>
            <input type="hidden" name="id" value={resend_key?.id} />
            <Input type="text" name="serviceKey" placeholder="SMTP host" />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit">Set Resend key</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ResendCard;
