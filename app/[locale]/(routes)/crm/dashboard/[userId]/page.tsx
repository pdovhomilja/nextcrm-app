import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import React from "react";
import Container from "../../../components/ui/Container";
import { getAccountsTasks } from "@/actions/crm/account/get-tasks";
import { getUserCRMTasks } from "@/actions/crm/tasks/get-user-tasks";

const UserCRMDashboard = async () => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  const task = await getUserCRMTasks(session.user.id);

  return (
    <div>
      <Container
        title={`${session.user.name} | CRM Dashboard (in-progress) `}
        description="Your sales data in one place"
      >
        <div className="grid grid-cols-2 w-full ">
          <div className="">Calls overview</div>
          <div className="">
            <h1>Tasks in Accounts</h1>
            <pre>{JSON.stringify(task, null, 2)}</pre>
          </div>
          <div className="">Meetings overview</div>
          <div className="">
            <h1></h1>
          </div>
          <div className="">Leads overview</div>
          <div className="">
            <h1></h1>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default UserCRMDashboard;
