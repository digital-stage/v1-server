import {GlobalProducer} from "./GlobalProducer";
import {GlobalAudioProducerId} from "./IdTypes";

export interface GlobalAudioProducer extends GlobalProducer {
    _id: GlobalAudioProducerId;
}
