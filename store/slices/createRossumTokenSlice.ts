import { getRossumToken } from "@/actions/invoice/get-rossum-token";
import { StateCreator } from "zustand";

export interface RossumTokenSliceInterface {
  rossumToken: string;
}

export const createRossumTokenSlice: StateCreator<RossumTokenSliceInterface> = (
  set
) => ({
  //@ts-ignore
  rossumToken: getRossumTokenSync(), // Call getRossumTokenSync to get the initial token value
});

// Synchronous version of getRossumToken
const getRossumTokenSync = () => {
  try {
    // Fetch the token synchronously
    const token = getRossumToken(); // You might need to adapt getRossumToken to be synchronous
    return token;
  } catch (error) {
    console.error("Error fetching initial token:", error);
    return "";
  }
};
