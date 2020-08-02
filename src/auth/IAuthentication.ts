import * as socketIO from "socket.io";
import {User} from "../model";

export interface IAuthentication {
    authorizeSocket(socket: socketIO.Socket): Promise<User>
}