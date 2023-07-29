import { create } from "zustand";

import { createIsOpenSlice } from "./slices/createIsOpenSlice";

export const useAppStore = create<any>()((...a) => ({
  ...createIsOpenSlice(...a),
}));
