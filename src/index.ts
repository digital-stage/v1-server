import * as socketIO from "socket.io";
import * as admin from "firebase-admin";
import * as r from "rethinkdb";
import {IDatabase} from "./IDatabase";
import {
    COMMANDS,
    EVENTS,
    RemoteDevicePayload,
    RemoteTrackPayload,
    RemoteUserPayload,
    Stage,
    StagePayload,
    Track,
    User,
    UserPayload
} from "./data.model";

const authorizeSocket = (socket: socketIO.Socket): Promise<admin.auth.UserRecord> => {
    return new Promise<admin.auth.UserRecord>((resolve, reject) => {
        if (!socket.handshake.query || !socket.handshake.query.authorization) {
            reject(new Error("Missing authorization"));
        }
        return admin.auth()
            .verifyIdToken(socket.handshake.query.authorization)
            .then(decodedIDToken => admin.auth().getUser(decodedIDToken.uid))
            .then(user => resolve(user))
            .catch(() => reject(new Error("Invalid authorization")))
    })
}

const database: IDatabase;

const initializeWebsocket = (): socketIO.Server => {
    const io: socketIO.Server = socketIO(4000);

    // PLEASE DON'T USE SENDTOSTAGE OR STAGE GROUPS - WE ARE ITERATING EACH TIME OVER EACH USER OF A STAGE, SO WE CAN DIRECTLY USE THE FOLLOWING METHOD INSTEAD (it's easier and more safe)
    const sendToUser = (uid: string, event: string, payload: any) => {
        io.to(uid).send(event, payload);
    }

    io.on("connection", (socket: socketIO.Socket) => {
        authorizeSocket(socket)
            .then(async firebaseUser => {
                const uid: string = firebaseUser.uid;
                const sendToDevice = (event: string, payload: any) => {
                    socket.emit(event, payload);
                }

                // Socket has been authorized
                // Check if user is already in database
                let user: User = await database.getUser(uid);
                if (!user) {
                    user = await database.createUser(uid, firebaseUser.displayName, firebaseUser.photoURL);
                }

                if (user.stageId) {
                    const stage: Stage = await database.getStage(user.stageId);
                    sendToDevice(EVENTS.STAGE_CHANGED, stage);
                    const remoteUsers: RemoteUserPayload[] = await database.getRemoteUsersByStage(stage.id);
                    remoteUsers.forEach(remoteUser => {
                        sendToDevice(EVENTS.REMOTE_USER_ADDED, remoteUser);
                    });
                    const remoteDevices: RemoteDevicePayload[] = await database.getRemoteDevicesByStage(stage.id);
                    remoteDevices.forEach(remoteDevice => {
                        sendToDevice(EVENTS.REMOTE_DEVICE_ADDED, remoteDevice);
                    });
                    const remoteTracks: RemoteTrackPayload[] = await database.getRemoteTracksByStageForUser(stage.id, user.id);
                    remoteTracks.forEach(remoteTrack => {
                        sendToDevice(EVENTS.REMOTE_TRACK_ADDED, remoteTrack);
                    });
                }

                // Add listeners
                socket.on(COMMANDS.ADD_TRACK, () => {

                });
                socket.on(COMMANDS.REMOVE_TRACK, (payload: string) => {
                    return database.getTrack(payload)
                        .then((track) => {
                            if (track.userId === uid) {
                                return database.removeTrack(track.id)
                                    .then(() => sendToUser(uid, EVENTS.TRACK_REMOVED, payload))
                            }
                        });
                });
                socket.on(COMMANDS.CREATE_STAGE, () => {

                });
                socket.on(COMMANDS.JOIN_STAGE, () => {

                });
                socket.on(COMMANDS.LEAVE_STAGE, () => {

                });
                socket.on(COMMANDS.REGISTER_DEVICE, () => {

                });
                socket.on(COMMANDS.UNREGISTER_DEVICE, () => {

                });
                socket.on(COMMANDS.UPDATE_DEVICE, () => {

                });
                socket.on(COMMANDS.UPDATE_REMOTE_TRACK, () => {

                });
                socket.on(COMMANDS.UPDATE_STAGE, (payload: StagePayload) => {
                    return database.getStage(payload.id)
                        .then(stage => {
                            if (stage.adminId === uid) {
                                database.updateStage(stage.id, payload)
                                    .then(() => {
                                        // WE HAVE TO INFORM ALL MEMBERS OF THIS STAGE

                                        // OK, STOP - vielleicht doch alles gleiche für alle in die stage (bis auf volumes und sowas) und dann nen listener drauf schicken?
                                        // Denn unten bei UPDATE_TRACK müsste man das ja auch machen. eigentlich immer. Fast keine Daten sind "privat"
                                    });
                            }
                        })
                });
                socket.on(COMMANDS.UPDATE_TRACK, (payload: Track) => {
                    return database.getTrack(payload.id)
                        .then((track) => {
                            if (track.userId === uid) {
                                return database.updateTrack(track.id, payload)
                                    .then(() => sendToUser(uid, EVENTS.TRACK_CHANGED, payload))
                            }
                        });
                });
                socket.on(COMMANDS.UPDATE_USER, (payload: UserPayload) => {
                    if (payload.id === uid) {
                        return database.updateUser(uid, payload)
                            .then(() => sendToUser(uid, EVENTS.USER_CHANGED, payload))
                    }
                });

                sendToDevice(EVENTS.READY, true);
            })
            .catch((error) => {
                socket.error(error.message);
                socket.disconnect();
            });
    });

    return io;
}

// INIT FIREBASE
const adminConfig = require('./../../firebase-adminsdk.json');
admin.initializeApp({
    ...adminConfig,
    databaseURL: "https://digitalstage-wirvsvirus.firebaseio.com"
});

// INIT REALTIMEDB
r.connect({
    host: "46.101.146.123",
    port: 28015
}).then(conn => {
    // INIT WEBSOCKET
    initializeWebsocket();
});
