import { version } from "@/package.json";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getProductName, VENSAI_BRAND } from "@/lib/brand/vensai";
import { LoginComponent } from "./components/LoginComponent";

const SignInPage = async () => {
  const product = getProductName();

  return (
    <main
      className="flex min-h-0 flex-1 flex-col text-white"
      style={{ backgroundColor: VENSAI_BRAND.colors.navy }}
    >
      <div className="flex flex-1 flex-col items-center px-6 pb-16 pt-16 sm:pt-24">
        <BrandLogo size="lg" subtitle="tagline" className="mb-10" />
        <p className="mb-2 text-center text-sm font-medium uppercase tracking-[0.2em] text-sky-400/90">
          Sign in
        </p>
        <h1 className="mb-12 max-w-lg text-center text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
          {product}
        </h1>
        <LoginComponent />
      </div>
      <footer className="flex flex-col gap-2 border-t border-slate-800 px-6 py-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {VENSAI_BRAND.companyName} · v{version}
        </span>
        <span>
          Powered by <strong className="text-slate-300">{VENSAI_BRAND.legalName}</strong> · Built
          with Next.js
        </span>
      </footer>
    </main>
  );
};

export default SignInPage;
