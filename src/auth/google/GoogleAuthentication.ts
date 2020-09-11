import * as socketIO from "socket.io";
import * as admin from "firebase-admin";
import {Request} from "express";
import Auth from "../IAuthentication";
import {User} from "../../model.common";
import {manager} from "../../storage/Manager";

const serviceAccount = require('../../../firebase-adminsdk.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://digitalstage-wirvsvirus.firebaseio.com"
});

class GoogleAuthentication implements Auth.IAuthentication {
    authorizeSocket(socket: socketIO.Socket): Promise<User> {
        return new Promise<User>((resolve, reject) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                reject(new Error("Missing authorization"));
            }
            return admin.auth()
                .verifyIdToken(socket.handshake.query.token)
                .then(decodedIDToken => admin.auth().getUser(decodedIDToken.uid))
                .then(firebaseUser => {
                    return manager.getUserByUid(firebaseUser.uid)
                        .then(user => {
                            if (!user) {
                                return manager.createUserWithUid(firebaseUser.uid, firebaseUser.displayName, firebaseUser.photoURL)
                            }
                            return user;
                        })
                })
                .then(user => resolve(user));
        })
    }

    authorizeRequest(req: Request): Promise<User> {
        return new Promise<User>((resolve, reject) => {
            if (!req.headers.authorization) {
                reject(new Error("Missing authorization"));
            }
            return admin.auth()
                .verifyIdToken(req.headers.authorization)
                .then(decodedIDToken => admin.auth().getUser(decodedIDToken.uid))
                .then(firebaseUser => {
                    return manager.getUserByUid(firebaseUser.uid)
                        .then(user => {
                            if (!user) {
                                return manager.createUserWithUid(firebaseUser.uid, firebaseUser.displayName, firebaseUser.photoURL)
                            }
                            return user;
                        })
                })
                .then(user => resolve(user));
        })
    }
}

export default GoogleAuthentication;