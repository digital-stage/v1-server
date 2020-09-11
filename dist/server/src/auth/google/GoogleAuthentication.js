"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const Manager_1 = require("../../storage/Manager");
const serviceAccount = require('../../../firebase-adminsdk.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://digitalstage-wirvsvirus.firebaseio.com"
});
class GoogleAuthentication {
    authorizeSocket(socket) {
        return new Promise((resolve, reject) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                reject(new Error("Missing authorization"));
            }
            return admin.auth()
                .verifyIdToken(socket.handshake.query.token)
                .then(decodedIDToken => admin.auth().getUser(decodedIDToken.uid))
                .then(firebaseUser => {
                return Manager_1.manager.getUserByUid(firebaseUser.uid)
                    .then(user => {
                    if (!user) {
                        return Manager_1.manager.createUserWithUid(firebaseUser.uid, firebaseUser.displayName, firebaseUser.photoURL);
                    }
                    return user;
                });
            })
                .then(user => resolve(user));
        });
    }
    authorizeRequest(req) {
        return new Promise((resolve, reject) => {
            if (!req.headers.authorization) {
                reject(new Error("Missing authorization"));
            }
            return admin.auth()
                .verifyIdToken(req.headers.authorization)
                .then(decodedIDToken => admin.auth().getUser(decodedIDToken.uid))
                .then(firebaseUser => {
                return Manager_1.manager.getUserByUid(firebaseUser.uid)
                    .then(user => {
                    if (!user) {
                        return Manager_1.manager.createUserWithUid(firebaseUser.uid, firebaseUser.displayName, firebaseUser.photoURL);
                    }
                    return user;
                });
            })
                .then(user => resolve(user));
        });
    }
}
exports.default = GoogleAuthentication;
//# sourceMappingURL=GoogleAuthentication.js.map