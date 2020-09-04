import * as socketIO from "socket.io";
import {Socket} from "socket.io";
import {Request} from "express";

namespace Auth {
    export interface User {
        id: string;
        name: string;
        avatarUrl: string | null;
    }

    export interface IAuthentication {
        authorizeSocket(socket: socketIO.Socket): Promise<User>;

        authorizeRequest(req: Request): Promise<User>;
    }

    export type IAuthenticationMiddleware = (socket: Socket, fn: (err?: any) => void) => void;
}

export default Auth;