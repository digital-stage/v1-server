import {DatabaseEvents, IDatabase} from "./IDatabase";
import Server from "./model.server";
import {DeviceId, GroupId, StageId, UserId} from "./model.common";
import * as EventEmitter from "events";
import * as r from "rethinkdb";
import Stage = Server.Stage;
import User = Server.User;
import Group = Server.Group;
import GroupVolume = Server.GroupVolume;
import GroupUser = Server.GroupUser;
import GroupUserVolume = Server.GroupUserVolume;
import Device = Server.Device;
import Router = Server.Router;
import Producer = Server.Producer;
import {v4 as uuidv4} from 'uuid';

export class Database extends EventEmitter.EventEmitter implements IDatabase {
    private connection;

    constructor() {
        super();
    }

    init(): Promise<any> {
        // INIT REALTIMEDB
        return r.connect({
            host: "46.101.146.123",
            port: 28015
        })
            .then(conn => {
                // INIT WEBSOCKET
                this.connection = conn;
                return this.initDatabase();
            })
            .then(() => this.attachHandler());
    }

    private initDatabase() {
        console.log("Init database");
        return r.dbList()
            .run(this.connection)
            .then(async (list: string[]) => {
                if (list.indexOf("ds") === -1) {
                    await r.dbCreate('ds').run(this.connection);
                }
                const tables: string[] = await r.db('ds').tableList().run(this.connection);
                const createIfNotExists = (tableName: string) => {
                    if (tables.indexOf(tableName) === -1) {
                        return r.db('ds').tableCreate(tableName).run(this.connection);
                    }
                };
                return Promise.all([
                    createIfNotExists("routers"),
                    createIfNotExists("users"),
                    createIfNotExists("devices"),
                    createIfNotExists("producers"),
                    createIfNotExists("stages"),
                    createIfNotExists("groups"),
                    createIfNotExists("group_volumes"),
                    createIfNotExists("group_users"),
                    createIfNotExists("group_user_volumes"),
                ]);
            })
    }

    attachHandler() {
        console.log("Attach handlers");
        return Promise.all([
            this.attachEventsToTable<Router>("routers", DatabaseEvents.RouterAdded, DatabaseEvents.RouterChanged, DatabaseEvents.RouterRemoved),

            this.attachEventsToTable<User>("users", DatabaseEvents.UserAdded, DatabaseEvents.UserChanged, DatabaseEvents.UserRemoved),
            this.attachEventsToTable<Device>("devices", DatabaseEvents.DeviceAdded, DatabaseEvents.DeviceChanged, DatabaseEvents.DeviceRemoved),
            this.attachEventsToTable<Producer>("producers", DatabaseEvents.ProducerAdded, DatabaseEvents.ProducerChanged, DatabaseEvents.ProducerRemoved),

            this.attachEventsToTable<Stage>("stages", DatabaseEvents.StageAdded, DatabaseEvents.StageChanged, DatabaseEvents.StageRemoved),
            this.attachEventsToTable<Group>("groups", DatabaseEvents.GroupAdded, DatabaseEvents.GroupChanged, DatabaseEvents.GroupRemoved),
            this.attachEventsToTable<GroupVolume>("group_volumes", DatabaseEvents.GroupVolumeAdded, DatabaseEvents.GroupVolumeChanged, DatabaseEvents.GroupVolumeRemoved),
            this.attachEventsToTable<GroupUser>("group_users", DatabaseEvents.GroupUserAdded, DatabaseEvents.GroupUserChanged, DatabaseEvents.GroupUserRemoved),
            this.attachEventsToTable<GroupUserVolume>("group_user_volumes", DatabaseEvents.GroupUserVolumeAdded, DatabaseEvents.GroupUserVolumeChanged, DatabaseEvents.GroupUserVolumeRemoved)
        ])
    }


    private create<ModelType>(tableName: string, model: Omit<ModelType, "id">): Promise<ModelType> {
        const id: string = uuidv4();
        const item = {
            ...model,
            id: id
        } as any;
        return r.db('ds').table(tableName).insert(item)
            .run(this.connection)
            .then(() => item as ModelType);
    }

