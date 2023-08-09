import { create } from "zustand";

import {
  createIsOpenSlice,
  IsOpenSliceInterface,
} from "./slices/createIsOpenSlice";

type AppStoreInterface = IsOpenSliceInterface;

export const useAppStore = create<AppStoreInterface>()((...a) => ({
  ...createIsOpenSlice(...a),
}));
