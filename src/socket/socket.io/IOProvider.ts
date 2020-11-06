import * as socketIO from 'socket.io';
import IProvider, { Authentication, ISocketHandler } from '../IProvider';

class IOProvider implements IProvider {
  readonly _io: socketIO.Server;

  _authentication: Authentication;

  constructor(io: socketIO.Server) {
    this._io = io;
  }

  onConnection(handler: ISocketHandler) {
    this._io.on('connection', handler);
  }

  to(group: string, event: string, payload: any) {
    this._io.to(group).emit(event, payload);
  }

  toAll(event: string, payload: any) {
    this._io.emit(event, payload);
  }

  setAuthentication(authentication: Authentication) {
    this._authentication = authentication;
  }
}

export default IOProvider;
