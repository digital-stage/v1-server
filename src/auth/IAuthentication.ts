import * as socketIO from "socket.io";
import {User} from "../model";
import {Socket} from "socket.io";

export interface IAuthentication {
    authorizeSocket(socket: socketIO.Socket): Promise<User>
}

export type IAuthenticationMiddleware = (socket: Socket, fn: (err?: any) => void) => void