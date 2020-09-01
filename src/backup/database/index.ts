import {Device, Track, User} from "../model";
import * as r from "rethinkdb";
import {v4 as uuidv4} from 'uuid';
import * as EventEmitter from "events";

export enum DatabaseEvents {
    USER_CHANGED = "user-changed",
    TRACK_ADDED = "track-added",
    TRACK_CHANGED = "track-changed",
    TRACK_REMOVED = "track-removed",
    STAGE_MEMBER_ADDED = "stage-member-added",
    STAGE_MEMBER_CHANGED = "stage-member-added",
    STAGE_MEMBER_REMOVED = "stage-member-removed",
    STAGE_TRACK_ADDED = "stage-track-added",
    STAGE_TRACK_CHANGED = "stage-track-changed",
    STAGE_TRACK_REMOVED = "stage-track-removed",
    USER_STAGE_TRACK_ADDED = "user-stage-track-added",
    USER_STAGE_TRACK_CHANGED = "user-stage-track-changed",
    USER_STAGE_TRACK_REMOVED = "stage-track-removed",
    DEVICE_ADDED = "device-added",
    DEVICE_CHANGED = "device-changed",
    DEVICE_REMOVED = "device-removed"
}


class Database extends EventEmitter.EventEmitter {
    private connection;

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

    private addHandler() {
        /*
        r.table("tracks")
            .changes()
            .run(this.connection)
            .then((cursor) =>
                cursor.each((err, row) => {
                    const oldTrack: Track = row.old_val;
                    const newTrack: Track = row.old_val;
                    if (newTrack) {
                        if (oldTrack) {
                            // Track changed
                            this.emit(DatabaseEvents.TRACK_CHANGED, newTrack);
                        } else {
                            // Track added
                            this.emit(DatabaseEvents.TRACK_ADDED, newTrack);
                        }
                    } else {
                        if (oldTrack) {
                            // Track removed
                            this.emit(DatabaseEvents.TRACK_REMOVED, oldTrack);
                        }   // else = ?!?
                    }
                })
            );
        r.table("devices")
            .changes()
            .run(this.connection)
            .then(cursor =>
                cursor.each((err, row) => {
                    const oldDevice: Device = row.old_val;
                    const newDevice: Device = row.new_val;
                    if (newDevice) {
                        if (oldDevice) {
                            // Track changed
                            this.emit(DatabaseEvents.DEVICE_CHANGED, newDevice);
                        } else {
                            // Track added
                            this.emit(DatabaseEvents.DEVICE_ADDED, newDevice);
                        }
                    } else {
                        if (oldDevice) {
                            // Track removed
                            this.emit(DatabaseEvents.DEVICE_REMOVED, oldDevice);
                        }   // else = ?!?
                    }
                })
            )
        //TODO: Stage member but always with merge with users (to deliver the whole user)
        r.table("stage_members")
            .changes()
            .run(this.connection)
            .then(cursor =>
                cursor.each((err, row) => {
                    const oldStageMember: Device = row.old_val;
                    const newStageMember: Device = row.new_val;
                    if (newStageMember) {
                        if (oldStageMember) {
                            // Track changed
                            this.emit(DatabaseEvents.STAGE_MEMBER_CHANGED, newStageMember);
                        } else {
                            // Track added
                            this.emit(DatabaseEvents.STAGE_MEMBER_ADDED, newStageMember);
                        }
                    } else {
                        if (oldStageMember) {
                            // Track removed
                            this.emit(DatabaseEvents.STAGE_MEMBER_REMOVED, oldStageMember);
                        }   // else = ?!?
                    }
                })
            )*/
    }

    storeUser(user: User): Promise<User> {
        return r.table("users")
            .update(user)
            .run(this.connection)
            .then(() => user);
    }

    getUser(userId: string): Promise<User> {
        return r.table("users")
            .get(userId)
            .run(this.connection)
            .then(user => user as User);
    }

    addDevice(userId: string, initialDevice?: Partial<Device>): Promise<Device> {
        const id: string = uuidv4();
        const device: Device = {
            name: "Unnamed",
            canAudio: false,
            canVideo: false,
            receiveVideo: false,
            receiveAudio: false,
            sendVideo: false,
            sendAudio: false,
            ...initialDevice,
            id: id,
            userId: userId
        }
        console.log(device);
        return r.table("devices")
            .insert(device)
            .run(this.connection)
            .then(() => device);
    }

    getDeviceByMac(mac: string): Promise<Device> {
        return r.table("devices")
            .getAll(mac, {
                index: "mac"
            })
            .filter(r.row("mac").eq(mac))
            .run(this.connection)
            .then(cursor => {
                if (cursor.hasNext()) {
                    return cursor.toArray<Device>()[0];
                }
                throw new Error("Not found");
            })
    }

    removeDevice(deviceId: string): Promise<any> {
        return r.table("devices")
            .get(deviceId)
            .delete()
            .run(this.connection);
    }

    addTrack(deviceId: string, kind: "audio" | "video" | "ov-audio", routerId?: string, producerId?: string): Promise<Track> {
        const id: string = uuidv4();
        const track: Track = {
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

    updateTrack(trackId: string, track: Partial<Track>): Promise<boolean> {
        return r.table("tracks").update({
            ...track,
            id: trackId
        })
            .run(this.connection)
            .then(() => true);
    }

    removeTrack(trackId: string, track: Partial<Track>): Promise<boolean> {
        return r.table("tracks").update({
            ...track,
            id: trackId
        })
            .run(this.connection)
            .then(() => true);
    }


    getStageById(stageId: string) {

    }
}

export default Database;