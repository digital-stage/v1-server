import * as socketIO from "socket.io";
import Auth, {IAuthentication, IAuthenticationMiddleware} from "./IAuthentication";
import Server from "../model.server";
import {Request} from "express";
import * as admin from "firebase-admin";

class DummyAuthentication implements IAuthentication {
    authorizeSocket(socket: socketIO.Socket): Promise<Server.User> {
        return new Promise<Auth.User>((resolve, reject) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                reject(new Error("Missing authorization"));
            }
            if (socket.handshake.query.token === "123")
                return resolve({
                    id: "123",
                    name: "Test",
                    avatarUrl: "https://vignette.wikia.nocookie.net/bibi-blocksberg/images/e/e1/Dgtzgh.png/revision/latest/top-crop/width/360/height/450?cb=20190623184129&path-prefix=de"
                });
            reject(new Error("Invalid credentials, try 123"))
        })
    }

    authorizeRequest(req: Request): Promise<Server.User> {
        return new Promise<Server.User>((resolve, reject) => {
            if (!req.headers.authorization) {
                reject(new Error("Missing authorization"));
            }
            if (req.headers.authorization === "123")
                return resolve({
                    id: "123",
                    name: "Test",
                    avatarUrl: "https://vignette.wikia.nocookie.net/bibi-blocksberg/images/e/e1/Dgtzgh.png/revision/latest/top-crop/width/360/height/450?cb=20190623184129&path-prefix=de"
                });
            reject(new Error("Invalid credentials, try 123"))
        })
    }
}

const isValid = (token: string) => {
    return token === "123";
}
export const DummyAuthenticationMiddleware: IAuthenticationMiddleware = ((socket, next) => {
    let token = socket.handshake.query.token;
    if (isValid(token)) {
        return next();
    }
    return next(new Error('authentication error'));
})

export default DummyAuthentication;