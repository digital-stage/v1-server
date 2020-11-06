interface ISocket extends NodeJS.EventEmitter {
  id: string;

  join(group: string): this;

  leave(group: string): this;

  leaveAll(): this;

  handle(event: string, payload?: any);

  error(message?: string);

  disconnect();

  getUserData(key: string): any;
}
export default ISocket;
