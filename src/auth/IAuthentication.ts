import * as socketIO from 'socket.io';
import { Socket } from 'socket.io';
import { HttpRequest } from 'uWebSockets.js';
import { User } from '../model.server';

export interface IAuthentication {
  authorizeSocket(socket: socketIO.Socket): Promise<User>;

  authorizeRequest(req: HttpRequest): Promise<User>;
}

export type IAuthenticationMiddleware = (socket: Socket, fn: (err?: any) => void) => void;
