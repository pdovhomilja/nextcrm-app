import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const CustomerDashboardPage = async () => {
  const session = await getServerSession(authOptions);

  return (
    <div className="h-full">
      <div className="py-10">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Welcome, {session?.user?.name}
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          This is your customer dashboard. Here you can view your vehicles, service history, and other information.
        </p>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-bold">Quick Links</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href="/customer-portal/vehicles"
            className="rounded-lg border bg-card text-card-foreground shadow-sm"
          >
            <div className="p-6">
              <h3 className="text-lg font-medium">My Vehicles</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                View and manage your registered vehicles.
              </p>
            </div>
          </a>
          <a
            href="/customer-portal/service-history"
            className="rounded-lg border bg-card text-card-foreground shadow-sm"
          >
            <div className="p-6">
              <h3 className="text-lg font-medium">Service History</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                View your complete service history.
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
