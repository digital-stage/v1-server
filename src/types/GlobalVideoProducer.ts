import { GlobalProducer } from "./GlobalProducer";
import { GlobalVideoProducerId } from "./IdTypes";

export interface GlobalVideoProducer extends GlobalProducer {
  _id: GlobalVideoProducerId;
}
