"use client";

import {
  useEffect,
  experimental_useOptimistic as useOptimistic,
  useState,
} from "react";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import {
  crm_Opportunities,
  crm_Opportunities_Sales_Stages,
} from "@prisma/client";
import { DotsHorizontalIcon, PlusCircledIcon } from "@radix-ui/react-icons";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

import { format } from "date-fns";
import LoadingModal from "@/components/modals/loading-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CRMKanbanProps {
  salesStages: crm_Opportunities_Sales_Stages[];
  opportunities: crm_Opportunities[];
}

const CRMKanban = ({ salesStages, opportunities: data }: CRMKanbanProps) => {
  const router = useRouter();

  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [opportunities, setOpportunities] = useState(data);

  useEffect(() => {
    setOpportunities(data);
    setIsLoading(false);
  }, [data]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onDragEnd = async (result: any) => {
    setIsLoading(true);
    //Implement drag end logic
    const { destination, source, draggableId } = result;

    // If there is no destination, we just return
    if (!destination) {
      return;
    }

    // If the source and destination is the same, we return
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    try {
      const response = await axios.put(`/api/crm/opportunity/${draggableId}`, {
        source: source.droppableId,
        destination: destination.droppableId,
      });
      setOpportunities(response.data.data);
      toast({
        title: "Success",
        description: "Opportunity sale stage changed",
      });
    } catch (error) {
      console.log(error);
      toast({
        title: "Error",
        description: "Something went wrong",
      });
    } finally {
      router.refresh();
      setIsLoading(false);
    }
    // If start is the same as end, we're in the same column
  };
  const onCreateOpportunity = (stage: string) => {
    // Implement create opportunity logic
    alert(
      "Create opportunity - not implemented yet" +
        "new opps will be created in stage:" +
        stage
    );
  };

  const onThumbsUp = (opportunity: crm_Opportunities) => {
    // Implement thumbs up logic
    alert("Thumbs up - not implemented yet");
  };

  const onThumbsDown = (opportunity: crm_Opportunities) => {
    // Implement thumbs down logic
    alert("Thumbs down - not implemented yet");
  };

  // console.log(opportunities, "opportunities");

  return (
    <>
      <LoadingModal
        title="Reordering opportunities"
        description="Please wait while we reorder the opportunities"
        isOpen={isLoading}
      />
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex w-full h-full overflow-x-auto ">
          {salesStages.map((stage: any, index: number) => (
            <Droppable droppableId={stage.id} key={index}>
              {(provided) => (
                <Card
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="mx-1 w-full min-w-[300px] overflow-hidden"
                >
                  <CardTitle className="flex gap-2 p-3 justify-between">
                    <span className="text-sm font-bold">{stage.name}</span>
                    <PlusCircledIcon
                      className="w-5 h-5 cursor-pointer"
                      onClick={() => onCreateOpportunity(stage.id)}
                    />
                  </CardTitle>
                  <CardContent className="w-full h-full overflow-y-scroll">
                    {opportunities
                      .filter(
                        (opportunity: any) =>
                          opportunity.sales_stage === stage.id
                      )
                      .map((opportunity: any, index: number) => (
                        <Draggable
                          draggableId={opportunity.id}
                          index={index}
                          key={opportunity.id}
                        >
                          {(provided) => (
                            <Card
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              ref={provided.innerRef}
                              className="my-2 w-full"
                            >
                              <CardTitle className="p-2 text-sm">
                                <div className="flex justify-between p-2">
                                  <span className="font-bold">
                                    {opportunity.name}
                                  </span>
                                  <div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <DotsHorizontalIcon className="w-4 h-4 text-slate-600" />
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="w-[160px]"
                                      >
                                        <DropdownMenuItem
                                          onClick={() =>
                                            router.push(
                                              `/crm/opportunities/${opportunity.id}`
                                            )
                                          }
                                        >
                                          View
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </CardTitle>
                              <CardContent className="text-xs text-muted-foreground">
                                <div className="flex flex-col space-y-1">
                                  <div>
                                    {opportunity.description.substring(0, 200)}
                                  </div>
                                  {/*          <div>
                                  id:
                                  {opportunity.id}
                                </div> */}
                                  <div className="space-x-1">
                                    <span>Amount:</span>
                                    <span>{opportunity.budget}</span>
                                  </div>
                                  <div className="space-x-1">
                                    <span>Expected closing:</span>
                                    <span
                                      className={
                                        opportunity.close_date &&
                                        new Date(opportunity.close_date) <
                                          new Date()
                                          ? "text-red-500"
                                          : ""
                                      }
                                    >
                                      {format(
                                        opportunity.close_date
                                          ? new Date(opportunity.close_date)
                                          : new Date(),
                                        "dd/MM/yyyy"
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                              <CardFooter className="flex justify-between">
                                <div className="flex text-xs items-center gap-2">
                                  {/*         <pre>
                                    {JSON.stringify(opportunity, null, 2)}
                                  </pre> */}
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage
                                      src={
                                        opportunity.assigned_to_user.avatar
                                          ? opportunity.assigned_to_user.avatar
                                          : `${process.env.NEXT_PUBLIC_APP_URL}/images/nouser.png`
                                      }
                                    />
                                  </Avatar>
                                  <span className="text-xs ">
                                    {opportunity.assigned_to_user.name}
                                  </span>
                                </div>
                                <div className="flex space-x-2">
                                  {
                                    //Hide thumbs up and down for last sales stage
                                    stage.probability !==
                                      Math.max(
                                        ...salesStages.map(
                                          (s) => s.probability || 0
                                        )
                                      ) && (
                                      <ThumbsUp
                                        className="w-4 h-4 text-green-500"
                                        onClick={() =>
                                          onThumbsUp(opportunity.id)
                                        }
                                      />
                                    )
                                  }
                                  {stage.probability !==
                                    Math.max(
                                      ...salesStages.map(
                                        (s) => s.probability || 0
                                      )
                                    ) && (
                                    <ThumbsDown
                                      className="w-4 h-4 text-red-500"
                                      onClick={() =>
                                        onThumbsDown(opportunity.id)
                                      }
                                    />
                                  )}
                                </div>
                              </CardFooter>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </>
  );
};

export default CRMKanban;
