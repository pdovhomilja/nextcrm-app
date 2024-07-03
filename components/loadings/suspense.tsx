import React from "react";
import Image from "next/image";

type Props = {};

const SuspenseLoading = (props: Props) => {
  return (
    <div className="flex justify-center items-center w-full ">
      <div className="flex items-center p-20 space-x-5">
        <span className="border px-4 py-2 rounded-full animate-spin"><Image src="images/windroseLogo.png" alt="Windrose Logo" height={50} width={50}/></span>
        <span className="animate-pulse">Loading ...</span>
      </div>
    </div>
  );
};

export default SuspenseLoading;
