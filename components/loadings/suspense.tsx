import React from "react";

type Props = {};

const SuspenseLoading = (props: Props) => {
  return (
    <div className="flex justify-center items-center w-full ">
      <div className="p-20">
        <span className="border px-4 py-2 rounded-full animate-spin">N</span>
        <span>Loading ...</span>
      </div>
    </div>
  );
};

export default SuspenseLoading;
