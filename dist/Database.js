"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const IDatabase_1 = require("./IDatabase");
const EventEmitter = require("events");
const r = require("rethinkdb");
const uuid_1 = require("uuid");
class Database extends EventEmitter.EventEmitter {
    constructor() {
        super();
    }
    init() {
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
    initDatabase() {
        console.log("Init database");
        return r.dbList()
            .run(this.connection)
            .then((list) => __awaiter(this, void 0, void 0, function* () {
            if (list.indexOf("ds") === -1) {
                yield r.dbCreate('ds').run(this.connection);
            }
            const tables = yield r.db('ds').tableList().run(this.connection);
            const createIfNotExists = (tableName) => {
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
        }));
    }
    attachHandler() {
        console.log("Attach handlers");
        return Promise.all([
            this.attachEventsToTable("routers", IDatabase_1.DatabaseEvents.RouterAdded, IDatabase_1.DatabaseEvents.RouterChanged, IDatabase_1.DatabaseEvents.RouterRemoved),
            this.attachEventsToTable("users", IDatabase_1.DatabaseEvents.UserAdded, IDatabase_1.DatabaseEvents.UserChanged, IDatabase_1.DatabaseEvents.UserRemoved),
            this.attachEventsToTable("devices", IDatabase_1.DatabaseEvents.DeviceAdded, IDatabase_1.DatabaseEvents.DeviceChanged, IDatabase_1.DatabaseEvents.DeviceRemoved),
            this.attachEventsToTable("producers", IDatabase_1.DatabaseEvents.ProducerAdded, IDatabase_1.DatabaseEvents.ProducerChanged, IDatabase_1.DatabaseEvents.ProducerRemoved),
            this.attachEventsToTable("stages", IDatabase_1.DatabaseEvents.StageAdded, IDatabase_1.DatabaseEvents.StageChanged, IDatabase_1.DatabaseEvents.StageRemoved),
            this.attachEventsToTable("groups", IDatabase_1.DatabaseEvents.GroupAdded, IDatabase_1.DatabaseEvents.GroupChanged, IDatabase_1.DatabaseEvents.GroupRemoved),
            this.attachEventsToTable("group_volumes", IDatabase_1.DatabaseEvents.GroupVolumeAdded, IDatabase_1.DatabaseEvents.GroupVolumeChanged, IDatabase_1.DatabaseEvents.GroupVolumeRemoved),
            this.attachEventsToTable("group_users", IDatabase_1.DatabaseEvents.GroupUserAdded, IDatabase_1.DatabaseEvents.GroupUserChanged, IDatabase_1.DatabaseEvents.GroupUserRemoved),
            this.attachEventsToTable("group_user_volumes", IDatabase_1.DatabaseEvents.GroupUserVolumeAdded, IDatabase_1.DatabaseEvents.GroupUserVolumeChanged, IDatabase_1.DatabaseEvents.GroupUserVolumeRemoved)
        ]);
    }
    create(tableName, model) {
        const id = uuid_1.v4();
        const item = Object.assign(Object.assign({}, model), { id: id });
        return r.db('ds').table(tableName).insert(item)
            .run(this.connection)
            .then(() => item);
    }
    read(tableName, id) {
        return r.db('ds').table(tableName)
            .get(id)
            .run(this.connection)
            .then((model) => model);
    }
    update(tableName, id, model) {
        return r.db('ds').table(tableName)
            .update(Object.assign(Object.assign({}, model), { id }))
            .run(this.connection)
            .then(value => value.replaced > 0);
    }
    delete(tableName, id) {
        return r.db('ds').table(tableName)
            .get(id)
            .delete()
            .run(this.connection)
            .then(value => value.deleted > 0);
    }
    listenToTable(tableName, added, changed, removed) {
        r.db('ds').table(tableName)
            .changes()
            .run(this.connection)
            .then((cursor) => cursor.each((err, row) => {
            const oldValue = row.old_val;
            const newValue = row.new_val;
            if (newValue) {
                if (oldValue) {
                    // Changed
                    changed(newValue);
                }
                else {
                    // Added
                    added(newValue);
                }
            }
            else {
                if (oldValue) {
                    // Removed
                    removed(oldValue);
                }
            }
        }))
            .catch((err) => console.error(err));
    }
    attachEventsToTable(tableName, added, changed, removed) {
        this.listenToTable(tableName, (value) => {
            this.emit(added, value);
        }, (value) => {
            this.emit(changed, value);
        }, (value) => {
            this.emit(removed, value);
        });
    }
    createStage(stage) {
        return this.create("stages", stage);
    }
    createGroup(group) {
        return this.create("groups", group);
    }
    createUser(user) {
        return this.create("users", user);
    }
    readGroup(id) {
        return this.read("groups", id);
    }
    readStage(id) {
        return this.read("stages", id);
    }
    readUser(id) {
        return this.read("users", id);
    }
    deleteGroup(id) {
        return this.delete("groups", id);
    }
    deleteStage(id) {
        return this.delete("stages", id);
    }
    deleteUser(id) {
        return this.delete("users", id);
    }
    updateGroup(id, group) {
        return this.update("groups", id, group);
    }
    updateStage(id, stage) {
        return this.update("stages", id, stage);
    }
    updateUser(id, user) {
        return this.update("users", id, user);
    }
    createDevice(device) {
        return this.create("devices", device);
    }
    deleteDevice(id) {
        return this.delete("devices", id);
    }
    readDevice(id) {
        return this.read("devices", id);
    }
    updateDevice(id, device) {
        return this.update("devices", id, device);
    }
    readDeviceByUserAndMac(userId, mac) {
        return r.db('ds').table("devices")
            .filter(r.row('userId').eq(userId))
            .filter(r.row('mac').eq(mac))
            .run(this.connection)
            .then((model) => model);
    }
}
exports.Database = Database;
//# sourceMappingURL=Database.js.map