import { EventEmitter } from 'events';

class SocketEventEmitter<T extends string> extends EventEmitter {
  protected _maxListeners: number = 10;

  protected _handlers: {
    [event: string]: ((...args: any[]) => void)[]
  } = {};

  addListener = (event: T, listener: (...args: any[]) => void): this => {
    if (Object.keys(this._handlers).length === this._maxListeners) {
      throw new Error('Max listeners reached');
    }
    this._handlers[event] = this._handlers[event] || [];
    this._handlers[event].push(listener);
    return this;
  };

  once = (event: T, listener: (...args: any[]) => void): this => {
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
  };

  removeListener = (event: T, listener: (...args: any[]) => void): this => {
    if (this._handlers[event]) {
      this._handlers[event] = this._handlers[event].filter((handler) => handler !== listener);
    }
    return this;
  };

  off = (
    event: T,
    listener: (...args: any[]) => void,
  ): this => this.removeListener(event, listener);

  removeAllListeners = (event?: T): this => {
    if (event) {
      delete this._handlers[event];
    } else {
      this._handlers = {};
    }
    return this;
  };

  setMaxListeners = (n: number): this => {
    this._maxListeners = n;
    return this;
  };

  getMaxListeners = (): number => this._maxListeners;

  listeners = (event: T): Function[] => {
    if (!this._handlers) {
      console.error('No handlers?');
    }
    return [...this._handlers[event]];
  };

  rawListeners = (event: T): Function[] => [...this._handlers[event]];

  listenerCount = (event: T): number => {
    if (this._handlers[event]) {
      return Object.keys(this._handlers[event]).length;
    }
    return 0;
  };

  prependListener = (event, listener: (...args: any[]) => void): this => {
    if (Object.keys(this._handlers).length === this._maxListeners) {
      throw new Error('Max listeners reached');
    }
    this._handlers[event] = this._handlers[event] || [];
    this._handlers[event].unshift(listener);
    return this;
  };

  prependOnceListener = (event: T, listener: (...args: any[]) => void): this => {
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
  };

  eventNames = (): (T)[] => (Object.keys(this._handlers) as T[]);

  on = (event: T, listener: (...args: any[]) => void): this => this.addListener(event, listener);

  emit = (event: T, ...args: any[]): boolean => {
    const listeners = this.listeners(event);
    if (listeners.length > 0) {
      listeners.forEach((listener) => listener(args));
      return true;
    }
    return false;
  };
}

export default SocketEventEmitter;
