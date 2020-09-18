import * as socketIO from "socket.io";
import {Request} from "express";
import Auth from "../IAuthentication";
import fetch from "node-fetch";
import * as pino from "pino";
import {AUTH_SERVER_URL} from "../../env";
import {IUserManager} from "../../storage/IManager";
import {UserModel, UserType} from "../../storage/mongo/model.mongo";

const logger = pino({level: process.env.LOG_LEVEL || 'info'});

export interface DefaultAuthUser {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

const getUserByToken = (token: string): Promise<DefaultAuthUser> => {
    return fetch(AUTH_SERVER_URL + "/profile", {
        headers: {
            'Content-Type': 'application/json',
            Authorization: "Bearer " + token
        }
    })
        .then(result => result.json() as DefaultAuthUser);
}

class DefaultAuthentication implements Auth.IAuthentication {
    private readonly manager: IUserManager;

    constructor(manager: IUserManager) {
        this.manager = manager;
    }

    verifyWithToken(resolve, reject, token: string): Promise<UserType> {
        return getUserByToken(token)
            .then(authUser => {
                return UserModel.findOne({uid: authUser._id}).exec()
                    .then(user => {
                        if (!user) {
                            logger.trace("[AUTH] Creating new user " + authUser.name);
                            return this.manager.createUserWithUid(authUser._id, authUser.name, authUser.avatarUrl)
                                .then(user => resolve(user));
                        }
                        logger.trace("[AUTH] Signed in user " + authUser.name);
                        return resolve(user);
                    })
            })
            .catch(error => {
                logger.trace("[AUTH] Invalid token delivered");
                logger.error(error);
                reject(new Error("Invalid credentials"));
            });
    }

    authorizeSocket(socket: socketIO.Socket): Promise<UserType> {
        return new Promise<UserType>((resolve, reject) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                reject(new Error("Missing authorization"));
            }
            return this.verifyWithToken(resolve, reject, socket.handshake.query.token);
        })
    }

    authorizeRequest(req: Request): Promise<UserType> {
        return new Promise<UserType>((resolve, reject) => {
            if (!req.headers.authorization) {
                reject(new Error("Missing authorization"));
            }
            return this.verifyWithToken(resolve, reject, req.headers.authorization);
        })
    }
}

export const DefaultAuthenticationMiddleware: Auth.IAuthenticationMiddleware = ((socket, next) => {
    let token = socket.handshake.query.token;
    getUserByToken(token).then(user => next());
    return next(new Error('authentication error'));
})

export default DefaultAuthentication;