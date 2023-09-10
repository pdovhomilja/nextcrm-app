import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LightbulbIcon } from "lucide-react";

const LoadingBox = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium bg-gray-200 text-gray-200 animate-pulse ">
          Notions
        </CardTitle>
        <LightbulbIcon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-medium text-gray-200 bg-gray-200 animate-pulse ">
          Loading...
        </div>
      </CardContent>
    </Card>
  );
};

export default LoadingBox;
