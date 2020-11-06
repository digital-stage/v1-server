import { WebSocket } from 'uWebSockets.js';
import ISocket from '../ISocket';

class UWSSocket implements ISocket {
  readonly _id: string;

  readonly _ws: WebSocket;

  _maxListeners: number = 10;

  _handlers: {
    [event: string]: ((...args: any[]) => void)[]
  } = {};

  get id(): string {
    return this._id;
  }

  constructor(id: string, ws: WebSocket) {
    this._id = id;
    this._ws = ws;
  }

  addListener(event: string, listener: (...args: any[]) => void): this {
    if (Object.keys(this._handlers).length === this._maxListeners) {
      throw new Error('Max listeners reached');
    }
    this._handlers[event] = this._handlers[event] || [];
    this._handlers[event].push(listener);
    return this;
  }

  once(event: string, listener: (...args: any[]) => void): this {
    if (Object.keys(this._handlers).length === this._maxListeners) {
      throw new Error('Max listeners reached');
    }
    this._handlers[event] = this._handlers[event] || [];
    const onceWrapper = () => {
      listener();
      this.off(event, onceWrapper);
    };
    this._handlers[event].push(onceWrapper);
    return this;
  }

  removeListener(event: string, listener: (...args: any[]) => void): this {
    if (this._handlers[event]) {
      this._handlers[event] = this._handlers[event].filter((handler) => handler !== listener);
    }
    return this;
  }

  off(event: string, listener: (...args: any[]) => void): this {
    return this.removeListener(event, listener);
  }

  removeAllListeners(event?: string): this {
    if (event) {
      delete this._handlers[event];
    } else {
      this._handlers = {};
    }
    return this;
  }

  setMaxListeners(n: number): this {
    this._maxListeners = n;
    return this;
  }

  getMaxListeners(): number {
    return this._maxListeners;
  }

  listeners(event: string): Function[] {
    return [...this._handlers[event]];
  }

  rawListeners(event: string): Function[] {
    return [...this._handlers[event]];
  }

  listenerCount(event: string): number {
    if (this._handlers[event]) {
      return Object.keys(this._handlers[event]).length;
    }
    return 0;
  }

  prependListener(event, listener: (...args: any[]) => void): this {
    if (Object.keys(this._handlers).length === this._maxListeners) {
      throw new Error('Max listeners reached');
    }
    this._handlers[event] = this._handlers[event] || [];
    this._handlers[event].unshift(listener);
    return this;
  }

  prependOnceListener(event: string, listener: (...args: any[]) => void): this {
    if (Object.keys(this._handlers).length === this._maxListeners) {
      throw new Error('Max listeners reached');
    }
    this._handlers[event] = this._handlers[event] || [];
    const onceWrapper = () => {
      listener();
      this.off(event, onceWrapper);
    };
    this._handlers[event].unshift(onceWrapper);
    return this;
  }

  eventNames(): (string)[] {
    return Object.keys(this._handlers);
  }

  on(event: string, listener: (...args: any[]) => void): this {
    return this.addListener(event, listener);
  }

  join(group: string): this {
    this._ws.subscribe(group);
    return this;
  }

  leave(group: string): this {
    this._ws.unsubscribe(group);
    return this;
  }

  leaveAll(): this {
    this._ws.unsubscribeAll();
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    return this._ws.send(JSON.stringify({
      event,
      payload: {
        ...args,
      },
    }));
  }

  handle(event: string, payload?: any) {
    if (this._handlers[event]) {
      this._handlers[event].forEach((handler) => handler(payload));
    }
  }

  error(message?: string) {
    this.emit('error', message);
  }

  disconnect() {
    this._ws.close();
  }

  getUserData(key: string): any {
    return this._ws[key];
  }
}
export default UWSSocket;
