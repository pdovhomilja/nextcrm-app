import { getNotions } from "@/actions/get-notions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LightbulbIcon } from "lucide-react";

const NotionsBox = async () => {
  const notions = await getNotions();

  return (
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
  );
};

export default NotionsBox;
