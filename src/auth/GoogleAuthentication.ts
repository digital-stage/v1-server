import * as socketIO from "socket.io";
import * as admin from "firebase-admin";
import {Request} from "express";
import Auth from "./IAuthentication";

const serviceAccount = require('./../../firebase-adminsdk.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://digitalstage-wirvsvirus.firebaseio.com"
});

class GoogleAuthentication implements Auth.IAuthentication {
    authorizeSocket(socket: socketIO.Socket): Promise<Auth.User> {
        return new Promise<Auth.User>((resolve, reject) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                reject(new Error("Missing authorization"));
            }
            return admin.auth()
                .verifyIdToken(socket.handshake.query.token)
                .then(decodedIDToken => admin.auth().getUser(decodedIDToken.uid))
                .then(user => resolve({
                    id: user.uid,
                    name: user.displayName ? user.displayName : user.email,
                    avatarUrl: user.photoURL ? user.photoURL : null
                }))
        })
    }

    authorizeRequest(req: Request): Promise<Auth.User> {
        return new Promise<Auth.User>((resolve, reject) => {
            if (!req.headers.authorization) {
                reject(new Error("Missing authorization"));
            }
            return admin.auth()
                .verifyIdToken(req.headers.authorization)
                .then(decodedIDToken => admin.auth().getUser(decodedIDToken.uid))
                .then(user => resolve({
                    id: user.uid,
                    name: user.displayName,
                    avatarUrl: user.photoURL ? user.photoURL : null
                }))
        })
    }
}

export default GoogleAuthentication;