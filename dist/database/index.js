"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseEvents = void 0;
const events_1 = require("events");
const r = require("rethinkdb");
const uuid_1 = require("uuid");
var DatabaseEvents;
(function (DatabaseEvents) {
    DatabaseEvents["USER_CHANGED"] = "user-changed";
    DatabaseEvents["TRACK_ADDED"] = "track-added";
    DatabaseEvents["TRACK_CHANGED"] = "track-changed";
    DatabaseEvents["TRACK_REMOVED"] = "track-removed";
    DatabaseEvents["STAGE_MEMBER_ADDED"] = "stage-member-added";
    DatabaseEvents["STAGE_MEMBER_CHANGED"] = "stage-member-added";
    DatabaseEvents["STAGE_MEMBER_REMOVED"] = "stage-member-removed";
    DatabaseEvents["STAGE_TRACK_ADDED"] = "stage-track-added";
    DatabaseEvents["STAGE_TRACK_CHANGED"] = "stage-track-changed";
    DatabaseEvents["STAGE_TRACK_REMOVED"] = "stage-track-removed";
    DatabaseEvents["USER_STAGE_TRACK_ADDED"] = "user-stage-track-added";
    DatabaseEvents["USER_STAGE_TRACK_CHANGED"] = "user-stage-track-changed";
    DatabaseEvents["USER_STAGE_TRACK_REMOVED"] = "stage-track-removed";
    DatabaseEvents["DEVICE_ADDED"] = "device-added";
    DatabaseEvents["DEVICE_CHANGED"] = "device-changed";
    DatabaseEvents["DEVICE_REMOVED"] = "device-removed";
})(DatabaseEvents = exports.DatabaseEvents || (exports.DatabaseEvents = {}));
class Database extends events_1.EventEmitter {
    constructor() {
        super();
        // INIT REALTIMEDB
        r.connect({
            host: "46.101.146.123",
            port: 28015
        }).then(conn => {
            // INIT WEBSOCKET
            this.connection = conn;
            this.addHandler();
        });
    }
    addHandler() {
        r.table("tracks")
            .changes()
            .run(this.connection)
            .then((cursor) => cursor.each((err, row) => {
            const oldTrack = row.old_val;
            const newTrack = row.old_val;
            if (newTrack) {
                if (oldTrack) {
                    // Track changed
                    this.emit(DatabaseEvents.TRACK_CHANGED, newTrack);
                }
                else {
                    // Track added
                    this.emit(DatabaseEvents.TRACK_ADDED, newTrack);
                }
            }
            else {
                if (oldTrack) {
                    // Track removed
                    this.emit(DatabaseEvents.TRACK_REMOVED, oldTrack);
                } // else = ?!?
            }
        }));
        r.table("devices")
            .changes()
            .run(this.connection)
            .then(cursor => cursor.each((err, row) => {
            const oldDevice = row.old_val;
            const newDevice = row.new_val;
            if (newDevice) {
                if (oldDevice) {
                    // Track changed
                    this.emit(DatabaseEvents.DEVICE_CHANGED, newDevice);
                }
                else {
                    // Track added
                    this.emit(DatabaseEvents.DEVICE_ADDED, newDevice);
                }
            }
            else {
                if (oldDevice) {
                    // Track removed
                    this.emit(DatabaseEvents.DEVICE_REMOVED, oldDevice);
                } // else = ?!?
            }
        }));
        //TODO: Stage member but always with merge with users (to deliver the whole user)
        r.table("stage_members")
            .changes()
            .run(this.connection)
            .then(cursor => cursor.each((err, row) => {
            const oldStageMember = row.old_val;
            const newStageMember = row.new_val;
            if (newStageMember) {
                if (oldStageMember) {
                    // Track changed
                    this.emit(DatabaseEvents.STAGE_MEMBER_CHANGED, newStageMember);
                }
                else {
                    // Track added
                    this.emit(DatabaseEvents.STAGE_MEMBER_ADDED, newStageMember);
                }
            }
            else {
                if (oldStageMember) {
                    // Track removed
                    this.emit(DatabaseEvents.STAGE_MEMBER_REMOVED, oldStageMember);
                } // else = ?!?
            }
        }));
    }
    storeUser(user) {
        return r.table("users")
            .update(user)
            .run(this.connection)
            .then(() => user);
    }
    getUser(userId) {
        return r.table("users")
            .get(userId)
            .run(this.connection)
            .then(user => user);
    }
    addDevice(userId, mac) {
        return r.table("devices")
            .insert({});
    }
    getDeviceByMac(mac) {
        return r.table("devices")
            .getAll(mac, {
            index: "mac"
        })
            .filter(r.row("mac").eq(mac))
            .run(this.connection)
            .then(cursor => {
            if (cursor.hasNext()) {
                return cursor.toArray()[0];
            }
            throw new Error("Not found");
        });
    }
    addTrack(deviceId, kind, routerId, producerId) {
        const id = uuid_1.v4();
        const track = {
            id: id,
            deviceId: deviceId,
            kind: kind,
            routerId: routerId,
            producerId: producerId
        };
        return r.table("tracks").insert(track)
            .run(this.connection)
            .then(() => track);
    }
    updateTrack(trackId, track) {
        return r.table("tracks").update(Object.assign(Object.assign({}, track), { id: trackId }))
            .run(this.connection)
            .then(() => true);
    }
    removeTrack(trackId, track) {
        return r.table("tracks").update(Object.assign(Object.assign({}, track), { id: trackId }))
            .run(this.connection)
            .then(() => true);
    }
    getStageById(stageId) {
    }
}
exports.default = Database;
//# sourceMappingURL=index.js.map