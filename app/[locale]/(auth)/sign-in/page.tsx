import { getServerSession } from "next-auth";
import { LoginComponent } from "./components/LoginComponent";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

const SignInPage = async () => {
  /*   const session = await getServerSession(authOptions);

  // If the user is authenticated, redirect to the dashboard page.
  if (session?.user) {
    redirect("/");
  } */

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
