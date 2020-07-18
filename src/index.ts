import * as socketIO from "socket.io";
import * as admin from "firebase-admin";
import * as r from "rethinkdb";

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

const initializeWebsocket = (): socketIO.Server => {
    const io: socketIO.Server = socketIO(4000);

    // PLEASE DON'T USE SENDTOSTAGE OR STAGE GROUPS - WE ARE ITERATING EACH TIME OVER EACH USER OF A STAGE, SO WE CAN DIRECTLY USE THE FOLLOWING METHOD INSTEAD (it's easier and more safe)
    const sendToUser = (uid: string, event: string, payload: any) => {
        io.to(uid).send(event, payload);
    }

    io.on("connection", (socket: socketIO.Socket) => {
        authorizeSocket(socket)
            .then(async firebaseUser => {
                const sendToDevice = (event: string, payload: any) => {
                    socket.emit(event, payload);
                }

                // Socket has been authorized
                // Check if user is already in database

                // Send message to all stage participants, if stage has changed


                r.table("")

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
