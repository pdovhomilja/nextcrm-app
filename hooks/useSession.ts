import { create } from "zustand";

import { Session } from "@/types/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface PreviewModalStore {
  data?: Session;
}

const useSession = create<PreviewModalStore>(async (set) => ({
  data: await getServerSession(authOptions),
}));

export default useSession;
