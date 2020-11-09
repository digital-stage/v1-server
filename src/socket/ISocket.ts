interface ConnectionEvents {
  connect: 'connect';
  disconnect: 'disconnect';
}

export type SocketEvent = ConnectionEvents[keyof ConnectionEvents] | string;

interface ISocket extends NodeJS.EventEmitter {
  id: string;

  on(event: SocketEvent, listener: (...args: any[]) => void): this;

  once(event: SocketEvent, listener: (...args: any[]) => void): this;

  off(event: SocketEvent, listener: (...args: any[]) => void): this;

  join(group: string): this;

  leave(group: string): this;

  leaveAll(): this;

  handle(event: SocketEvent, payload?: any);

  error(message?: string);

  disconnect();

  getUserData(key: string): any;
}
export default ISocket;
