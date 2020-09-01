import * as socketIO from "socket.io";
import {Socket} from "socket.io";
import Server from "../model.server";

export interface IAuthentication {
    authorizeSocket(socket: socketIO.Socket): Promise<Server.User>
}

export type IAuthenticationMiddleware = (socket: Socket, fn: (err?: any) => void) => void;

export default Auth;