import {MongoDatabase} from "../database/MongoDatabase";
import {IReactor} from "../Reactor";
import {Device, DeviceId, UserId} from "../model.server";
import {ServerDeviceEvents} from "../events";

export class MongoSocketReactor {
    private database: MongoDatabase;
    private handler: IReactor;


    constructor(database: MongoDatabase, handler: IReactor) {
        this.database = database;
        this.handler = handler;
    }

    public createDevice(user: UserId, init: Partial<Omit<Device, "_id">>) {
        return this.database.createDevice(user, init)
            .then(device => this.handler.sendToUser(user, ServerDeviceEvents.DEVICE_ADDED, device));
    }

    public changeDevice(user: UserId, id: DeviceId, update: Partial<Omit<Device, "_id">>) {
        // First send to others
        this.handler.sendToUser(user, ServerDeviceEvents.DEVICE_CHANGED, {
            ...update,
            user: user,
            _id: id
        })
        // Then update
        return this.database.updateDevice(id, update);
    }
}