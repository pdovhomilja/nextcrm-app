import { create } from "zustand";

import {
  createIsOpenSlice,
  IsOpenSliceInterface,
} from "./slices/createIsOpenSlice";

import {
  createRossumTokenSlice,
  RossumTokenSliceInterface,
} from "./slices/createRossumTokenSlice";

type AppStoreInterface = IsOpenSliceInterface;

export const useAppStore = create<AppStoreInterface>()((...a) => ({
  ...createIsOpenSlice(...a),
  //@ts-ignore
  ...createRossumTokenSlice(...a),
}));
