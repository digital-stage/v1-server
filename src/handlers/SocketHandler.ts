import * as pino from 'pino';
import MongoRealtimeDatabase from '../database/MongoRealtimeDatabase';
import SocketDeviceHandler from './SocketDeviceHandler';
import SocketStageHandler from './SocketStageHandler';
import { ServerGlobalEvents, ServerUserEvents } from '../events';
import { IAuthentication } from '../auth/IAuthentication';
import IProvider from '../socket/IProvider';
import ISocket from '../socket/ISocket';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

class SocketHandler {
  private readonly _serverAddress: string;

  private readonly _database: MongoRealtimeDatabase;

  private readonly _authentication: IAuthentication;

  private readonly _io: IProvider;

  constructor(
    serverAddress,
    database: MongoRealtimeDatabase,
    authentication: IAuthentication,
    io: IProvider,
  ) {
    this._serverAddress = serverAddress;
    this._database = database;
    this._authentication = authentication;
    this._io = io;
  }

  async init(): Promise<void> {
    logger.info('[SOCKETSERVER] Initializing socket server...');

    this._io.setAuthentication((req): Promise<NodeJS.Dict<any>> => {
      const authHeader = req.getHeader('authorization');
      const deviceHeader = req.getHeader('query');
      if (authHeader.length > 7 && authHeader.substr(0, 7) === 'Bearer ') {
        const token: string = authHeader.substr(7);
        return this._authentication.verifyWithToken(token)
          .then((user) => {
            let device;
            if (deviceHeader) {
              device = JSON.parse(deviceHeader);
            }
            return {
              user,
              device,
            };
          });
      }
      throw new Error('Malformed request');
    });
    this._io.onConnection((socket: ISocket) => {
      const user = socket.getUserData('user');
      const initialDevice = socket.getUserData('device');
      logger.trace(`[SOCKETSERVER] Incoming socket request ${socket.id}`);

      logger.trace(`[SOCKETSERVER](${socket.id}) Authenticated user ${user.name}`);
      const deviceHandler = new SocketDeviceHandler(
        this._serverAddress,
        this._database,
        user,
        socket,
      );
      const stageHandler = new SocketStageHandler(this._database, user, socket);

      deviceHandler.init();

      stageHandler.init();

      MongoRealtimeDatabase.sendToDevice(socket, ServerUserEvents.USER_READY, user);

      return Promise.all([
        deviceHandler.generateDevice(initialDevice)
          .then(() => deviceHandler.sendRemoteDevices()),
        stageHandler.sendStages(),
      ])
        .then(() => {
          socket.join(user._id.toString());
          MongoRealtimeDatabase.sendToDevice(socket, ServerGlobalEvents.READY);
        })
        .catch((error) => {
          socket.error(error.message);
          logger.error(`[SOCKETSERVER](${socket.id}) Internal error`);
          logger.error(error);
          socket.disconnect();
        });
    });
    logger.info('[SOCKETSERVER] DONE initializing socket server.');
  }
}

export default SocketHandler;
