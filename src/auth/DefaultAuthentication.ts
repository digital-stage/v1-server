import * as socketIO from "socket.io";
import {Request} from "express";
import Auth from "./IAuthentication";
import fetch from "node-fetch";
import * as pino from "pino";
import {IRealtimeDatabase} from "../database/IRealtimeDatabase";
import {User} from "../model.server";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

export interface DefaultAuthUser {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

const getUserByToken = (token: string): Promise<DefaultAuthUser> => {
    return fetch(process.env.AUTH_URL + "/profile", {
        headers: {
            'Content-Type': 'application/json',
            Authorization: "Bearer " + token
        }
    })
        .then(result => result.json())
}

class DefaultAuthentication implements Auth.IAuthentication {
    private readonly database;


    constructor(database: IRealtimeDatabase) {
        this.database = database;
    }

    verifyWithToken(resolve, reject, token: string): Promise<User> {
        return getUserByToken(token)
            .then(authUser => {
                console.log("AUTH USER IS:");
                console.log(authUser);
                return this.database.readUserByUid(authUser._id)
                    .then(user => {
                        if (!user) {
                            logger.trace("[AUTH] Creating new user " + authUser.name);
                            return this.database.createUser({
                                uid: authUser._id,
                                name: authUser.name,
                                avatarUrl: authUser.avatarUrl
                            })
                                .then(user => resolve(user));
                        }
                        return resolve(user);
                    })
            })
            .catch(error => {
                logger.trace("[AUTH] Invalid token delivered");
                logger.error(error);
                reject(new Error("Invalid credentials"));
            });
    }

    authorizeSocket(socket: socketIO.Socket): Promise<User> {
        return new Promise<User>((resolve, reject) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                reject(new Error("Missing authorization"));
            }
            return this.verifyWithToken(resolve, reject, socket.handshake.query.token);
        })
    }

    authorizeRequest(req: Request): Promise<User> {
        return new Promise<User>((resolve, reject) => {
            if (!req.headers.authorization) {
                reject(new Error("Missing authorization"));
            }
            if (!req.headers.authorization.startsWith("Bearer ")) {
                reject(new Error("Invalid authorization"));
            }
            const token = req.headers.authorization.substr(7);
            return this.verifyWithToken(resolve, reject, token);
        })
    }
}

export const DefaultAuthenticationMiddleware: Auth.IAuthenticationMiddleware = ((socket, next) => {
    let token = socket.handshake.query.token;
    getUserByToken(token).then(user => next());
    return next(new Error('authentication error'));
})

export default DefaultAuthentication;