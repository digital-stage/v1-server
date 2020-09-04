import {DatabaseEvents} from "../database/IDatabase";
import {GroupId, StageId, UserId} from "../../src/model.common";
import Client from "../../src/model.client";
import * as EventEmitter from "server/src/events";
import * as r from "rethinkdb";
import {IndexFunction} from "rethinkdb";
import Server from "../../src/model.server";

export class StageAPI extends EventEmitter.EventEmitter {
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
                    createIfNotExists("devices"),
                    createIfNotExists("producers"),
                    createIfNotExists("stages"),
                    createIfNotExists("groups"),
                    createIfNotExists("stage_members"),
                    createIfNotExists("users"),
                    createIfNotExists("user_group_volumes"),
                    createIfNotExists("user_stage_member_volumes"),
                ]).then(() => Promise.all([
                    // Additional Indexes
                    createIndiciesIfNotExists("devices", [{
                        name: "user_mac",
                        index: [r.row("userId"), r.row("mac")]
                    }]),
                    createIndiciesIfNotExists("stage_members", [{
                        name: "stage_user",
                        index: [r.row("stageId"), r.row("userId")]
                    }]),
                    createIndiciesIfNotExists("stage_members", [{
                        name: "groupId"
                    }]),
                    createIndiciesIfNotExists("user_group_volumes", [{
                        name: "user_group",
                        index: [r.row("userId"), r.row("groupId")]
                    }]),
                    createIndiciesIfNotExists("user_stage_member_volumes", [{
                        name: "user_stage-member",
                        index: [r.row("userId"), r.row("stageMemberId")]
                    }]),
                ]));
            })
    }

    attachHandler() {
        console.log("Attach handlers");
        return Promise.all([
            this.attachEventsToTable<Server.Router>("routers", DatabaseEvents.RouterAdded, DatabaseEvents.RouterChanged, DatabaseEvents.RouterRemoved),

            this.attachEventsToTable<Server.User>("users", DatabaseEvents.UserAdded, DatabaseEvents.UserChanged, DatabaseEvents.UserRemoved),
            this.attachEventsToTable<Server.Device>("devices", DatabaseEvents.DeviceAdded, DatabaseEvents.DeviceChanged, DatabaseEvents.DeviceRemoved),
            this.attachEventsToTable<Server.Producer>("producers", DatabaseEvents.ProducerAdded, DatabaseEvents.ProducerChanged, DatabaseEvents.ProducerRemoved),

            this.attachEventsToTable<Server.Stage>("stages", DatabaseEvents.StageAdded, DatabaseEvents.StageChanged, DatabaseEvents.StageRemoved),
            this.attachEventsToTable<Server.StageMember>("stage_members", DatabaseEvents.StageMemberAdded, DatabaseEvents.StageMemberChanged, DatabaseEvents.StageMemberRemoved),
            this.attachEventsToTable<Server.UserStageMemberVolume>("user_stage_member_volumes", DatabaseEvents.UserStageMemberVolumeAdded, DatabaseEvents.UserStageMemberVolumeChanged, DatabaseEvents.UserStageMemberVolumeRemoved),

            this.attachEventsToTable<Server.Group>("groups", DatabaseEvents.GroupAdded, DatabaseEvents.GroupChanged, DatabaseEvents.GroupRemoved),
            this.attachEventsToTable<Server.UserGroupVolume>("user_group_volumes", DatabaseEvents.UserGroupVolumeAdded, DatabaseEvents.UserGroupVolumeChanged, DatabaseEvents.UserGroupVolumeRemoved)
        ])
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

    // CLASSES FOR INITIAL DATA
    public createUser(user: Server.User) {
        return r.db('ds').table('users')
            .insert(user)
            .run(this.connection)
            .then(() => user);
    }


    public getLastStagesOfUser(id: UserId): Promise<Client.StageDescription[]> {
        return r.db('ds')
            .table('stage_members')
            .pluck('stageId')
            .filter({userId: id})
            .eqJoin("stageId", r.table('stages'))
            .zip()
            .run(this.connection)
            .then(cursors => cursors.toArray())
            .then(stages => stages.map(stage => ({
                id: stage.id,
                name: stage.name
            } as Client.StageDescription)));
    }

    public getUserDescriptions(userIds: UserId[]): Promise<Client.UserDescription[]> {
        return r.db('ds')
            .table('users')
            .getAll(userIds, {index: 'id'})
            .pluck('id', 'name', 'avatarUrl')
            .run(this.connection)
            .then(cursor => cursor.toArray<Client.UserDescription>())
    }

    public getUserDefinedGroupMembers(userId: UserId, groupId: GroupId): Promise<Client.GroupMember[]> {
        return r.db('ds')
            .table('stage_members')
            .getAll(groupId, {index: 'groupId'})
            .eqJoin("userId", r.db('ds').table('users').pluck('name', 'avatarUrl'))
            .eqJoin("groupId", r.db('ds').table('user_stage_member_volumes').filter({userId: userId}).pluck("volume"), {index: 'groupId'})
            .run(this.connection)
            .then(cursor => cursor.toArray<Server.UserStageMemberVolume & { name: string, avatarUrl: string | null } & Server.StageMember>())
            .then(arr => arr.map(item => ({
                id: item.id,
                name: item.name,
                avatarUrl: item.avatarUrl,
                isDirector: item.isDirector,
                volume: item.volume,


            })))
    }

    public getUserDefinedStageGroups(userId: UserId, stageId: StageId): Promise<Client.Group[]> {
        return r.db('ds')
            .table('groups')
            .getAll(stageId, {index: 'stageId'})
            .merge((group: Server.Group): Client.Group => {
                return {
                    id: group.id,
                    name: group.name,
                    volume: group.volume,
                    customVolume:

                }
            })
            .run(this.connection)
            .then(cursor => cursor.toArray<Client.Group>());
    }

    public getStage(id: StageId): Promise<Client.Stage> {
        return r.db('ds')
            .table('stage')
            .get<Server.Stage>(id)
            .run(this.connection)
            .then(async stage => ({
                ...stage,
                admins: await this.getUserDescriptions(stage.admins),
                groups: []
            }))
    }

    public getUser(id: UserId): Promise<Client.User> {

        return r.db('ds')
            .table('users')
            .get<Server.User>(id)
            .run(this.connection)
            .then(async user => ({
                ...user,
                stage: user.stageId ? await this.getStage(user.stageId) : null,
                lastStageIds: await this.getLastStagesOfUser(id)
            } as Client.User));

    }

    public removeUser(id: UserId) {
        r.db('ds').table('users')
            .get(id)
            .delete()
            .run(this.connection);
    }

    public getFullStageForUser(id: UserId): Promise<Client.Stage | null> {
        // Is user currently in stage?

        return this.getCurrentGroupIdForUser(id)
            .then(groupId => {
                if (groupId) {
                    return this.database.getStage();
                }
            });
    }
}