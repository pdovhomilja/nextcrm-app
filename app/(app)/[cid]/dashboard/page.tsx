import React from "react";
import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const DashboardPage = async () => {
  const session = await auth();

  return (
    <div>
      Dashboard Page
      <div>User: {session?.user?.name}</div>
      <div>
        <Link href={`/${session?.user?.cid}/tasks`}>
          <Button>Tasks</Button>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
