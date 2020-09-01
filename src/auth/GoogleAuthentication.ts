import * as socketIO from "socket.io";
import {IAuthentication} from "./IAuthentication";
import * as admin from "firebase-admin";
import Server from "../model.server";

const adminConfig = require('./../../firebase-adminsdk.json');
admin.initializeApp({
    ...adminConfig,
    databaseURL: "https://digitalstage-wirvsvirus.firebaseio.com"
});

class GoogleAuthentication implements IAuthentication {
    authorizeSocket(socket: socketIO.Socket): Promise<Server.User> {
        return new Promise<Server.User>((resolve, reject) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                reject(new Error("Missing authorization"));
            }
            return admin.auth()
                .verifyIdToken(socket.handshake.query.token)
                .then(decodedIDToken => admin.auth().getUser(decodedIDToken.uid))
                .then(user => resolve({
                    id: user.uid,
                    name: user.displayName,
                    avatarUrl: user.photoURL
                }))
                .catch(() => reject(new Error("Invalid authorization")))
        })
    }

}

export default GoogleAuthentication;