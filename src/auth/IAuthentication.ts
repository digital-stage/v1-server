import { Socket } from 'socket.io';
import { HttpRequest } from 'uWebSockets.js';
import { User } from '../model.server';

export interface IAuthentication {
  verifyWithToken(token: string): Promise<User>;

  authorizeRequest(req: HttpRequest): Promise<User>;
}

export type IAuthenticationMiddleware = (socket: Socket, fn: (err?: any) => void) => void;
