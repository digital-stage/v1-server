import * as socketIO from "socket.io";
import {Request} from "express";
import Auth from "../IAuthentication";
import {User} from "../../model.common";

class DummyAuthentication implements Auth.IAuthentication {
    authorizeSocket(socket: socketIO.Socket): Promise<User> {
        return new Promise<User>((resolve, reject) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                reject(new Error("Missing authorization"));
            }
            if (socket.handshake.query.token === "123")
                return resolve({
                    _id: "123",
                    uid: "123",
                    name: "Test",
                    avatarUrl: "https://vignette.wikia.nocookie.net/bibi-blocksberg/images/e/e1/Dgtzgh.png/revision/latest/top-crop/width/360/height/450?cb=20190623184129&path-prefix=de",
                    stageMembers: []
                });
            reject(new Error("Invalid credentials, try 123"))
        })
    }

    authorizeRequest(req: Request): Promise<User> {
        return new Promise<User>((resolve, reject) => {
            if (!req.headers.authorization) {
                reject(new Error("Missing authorization"));
            }
            if (req.headers.authorization === "123")
                return resolve({
                    _id: "123",
                    uid: "123",
                    name: "Test",
                    avatarUrl: "https://vignette.wikia.nocookie.net/bibi-blocksberg/images/e/e1/Dgtzgh.png/revision/latest/top-crop/width/360/height/450?cb=20190623184129&path-prefix=de",
                    stageMembers: []
                });
            reject(new Error("Invalid credentials, try 123"))
        })
    }

    login(email: string, password: string) {
    }

    logout() {
    }

    signup(email: string, password: string) {
    }
}

const isValid = (token: string) => {
    return token === "123";
}
export const DummyAuthenticationMiddleware: Auth.IAuthenticationMiddleware = ((socket, next) => {
    let token = socket.handshake.query.token;
    if (isValid(token)) {
        return next();
    }
    return next(new Error('authentication error'));
})

export default DummyAuthentication;