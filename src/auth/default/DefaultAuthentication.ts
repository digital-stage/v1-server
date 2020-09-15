import * as socketIO from "socket.io";
import {Request} from "express";
import Auth from "../IAuthentication";
import {User} from "../../model.common";
import fetch from "node-fetch";
import {manager} from "../../storage/Manager";
import * as pino from "pino";
import {AUTH_SERVER_URL} from "../../index";

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

    verifyWithToken(resolve, reject, token: string) {
        return getUserByToken(token)
            .then(authUser => {
                return manager.getUserByUid(authUser._id)
                    .then(user => {
                        if (!user) {
                            logger.trace("[AUTH] Creating new user " + authUser.name);
                            return manager.createUserWithUid(authUser._id, authUser.name, authUser.avatarUrl)
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
            return this.verifyWithToken(resolve, reject, req.headers.authorization);
        })
    }

    login(email: string, password: string) {
    }

    logout() {
    }

    signup(email: string, password: string) {
    }
}

export const DefaultAuthenticationMiddleware: Auth.IAuthenticationMiddleware = ((socket, next) => {
    let token = socket.handshake.query.token;
    getUserByToken(token).then(user => next());
    return next(new Error('authentication error'));
})

export default DefaultAuthentication;