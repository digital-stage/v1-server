import * as Redis from 'ioredis';
import * as socketIO from 'socket.io';
import * as redisAdapter from 'socket.io-redis';
import * as pino from 'pino';
import MongoRealtimeDatabase from '../database/MongoRealtimeDatabase';
import { User } from '../model.server';
import SocketDeviceHandler from './SocketDeviceHandler';
import SocketStageHandler from './SocketStageHandler';
import { ServerGlobalEvents, ServerUserEvents } from '../events';
import { IAuthentication } from '../auth/IAuthentication';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

class SocketHandler {
  private readonly _serverAddress: string;

  private readonly _database: MongoRealtimeDatabase;

  private readonly _authentication: IAuthentication;

  private readonly _io: socketIO.Server;

  constructor(
    serverAddress,
    database: MongoRealtimeDatabase,
    authentication: IAuthentication,
    io: socketIO.Server,
  ) {
    this._serverAddress = serverAddress;
    this._database = database;
    this._authentication = authentication;
    this._io = io;
  }

  async init(): Promise<void> {
    logger.info('[SOCKETSERVER] Initializing socket server...');
    if (process.env.USE_REDIS) {
      logger.info(`[SOCKETSERVER] Using redis at ${process.env.REDIS_HOSTNAME}:${process.env.REDIS_PORT}`);
      const pub = new Redis(`rediss://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOSTNAME}:${process.env.REDIS_PORT}`);
      const sub = new Redis(`rediss://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOSTNAME}:${process.env.REDIS_PORT}`);
      this._io.adapter(redisAdapter({
        pubClient: pub,
        subClient: sub,
      }));
    }
    this._io.on('connection', (socket: socketIO.Socket) => {
      logger.trace(`[SOCKETSERVER] Incoming socket request ${socket.id}`);
      return this._authentication.authorizeSocket(socket)
        .then(async (user: User) => {
          logger.trace(`[SOCKETSERVER](${socket.id}) Authenticated user ${user.name}`);
          const deviceHandler = new SocketDeviceHandler(
            this._serverAddress,
            this._database,
            user,
            socket,
          );
          const stageHandler = new SocketStageHandler(this._database, user, socket);
          /**
                     * DEVICE MANAGEMENT
                     */
          deviceHandler.init();

          /**
                     * STAGE MANAGEMENT
                     */
          stageHandler.init();

          MongoRealtimeDatabase.sendToDevice(socket, ServerUserEvents.USER_READY, user);

          return Promise.all([
            deviceHandler.generateDevice()
              .then(() => deviceHandler.sendRemoteDevices()),
            stageHandler.sendStages(),
          ])
            .then(() => socket.join(user._id.toString(), (err) => {
              if (err) logger.warn(`[SOCKETSERVER](${socket.id}) Could not join room: ${err}`);
              logger.trace(`[SOCKETSERVER](${socket.id}) Joined room: ${user._id}`);
              logger.trace(`[SOCKETSERVER](${socket.id}) Ready`);
              MongoRealtimeDatabase.sendToDevice(socket, ServerGlobalEvents.READY);
            }))
            .catch((error) => {
              socket.error(error.message);
              logger.error(`[SOCKETSERVER](${socket.id}) Internal error`);
              logger.error(error);
              socket.disconnect();
            });
        })
        .catch((error) => {
          socket.error('Invalid authorization');
          logger.trace(`[SOCKETSERVER](${socket.id}) INVALID CONNECTION ATTEMPT`);
          logger.trace(error);
          socket.disconnect();
        });
    });
    logger.info('[SOCKETSERVER] DONE initializing socket server.');
  }
}

export default SocketHandler;
