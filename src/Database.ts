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
import {IndexFunction} from "rethinkdb";

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
                const existingTables: string[] = await r.db('ds').tableList().run(this.connection);
                const createIfNotExists = (tableName: string) => {
                    if (existingTables.indexOf(tableName) === -1) {
                        return r.db('ds').tableCreate(tableName).run(this.connection);
                    }
                };
                const createIndiciesIfNotExists = async (tableName: string, indicies: { name: string, index?: IndexFunction<any> }[]) => {
                    const existingIndicies: string[] = await r.db('ds').table(tableName).indexList().run(this.connection);
                    indicies.forEach(index => {
                        if (existingIndicies.indexOf(index.name) === -1) {
                            return r.db('ds').table(tableName).indexCreate(index.name, index.index).run(this.connection);
                        }
                    })
                };
                return Promise.all([
                    // Tables
                    createIfNotExists("routers"),
                    createIfNotExists("users"),
                    createIfNotExists("devices"),
                    createIfNotExists("producers"),
                    createIfNotExists("stages"),
                    createIfNotExists("groups"),
                    createIfNotExists("group_volumes"),
                    createIfNotExists("group_users"),
                    createIfNotExists("group_user_volumes"),
                ]).then(() => Promise.all([
                    // Additional Indexes
                    createIndiciesIfNotExists("devices", [{
                        name: "user_mac",
                        index: [r.row("userId"), r.row("mac")]
                    }])
                ]));
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

    private readAll<ModelType>(tableName: string, filter: { [key: string]: any }): Promise<ModelType[]> {
        return r.db('ds').table(tableName)
            .filter(filter)
            .run(this.connection)
            .then(cursor => cursor.toArray<ModelType>());
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

    private deleteAll<ModelType>(tableName: string, filter: { [key: string]: any }): Promise<boolean> {
        return r.db('ds').table(tableName)
            .filter(filter)
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

    createUser(user: Server.User): Promise<Server.User> {
        return r.db('ds').table('users')
            .insert(user)
            .run(this.connection)
            .then(() => user);
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
        return this.delete<Server.Group>("groups", id)
            .then(() => Promise.all([
                this.deleteAll("group_volumes", [{groupId: id}]),
                this.deleteAll("group_users", [{groupId: id}]),
                this.deleteAll("group_user_volumes", [{groupId: id}])
            ]))
            .then(results => results.every(result => result === true));
    }

    deleteStage(id: StageId): Promise<boolean> {
        return this.delete<Server.Stage>("stages", id)
            .then(result => {
                if (result) {
                    return this.readGroupsByStage(id)
                        .then(groups => groups.forEach(group => this.deleteGroup(group.id)))
                        .then(() => true);
                }
                return false;
            });
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
        return r.db('ds').table("devices")  // TODO: Replace with compound index of userId and mac
            .getAll([userId, mac], {index: "user_mac"})
            .run(this.connection)
            .then(async cursor => {
                const devices: Server.Device[] = await cursor.toArray<Server.Device>();
                if (devices.length > 0) {
                    return devices[0];
                }
                return undefined;
            });
    }

    readStages(): Promise<Server.Stage[]> {
        return r.db('ds').table("stages")
            .run(this.connection)
            .then(cursor => cursor.toArray<Server.Stage>());
    }

    readGroupsByStage(stageId: StageId): Promise<Server.Group[]> {
        return r.db('ds').table('groups')
            .filter({stageId: stageId})
            .run(this.connection)
            .then(cursor => cursor.toArray<Server.Group>());
    }
}