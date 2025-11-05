import { CustomerRegisterComponent } from "./components/CustomerRegisterComponent";

const CustomerRegisterPage = async () => {
  return (
    <div className="flex flex-col w-full h-full overflow-auto p-10 space-y-5">
      <div className="">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Customer Portal Registration
        </h1>
      </div>
      <CustomerRegisterComponent />
    </div>
  );
};

export default CustomerRegisterPage;