    private read<ModelType>(tableName: string, id: string): Promise<ModelType> {
        return r.db('ds').table(tableName)
            .get(id)
            .run(this.connection)
            .then((model: any) => model as ModelType);
    }

    private update<ModelType>(tableName: string, id: string, model: Partial<Omit<ModelType, "id">>): Promise<boolean> {
        return r.db('ds').table(tableName)
            .update({
                ...model,
                id
            })
            .run(this.connection)
            .then(value => value.replaced > 0);
    }

    private delete<ModelType>(tableName: string, id: string): Promise<boolean> {
        return r.db('ds').table(tableName)
            .get(id)
            .delete()
            .run(this.connection)
            .then(value => value.deleted > 0);
    }

    private listenToTable<T>(
        tableName: string,
        added: (value: T) => void,
        changed: (value: T) => void,
        removed: (value: T) => void,
    ) {
        r.db('ds').table(tableName)
            .changes()
            .run(this.connection)
            .then((cursor) =>
                cursor.each((err, row) => {
                        const oldValue: T = row.old_val;
                        const newValue: T = row.new_val;
                        if (newValue) {
                            if (oldValue) {
                                // Changed
                                changed(newValue);
                            } else {
                                // Added
                                added(newValue);
                            }
                        } else {
                            if (oldValue) {
                                // Removed
                                removed(oldValue);
                            }
                        }

                    }
                ))
            .catch((err) => console.error(err));
    }

    private attachEventsToTable<T>(
        tableName: string,
        added: DatabaseEvents,
        changed: DatabaseEvents,
        removed: DatabaseEvents,
    ) {
        this.listenToTable<T>(tableName, (value: T) => {
            this.emit(added, value);
        }, (value: T) => {
            this.emit(changed, value);
        }, (value: T) => {
            this.emit(removed, value);
        });
    }

    createStage(stage: Omit<Server.Stage, "id">): Promise<Server.Stage> {
        return this.create<Server.Stage>("stages", stage);
    }

    createGroup(group: Omit<Server.Group, "id">): Promise<Server.Group> {
        return this.create<Server.Group>("groups", group);
    }

    createUser(user: Omit<Server.User, "id">): Promise<Server.User> {
        return this.create<Server.User>("users", user);
    }

    readGroup(id: GroupId): Promise<Server.Group> {
        return this.read<Server.Group>("groups", id);
    }

    readStage(id: StageId): Promise<Server.Stage> {
        return this.read<Server.Stage>("stages", id);
    }

    readUser(id: UserId): Promise<Server.User> {
        return this.read<Server.User>("users", id);
    }

    deleteGroup(id: GroupId): Promise<boolean> {
        return this.delete<Server.Group>("groups", id);
    }

    deleteStage(id: StageId): Promise<boolean> {
        return this.delete<Server.Stage>("stages", id);
    }

    deleteUser(id: UserId): Promise<boolean> {
        return this.delete<Server.User>("users", id);
    }

    updateGroup(id: GroupId, group: Partial<Omit<Server.Group, "id">>): Promise<boolean> {
        return this.update<Server.Group>("groups", id, group);
    }

    updateStage(id: StageId, stage: Partial<Server.Stage>): Promise<boolean> {
        return this.update<Server.Stage>("stages", id, stage);
    }

    updateUser(id: UserId, user: Partial<Omit<Server.User, "id">>): Promise<boolean> {
        return this.update<Server.User>("users", id, user);
    }

    createDevice(device: Omit<Server.Device, "id">): Promise<Server.Device> {
        return this.create<Server.Device>("devices", device);
    }

    deleteDevice(id: DeviceId): Promise<boolean> {
        return this.delete<Server.Device>("devices", id);
    }

    readDevice(id: DeviceId): Promise<Server.Device> {
        return this.read<Server.Device>("devices", id);
    }

    updateDevice(id: DeviceId, device: Partial<Omit<Server.Device, "id">>): Promise<boolean> {
        return this.update<Server.Device>("devices", id, device);
    }

    readDeviceByUserAndMac(userId: UserId, mac: string): Promise<Server.Device> {
        return r.db('ds').table("devices")
            .filter(
                r.row('userId').eq(userId)
            )
            .filter(
                r.row('mac').eq(mac)
            )
            .run(this.connection)
            .then((model: any) => model as Server.Device);
    }


}