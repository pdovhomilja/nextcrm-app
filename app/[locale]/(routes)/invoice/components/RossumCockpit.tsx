"use client";

import SuspenseLoading from "@/components/loadings/suspense";
import axios from "axios";
import React, { use, useEffect, useState } from "react";

type Props = {
  invoiceData: any;
};

const RossumCockpit = ({ invoiceData }: Props) => {
  const [rossumEmbbededUrl, setRossumEmbbededUrl]: any = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    axios
      .post("/api/invoice/rossum/get-rossum-embedded-url", invoiceData)
      .then((response) => {
        setRossumEmbbededUrl(response.data);
        setIsLoading(false);
      });
  }, [invoiceData]);

  if (isLoading) {
    return <SuspenseLoading />;
  }

  console.log(rossumEmbbededUrl, "rossumEmbbededUrl");
  if (!rossumEmbbededUrl) {
    return <div>Something went wrong</div>;
  }

  return (
    <div className="h-full max-h-[90%] p-5 max-w-[90%] ">
      <iframe className="w-full h-full" src={rossumEmbbededUrl.url} />
    </div>
  );
};

export default RossumCockpit;
