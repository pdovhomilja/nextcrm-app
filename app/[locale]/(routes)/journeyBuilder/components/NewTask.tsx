"use client";

import { useAppStore } from "@/store/store";

import NewTaskDialog from "../dialogs/NewTask";

type Props = {
  users: any;
  boards: any;
};

const NewTask = ({ users, boards }: Props) => {
  //Zustand
  const { isOpen, setIsOpen, notionUrl } = useAppStore();

  return (
    <NewTaskDialog
      open={isOpen}
      setOpen={() => setIsOpen(false)}
      users={users}
      boards={boards}
      notionUrl={notionUrl}
    />
  );
};

export default NewTask;
