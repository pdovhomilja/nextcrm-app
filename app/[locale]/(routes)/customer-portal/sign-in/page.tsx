import { CustomerLoginComponent } from "./components/CustomerLoginComponent";

const CustomerSignInPage = async () => {
  return (
    <div className="h-full">
      <div className="py-10">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Customer Portal
        </h1>
      </div>
      <div>
        <CustomerLoginComponent />
      </div>
    </div>
  );
};

export default CustomerSignInPage;
