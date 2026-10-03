import { LoginComponent } from "./components/LoginComponent";

const SignInPage = async () => {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-[#070d1b] text-white">
      <div className="flex flex-1 flex-col items-center px-6 pb-16 pt-24 sm:pt-32">
        <h1 className="mb-16 text-center text-5xl font-extrabold tracking-tight sm:text-6xl">
          Welcome to {process.env.NEXT_PUBLIC_APP_NAME}
        </h1>
        <LoginComponent />
      </div>
      <footer className="flex flex-col gap-2 border-t border-slate-800 px-6 py-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>VenSai CRM · v0.22.0</span>
        <span>Powered by <strong className="text-slate-300">Hari Cornucopia Tech Pvt. Ltd.</strong> · Built with Next.js</span>
      </footer>
    </main>
  );
};

export default SignInPage;
