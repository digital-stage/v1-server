import { TemplatedApp } from 'uWebSockets.js';
import * as IORedis from 'ioredis';
import * as uWS from 'uWebSockets.js';
import * as crypto from 'crypto';
import ISocket from '../ISocket';
import UWSSocket from './UWSSocket';
import IProvider, { ISocketHandler } from '../IProvider';
import { decodeArray, encodeArray } from '../Converter';

function generateUUID(): string {
  return crypto.randomBytes(16).toString('hex');
}

class UWSProvider implements IProvider {
  private readonly _useRedis;

  private _app: TemplatedApp;

  private readonly _pub: IORedis.Redis;

  private readonly _sub: IORedis.Redis;

  private _connections: {
    [uuid: string]: ISocket
  } = {};

  private _handlers: ISocketHandler[] = [];

  constructor(app: uWS.TemplatedApp, options?: {
    redisUrl: string
  }) {
    this._app = app;
    if (options && options.redisUrl) {
      const { redisUrl } = options;
      this._useRedis = true;
      this._pub = new IORedis(redisUrl);
      this._sub = new IORedis(redisUrl);

      this._sub.subscribe('a', (err) => {
        if (err) {
          console.error(err.message);
        }
      });
      this._sub.subscribe('g.*', (err) => {
        if (err) {
          console.error(err.message);
        }
      });

      this._sub.on('message', (channel, message) => {
        console.log(`REDIS: Got ${message} from ${channel}`);
        if (channel === 'a') {
          return this._app.publish('a', message);
        }
        return this._app.publish(channel.substr(2), message);
      });
    }
    this._app.ws('/*', {
      /* Options */
      compression: uWS.SHARED_COMPRESSOR,
      maxPayloadLength: 16 * 1024 * 1024,
      idleTimeout: 0,
      maxBackpressure: 1024,

      open: (ws) => {
        const id: string = generateUUID();
        /* Let this client listen to all sensor topics */
        console.log(`Have new connection from: ${id}`);

        // Subscribe to all
        ws.subscribe('a');

        // eslint-disable-next-line no-param-reassign
        ws.id = id;
        this._connections[id] = new UWSSocket(id, ws);
        this._handlers.forEach((handler) => handler(this._connections[id]));
      },
      message: (ws, buffer) => {
        if (this._connections[ws.id]) {
          const arr = decodeArray(buffer);

          if (arr.length > 0) {
            console.log(`[UWSProvider] Handle event ${arr[0]}`);
            this._connections[ws.id].handle(arr[0], ...arr.slice(1));
          }
        } else {
          console.error(`Unknown connection: ${ws.id}`);
        }
      },
      drain: (ws) => {
        console.error(`Drain: ${ws.id}`);
      },
      close: (ws) => {
        if (this._connections[ws.id]) {
          this._connections[ws.id].handle('disconnect');
          delete this._connections[ws.id];
        }
      },
    });
  }

  onConnection = (handler: ISocketHandler) => {
    this._handlers.push(handler);
  };

  toAll = (event: string, ...args: any[]) => {
    args.unshift(event);
    const buffer = encodeArray(args);
    if (this._useRedis) {
      console.log('Publishing to all via REDIS');
      this._pub.publishBuffer('a', buffer);
    } else {
      this._app.publish('a', buffer);
    }
  };

  to = (group: string, event: string, ...args: any[]) => {
    args.unshift(event);
    const buffer = encodeArray(args);
    if (this._useRedis) {
      console.log(`Publishing to group ${group} via REDIS`);
      this._pub.publishBuffer(`g.${group}`, buffer);
    } else {
      this._app.publish(group, buffer);
    }
  };

  listen = (port: number): Promise<any> => new Promise((resolve, reject) => {
    this._app.listen(port, (socket) => {
      if (socket) {
        return resolve(this);
      }
      return reject(new Error(`Could not listen on port ${port}`));
    });
  });
}

export default UWSProvider;
