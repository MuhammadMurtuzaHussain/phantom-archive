import { createContext } from "react";

/** Where the guided brief lies in the room; null when there is no desk (phones). */
export const BriefSlot = createContext<HTMLElement | null>(null);
