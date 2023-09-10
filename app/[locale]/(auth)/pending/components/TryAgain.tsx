"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

const TryAgain = () => {
  const router = useRouter();
  return <Button onClick={() => router.refresh()}>Try again</Button>;
};

export default TryAgain;
