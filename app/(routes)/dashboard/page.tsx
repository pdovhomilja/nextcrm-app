import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

const DashboardPage = async () => {
  const session = await getServerSession(authOptions);
  return (
    <div>
      <Heading title="Dashboard" description="Your dashboard" />
      <Separator />
    </div>
  );
};

export default DashboardPage;
