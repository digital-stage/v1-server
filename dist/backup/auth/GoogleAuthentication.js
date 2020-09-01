"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const adminConfig = require('./../../firebase-adminsdk.json');
admin.initializeApp(Object.assign(Object.assign({}, adminConfig), { databaseURL: "https://digitalstage-wirvsvirus.firebaseio.com" }));
class GoogleAuthentication {
    authorizeSocket(socket) {
        return new Promise((resolve, reject) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                reject(new Error("Missing authorization"));
            }
            return admin.auth()
                .verifyIdToken(socket.handshake.query.token)
                .then(decodedIDToken => admin.auth().getUser(decodedIDToken.uid))
                .then(user => resolve({
                id: user.uid,
                name: user.displayName,
                avatarUrl: user.photoURL,
                stageId: null
            }))
                .catch(() => reject(new Error("Invalid authorization")));
        });
    }
}
exports.default = GoogleAuthentication;
//# sourceMappingURL=GoogleAuthentication.js.map