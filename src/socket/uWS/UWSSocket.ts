import { WebSocket } from 'uWebSockets.js';
import ISocket from '../ISocket';
import SocketEventEmitter from '../SocketEventEmitter';
import SocketEvent from '../SocketEvent';
import { encodeArray } from '../Converter';

class UWSSocket extends SocketEventEmitter<SocketEvent> implements ISocket {
  readonly _id: string;

  readonly _ws: WebSocket;

  _maxListeners: number = 50;

  _handlers: {
    [event: string]: ((...args: any[]) => void)[]
  } = {};

  get id(): string {
    return this._id;
  }

  constructor(id: string, ws: WebSocket) {
    super();
    this._id = id;
    this._ws = ws;
  }

  join = (group: string): this => {
    this._ws.subscribe(group);
    return this;
  };

  leave = (group: string): this => {
    this._ws.unsubscribe(group);
    return this;
  };

  leaveAll = (): this => {
    this._ws.unsubscribeAll();
    return this;
  };

  emit = (event: SocketEvent, ...args: any[]): boolean => this._ws.send(encodeArray(...args));

  handle = (event: SocketEvent, ...args: any[]) => {
    if (this._handlers[event]) {
      this._handlers[event].forEach((handler) => handler(...args));
    }
  };

  error = (message?: string) => {
    this.emit('error', message);
  };

  disconnect = () => {
    this._ws.close();
  };

  getUserData = (key: string): any => this._ws[key];
}
export default UWSSocket;
