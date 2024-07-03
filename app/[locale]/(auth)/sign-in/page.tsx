import { LoginComponent } from "./components/LoginComponent";

const SignInPage = async () => {
  return (
    <div className="h-full overflow-y-scroll overflow-x-hidden ">
      <div className="pt-3">
        <h1 className="scroll-m-20 px-5 mx-5 text-3xl font-extrabold tracking-tight lg:text-5xl">
          Welcome to {process.env.NEXT_PUBLIC_APP_NAME}
        </h1>
      </div>
      <div>
        <LoginComponent />
      </div>
    </div>
  );
};

export default SignInPage;
