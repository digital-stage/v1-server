import {Db, MongoClient} from "mongodb";
import {Device, DeviceId, Stage, StageId, User, UserId} from "../model.server";
import {ServerDeviceEvents, ServerStageEvents} from "../events";
import {IReactor} from "../Reactor";

export interface IDatabase {

}

export class MongoDatabase implements IDatabase {
    private _mongoClient: MongoClient;
    private _db: Db;
    private readonly _handler: IReactor;
    private readonly _serverAddress: string;

    constructor(url: string, handler: IReactor, serverAddress: string) {
        this._handler = handler;
        this._serverAddress = serverAddress;
        this._mongoClient = new MongoClient(url, {
            useNewUrlParser: true
        });
    }

    public db(): Db {
        return this._db;
    }

    async connect(database: string): Promise<void> {
        if (this._mongoClient.isConnected()) {
            await this.disconnect()
        }
        this._mongoClient = await this._mongoClient.connect();
        this._db = this._mongoClient.db(database);
        //TODO: Clean up old devices etc.
    }

    disconnect() {
        return this._mongoClient.close();
    }

    createDevice(user: UserId, init: Partial<Omit<Device, "_id">>): Promise<Device> {
        const device: Omit<Device, "_id"> = {
            name: "",
            online: true,
            canAudio: false,
            canVideo: false,
            canOv: false,
            sendAudio: false,
            sendVideo: false,
            receiveAudio: false,
            receiveVideo: false,
            inputAudioDevices: [],
            inputVideoDevices: [],
            outputAudioDevices: [],
            soundCards: [],
            producers: [],
            receiverJitter: 5,
            senderJitter: 5,
            ...init,
            user: user,
            server: this._serverAddress
        }
        return this._db.collection("devices").insertOne(device)
            .then(result => result.ops[0])
            .then(device => {
                this._handler.sendToUser(user, ServerDeviceEvents.DEVICE_ADDED, device)
                return device;
            })
    }

    readDevicesByUser(user: UserId): Promise<Device[]> {
        return this._db.collection("devices").find({user: user}).toArray();
    }

    readDeviceByMac(user: UserId, mac: string): Promise<Device | null> {
        return this._db.collection("devices").findOne({user: user, mac: mac});
    }

    readDevice(id: DeviceId): Promise<Device | null> {
        return this._db.collection("devices").findOne({_id: id});
    }


    updateDevice(user: UserId, id: DeviceId, update: Partial<Omit<Device, "_id">>): Promise<boolean> {
        // Update first ;)
        this._handler.sendToUser(user, ServerDeviceEvents.DEVICE_CHANGED, {
            ...update,
            user: user,
            _id: id,
        });
        return this._db.collection("devices").updateOne({_id: id}, {$set: {update}})
            .then(result => result.modifiedCount !== 0)
            .then(result => {
                //TODO: Update all associated (Stage Members), too

                return result;
            });
    }

    removeDevice(user: UserId, id: DeviceId) {
        return this._db.collection("devices").deleteOne({_id: id})
            .then(() => this._handler.sendToUser(user, ServerDeviceEvents.DEVICE_REMOVED, id))
    }

    removeDevicesByServer(server: string): Promise<boolean> {
        //TODO: Also delete all associated
        return this._db.collection("devices").deleteMany({server: server})
            .then(result => result.deletedCount !== 0)
        // NO HANDLER INFORMATION
    }

    createUser(uid: string, name: string, avatarUrl?: string): Promise<User> {
        const user: Omit<User, "_id"> = {
            uid: uid,
            name: name,
            avatarUrl: avatarUrl
        }
        return this._db.collection("users").insertOne(user)
            .then(result => result.ops[0]);
    }

    readUser(id: UserId): Promise<User | null> {
        return this._db.collection("users").findOne({_id: id});
    }

    readUserByUid(uid: string): Promise<User | null> {
        return this._db.collection("users").findOne({uid: uid});
    }

    updateUser(id: UserId, update: Partial<Omit<User, "_id">>): Promise<boolean> {
        return this._db.collection("users").updateOne({_id: id}, {$set: {update}})
            .then(result => result.modifiedCount !== 0)
            .then(result => {
                //TODO: Update all associated (Stage Members), too

                this._handler.sendToUser(id, ServerStageEvents.USER_CHANGED, {
                    ...update,
                    _id: id
                })
                return result;
            });
    }

    deleteUser(id: UserId): Promise<boolean> {
        return this._db.collection("users").deleteOne({_id: id})
            .then(result => result.deletedCount !== 0)
            .then(result => {
                //TODO: Remove all associated, too
                return result;
            })
    }

    createStage(user: UserId, init: Partial<Omit<Stage, "_id">>): Promise<Stage> {
        const stage: Omit<Stage, "_id"> = {
            name: "",
            password: "",
            width: 13,
            length: 25,
            height: 7.5,
            absorption: 0.6,
            damping: 0.7,
            ...init,
            admins: init.admins ? [...init.admins, user] : [user]
        }
        return this._db.collection("stages").insertOne(stage)
            .then(result => {
                stage.admins.forEach(adminId => this._handler.sendToUser(adminId, ServerStageEvents.STAGE_ADDED, stage));
                return result.ops[0];
            });
    }

    readStage(id: StageId): Promise<Stage | null> {
        return this._db.collection("stages").findOne({_id: id});
    }

    updateStage(id: StageId, update: Partial<Omit<Stage, "_id">>): Promise<boolean> {
        return this._db.collection("stages").updateOne({_id: id}, {$set: {update}})
            .then(result => result.modifiedCount !== 0)
            .then(result => {
                //TODO: Update all associated, too

                this._handler.sendToStage(id, ServerStageEvents.STAGE_CHANGED, {
                    ...update,
                    _id: id
                });
                return result;
            });
    }

    deleteStage(id: StageId): Promise<boolean> {
        return this._db.collection("stages").deleteOne({_id: id})
            .then(result => result.deletedCount !== 0)
            .then(result => {
                //TODO: Remove all associated, too

                this._handler.sendToStage(id, ServerStageEvents.STAGE_REMOVED, id);
                return result;
            })
    }


}