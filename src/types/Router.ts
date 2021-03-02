import { RouterId } from "./IdTypes";

export interface Router {
  _id: RouterId;
  wsPrefix: string;
  restPrefix: string;
  url: string;
  path: string;
  ipv4: string;
  ipv6: string;
  port: number;
  availableRTCSlots: number;
  availableOVSlots: number;

  // Optimizations for performance and redundancy
  server?: string;
}
