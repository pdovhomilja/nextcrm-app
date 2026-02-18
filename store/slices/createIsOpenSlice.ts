import { StateCreator } from "zustand";

export interface IsOpenSliceInterface {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const createIsOpenSlice: StateCreator<IsOpenSliceInterface> = (set) => ({
  isOpen: false,
  setIsOpen: (isOpen: boolean) => set({ isOpen }),
});
