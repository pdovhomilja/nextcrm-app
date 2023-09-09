"use client";

import AlertModal from "@/components/modals/alert-modal";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";
import { TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  DragDropContext,
  Draggable,
  DropResult,
  Droppable,
} from "react-beautiful-dnd";

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

  const boardSections = boardData.sections;

  //Use useEffect to update the data when tasks change
  useEffect(() => {
    setData(tasks);
  }, [tasks]);

  const onDragEnd = async ({
    source,
    destination,
    draggableId,
  }: DropResult) => {
    console.log(source, destination, draggableId);

    if (!destination) return;

    // Update the local data optimistically
    const newTasks = [...data];
    console.log(newTasks, "newTasks");
    const [reorderedItem] = newTasks.splice(source.index, 1);
    newTasks.splice(destination.index, 0, reorderedItem);
    setData(newTasks);

    try {
      await axios.put(`/api/projects/tasks/`, {
        id: draggableId,
        section: destination.droppableId,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while updating task. Please try again.",
      });
    } finally {
      router.refresh();
      toast({
        title: "Success",
        description: `Task updated successfully`,
      });
    }
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
          {boardSections.map((section: any) => (
            <div
              key={section.id}
              className="flex flex-col grow w-full h-full border rounded-md items-center"
            >
              <Droppable key={section.id} droppableId={section.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="w-full h-full"
                    key={section.id}
                  >
                    <div className="flex flex-col items-center py-4 text-sm space-x-2 ">
                      <p> {section.name} </p>
                      <p className="flex justify-between w-full px-3">
                        {boardSections && boardSections
                          ? boardSections?.find(
                              (sectionName: any) =>
                                sectionName?.id === section.id
                            )?.title
                          : "Nepřiřazeno"}
                        <TrashIcon
                          className={`w-4 h-4 cursor-pointer hover:text-red-500 mr-2`}
                          onClick={() => {
                            setDeleteSection(section.id);
                            setOpen(true);
                          }}
                        />
                      </p>
                    </div>
                    <Separator />
                    <div className="flex flex-col overflow-x-auto  h-full ">
                      {data &&
                        data
                          .filter((task: any) => task.section === section.id)
                          .map((task: any, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  key={task.id}
                                  className="dropBox space-y-2 "
                                >
                                  <p className="font-bold text-sm">
                                    {task.title}
                                  </p>
                                  <p className="opacity-75 text-xs">
                                    {task.content}
                                  </p>
                                  <p className="opacity-75 text-xs">
                                    Priority: {task.priority}
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
