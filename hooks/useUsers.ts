import { create } from "zustand";

import { getAccounts } from "@/actions/crm/get-accounts";
import { getUsers } from "@/actions/get-users";
import { Users } from "@prisma/client";

interface UsersStore {
  users: Users[];
}

const useUsersStore = create<UsersStore>((set) => ({
  users: [],
  getUsers: async () => {
    const users = await getUsers();
    set({ users });
  },
}));

export default useUsersStore;
