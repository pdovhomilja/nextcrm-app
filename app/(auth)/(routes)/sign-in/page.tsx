import UserAuthForm from "@/components/UserAuthForm";
import { LoginComponent } from "./components/LoginComponent";

const SignInPage = () => {
  /*   return (
    <div className="flex text-3xl text-black gap-2">
      <div className="space-x-2">
        <UserAuthForm />
      </div>
    </div>
  ); */
  return (
    <div>
      <div className="py-10">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Welcome to NextCRM
        </h1>
      </div>
      <LoginComponent />
    </div>
  );
};

export default SignInPage;
