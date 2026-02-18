"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";

import { NewOpportunityForm } from "../../opportunities/components/NewOpportunityForm";
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

// Draggable Opportunity Card Component
function OpportunityCard({ opportunity, router, onThumbsDown, stage, salesStages }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="my-2 w-full cursor-grab active:cursor-grabbing"
    >
      <CardTitle className="p-2 text-sm">
        <div className="flex justify-between p-2">
          <span className="font-bold">{opportunity.name}</span>
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DotsHorizontalIcon className="w-4 h-4 text-slate-600" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/crm/opportunities/${opportunity.id}`)
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
                {opportunity.description.substring(0, 200)}
              </HoverCardTrigger>
              <HoverCardContent className="overflow-hidden">
                {opportunity.description}
              </HoverCardContent>
            </HoverCard>
          </div>
          <div className="space-x-1">
            <span>Amount:</span>
            <span>{opportunity.budget?.toString()}</span>
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
      <CardFooter className="flex justify-between">
        <div className="flex text-xs items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarImage
              src={
                opportunity.assigned_to_user.avatar
                  ? opportunity.assigned_to_user.avatar
                  : `${process.env.NEXT_PUBLIC_APP_URL}/images/nouser.png`
              }
            />
          </Avatar>
          <span className="text-xs ">{opportunity.assigned_to_user.name}</span>
        </div>
        <div className="flex space-x-2">
          {stage.probability !==
            Math.max(...salesStages.map((s: any) => Number(s.probability || 0))) && (
            <ThumbsDown
              className="w-4 h-4 text-red-500"
              onClick={() => onThumbsDown(opportunity.id)}
            />
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// Droppable Stage Column
function StageColumn({ stage, opportunities, onAddOpportunity, children }: any) {
  const { setNodeRef } = useSortable({
    id: stage.id,
    data: {
      type: "column",
    },
  });

  return (
    <Card
      ref={setNodeRef}
      className="mx-1 w-full min-w-[300px] overflow-hidden pb-10"
    >
      <CardTitle className="flex gap-2 p-3 justify-between">
        <span className="text-sm font-bold">{stage.name}</span>
        <PlusCircledIcon
          className="w-5 h-5 cursor-pointer"
          onClick={() => onAddOpportunity(stage.id)}
        />
      </CardTitle>
      <CardContent className="w-full h-full overflow-y-scroll">
        {children}
      </CardContent>
    </Card>
  );
}

const CRMKanban = ({
  salesStages,
  opportunities: data,
  crmData,
}: CRMKanbanProps) => {
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  const [selectedStage, setSelectedStage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [opportunities, setOpportunities] = useState(data);
  const [activeOpportunity, setActiveOpportunity] = useState<crm_Opportunities | null>(null);

  const { users, accounts, contacts, saleTypes, saleStages, campaigns } =
    crmData;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    setOpportunities(data);
    setIsLoading(false);
  }, [data]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const opportunity = opportunities.find((opp: any) => opp.id === active.id);
    setActiveOpportunity(opportunity || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOpportunity(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the opportunity being moved
    const opportunity = opportunities.find((opp: any) => opp.id === activeId);
    if (!opportunity) return;

    // Determine the destination stage
    let destinationStageId = overId;

    // If dropped on another opportunity, get its stage
    const overOpportunity = opportunities.find((opp: any) => opp.id === overId);
    if (overOpportunity && overOpportunity.sales_stage) {
      destinationStageId = overOpportunity.sales_stage;
    }

    // Check if stage actually changed
    if (opportunity.sales_stage === destinationStageId) return;

    setIsLoading(true);

    try {
      const response = await axios.put(`/api/crm/opportunity/${activeId}`, {
        source: opportunity.sales_stage,
        destination: destinationStageId,
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
        variant: "destructive",
      });
    } finally {
      router.refresh();
      setIsLoading(false);
    }
  };

  const onThumbsUp = async (opportunity: crm_Opportunities) => {
    alert("Thumbs up - not implemented yet");
  };

  const onThumbsDown = async (opportunityId: string) => {
    try {
      await setInactiveOpportunity(opportunityId);
      toast({
        title: "Success",
        description: "Opportunity has been set to inactive",
      });
    } catch (error) {
      console.log(error);
    } finally {
      router.refresh();
    }
  };

  return (
    <>
      <LoadingModal
        title="Reordering opportunities"
        description="Please wait while we reorder the opportunities"
        isOpen={isLoading}
      />

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex w-full h-full overflow-x-auto ">
          {salesStages.map((stage: any) => {
            const stageOpportunities = opportunities.filter(
              (opportunity: any) =>
                opportunity.sales_stage === stage.id &&
                opportunity.status === "ACTIVE"
            );

            return (
              <StageColumn
                key={stage.id}
                stage={stage}
                opportunities={stageOpportunities}
                onAddOpportunity={(stageId: string) => {
                  setSelectedStage(stageId);
                  setIsDialogOpen(true);
                }}
              >
                <SortableContext
                  items={stageOpportunities.map((opp: any) => opp.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {stageOpportunities.map((opportunity: any) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      router={router}
                      onThumbsDown={onThumbsDown}
                      stage={stage}
                      salesStages={salesStages}
                    />
                  ))}
                </SortableContext>
              </StageColumn>
            );
          })}

          {/* Lost Opportunities Column */}
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
                        <div className="space-x-1">
                          <span>Amount:</span>
                          <span>{opportunity.budget?.toString()}</span>
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

        <DragOverlay>
          {activeOpportunity ? (
            <Card className="my-2 w-[280px] opacity-80 bg-white shadow-lg">
              <CardTitle className="p-2 text-sm">
                <div className="flex justify-between p-2">
                  <span className="font-bold">{activeOpportunity.name}</span>
                </div>
              </CardTitle>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};

export default CRMKanban;
