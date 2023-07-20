import { create } from "zustand";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface PreviewModalStore {
  session?: any;
  getSession: () => void;
}

const useSessionStore = create<PreviewModalStore>((set) => ({
  session: {
    id: "",
    _id: "",
    name: "",
    isAdmin: false,
    userLanguage: "",
    userStatus: "",
  },
  getSession: async () => {
    const session = await getServerSession(authOptions);
    set({ session });
  },
}));

export default useSessionStore;
