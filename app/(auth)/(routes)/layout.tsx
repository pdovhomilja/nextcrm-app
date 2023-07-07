import Footer from "@/app/(routes)/components/Footer";
import "@/app/globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = {
  title: "NextCRM - Sign in",
  description: "",
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col justify-center items-center h-screen w-full">
      <div className="flex justify-end w-full p-5">
        <ThemeToggle />
      </div>
      <div className="flex items-center h-full "> {children}</div>
      <Footer />
    </div>
  );
};

export default AuthLayout;
