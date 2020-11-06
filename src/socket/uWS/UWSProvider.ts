import { TemplatedApp } from 'uWebSockets.js';
import * as IORedis from 'ioredis';
import * as uWS from 'uWebSockets.js';
import * as crypto from 'crypto';
import ISocket from '../ISocket';
import UWSSocket from './UWSSocket';
import IProvider, { Authentication, ISocketHandler } from '../IProvider';

const decoder = new TextDecoder();

function generateUUID(): string {
  return crypto.randomBytes(16).toString('hex');
}

class UWSProvider implements IProvider {
  private readonly _useRedis;

  private _app: TemplatedApp;

  private readonly _pub: IORedis.Redis;

  private readonly _sub: IORedis.Redis;

  private _authentication: Authentication;

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
      idleTimeout: 10,
      maxBackpressure: 1024,

      upgrade: (res, req, context) => {
        console.log(`An Http connection wants to become WebSocket, URL: ${req.getUrl()}!`);
        const upgradeAborted = { aborted: false };
        const url = req.getUrl();
        const secWebSocketKey = req.getHeader('sec-websocket-key');
        const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
        const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');

        if (this._authentication) {
          this._authentication(req)
            .then((result) => {
              if (upgradeAborted.aborted) {
                console.log('Ouch! Client disconnected before we could upgrade it!');
                return;
              }
              res.upgrade({
                url,
                ...result,
              },
              secWebSocketKey,
              secWebSocketProtocol,
              secWebSocketExtensions,
              context);
            })
            .catch(() => {
              res.close();
            });
          res.onAborted(() => {
            upgradeAborted.aborted = true;
          });
        } else {
          res.upgrade({
            url,
          },
          secWebSocketKey,
          secWebSocketProtocol,
          secWebSocketExtensions,
          context);
        }
      },
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
      message: (ws, message, isBinary) => {
        if (this._connections[ws.id]) {
          const parsedMessage = JSON.parse(decoder.decode(message));
          const { event, payload } = parsedMessage;
          this._connections[ws.id].handle(event, payload);
        } else {
          console.error(`Unknown connection: ${ws.id}`);
        }
      },
      drain: (ws) => {

      },
      close: (ws) => {
        if (this._connections[ws.id]) {
          this._connections[ws.id].handle('disconnect');
          delete this._connections[ws.id];
        }
      },
    });
  }

  setAuthentication(authentication: Authentication) {
    this._authentication = authentication;
  }

  onConnection(handler: ISocketHandler) {
    this._handlers.push(handler);
  }

  toAll(event: string, payload: any) {
    const msg = JSON.stringify({
      event,
      payload,
    });
    if (this._useRedis) {
      console.log('Publishing to all via REDIS');
      this._pub.publish('a', msg);
    } else {
      this._app.publish('a', msg);
    }
  }

  to(group: string, event: string, payload: any) {
    const msg = JSON.stringify({
      event,
      payload,
    });
    if (this._useRedis) {
      console.log(`Publishing to group ${group} via REDIS`);
      this._pub.publish(`g.${group}`, msg);
    } else {
      this._app.publish(group, msg);
    }
  }

  listen(port: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this._app.listen(port, (socket) => {
        if (socket) {
          return resolve(this);
        }
        return reject(new Error(`Could not listen on port ${port}`));
      });
    });
  }
}

export default UWSProvider;
