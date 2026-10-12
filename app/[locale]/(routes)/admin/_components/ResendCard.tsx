import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getResendKeyStatus } from "@/lib/resend";

import { Input } from "@/components/ui/input";
import { setResendKey } from "@/actions/admin/system/set-resend-key";

const ResendCard = async () => {
  const resend_key = await getResendKeyStatus();

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
          <p>ENV API key: {resend_key.envKey ?? "not enabled"}</p>
          <p>Legacy DB key: {resend_key.dbKey ?? "not enabled"}</p>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <form action={setResendKey}>
          <div>
            <input type="hidden" name="id" value={resend_key.id} />
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
