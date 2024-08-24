"use client";

import { useEffect, useOptimistic, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import {
  crm_Opportunities,
  crm_Opportunities_Sales_Stages,
} from "@prisma/client";

import { DotsHorizontalIcon, PlusCircledIcon } from "@radix-ui/react-icons";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import LoadingModal from "@/components/modals/loading-modal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";

import { NewOpportunityForm } from "../../opportunities/components/NewOpportunityForm";
import { set } from "cypress/types/lodash";
import { setInactiveOpportunity } from "@/actions/crm/opportunity/dashboard/set-inactive";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface CRMKanbanProps {
  salesStages: crm_Opportunities_Sales_Stages[];
  opportunities: crm_Opportunities[];
  crmData: any;
}

const CRMKanban = ({
  salesStages,
  opportunities: data,
  crmData,
}: CRMKanbanProps) => {
  const router = useRouter();

  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [selectedStage, setSelectedStage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [opportunities, setOpportunities] = useState(data);

  const { users, accounts, contacts, saleTypes, saleStages, campaigns } =
    crmData;

  useEffect(() => {
    setOpportunities(data);
    setIsLoading(false);
  }, [data]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onDragEnd = async (result: any) => {
    //TODO: Add optimistic ui
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

  const onThumbsUp = async (opportunity: crm_Opportunities) => {
    // Implement thumbs up logic
    alert("Thumbs up - not implemented yet");
  };

  const onThumbsDown = async (opportunity: string) => {
    // Implement thumbs down logic
    console.log(opportunity, "opportunity");
    try {
      await setInactiveOpportunity(opportunity);
      toast({
        title: "Success",
        description: "Opportunity has been set to inactive",
      });
    } catch (error) {
      console.log(error);
    } finally {
      router.refresh();
    }

    //alert("Thumbs down - not implemented yet");
  };

  // console.log(opportunities, "opportunities");

  return (
    <>
      <LoadingModal
        title="Reordering opportunities"
        description="Please wait while we reorder the opportunities"
        isOpen={isLoading}
      />
      {/* Dialog */}

      <Dialog open={isDialogOpen} onOpenChange={() => setIsDialogOpen(false)}>
        <DialogContent className="min-w-[1000px] py-10 overflow-auto ">
          <NewOpportunityForm
            users={users}
            accounts={accounts}
            contacts={contacts}
            salesType={saleTypes}
            saleStages={saleStages}
            campaigns={campaigns}
            selectedStage={selectedStage}
            onDialogClose={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex w-full h-full overflow-x-auto ">
          {salesStages.map((stage: any, index: number) => (
            <Droppable droppableId={stage.id} key={index}>
              {
                //TODO: fix problem with droppable defaultProps
              }
              {(provided) => (
                <Card
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="mx-1 w-full min-w-[300px] overflow-hidden pb-10"
                >
                  <CardTitle className="flex gap-2 p-3 justify-between">
                    <span className="text-sm font-bold">{stage.name}</span>
                    <PlusCircledIcon
                      className="w-5 h-5 cursor-pointer"
                      onClick={() => {
                        setSelectedStage(stage.id);
                        setIsDialogOpen(true);
                      }}
                    />
                  </CardTitle>
                  <CardContent className="w-full h-full overflow-y-scroll">
                    {opportunities
                      .filter(
                        (opportunity: any) =>
                          opportunity.sales_stage === stage.id &&
                          opportunity.status === "ACTIVE"
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
                                  <div className="overflow-hidden">
                                    <HoverCard>
                                      <HoverCardTrigger>
                                        {opportunity.description.substring(
                                          0,
                                          200
                                        )}
                                      </HoverCardTrigger>
                                      <HoverCardContent className="overflow-hidden">
                                        {opportunity.description}
                                      </HoverCardContent>
                                    </HoverCard>
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
                                  {/*                            {
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
                                  } */}
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
          <Card className="mx-1 w-full min-w-[300px] overflow-hidden pb-10">
            <CardTitle className="flex gap-2 p-3 justify-between">
              <span className="text-sm font-bold">Lost</span>
            </CardTitle>
            <CardContent className="w-full h-full overflow-y-scroll space-y-2">
              {opportunities
                .filter((opportunity: any) => opportunity.status === "INACTIVE")
                .map((opportunity: any, index: number) => (
                  <Card key={index}>
                    <CardTitle className="p-2 text-sm">
                      <span className="font-bold">{opportunity?.name}</span>
                    </CardTitle>
                    <CardContent className="text-xs text-muted-foreground">
                      <div className="flex flex-col space-y-1">
                        <div>{opportunity.description.substring(0, 200)}</div>
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
                              new Date(opportunity.close_date) < new Date()
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
                  </Card>
                ))}
            </CardContent>
          </Card>
        </div>
      </DragDropContext>
    </>
  );
};

export default CRMKanban;
