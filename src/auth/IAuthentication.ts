import * as socketIO from 'socket.io';
import { Socket } from 'socket.io';
import { Request } from 'express';
import { User } from '../model.server';

export interface IAuthentication {
  authorizeSocket(socket: socketIO.Socket): Promise<User>;

  authorizeRequest(req: Request): Promise<User>;
}

export type IAuthenticationMiddleware = (socket: Socket, fn: (err?: any) => void) => void;
