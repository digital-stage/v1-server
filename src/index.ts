import * as socketIO from "socket.io";
import {IAuthentication} from "./auth/IAuthentication";
import GoogleAuthentication from "./auth/GoogleAuthentication";
import {Stage} from "./model";
import {Database, DatabaseEvents} from "./database";

const database: Database = new Database();
const authentication: IAuthentication = new GoogleAuthentication();

const io: socketIO.Server = socketIO(4000);

const sendToUser = (uid: string, event: string, payload: any) => {
    io.to(uid).send(event, payload);
}

database.on(DatabaseEvents.USER_CHANGED, track => {
    // If stage Id changed, add all user's tracks as stage tracks
})

database.on(DatabaseEvents.TRACK_ADDED, track => {
    // Get user for track
})


io.on("connection", (socket: socketIO.Socket) => {
    authentication.authorizeSocket(socket)
        .then(async user => {
            const uid: string = user.id;
            const sendToDevice = (event: string, payload: any) => {
                socket.emit(event, payload);
            }

            // Socket has been authorized
            // Check if user is already in database
            let existingUser = database.getUser(user.id);
            if (!existingUser) {
                database.storeUser(user);
            } else {
                user = existingUser;
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
