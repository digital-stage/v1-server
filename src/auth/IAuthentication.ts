import * as socketIO from "socket.io";
import {Socket} from "socket.io";
import {Request} from "express";
import {UserType} from "../storage/mongo/model.mongo";

namespace Auth {
    export interface IAuthentication {
        authorizeSocket(socket: socketIO.Socket): Promise<UserType>;

        authorizeRequest(req: Request): Promise<UserType>;
    }

    export type IAuthenticationMiddleware = (socket: Socket, fn: (err?: any) => void) => void;
}

export default Auth;