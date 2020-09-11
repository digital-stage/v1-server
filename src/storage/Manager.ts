import {IDeviceManager, IStageManager} from "./IManager";
import MongoStageManager from "./mongo/MongoStageManager";

export const manager: IStageManager & IDeviceManager = new MongoStageManager();