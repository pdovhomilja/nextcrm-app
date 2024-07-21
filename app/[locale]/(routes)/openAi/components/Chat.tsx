"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader } from "lucide-react";

export default function AiHelpCenter() {
  const [input, setInput] = useState("");
  const [completion, setCompletion] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setCompletion("");

    try {
      const response = await fetch(`/api/openai/completion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      const streamData = async () => {
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            setCompletion((prev) => prev + text);
          }
          setIsLoading(false);
          toast.success("Response received");
        }
      };

      streamData().catch((error) => {
        setIsLoading(false);
        if (error instanceof Error) {
          toast.error(`Error: ${error.message}`);
        } else {
          toast.error("Error: unable to stream response");
        }
      });
    } catch (error) {
      setIsLoading(false);
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
      } else {
        toast.error("Error: unable to submit request");
      }
    }
  };

  const stop = () => {
    setIsLoading(false);
    // Implement logic to stop streaming if needed
  };

  return (
    <div className="mx-auto w-full h-full p-20 flex flex-col items-center justify-center gap-5 overflow-auto">
      <div className="flex items-start w-2/3">
        <form onSubmit={handleSubmit} className="w-full px-10">
          <div>
            <div>
              <input
                className="w-full bottom-0 border border-gray-300 rounded p-2 shadow-xl"
                value={input}
                placeholder="Describe client situation to begin journey builder"
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
      <div className="h-full w-2/3 px-10">
        <div className="my-6">{completion}</div>
      </div>
    </div>
  );
}
