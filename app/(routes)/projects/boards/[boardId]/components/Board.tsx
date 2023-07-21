"use client";

import AlertModal from "@/components/modals/alert-modal";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";
import { TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";

type Props = {
  boardData: any;
  tasks: any;
};

const BoardDasboard = ({ boardData, tasks }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [id, setDeleteSection] = useState("");

  const [data, setData] = useState([]);
  const { toast } = useToast();
  const router = useRouter();

  const salesStages = boardData.sections;

  useEffect(() => {
    setData(tasks);
  }, [tasks]);

  const onDragEnd = async ({ source, destination, draggableId }: any) => {
    if (!destination) return;

    // Update the local data optimistically
    const newOpportunities = [...data];
    const [reorderedItem] = newOpportunities.splice(source.index, 1);
    newOpportunities.splice(destination.index, 0, reorderedItem);
    setData(newOpportunities);

    // Update the server
    //await mutate(updateOppSaleStage(draggableId, destination.droppableId));

    // toast.success("Opportunity sale stage updated successfully");
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/projects/sections/`, { data: { id } });
      toast({
        title: "Success",
        description: `Section deleted successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while deleting section. Please try again.",
      });
    } finally {
      setLoading(false);
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-row w-full h-full  justify-center space-x-2">
          {salesStages.map((stage: any) => (
            <div
              key={stage.id}
              className="flex flex-col grow w-full h-full border rounded-md items-center"
            >
              <Droppable key={stage.id} droppableId={stage.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="w-full h-full"
                    key={stage.id}
                  >
                    <div className="flex flex-col items-center p-4 text-sm space-x-2 ">
                      <p> {stage.name} </p>
                      <p className="flex justify-between w-full px-3">
                        {salesStages && salesStages
                          ? salesStages?.find(
                              (stagex: any) => stagex?.id === stage.id
                            )?.title
                          : "Nepřiřazeno"}
                        <TrashIcon
                          className={`w-4 h-4 cursor-pointer hover:text-red-500`}
                          onClick={() => {
                            setDeleteSection(stage.id);
                            setOpen(true);
                          }}
                        />
                      </p>
                    </div>
                    <Separator />
                    <div className="flex flex-col overflow-x-auto  h-full ">
                      {data &&
                        data
                          .filter(
                            (opportunity: any) =>
                              opportunity.section === stage.id
                          )
                          .map((opportunity: any, index) => (
                            <Draggable
                              key={opportunity.id}
                              draggableId={opportunity.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  key={opportunity.id}
                                  className="dropBox space-y-2 "
                                >
                                  <p className="font-bold text-sm">
                                    {opportunity.title}
                                  </p>
                                  <p className="opacity-75 text-xs">
                                    {opportunity.content}
                                  </p>
                                  <p className="opacity-75 text-xs">
                                    Priority: {opportunity.priority}
                                  </p>
                                </div>
                              )}
                            </Draggable>
                          ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </>
  );
};

export default BoardDasboard;
