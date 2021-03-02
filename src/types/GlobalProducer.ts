/**
 *
 */
import {
  DeviceId,
  GlobalProducerId,
  RouterId,
  RouterProducerId,
  UserId,
} from "./IdTypes";

export interface GlobalProducer {
  _id: GlobalProducerId;
  deviceId: DeviceId; // <-- RELATION

  routerId: RouterId;
  routerProducerId: RouterProducerId;

  // Optimizations for performance
  userId: UserId;
}
