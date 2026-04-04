"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { ThumbsDown } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
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
import { toast } from "sonner";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";

import { NewOpportunityForm } from "../../opportunities/components/NewOpportunityForm";
import { setInactiveOpportunity } from "@/actions/crm/opportunity/dashboard/set-inactive";
import { updateOpportunity } from "@/actions/crm/opportunities/update-opportunity";
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

type Column = crm_Opportunities_Sales_Stages & {
  opportunities: crm_Opportunities[];
};

function initColumns(
  opps: crm_Opportunities[],
  stages: crm_Opportunities_Sales_Stages[]
): Column[] {
  return stages.map((stage) => ({
    ...stage,
    opportunities: opps.filter(
      (o: any) => o.sales_stage === stage.id && o.status === "ACTIVE"
    ),
  }));
}

// Draggable Opportunity Card
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
                {opportunity.description?.substring(0, 200)}
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
                opportunity.assigned_to_user?.avatar
                  ? opportunity.assigned_to_user.avatar
                  : `${process.env.NEXT_PUBLIC_APP_URL}/images/nouser.png`
              }
            />
          </Avatar>
          <span className="text-xs">{opportunity.assigned_to_user?.name}</span>
        </div>
        <div className="flex space-x-2">
          {stage.probability !==
            Math.max(
              ...salesStages.map((s: any) => Number(s.probability || 0))
            ) && (
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

// Droppable zone inside each column — same pattern as DroppableColumn in Kanban.tsx
function DroppableStage({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="min-h-[50px]">
      {children}
    </div>
  );
}

const CRMKanban = ({
  salesStages,
  opportunities: data,
  crmData,
}: CRMKanbanProps) => {
  const router = useRouter();

  const [selectedStage, setSelectedStage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const serverDataRef = useRef(data);
  const [columns, setColumns] = useState<Column[]>(() =>
    initColumns(data, salesStages)
  );
  const columnsRef = useRef<Column[]>(columns);
  columnsRef.current = columns;

  const [activeOpportunity, setActiveOpportunity] =
    useState<crm_Opportunities | null>(null);
  const origStageIdRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);

  const { accounts, contacts, saleTypes, saleStages, campaigns, currencies } = crmData;

  // Sync from server (e.g. after onThumbsDown router.refresh()) — only when not dragging
  useEffect(() => {
    if (serverDataRef.current !== data && !isDraggingRef.current) {
      serverDataRef.current = data;
      setColumns(initColumns(data, salesStages));
    }
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true;
    const { active } = event;
    const activeId = active.id as string;
    for (const col of columnsRef.current) {
      const opp = col.opportunities.find((o) => o.id === activeId);
      if (opp) {
        setActiveOpportunity(opp);
        origStageIdRef.current = col.id;
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const current = columnsRef.current;

    // Find source column and opportunity index
    let fromColIdx = -1,
      fromOppIdx = -1;
    for (let i = 0; i < current.length; i++) {
      const idx = current[i].opportunities.findIndex((o) => o.id === activeId);
      if (idx !== -1) {
        fromColIdx = i;
        fromOppIdx = idx;
        break;
      }
    }
    if (fromColIdx === -1) return;

    // Determine destination — overId is either a stage ID or an opportunity ID
    let toColIdx = current.findIndex((c) => c.id === overId);
    let toOppIdx = 0;
    const isOverColumn = toColIdx !== -1;

    if (!isOverColumn) {
      for (let i = 0; i < current.length; i++) {
        const idx = current[i].opportunities.findIndex((o) => o.id === overId);
        if (idx !== -1) {
          toColIdx = i;
          toOppIdx = idx;
          break;
        }
      }
    } else {
      toOppIdx = current[toColIdx].opportunities.length;
    }

    if (toColIdx === -1) return;
    if (fromColIdx === toColIdx) return;

    const newColumns = current.map((c) => ({
      ...c,
      opportunities: [...c.opportunities],
    }));
    const [movedOpp] = newColumns[fromColIdx].opportunities.splice(
      fromOppIdx,
      1
    );
    (movedOpp as any).sales_stage = newColumns[toColIdx].id;
    newColumns[toColIdx].opportunities.splice(toOppIdx, 0, movedOpp);
    columnsRef.current = newColumns;
    setColumns(newColumns);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    isDraggingRef.current = false;
    const { active } = event;
    setActiveOpportunity(null);

    const activeId = active.id as string;
    const current = columnsRef.current;

    // Find where the opportunity ended up after handleDragOver moves
    let curColIdx = -1;
    for (let i = 0; i < current.length; i++) {
      if (current[i].opportunities.find((o) => o.id === activeId)) {
        curColIdx = i;
        break;
      }
    }
    if (curColIdx === -1) return;

    const curStageId = current[curColIdx].id;
    const wasCrossStageMove =
      origStageIdRef.current !== null &&
      origStageIdRef.current !== curStageId;

    if (!wasCrossStageMove) return;

    try {
      const result = await updateOpportunity({
        id: activeId,
        sales_stage: curStageId,
      });
      if (result?.error) {
        toast.error(result.error);
        columnsRef.current = initColumns(data, salesStages);
        setColumns(initColumns(data, salesStages));
      } else {
        toast.success("Opportunity stage changed");
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
      columnsRef.current = initColumns(data, salesStages);
      setColumns(initColumns(data, salesStages));
    }
  };

  const onThumbsDown = async (opportunityId: string) => {
    try {
      await setInactiveOpportunity(opportunityId);
      toast.success("Opportunity has been set to inactive");
    } catch (error) {
      console.log(error);
    } finally {
      router.refresh();
    }
  };

  // Lost opportunities come from server data (updated via router.refresh on thumbsDown)
  const lostOpportunities = data.filter(
    (o: any) => o.status === "INACTIVE"
  );

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={() => setIsDialogOpen(false)}>
        <DialogContent className="min-w-[1000px] py-10 overflow-auto">
          <NewOpportunityForm
            accounts={accounts}
            contacts={contacts}
            salesType={saleTypes}
            saleStages={saleStages}
            campaigns={campaigns}
            currencies={(currencies ?? []).map((c: any) => ({ code: c.code, name: c.name, symbol: c.symbol }))}
            selectedStage={selectedStage}
            onDialogClose={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex w-full h-full overflow-x-auto">
          {columns.map((col) => (
            <Card
              key={col.id}
              className="mx-1 w-full min-w-[300px] overflow-hidden pb-10"
            >
              <CardTitle className="flex gap-2 p-3 justify-between">
                <span className="text-sm font-bold">{col.name}</span>
                <PlusCircledIcon
                  className="w-5 h-5 cursor-pointer"
                  onClick={() => {
                    setSelectedStage(col.id);
                    setIsDialogOpen(true);
                  }}
                />
              </CardTitle>
              <CardContent className="w-full h-full overflow-y-auto">
                <SortableContext
                  items={col.opportunities.map((o) => o.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <DroppableStage id={col.id}>
                    {col.opportunities.map((opportunity) => (
                      <OpportunityCard
                        key={opportunity.id}
                        opportunity={opportunity}
                        router={router}
                        onThumbsDown={onThumbsDown}
                        stage={col}
                        salesStages={salesStages}
                      />
                    ))}
                  </DroppableStage>
                </SortableContext>
              </CardContent>
            </Card>
          ))}

          {/* Lost Opportunities Column */}
          <Card className="mx-1 w-full min-w-[300px] overflow-hidden pb-10">
            <CardTitle className="flex gap-2 p-3 justify-between">
              <span className="text-sm font-bold">Lost</span>
            </CardTitle>
            <CardContent className="w-full h-full overflow-y-scroll space-y-2">
              {lostOpportunities.map((opportunity: any, index: number) => (
                <Card key={index}>
                  <CardTitle className="p-2 text-sm">
                    <span className="font-bold">{opportunity?.name}</span>
                  </CardTitle>
                  <CardContent className="text-xs text-muted-foreground">
                    <div className="flex flex-col space-y-1">
                      <div>{opportunity.description?.substring(0, 200)}</div>
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
