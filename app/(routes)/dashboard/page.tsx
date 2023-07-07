import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import Container from "../components/ui/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

const DashboardPage = async () => {
  const session = await getServerSession(authOptions);
  return (
    <Container title="Dashboard" description={"some desc"}>
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">{"0"}</div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

export default DashboardPage;
