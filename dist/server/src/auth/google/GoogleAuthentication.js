"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const Manager_1 = require("../../storage/Manager");
const pino = require("pino");
const serviceAccount = require('../../../firebase-adminsdk.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://digitalstage-wirvsvirus.firebaseio.com"
});
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
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
                        logger.debug("[GOOGLE AUTH] Creating new user " + firebaseUser.displayName);
                        return Manager_1.manager.createUserWithUid(firebaseUser.uid, firebaseUser.displayName, firebaseUser.photoURL)
                            .then(user => resolve(user));
                    }
                    logger.debug("[GOOGLE AUTH] Signed in user " + firebaseUser.displayName);
                    return resolve(user);
                });
            })
                .catch(error => console.error(error));
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
            });
        });
    }
}
exports.default = GoogleAuthentication;
//# sourceMappingURL=GoogleAuthentication.js.map