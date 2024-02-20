"use client";
import { useCompletion } from "ai/react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader } from "lucide-react";

export default function AiHelpCenter() {
  const {
    completion,
    input,
    setInput,
    stop,
    isLoading,
    handleInputChange,
    handleSubmit,
  } = useCompletion({
    api: "/api/openai/completion",
    onFinish: (response) => {
      //console.log(response, "response");
      toast.success("Response received");
      setInput("");
    },
    onError: (error) => {
      toast.error("Error: no API key found");
    },
  });

  //console.log(input, "input");

  return (
    <div className="mx-auto w-full h-full p-20 flex flex-col items-center justify-center gap-5 overflow-auto">
      <div className="flex items-start w-2/3">
        <form onSubmit={handleSubmit} className="w-full px-10">
          <div>
            <div>
              <input
                className="w-full  bottom-0 border border-gray-300 rounded p-2 shadow-xl"
                value={input}
                placeholder="Napište Váš dotaz ..."
                onChange={handleInputChange}
              />
            </div>
            <div className="flex gap-2 justify-end pt-5">
              <Button type="button" onClick={stop} variant={"destructive"}>
                Stop
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader className="animate-spin" /> : "Submit"}
              </Button>
            </div>
          </div>
        </form>
      </div>
      <div className=" h-full w-2/3 px-10 ">
        <div className="my-6">{completion}</div>
      </div>
    </div>
  );
}
