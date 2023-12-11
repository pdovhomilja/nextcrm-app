import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { BasicView } from "./components/BasicView";
import { getEmployeesData } from "@/actions/employees/get-employees";

interface EmployeeDetailPageProps {
  params: {
    employeeId: string;
  };
}

const EmployeeViewPage = async ({ params }: EmployeeDetailPageProps) => {
  const { employeeId } = params;
  const employee: any = await getEmployeesData(employeeId);

  if (!employee) return <div>Employee not found</div>;

  return (
    <Container
      title={`Employee detail view: ${employee?.firstName} ${employee?.lastName}`}
      description={"Everything you need to know about employees"}
    >
      <div className="space-y-5">
        <BasicView data={employee} />
      </div>
    </Container>
  );
};

export default EmployeeViewPage;
