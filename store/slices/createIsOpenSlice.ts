import { StateCreator } from "zustand";

interface IsOpenSlice {
  isOpen: boolean;
  notionUrl: string;
  setIsOpen: (isLoading: boolean) => void;
}

export const createIsOpenSlice: StateCreator<IsOpenSlice> = (set) => ({
  isOpen: false,
  notionUrl: "",
  setIsOpen: (isOpen: boolean) => set({ isOpen }),
  setNotionUrl: (notionUrl: string) => set({ notionUrl }),
});
