import {MongoStorage} from "./mongo/MongoStorage";
import {IStorage} from "./IStorage";

export const storage: IStorage = new MongoStorage();