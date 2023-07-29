import { StateCreator } from "zustand";

export interface IsOpenSliceInterface {
  isOpen: boolean;
  notionUrl: string;
  setIsOpen: (isOpen: boolean) => void;
  setNotionUrl: (notionUrl: string) => void;
}

export const createIsOpenSlice: StateCreator<IsOpenSliceInterface> = (set) => ({
  isOpen: false,
  notionUrl: "",
  setIsOpen: (isOpen: boolean) => set({ isOpen }),
  setNotionUrl: (notionUrl: string) => set({ notionUrl }),
});
