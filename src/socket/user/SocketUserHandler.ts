import { ITeckosSocket } from 'teckos';
import debug from 'debug';
import SocketDeviceContext from './handlers/SocketDeviceContext';
import SocketStageContext from './handlers/SocketStageContext';
import SocketUserContext from './handlers/SocketUserContext';
import MongoRealtimeDatabase from '../../database/MongoRealtimeDatabase';
import { ServerGlobalEvents, ServerUserEvents } from '../../events';
import { IAuthentication } from '../../auth/IAuthentication';
import { Device } from '../../types';

const d = debug('server').extend('socket').extend('user');
const error = d.extend('error');
const trace = d.extend('trace');

class SocketUserHandler {
  private readonly _serverAddress: string;

  private readonly _database: MongoRealtimeDatabase;

  private readonly _authentication: IAuthentication;

  constructor(
    serverAddress,
    database: MongoRealtimeDatabase,
    authentication: IAuthentication,
  ) {
    this._serverAddress = serverAddress;
    this._database = database;
    this._authentication = authentication;
  }

  handle(socket: ITeckosSocket, token: string, initialDevice: Partial<Device>) {
    return this._authentication.verifyWithToken(token)
      .then((user) => {
        trace(`(${socket.id}) Authenticated user ${user.name}`);
        const deviceHandler = new SocketDeviceContext(
          this._serverAddress,
          this._database,
          user,
          socket,
        );
        const stageHandler = new SocketStageContext(this._database, user, socket);
        const userHandler = new SocketUserContext(this._database, user, socket);

        deviceHandler.init();

        stageHandler.init();

        userHandler.init();

        MongoRealtimeDatabase.sendToDevice(socket, ServerUserEvents.USER_READY, user);

        return Promise.all([
          deviceHandler.generateDevice(initialDevice)
            .then(() => deviceHandler.sendRemoteDevices())
            .then(() => deviceHandler.sendSoundCards()),
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
      });
  }
}

export default SocketUserHandler;
