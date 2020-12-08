import { ITeckosProvider, ITeckosSocket } from 'teckos';
import debug from 'debug';
import MongoRealtimeDatabase from '../database/MongoRealtimeDatabase';
import SocketDeviceHandler from './SocketDeviceHandler';
import SocketStageHandler from './SocketStageHandler';
import { ServerGlobalEvents, ServerUserEvents } from '../events';
import { IAuthentication } from '../auth/IAuthentication';
import { Device } from '../types';
import SocketUserHandler from './SocketUserHandler';

const d = debug('server').extend('socket').extend('main');
const info = d.extend('info');
const trace = d.extend('trace');
const error = d.extend('error');

class SocketHandler {
  private readonly _serverAddress: string;

  private readonly _database: MongoRealtimeDatabase;

  private readonly _authentication: IAuthentication;

  private readonly _io: ITeckosProvider;

  constructor(
    serverAddress,
    database: MongoRealtimeDatabase,
    authentication: IAuthentication,
    io: ITeckosProvider,
  ) {
    this._serverAddress = serverAddress;
    this._database = database;
    this._authentication = authentication;
    this._io = io;
  }

  async init(): Promise<void> {
    info('Initializing socket server...');

    this._io.onConnection((socket: ITeckosSocket) => {
      info('Got new Connection');
      // Wait for token

      socket.on('token', (payload: {
        token: string;
        device?: Partial<Device>;
      }) => {
        const { token, device: initialDevice } = payload;
        if (token) {
          return this._authentication.verifyWithToken(token)
            .then((user) => {
              trace(`Incoming socket request ${socket.id}`);

              trace(`(${socket.id}) Authenticated user ${user.name}`);
              const deviceHandler = new SocketDeviceHandler(
                this._serverAddress,
                this._database,
                user,
                socket,
              );
              const stageHandler = new SocketStageHandler(this._database, user, socket);
              const userHandler = new SocketUserHandler(this._database, user, socket);

              deviceHandler.init();

              stageHandler.init();

              userHandler.init();

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
                .catch((initializationError) => {
                  socket.error(initializationError.message);
                  error(`(${socket.id}) Internal error: ${error}`);
                  socket.disconnect();
                });
            })
            .catch((authError) => {
              error(`Could not authenticate token: ${authError}`);
              socket.disconnect();
            });
        }
        return socket.disconnect();
      });
      // TODO: Disconnect after timeout when no token is delivered
    });

    info('[SOCKETSERVER] DONE initializing socket server.');
  }
}

export default SocketHandler;
