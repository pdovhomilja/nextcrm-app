import { ReactNode } from "react";

const H2Title = ({ children }: { children: ReactNode }) => {
  return (
    <h2 className="scroll-m-20 border-b py-5 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
      {children}
    </h2>
  );
};

export default H2Title;
