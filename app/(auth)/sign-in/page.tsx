import { LoginComponent } from "./components/LoginComponent";

const SignInPage = async () => {
  return (
    <div>
      <div className="py-10">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Welcome to {process.env.NEXT_PUBLIC_APP_NAME}
        </h1>
      </div>
      <LoginComponent />
    </div>
  );
};

export default SignInPage;
