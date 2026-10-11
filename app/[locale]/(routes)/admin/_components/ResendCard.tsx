import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { prismadb } from "@/lib/prisma";

import { Input } from "@/components/ui/input";
import { setResendKey } from "@/actions/admin/system/set-resend-key";

function maskConfiguredSecret(value: string | undefined | null): string {
  if (!value?.trim()) return "not enabled";
  const v = value.trim();
  if (v.length <= 8) return "configured (hidden)";
  return `configured (${v.slice(0, 2)}…${v.slice(-4)})`;
}

const ResendCard = async () => {
  const resend_key = await prismadb.systemServices.findFirst({
    where: {
      name: "resend_smtp",
    },
  });

  return (
    <Card className="min-w-[350px] max-w-[450px]">
      <CardHeader className="text-lg">
        <CardTitle>Resend.com - API Key</CardTitle>
        <CardDescription className="text-xs space-y-2">
          <p>
            Use <code className="text-[10px]">RESEND_API_KEY</code> in Vercel /{" "}
            <code className="text-[10px]">.env.local</code> only (recommended). The form below is
            legacy — not required when env is set.
          </p>
          <p>ENV API key: {maskConfiguredSecret(process.env.RESEND_API_KEY)}</p>
          <p>Legacy DB key: {maskConfiguredSecret(resend_key?.serviceKey)}</p>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <form action={setResendKey}>
          <div>
            <input type="hidden" name="id" value={resend_key?.id} />
            <Input type="text" name="serviceKey" placeholder="Your API key" />
          </div>
          <div className="flex justify-end pt-2 gap-2">
            <Button type={"reset"}>Reset</Button>
            <Button type="submit">Set Resend key</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ResendCard;
