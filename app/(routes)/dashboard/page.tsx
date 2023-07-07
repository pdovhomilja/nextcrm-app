import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

const DashboardPage = async () => {
  const session = await getServerSession(authOptions);
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Heading title="Dashboard" description="Your dashboard" />
      <Separator />
    </div>
  );
};

export default DashboardPage;
