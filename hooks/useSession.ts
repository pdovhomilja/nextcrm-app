import { create } from "zustand";

import { Users } from "@prisma/client";
import { getUsers } from "@/actions/get-users";

interface UsersStore {
  users?: Users[];
  getUsers: () => void;
}

const useUsers = create<UsersStore>((set) => ({
  users: undefined,
  getUsers: async () => {
    const users = await getUsers();
    set({ users });
  },
}));

export default useUsers;
