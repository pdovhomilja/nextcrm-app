import "@/app/globals.css";

export const metadata = {
  title: "NextCRM - Sign in",
  description: "",
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex justify-center items-center h-screen w-full">
      {children}
    </div>
  );
};

export default AuthLayout;
