import { ReactNode } from "react";

const H4Title = ({ children }: { children: ReactNode }) => {
  return (
    <h4 className="scroll-m-20 text-xl font-semibold tracking-tight py-5">
      {children}
    </h4>
  );
};

export default H4Title;
