import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import FeedbackForm from "./FeedbackForm";
import IconButton from "@/components/ui/IconButton";
import { Button } from "@/components/ui/button";
import { ChatBubbleIcon } from "@radix-ui/react-icons";

const Feedback = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={"secondary"}>
          <ChatBubbleIcon className="w-4 h-4 mr-2" />
          Feedback
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <FeedbackForm />
      </PopoverContent>
    </Popover>
  );
};

export default Feedback;
