import { experimental_useOptimistic as useOptimistic } from "react";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import {
  crm_Opportunities,
  crm_Opportunities_Sales_Stages,
} from "@prisma/client";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

interface CRMKanbanProps {
  salesStages: crm_Opportunities_Sales_Stages[];
  opportunities: crm_Opportunities[];
}

const CRMKanbanServer = ({ salesStages, opportunities }: CRMKanbanProps) => {
  const [optimisticOpportunities, updateOptimisticOpportunities] =
    useOptimistic(opportunities, (state) => [...state]);

  return (
    <div>
      <pre>{JSON.stringify(optimisticOpportunities, null, 2)}</pre>
    </div>
  );
};

export default CRMKanbanServer;
