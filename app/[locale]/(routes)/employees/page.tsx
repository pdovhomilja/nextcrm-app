import { Suspense } from "react";

import SuspenseLoading from "@/components/loadings/suspense";

import Container from "../components/ui/Container";
import EmployeesView from "./components/EmployeesView";

import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getEmployee } from "@/actions/get-employee";

const EmployeePage = async () => {
  const crmData = await getAllCrmData();
  const employee = await getEmployee();

  return (
    <Container
      title="Employees"
      description={"Everything you need to know about your Employees"}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <EmployeesView crmData={crmData} data={employee} />
      </Suspense>
    </Container>
  );
};

export default EmployeePage;