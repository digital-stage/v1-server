import * as socketIO from "socket.io";
import {Socket} from "socket.io";
import {Request} from "express";
import {User} from "../model.common";

namespace Auth {
    export interface IAuthentication {
        authorizeSocket(socket: socketIO.Socket): Promise<User>;

        authorizeRequest(req: Request): Promise<User>;

        login(email: string, password: string);

        signup(email: string, password: string);

        logout();
    }

    export type IAuthenticationMiddleware = (socket: Socket, fn: (err?: any) => void) => void;
}

export default Auth;