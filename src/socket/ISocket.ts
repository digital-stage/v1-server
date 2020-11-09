import * as events from 'events';
import SocketEvent from './SocketEvent';

interface ISocket extends events.EventEmitter {
  id: string;

  on(event: SocketEvent, listener: (...args: any[]) => void): this;

  once(event: SocketEvent, listener: (...args: any[]) => void): this;

  off(event: SocketEvent, listener: (...args: any[]) => void): this;

  join(group: string): this;

  leave(group: string): this;

  leaveAll(): this;

  handle(event: SocketEvent, args?: any[]);

  error(message?: string);

  disconnect();

  getUserData(key: string): any;
}
export default ISocket;
