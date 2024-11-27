import { getNotions } from "@/actions/get-notions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { LightbulbIcon } from "lucide-react";
import Link from "next/link";

const NotionsBox = async () => {
  const notions: any = await getNotions();

  if (notions.error || !notions || notions === null) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Notions</CardTitle>
          <LightbulbIcon className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            Not connected to Notion DB. Here is how to connect:{" "}
            <Link href={"/secondBrain"} className="text-blue-500">
              settings
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href={"/secondBrain"}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Notions</CardTitle>
          <LightbulbIcon className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-medium">
            {notions != null ? notions.length : "not available"}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default NotionsBox;
