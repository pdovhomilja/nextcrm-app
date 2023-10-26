import { create } from "zustand";

interface AvatarState {
  avatar: string;
  setAvatar: (newAvatar: string) => void;
}

const useAvatarStore = create<AvatarState>((set) => ({
  avatar: "",
  setAvatar: (avatar) => set({ avatar }),
}));

export default useAvatarStore;
